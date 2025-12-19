
import React from 'react';
import { CardData } from '../../types';
import { audioController } from '../../utils/AudioController';

interface CardProps {
  card: CardData;
  className?: string;
  isPeeked?: boolean;
  onClick?: () => void;
  canInteract?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, className = '', isPeeked = false, onClick, canInteract = false }) => {
  
  const handleClick = () => {
      if (canInteract && onClick) {
          audioController.playCardFlip();
          onClick();
      }
  };

  const showFace = card.isFaceUp || isPeeked;

  return (
    <div 
      className={`relative w-24 h-36 md:w-32 md:h-48 perspective-1000 transition-transform duration-500 ${canInteract ? 'cursor-pointer hover:-translate-y-2' : ''} ${className}`}
      onClick={handleClick}
    >
      <div 
        className={`w-full h-full relative preserve-3d transition-transform duration-500 shadow-2xl ${showFace ? 'rotate-y-0' : 'rotate-y-180'}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* FRONT (The Number) - Initially hidden (rotated) */}
        <div 
            className="absolute inset-0 backface-hidden bg-zinc-200 rounded-lg flex flex-col items-center justify-center border-4 border-zinc-400 overflow-hidden"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }} 
        >
          {/* Grunge Overlay */}
          <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/black-felt.png')]"></div>
          <div className="absolute inset-0 opacity-10 bg-red-900 pointer-events-none"></div>
          
          {/* Peek Indicator Overlay */}
          {isPeeked && !card.isFaceUp && (
              <div className="absolute inset-0 border-4 border-blue-500/50 z-20 pointer-events-none animate-pulse">
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-1 font-mono">PEEKING</div>
              </div>
          )}

          {/* Corner Numbers */}
          <div className="absolute top-2 left-2 text-xl font-bold font-mono text-zinc-800">{card.value}</div>
          <div className="absolute bottom-2 right-2 text-xl font-bold font-mono text-zinc-800 rotate-180">{card.value}</div>

          {/* Center Number */}
          <div className="text-6xl md:text-7xl font-bold font-mono text-black relative z-10">
            {card.value}
          </div>
          
          <div className="absolute top-1/4 right-1/4 w-8 h-8 rounded-full bg-red-800 opacity-20 blur-sm"></div>
        </div>

        {/* BACK (The Cover) - Initially visible */}
        <div 
          className="absolute inset-0 backface-hidden bg-zinc-900 rounded-lg border-4 border-zinc-700 flex items-center justify-center bg-[repeating-linear-gradient(45deg,_#18181b_0,_#18181b_10px,_#27272a_10px,_#27272a_20px)]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
           <div className={`w-16 h-16 border-2 flex items-center justify-center rounded-full bg-black/50 transition-colors ${canInteract ? 'border-blue-500/50 text-blue-500' : 'border-zinc-600 text-zinc-500'}`}>
             <span className="font-bold text-xs tracking-widest">{canInteract ? 'VIEW' : '21'}</span>
           </div>
        </div>
      </div>
    </div>
  );
};
