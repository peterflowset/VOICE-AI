import React, { useState, useCallback } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { Orb } from './components/Orb';
import { Controls } from './components/Controls';
import { ConnectionState } from './types';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [volume, setVolume] = useState(0);
  
  const handleAudioLevel = useCallback((level: number) => {
    // Smooth the volume visually
    setVolume(prev => prev * 0.8 + level * 0.2);
  }, []);

  const { status, connect, disconnect, error } = useLiveSession({
    onAudioLevel: handleAudioLevel
  });

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden selection:bg-violet-500/30">
      
      {/* Background Ambient Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/20 blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] animate-pulse pointer-events-none" />

      {/* Header */}
      <header className="absolute top-8 left-0 right-0 flex justify-center items-center gap-2 opacity-80">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <h1 className="text-xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Gemini Voice AI
        </h1>
      </header>

      {/* Main Visualizer Area */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 z-10 space-y-12">
        
        <div className="h-80 flex items-center justify-center">
            <Orb 
                isActive={status === ConnectionState.CONNECTED} 
                volume={volume} 
            />
        </div>

        {/* Error Message Toast */}
        {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg text-sm text-center backdrop-blur-sm animate-fade-in">
                {error}
            </div>
        )}

        <Controls 
            status={status} 
            onConnect={connect} 
            onDisconnect={disconnect} 
        />
      </main>

      {/* Footer */}
      <footer className="absolute bottom-6 text-xs text-slate-600 font-medium">
        Powered by Google Gemini Live API
      </footer>
    </div>
  );
}
