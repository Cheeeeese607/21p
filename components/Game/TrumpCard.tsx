import React from 'react';
import { TrumpCardData, TrumpRarity } from '../../types';
import { audioController } from '../../utils/AudioController';

interface TrumpCardProps {
  card: TrumpCardData;
  onClick: () => void;
  disabled?: boolean;
}

export const TrumpCard: React.FC<TrumpCardProps> = ({ card, onClick, disabled }) => {
  const getBorderColor = (rarity: TrumpRarity) => {
    switch (rarity) {
      case TrumpRarity.COMMON: return 'border-zinc-500';
      case TrumpRarity.UNCOMMON: return 'border-blue-500';
      case TrumpRarity.RARE: return 'border-yellow-500';
      default: return 'border-zinc-500';
    }
  };

  const getBgGradient = (rarity: TrumpRarity) => {
    switch (rarity) {
      case TrumpRarity.COMMON: return 'bg-gradient-to-b from-zinc-800 to-zinc-900';
      case TrumpRarity.UNCOMMON: return 'bg-gradient-to-b from-blue-900/40 to-black';
      case TrumpRarity.RARE: return 'bg-gradient-to-b from-yellow-900/40 to-black';
      default: return 'bg-zinc-900';
    }
  };

  const handleClick = () => {
      if (!disabled) {
          audioController.playClick();
          onClick();
      }
  };

  return (
    <div 
        onClick={handleClick}
        className={`
            relative w-20 h-28 md:w-24 md:h-32 flex-shrink-0 
            border-2 ${getBorderColor(card.rarity)} ${getBgGradient(card.rarity)}
            flex flex-col items-center p-1 cursor-pointer transition-all duration-200
            ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:-translate-y-2 hover:shadow-[0_0_15px_rgba(255,0,0,0.3)]'}
            group
        `}
    >
        {/* Stars */}
        <div className="flex gap-0.5 mb-1">
            {Array.from({ length: card.rarity }).map((_, i) => (
                <span key={i} className="text-[8px] text-yellow-500">★</span>
            ))}
        </div>

        {/* Icon */}
        <div className="flex-1 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
            {card.icon}
        </div>

        {/* Name */}
        <div className="w-full text-center bg-black/50 py-1 mt-auto">
            <span className="text-[8px] md:text-[10px] font-bold text-zinc-300 uppercase leading-none block overflow-hidden text-ellipsis whitespace-nowrap">
                {card.name}
            </span>
        </div>

        {/* Hover Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black border border-zinc-600 p-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-xs font-bold text-white mb-1">{card.name}</div>
            <div className="text-[10px] text-zinc-400 leading-tight">{card.description}</div>
        </div>
    </div>
  );
};
