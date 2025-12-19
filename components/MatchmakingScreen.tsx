
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { GlitchText } from './GlitchText';
import { Socket } from 'socket.io-client';

interface MatchmakingScreenProps {
  onBack: () => void;
  onJoinRoom: (code: string) => void;
  onRandomMatch: () => void;
  socket: Socket | null;
}

export const MatchmakingScreen: React.FC<MatchmakingScreenProps> = ({ onBack, onJoinRoom, onRandomMatch, socket }) => {
  const [view, setView] = useState<'SELECTION' | 'ROOM_INPUT'>('SELECTION');
  const [roomCode, setRoomCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [statusText, setStatusText] = useState("SEARCHING FOR SIGNAL...");
  const [timer, setTimer] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen for socket events
  useEffect(() => {
      if (!socket) return;

      // NOTE: match_found is handled in App.tsx to switch views. 
      // We don't need to handle it here to avoid conflicting state updates on unmount.

      socket.on('waiting_for_opponent', ({ code }) => {
          setIsSearching(true);
          setTimer(30);
          setStatusText(`HOSTING CELL: ${code}`);
          startCountdown();
      });

      socket.on('match_timeout', () => {
          resetSearch();
          alert("CONNECTION TIMEOUT. NO SUBJECTS FOUND.");
      });

      return () => {
          // Cleanup
          socket.off('waiting_for_opponent');
          socket.off('match_timeout');
      };
  }, [socket]);

  const startCountdown = () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
      const countInterval = setInterval(() => {
          setTimer(prev => {
              if (prev <= 1) {
                  clearInterval(countInterval);
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
      timeoutRef.current = countInterval;
  };

  const startRandomSearch = () => {
      setIsSearching(true);
      setStatusText("SEARCHING RANDOM FREQUENCY...");
      setTimer(30);
      if (socket) socket.emit('join_queue');
      startCountdown();
  };

  const resetSearch = () => {
      setIsSearching(false);
      setTimer(0);
      if (timeoutRef.current) clearInterval(timeoutRef.current);
  };

  const cancelSearch = () => {
      if (view === 'ROOM_INPUT' && isSearching && socket) {
          socket.emit('cancel_private_room', { code: roomCode });
      } else if (socket) {
          socket.emit('leave_queue');
      }
      resetSearch();
  };

  const handleRandomMatch = () => {
    startRandomSearch();
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim().length === 6) {
       // Send to server to either create or join
       if (socket) {
           setStatusText("CONNECTING TO CELL...");
           setIsSearching(true); 
           socket.emit('join_private_room', { code: roomCode });
       }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          if (timeoutRef.current) clearInterval(timeoutRef.current);
          if (isSearching && socket) {
              socket.emit('leave_queue');
              if(roomCode) socket.emit('cancel_private_room', { code: roomCode });
          }
      };
  }, []);

  return (
    <div className="flex items-center justify-center h-screen w-full relative z-10 p-4">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/90 z-[-1]"></div>
      
      <div className="w-full max-w-2xl border border-zinc-800 bg-black/80 backdrop-blur-md p-1">
        <div className="border border-zinc-900/50 p-6 md:p-12 relative overflow-hidden">
            
            {/* Header */}
            <div className="mb-12 text-center">
                <div className="flex justify-center mb-4">
                     <span className="w-16 h-1 bg-red-900/50"></span>
                </div>
                <GlitchText 
                    text="ESTABLISHING CONNECTION" 
                    as="h2" 
                    className="text-2xl md:text-4xl text-zinc-100 font-bold tracking-widest"
                    intensity="low"
                />
                <p className="text-zinc-600 text-xs mt-2 uppercase">Select connection protocol</p>
            </div>

            {view === 'SELECTION' && !isSearching && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                        onClick={handleRandomMatch}
                        className="group border border-zinc-700 bg-zinc-900/30 p-8 hover:bg-zinc-900 hover:border-red-600 transition-all text-left relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                            <span className="text-4xl text-red-900 font-bold">01</span>
                        </div>
                        <h3 className="text-xl font-bold text-zinc-300 group-hover:text-red-500 mb-2">RANDOM MATCH</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Connect to any available subject. <br/>
                            <span className="text-zinc-600">[随机匹配]</span>
                        </p>
                    </button>

                    <button 
                        onClick={() => setView('ROOM_INPUT')}
                        className="group border border-zinc-700 bg-zinc-900/30 p-8 hover:bg-zinc-900 hover:border-blue-500 transition-all text-left relative overflow-hidden"
                    >
                         <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                            <span className="text-4xl text-blue-900 font-bold">02</span>
                        </div>
                        <h3 className="text-xl font-bold text-zinc-300 group-hover:text-blue-400 mb-2">ROOM CODE</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Enter or Create private key. <br/>
                            <span className="text-zinc-600">[房间码匹配]</span>
                        </p>
                    </button>
                </div>
            )}

            {view === 'ROOM_INPUT' && !isSearching && (
                <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <form onSubmit={handleRoomSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-zinc-500 tracking-widest">Enter 6-Digit Access Code</label>
                            <input 
                                type="text" 
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="w-full bg-black border-2 border-zinc-700 text-center text-3xl md:text-4xl py-4 tracking-[0.5em] text-white focus:outline-none focus:border-blue-500 font-mono uppercase placeholder-zinc-800"
                                placeholder="XXXXXX"
                                autoFocus
                            />
                            <p className="text-[10px] text-zinc-600 text-center">First player creates. Second player joins.</p>
                        </div>
                        <div className="flex gap-4">
                            <Button type="button" variant="secondary" onClick={() => { setView('SELECTION'); setRoomCode(''); }} className="flex-1">
                                CANCEL
                            </Button>
                            <Button type="submit" variant="primary" className="flex-1" disabled={roomCode.length !== 6}>
                                INITIALIZE
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {isSearching && (
                <div className="py-12 text-center space-y-6 animate-pulse">
                    <div className="w-16 h-16 border-4 border-t-red-600 border-r-transparent border-b-zinc-800 border-l-transparent rounded-full animate-spin mx-auto"></div>
                    <div>
                        <h3 className="text-xl text-red-500 font-bold tracking-widest">{statusText}</h3>
                         {view === 'ROOM_INPUT' && (
                            <p className="text-zinc-500 text-xs mt-2">WAITING FOR OPPONENT TO ENTER CODE...</p>
                         )}
                        <p className="text-zinc-600 text-xs mt-2 font-mono">TIMEOUT IN {timer}s</p>
                    </div>
                     <button 
                        onClick={cancelSearch}
                        className="text-xs text-zinc-600 hover:text-white uppercase tracking-widest border border-zinc-800 px-4 py-2 hover:border-white transition-all"
                    >
                        ABORT
                    </button>
                </div>
            )}

            {/* Footer Back Button */}
            {view === 'SELECTION' && !isSearching && (
                 <div className="mt-12 text-center">
                    <button 
                        onClick={onBack}
                        className="text-xs text-zinc-600 hover:text-zinc-400 uppercase tracking-widest border-b border-transparent hover:border-zinc-400 pb-1 transition-all"
                    >
                        &lt; Return to Main Menu
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
