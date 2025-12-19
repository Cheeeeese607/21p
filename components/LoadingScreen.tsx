import React, { useEffect, useState } from 'react';
import { GlitchText } from './GlitchText';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("INITIALIZING SYSTEM");

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 5;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress > 30) setText("LOADING ASSETS...");
    if (progress > 60) setText("ESTABLISHING CONNECTION...");
    if (progress > 90) setText("WELCOME TO THE FAMILY");
    
    if (progress >= 100) {
      setTimeout(onComplete, 800);
    }
  }, [progress, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-black relative z-10">
      <div className="w-full max-w-md p-4 space-y-8">
        <div className="flex justify-center mb-12">
           {/* Abstract Logo */}
           <div className="w-24 h-24 border-4 border-zinc-800 rotate-45 flex items-center justify-center animate-pulse">
              <div className="w-16 h-16 border-2 border-red-900 bg-red-950/50"></div>
           </div>
        </div>

        <div className="space-y-2">
          <GlitchText text={text} className="text-xl text-zinc-400 tracking-widest w-full text-center block" />
          
          <div className="h-2 w-full bg-zinc-900 border border-zinc-800 relative overflow-hidden">
            <div 
              className="h-full bg-red-800 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-zinc-600 font-mono">
             <span>V.1.0.2</span>
             <span>BAKER_NET_PROTOCOL</span>
          </div>
        </div>
      </div>
    </div>
  );
};