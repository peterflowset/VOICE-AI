import React, { useEffect, useRef } from 'react';

interface OrbProps {
  isActive: boolean;
  volume: number; // 0 to 1
}

export const Orb: React.FC<OrbProps> = ({ isActive, volume }) => {
  // Smooth out volume changes for better visuals
  const smoothVolRef = useRef(0);
  
  // Canvas logic for a more complex visualization if desired, 
  // but CSS transforms are smoother for this specific "breathing" effect.
  
  const scale = 1 + (volume * 1.5); // Scale up to 2.5x based on volume
  const glowOpacity = 0.4 + (volume * 0.6);
  
  const baseColor = isActive ? "rgb(139, 92, 246)" : "rgb(71, 85, 105)"; // Violet when active, Slate when idle
  const glowColor = isActive ? "rgba(139, 92, 246, 0.6)" : "rgba(71, 85, 105, 0.2)";

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
        {/* Outer Glow Ring */}
        <div 
            className="absolute rounded-full transition-all duration-100 ease-out"
            style={{
                width: '100%',
                height: '100%',
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                transform: `scale(${isActive ? scale * 1.2 : 1})`,
                opacity: glowOpacity
            }}
        />
        
        {/* Core Orb */}
        <div 
            className={`relative z-10 rounded-full shadow-2xl transition-all duration-300 ease-out ${isActive ? 'orb-pulse' : ''}`}
            style={{
                width: '120px',
                height: '120px',
                backgroundColor: baseColor,
                transform: `scale(${isActive ? Math.max(1, scale) : 1})`,
                boxShadow: `0 0 ${isActive ? 30 + (volume * 50) : 10}px ${baseColor}`
            }}
        >
            {/* Inner reflection/highlight for 3D effect */}
            <div className="absolute top-4 left-4 w-8 h-8 bg-white rounded-full opacity-20 blur-sm"></div>
        </div>
        
        {/* Ripple Effects when talking loudly */}
        {isActive && volume > 0.2 && (
             <div 
             className="absolute border-2 border-violet-400 rounded-full opacity-0 animate-ping"
             style={{
                 width: '120px',
                 height: '120px',
                 animationDuration: `${1 - volume}s`
             }}
         />
        )}
    </div>
  );
};
