import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { base64ToBytes, decodeAudioData, createPcmBlob } from '../utils/audioUtils';

interface UseLiveSessionProps {
  onAudioLevel?: (level: number) => void;
}

export function useLiveSession({ onAudioLevel }: UseLiveSessionProps) {
  const [status, setStatus] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for audio context and processing
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Scheduling playback
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session promise ref to avoid stale closures
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const activeSessionRef = useRef<boolean>(false);

  // Cleanup function
  const disconnect = useCallback(() => {
    console.log("Disconnecting session...");
    activeSessionRef.current = false;
    
    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Stop all scheduled audio
    scheduledSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) { /* ignore */ }
    });
    scheduledSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    // Close session if possible (we can't explicitly close the promise, but we stop sending data)
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
            try {
                session.close();
            } catch (e) {
                console.error("Error closing session", e);
            }
        });
        sessionPromiseRef.current = null;
    }

    setStatus(ConnectionState.DISCONNECTED);
  }, []);

  const connect = useCallback(async () => {
    if (activeSessionRef.current) return;

    try {
      setStatus(ConnectionState.CONNECTING);
      setError(null);

      // Initialize Audio Contexts
      // Input: 16kHz required by Gemini
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz returned by Gemini
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.connect(outputAudioContextRef.current.destination);

      // Analyzer for visualization (output)
      const analyser = outputAudioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      outputNode.connect(analyser);
      
      // Animation loop for visualizer
      const updateVisualizer = () => {
        if (!activeSessionRef.current) return;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for(let i=0; i<dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        if (onAudioLevel) {
            onAudioLevel(average / 255); // Normalize 0-1
        }
        requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Initialize Gemini API
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      // Create Session
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: "Du bist ein hilfreicher KI-Assistent, der Deutsch spricht. Antworte prägnant und freundlich.",
        },
        callbacks: {
          onopen: () => {
            console.log("Session opened");
            setStatus(ConnectionState.CONNECTED);
            activeSessionRef.current = true;

            if (!inputAudioContextRef.current || !streamRef.current) return;

            // Setup Audio Input Processing
            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            inputSourceRef.current = source;
            
            // ScriptProcessor is deprecated but required for raw PCM access in this context
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (!activeSessionRef.current) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              // Send to Gemini
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              }).catch(e => {
                  console.error("Failed to send audio", e);
              });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioStr = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (audioStr && outputAudioContextRef.current) {
               const ctx = outputAudioContextRef.current;
               const audioData = base64ToBytes(audioStr);
               
               // Ensure nextStartTime is not in the past
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

               const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
               
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNode);
               
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               
               scheduledSourcesRef.current.add(source);
               source.onended = () => {
                   scheduledSourcesRef.current.delete(source);
               };
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
                console.log("Interrupted by user");
                scheduledSourcesRef.current.forEach(s => {
                    try { s.stop(); } catch(e){}
                });
                scheduledSourcesRef.current.clear();
                if (outputAudioContextRef.current) {
                    nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
                }
            }
          },
          onclose: () => {
            console.log("Session closed");
            if (activeSessionRef.current) {
                disconnect();
            }
          },
          onerror: (err) => {
            console.error("Session error", err);
            setError("Verbindungsfehler aufgetreten.");
            disconnect();
            setStatus(ConnectionState.ERROR);
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Failed to connect", err);
      setError(err.message || "Konnte Mikrofon nicht starten.");
      setStatus(ConnectionState.ERROR);
      activeSessionRef.current = false;
    }
  }, [disconnect, onAudioLevel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
    error
  };
}
