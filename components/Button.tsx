import React from 'react';
import { audioController } from '../utils/AudioController';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '',
  onClick,
  ...props 
}) => {
  const baseStyles = "relative px-8 py-3 text-lg font-bold tracking-widest uppercase transition-all duration-200 border-2 clip-path-slant group disabled:opacity-50 disabled:cursor-not-allowed select-none";
  
  const variants = {
    primary: "border-zinc-500 bg-zinc-900/80 text-zinc-300 hover:border-red-600 hover:text-red-500 hover:bg-zinc-900 active:bg-zinc-800",
    secondary: "border-zinc-700 bg-transparent text-zinc-500 hover:border-zinc-400 hover:text-zinc-300 active:bg-zinc-900",
    danger: "border-red-800 bg-red-950/30 text-red-500 hover:bg-red-900/50 hover:border-red-500 active:bg-red-900"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isLoading && !props.disabled) {
      audioController.playClick();
    }
    if (onClick) onClick(e);
  };

  const handleMouseEnter = () => {
    if (!isLoading && !props.disabled) {
        audioController.playHover();
    }
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {/* Decorative corner markers */}
      <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-current opacity-50 group-hover:opacity-100 transition-opacity"></span>
      <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-current opacity-50 group-hover:opacity-100 transition-opacity"></span>
      
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
           <span className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
           LOADING...
        </span>
      ) : (
        children
      )}
    </button>
  );
};