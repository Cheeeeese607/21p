
import React from 'react';
import { IncomingInvite } from '../types';
import { Button } from './Button';
import { GlitchText } from './GlitchText';

interface InviteModalProps {
  invite: IncomingInvite | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ invite, onAccept, onDecline }) => {
  if (!invite) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 border-2 border-red-900 p-8 shadow-[0_0_30px_rgba(255,0,0,0.2)]">
        
        {/* Animated Corner Borders */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-600 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-600 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-600 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-600 animate-pulse"></div>

        <div className="text-center space-y-6">
            <div className="inline-block bg-red-950/50 border border-red-500/50 px-3 py-1">
                <span className="text-red-500 text-xs font-mono tracking-widest animate-pulse">INCOMING TRANSMISSION</span>
            </div>

            <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-20 h-20 border-2 border-zinc-500 overflow-hidden relative">
                    <img src={invite.senderAvatar.startsWith('http') ? invite.senderAvatar : `https://picsum.photos/seed/${invite.senderAvatar === 'avatar_1' ? 'bio1' : invite.senderAvatar}/200`} className="w-full h-full object-cover grayscale" />
                    <div className="absolute inset-0 bg-red-500 mix-blend-overlay opacity-50"></div>
                </div>
                <div>
                    <GlitchText 
                        text={invite.senderName} 
                        as="h3" 
                        className="text-2xl font-bold text-white uppercase tracking-widest" 
                        intensity="high" 
                    />
                    <p className="text-zinc-500 text-xs mt-1">REQUESTS BATTLE LINK</p>
                </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-zinc-800">
                <Button onClick={onDecline} variant="secondary" className="flex-1 text-xs">
                    DECLINE
                </Button>
                <Button onClick={onAccept} variant="danger" className="flex-1 text-xs bg-red-900 hover:bg-red-800 border-red-600">
                    ACCEPT CHALLENGE
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};
