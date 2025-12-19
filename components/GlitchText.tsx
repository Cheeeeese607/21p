import React from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  intensity?: 'low' | 'high';
}

export const GlitchText: React.FC<GlitchTextProps> = ({ 
  text, 
  className = '', 
  as: Component = 'span',
  intensity = 'low'
}) => {
  return (
    <Component className={`relative inline-block group ${className}`}>
      <span className="relative z-10">{text}</span>
      <span 
        className={`absolute top-0 left-0 -z-10 w-full h-full text-red-600 opacity-70 animate-pulse ${intensity === 'high' ? 'translate-x-[2px]' : 'translate-x-[1px]'}`}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)' }}
      >
        {text}
      </span>
      <span 
        className={`absolute top-0 left-0 -z-10 w-full h-full text-blue-400 opacity-70 animate-pulse delay-75 ${intensity === 'high' ? '-translate-x-[2px]' : '-translate-x-[1px]'}`}
        style={{ clipPath: 'polygon(0 80%, 100% 20%, 100% 100%, 0 100%)' }}
      >
        {text}
      </span>
    </Component>
  );
};