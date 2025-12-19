import React from 'react';

interface ConnectionStatusProps {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  className?: string;
  showLabel?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, className = '', showLabel = true }) => {
  const getColor = () => {
    switch (status) {
      case 'CONNECTED': return 'bg-green-500 shadow-[0_0_8px_lime]';
      case 'CONNECTING': return 'bg-yellow-500 animate-pulse';
      case 'DISCONNECTED': return 'bg-red-600 shadow-[0_0_8px_red]';
    }
  };

  const getText = () => {
     switch (status) {
      case 'CONNECTED': return 'ONLINE';
      case 'CONNECTING': return 'LINKING...';
      case 'DISCONNECTED': return 'OFFLINE';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getColor()} transition-all duration-300`}></div>
      {showLabel && (
        <span className={`text-[10px] tracking-[0.2em] font-mono ${status === 'DISCONNECTED' ? 'text-red-500' : 'text-zinc-500'}`}>
          SERVER_STATUS: {getText()}
        </span>
      )}
    </div>
  );
};
