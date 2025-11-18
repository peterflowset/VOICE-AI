import React from 'react';
import { ConnectionState } from '../types';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface ControlsProps {
  status: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ status, onConnect, onDisconnect }) => {
  const isConnected = status === ConnectionState.CONNECTED;
  const isConnecting = status === ConnectionState.CONNECTING;

  return (
    <div className="flex flex-col items-center gap-6 z-20">
      <div className="text-center space-y-2">
        <h2 className="text-sm font-medium tracking-widest text-slate-400 uppercase">
            {status === ConnectionState.DISCONNECTED && "Bereit"}
            {status === ConnectionState.CONNECTING && "Verbinde..."}
            {status === ConnectionState.CONNECTED && "Ich höre zu"}
            {status === ConnectionState.ERROR && "Fehler"}
        </h2>
      </div>

      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={`
            relative group flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300
            ${isConnected 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-900/50' 
                : 'bg-white hover:bg-slate-200 shadow-white/20'
            }
            shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isConnecting ? (
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
        ) : isConnected ? (
            <MicOff className="w-8 h-8 text-white" />
        ) : (
            <Mic className="w-8 h-8 text-slate-900" />
        )}
        
        {/* Button Glow Ring */}
        <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md ${isConnected ? 'bg-red-500' : 'bg-white'}`}></div>
      </button>
      
      <p className="text-xs text-slate-500 max-w-xs text-center">
        {isConnected 
            ? "Tippe zum Beenden" 
            : "Tippe, um mit Gemini zu sprechen"}
      </p>
    </div>
  );
};
