import React, { useState } from 'react';
import { Button } from './Button';
import { GlitchText } from './GlitchText';
import { audioController } from '../utils/AudioController';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAudioOn: boolean;
  onToggleAudio: () => void;
  onSetBackground?: (url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  isAudioOn, 
  onToggleAudio,
  onSetBackground
}) => {
  const [bgInput, setBgInput] = useState('');

  if (!isOpen) return null;

  const handleBgSubmit = () => {
      if (onSetBackground) {
          onSetBackground(bgInput);
          setBgInput('');
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 p-6 md:p-8 shadow-2xl shadow-red-900/20">
        
        {/* Decorative Corner */}
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-600"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-600"></div>

        <div className="text-center mb-8">
            <GlitchText 
                text="SYSTEM SETTINGS" 
                as="h2" 
                className="text-2xl font-bold tracking-widest text-zinc-100"
                intensity="low"
            />
            <div className="h-px w-1/2 bg-red-900/50 mx-auto mt-2"></div>
        </div>

        <div className="space-y-6">
            {/* Audio Setting */}
            <div className="flex items-center justify-between border border-zinc-800 bg-black/40 p-4">
                <div className="flex flex-col">
                    <span className="text-zinc-300 font-bold tracking-wider">AUDIO SYSTEM</span>
                    <span className="text-[10px] text-zinc-600 uppercase">Sound Effects & Ambience</span>
                </div>
                
                <button 
                    onClick={() => {
                        audioController.playClick();
                        onToggleAudio();
                    }}
                    className={`relative w-14 h-7 transition-colors duration-300 ${isAudioOn ? 'bg-red-900/50 border-red-500' : 'bg-zinc-800 border-zinc-600'} border`}
                >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white transition-transform duration-300 ${isAudioOn ? 'translate-x-7' : 'translate-x-0'}`}></div>
                </button>
            </div>

            {/* Custom Background */}
            <div className="border border-zinc-800 bg-black/40 p-4 space-y-2">
                 <div className="flex flex-col">
                    <span className="text-zinc-300 font-bold tracking-wider">BACKGROUND IMAGE</span>
                    <span className="text-[10px] text-zinc-600 uppercase">Enter custom Image URL</span>
                </div>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={bgInput}
                        onChange={(e) => setBgInput(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-black border border-zinc-700 text-xs p-2 text-white font-mono"
                    />
                    <button 
                        onClick={handleBgSubmit}
                        className="bg-zinc-800 border border-zinc-600 px-3 text-xs hover:bg-zinc-700"
                    >
                        SET
                    </button>
                </div>
                <button 
                    onClick={() => onSetBackground && onSetBackground('')}
                    className="text-[10px] text-red-500 hover:text-red-400 underline"
                >
                    Reset to Default
                </button>
            </div>

        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-center">
            <Button onClick={onClose} variant="secondary" className="w-full">
                CLOSE MENU
            </Button>
        </div>

      </div>
    </div>
  );
};
