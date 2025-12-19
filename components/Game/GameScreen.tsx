
import React, { useState, useEffect, useRef } from 'react';
import { CardData, User, TrumpCardData, ActiveEffect, TrumpEffectType } from '../../types';
import { Card } from './Card';
import { Button } from '../Button';
import { GlitchText } from '../GlitchText';
import { audioController } from '../../utils/AudioController';
import { TrumpCardManager } from '../../utils/TrumpCardDefinitions';
import { TrumpCard } from './TrumpCard';
import { ConnectionStatus } from '../ConnectionStatus';
import { Socket } from 'socket.io-client';

interface GameScreenProps {
  user: User; 
  onExit: () => void;
  onMatchComplete?: (coinsEarned: number) => void;
  isOnline?: boolean;
  socket?: Socket | null;
  roomId?: string;
  initialRole?: 'HOST' | 'GUEST';
}

type Phase = 'SYNCING' | 'INIT' | 'COIN_TOSS' | 'DEALING' | 'PLAYING' | 'RESOLVING' | 'ROUND_OVER' | 'GAME_OVER';
type Turn = 'PLAYER' | 'OPPONENT';
type Winner = 'PLAYER' | 'OPPONENT' | 'DRAW';

// Generate deck 1-11
const generateDeck = (): CardData[] => {
  const cards: CardData[] = [];
  for (let i = 1; i <= 11; i++) {
    cards.push({ value: i, isFaceUp: false, id: `card-${i}-${Math.random()}` });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
};

const calculateScore = (hand: CardData[]): number => {
  return hand.reduce((sum, card) => sum + card.value, 0);
};

export const GameScreen: React.FC<GameScreenProps> = ({ 
    user, 
    onExit, 
    onMatchComplete,
    isOnline = false,
    socket,
    roomId,
    initialRole
}) => {
  const [phase, setPhase] = useState<Phase>(isOnline ? 'SYNCING' : 'INIT');
  const [turn, setTurn] = useState<Turn>('PLAYER');
  const [deck, setDeck] = useState<CardData[]>([]);
  
  const [playerHand, setPlayerHand] = useState<CardData[]>([]);
  const [opponentHand, setOpponentHand] = useState<CardData[]>([]);
  
  const [playerLives, setPlayerLives] = useState(5);
  const [opponentLives, setOpponentLives] = useState(5);
  
  const [consecutiveStays, setConsecutiveStays] = useState(0);
  const [roundResult, setRoundResult] = useState<{winner: Winner, reason: string} | null>(null);
  
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [winReason, setWinReason] = useState<string>('');

  const [peekedCardId, setPeekedCardId] = useState<string | null>(null);

  const [playerTrumps, setPlayerTrumps] = useState<TrumpCardData[]>([]);
  // We don't strictly track opponent trump inventory in visual state, 
  // but we track their Active Effects.
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  
  // Initialize some Trump Cards for testing/gameplay
  useEffect(() => {
      if (playerTrumps.length === 0) {
          setPlayerTrumps([TrumpCardManager.drawCard(), TrumpCardManager.drawCard()]);
      }
  }, []);

  const getAvatarUrl = (id: string) => {
    const seed = id === 'avatar_1' ? 'bio1' : id === 'avatar_2' ? 'bio2' : id === 'avatar_3' ? 'bio3' : 'bio4';
    return `https://picsum.photos/seed/${seed}/100`;
  };

  // --- ONLINE: Synchronization & Logic ---
  useEffect(() => {
      if (!isOnline || !socket || !roomId) return;

      socket.emit('join_game_room', { roomId });
      socket.emit('player_ready', { roomId });

      const handleAllReady = () => {
          setPhase('INIT');
      };

      const handleGameSignal = (data: any) => {
          // --- Coin Toss Sync ---
          if (data.type === 'START_COIN_TOSS') {
              setPhase('COIN_TOSS');
              audioController.playCoinToss();
          }

          // --- Round Data Sync ---
          if (data.type === 'INIT_ROUND_DATA') {
              if (initialRole === 'GUEST') {
                  setDeck(data.deck);
                  setPlayerHand(data.guestHand); 
                  setOpponentHand(data.hostHand);
                  setActiveEffects([]); // Clear old effects
                  setRoundResult(null); // Clear old result
                  
                  // Distribution Logic: Guest draws a card if needed
                  setPlayerTrumps(prev => {
                      if (prev.length < 3) return [...prev, TrumpCardManager.drawCard()];
                      return prev;
                  });

                  setPhase('PLAYING'); 
                  setTurn(data.startingTurn === 'HOST' ? 'OPPONENT' : 'PLAYER');
              }
          }

          // --- Gameplay Actions ---
          if (data.type === 'OPPONENT_HIT') {
              const card = data.card;
              setOpponentHand(prev => [...prev, card]);
              setDeck(prev => prev.filter(c => c.id !== card.id));
              setConsecutiveStays(0);
              setTurn('PLAYER');
          }
          
          if (data.type === 'OPPONENT_STAY') {
              setTurn('PLAYER');
              setConsecutiveStays(prev => {
                  const newVal = prev + 1;
                  if (newVal >= 2) setPhase('RESOLVING');
                  return newVal;
              });
          }

          // --- Trump Effects ---
          if (data.type === 'OPPONENT_USED_TRUMP') {
              const effect = data.effect as ActiveEffect;
              audioController.playClick();
              // Mirror target for local view: If opponent targeted SELF (them), for me it's OPPONENT.
              // If opponent targeted OPPONENT (me), for me it's SELF.
              const localTarget = effect.target === 'SELF' ? 'OPPONENT' : 'SELF';
              
              setActiveEffects(prev => [...prev, { ...effect, target: localTarget }]);
              
              // Immediate visual feedback
              // (You could add a toast here)
          }
      };

      const handleOpponentDisconnect = () => {
          setOpponentLives(0); 
          setWinReason("对手信号丢失");
          setPhase('GAME_OVER');
      };

      socket.on('all_players_ready', handleAllReady);
      socket.on('game_signal', handleGameSignal);
      socket.on('opponent_disconnected', handleOpponentDisconnect);

      return () => {
          socket.off('all_players_ready', handleAllReady);
          socket.off('game_signal', handleGameSignal);
          socket.off('opponent_disconnected', handleOpponentDisconnect);
      };
  }, [isOnline, socket, roomId, initialRole]);


  // 1. Initialize Round
  useEffect(() => {
    if (phase === 'INIT') {
      const newDeck = generateDeck();
      setConsecutiveStays(0);
      setRoundResult(null);
      setPeekedCardId(null);
      setActiveEffects([]);

      if (!isOnline || (isOnline && initialRole === 'HOST')) {
          setDeck(newDeck);
          setPlayerHand([]);
          setOpponentHand([]);
          // Host controls the flow
          setTimeout(() => {
             if (isOnline && socket && roomId) {
                 socket.emit('game_signal', { roomId, type: 'START_COIN_TOSS' });
             }
             setPhase('COIN_TOSS');
          }, 500);
      } else {
          // Guest waits for signals
          setDeck([]); 
          setPlayerHand([]); 
          setOpponentHand([]);
      }
    }
  }, [phase, isOnline, initialRole]);

  // 2. Coin Toss
  useEffect(() => {
    if (phase === 'COIN_TOSS') {
      audioController.playCoinToss();
      if (!isOnline || initialRole === 'HOST') {
          const starter: Turn = Math.random() > 0.5 ? 'PLAYER' : 'OPPONENT';
          setTimeout(() => {
            setTurn(starter);
            setPhase('DEALING');
          }, 2500);
      }
    }
  }, [phase, isOnline, initialRole]);

  // 3. Dealing (And Trump Distribution)
  useEffect(() => {
    if (phase === 'DEALING') {
      if (!isOnline || initialRole === 'HOST') {
          const dealSequence = async () => {
            // Trump Distribution Logic: Give Host a card if < 3
            setPlayerTrumps(prev => {
                if (prev.length < 3) return [...prev, TrumpCardManager.drawCard()];
                return prev;
            });

            const d = [...deck];
            const pHand: CardData[] = [];
            const oHand: CardData[] = [];

            const dealCard = (targetHand: CardData[], isFaceUp: boolean) => {
               if (d.length === 0) return;
               const c = d.pop()!;
               c.isFaceUp = isFaceUp;
               targetHand.push(c);
               audioController.playCardFlip();
            };

            await new Promise(r => setTimeout(r, 500));
            dealCard(pHand, false); dealCard(oHand, false); 
            await new Promise(r => setTimeout(r, 300));
            dealCard(pHand, true); dealCard(oHand, true);
            
            setPlayerHand([...pHand]); 
            setOpponentHand([...oHand]); 
            setDeck([...d]);
            
            await new Promise(r => setTimeout(r, 500));

            if (isOnline && socket && roomId) {
                socket.emit('game_signal', {
                    roomId,
                    type: 'INIT_ROUND_DATA',
                    deck: d, 
                    hostHand: pHand,
                    guestHand: oHand,
                    startingTurn: turn === 'PLAYER' ? 'HOST' : 'GUEST'
                });
            }

            setPhase('PLAYING');
          };
          dealSequence();
      }
    }
  }, [phase, isOnline, initialRole]);

  // AI Logic
  useEffect(() => {
    if (isOnline) return;
    if (phase === 'GAME_OVER') return;

    if (phase === 'PLAYING' && turn === 'OPPONENT') {
      const timer = setTimeout(() => {
        const myScore = calculateScore(opponentHand);
        const visiblePlayerScore = playerHand.filter(c => c.isFaceUp).reduce((s, c) => s + c.value, 0);
        let shouldHit = false;
        
        // Simple AI
        if (myScore <= 11) shouldHit = true;
        else if (myScore < 14) shouldHit = true;
        else if (myScore < 17 && visiblePlayerScore > 6) shouldHit = true;
        else shouldHit = false;
        
        // Trump usage chance for AI (Offline only)
        // ... (simplified: AI doesn't use trumps yet to keep code clean)

        if (deck.length === 0) shouldHit = false;

        if (shouldHit) {
            handleHit('OPPONENT');
        } else {
            handleStay('OPPONENT');
        }
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [phase, turn, opponentHand, playerHand, deck, isOnline]);

  // Game Over Check
  useEffect(() => {
    if (phase === 'GAME_OVER') {
        if (!rewardClaimed) {
             let coins = 0;
             if (playerLives > 0) { // Player Won
                 audioController.playWin();
                 coins = Math.floor(Math.random() * (50 - 20 + 1)) + 20;
             } else { // Player Lost
                 audioController.playLose();
                 coins = Math.floor(Math.random() * (10 - 1 + 1)) + 1;
             }
             setEarnedCoins(coins);
             setRewardClaimed(true);
             if (onMatchComplete) onMatchComplete(coins);
        }
        return;
    }
    // Prevent state updates if we are already closing
    if (playerLives <= 0 || opponentLives <= 0) {
        setPhase('GAME_OVER');
    }
  }, [playerLives, opponentLives, phase, rewardClaimed]);

  // --- Actions ---

  const handleUseTrump = (trump: TrumpCardData) => {
    if (phase !== 'PLAYING' || turn !== 'PLAYER') return;
    audioController.playClick();
    
    // Remove from hand
    setPlayerTrumps(prev => prev.filter(c => c.id !== trump.id));
    
    // Create Effect Object
    const newEffect: ActiveEffect = {
        id: trump.id, 
        sourceCardName: trump.name, 
        type: trump.effectType, 
        value: trump.value,
        target: trump.target === 'BOTH' ? 'SELF' : trump.target as 'SELF' | 'OPPONENT'
    };

    // Apply Locally
    setActiveEffects(prev => [...prev, newEffect]);

    // Send to Network
    if (isOnline && socket && roomId) {
        socket.emit('game_signal', {
            roomId,
            type: 'OPPONENT_USED_TRUMP',
            effect: {
                ...newEffect,
                // When sending to opponent, we need to flip the target perspective relative to them
                // But simpler logic: just send what *I* did, and let receiver flip it.
                // Sending exact copy of newEffect. Receiver handles flipping logic in handleGameSignal.
            }
        });
    }
  };

  const handleHit = (actor: Turn) => {
    if (deck.length === 0) return;
    audioController.playCardFlip();
    const d = [...deck];
    const card = d.pop()!;
    card.isFaceUp = true;

    if (actor === 'PLAYER') {
      setPlayerHand(prev => [...prev, card]);
      setDeck(d);
      setConsecutiveStays(0);
      setTurn('OPPONENT');
      
      if (isOnline && socket && roomId) {
          socket.emit('game_signal', { roomId, type: 'OPPONENT_HIT', card: card });
      }

    } else {
      setOpponentHand(prev => [...prev, card]);
      setDeck(d);
      setConsecutiveStays(0);
      setTurn('PLAYER');
    }
  };

  const handleStay = (actor: Turn) => {
    const newStays = consecutiveStays + 1;
    setConsecutiveStays(newStays);

    if (actor === 'PLAYER' && isOnline && socket && roomId) {
         socket.emit('game_signal', { roomId, type: 'OPPONENT_STAY' });
    }

    if (newStays >= 2) {
      setPhase('RESOLVING');
    } else {
      setTurn(actor === 'PLAYER' ? 'OPPONENT' : 'PLAYER');
    }
  };

  const handleCardClick = (card: CardData) => {
      const isPlayerCard = playerHand.some(c => c.id === card.id);
      if (isPlayerCard && !card.isFaceUp) {
          setPeekedCardId(prev => prev === card.id ? null : card.id);
      }
  };

  // Resolution
  useEffect(() => {
    if (phase === 'RESOLVING') {
       setTimeout(() => {
         // Reveal cards
         const pHand = playerHand.map(c => ({...c, isFaceUp: true}));
         const oHand = opponentHand.map(c => ({...c, isFaceUp: true}));
         setPlayerHand(pHand);
         setOpponentHand(oHand);
         setPeekedCardId(null);

         // Calculate Scores
         let pScore = calculateScore(pHand);
         let oScore = calculateScore(oHand);

         // Apply Trump Effects (Simple implementation for Attack/Defense)
         // Note: In a full game, we'd need complex ordering. Here we sum modifiers.
         let pDamageOut = 1;
         let oDamageOut = 1;
         let pDefense = 0;
         let oDefense = 0;

         // Calculate Modifiers
         activeEffects.forEach(eff => {
             if (eff.target === 'SELF') {
                 // It's a buff on the PLAYER
                 if (eff.type === 'MODIFY_ATTACK') pDamageOut += eff.value;
                 if (eff.type === 'MODIFY_DEFENSE') pDefense += eff.value;
             } else {
                 // It's a debuff/attack on OPPONENT (or Opponent's buff on themselves appearing as target=OPPONENT)
                 // Wait, activeEffects logic:
                 // If I used it on SELF -> target=SELF.
                 // If Opponent used it on THEMSELVES -> receive event -> handleGameSignal flips it to OPPONENT.
                 // So: target='SELF' means affects Me. target='OPPONENT' means affects Them.
                 
                 if (eff.type === 'MODIFY_ATTACK') oDamageOut += eff.value;
                 if (eff.type === 'MODIFY_DEFENSE') oDefense += eff.value;
             }
         });

         let winner: Winner = 'DRAW';
         let reason = '';

         // 21 Logic
         if (pScore <= 21 && oScore <= 21) {
             if (pScore > oScore) { winner = 'PLAYER'; reason = `${pScore} vs ${oScore}`; }
             else if (oScore > pScore) { winner = 'OPPONENT'; reason = `${oScore} vs ${pScore}`; }
             else { winner = 'DRAW'; reason = `平局 ${pScore}`; }
         }
         else if (pScore > 21 && oScore <= 21) { winner = 'OPPONENT'; reason = "你爆牌了"; }
         else if (oScore > 21 && pScore <= 21) { winner = 'PLAYER'; reason = "对手爆牌"; }
         else {
             if (pScore < oScore) { winner = 'PLAYER'; reason = `双爆 - ${pScore} 更接近`; }
             else if (oScore < pScore) { winner = 'OPPONENT'; reason = `双爆 - ${oScore} 更接近`; }
             else { winner = 'DRAW'; reason = "双爆平局"; }
         }

         setRoundResult({ winner, reason });

         // Apply Damage
         setTimeout(() => {
            if (winner === 'PLAYER') {
                audioController.playWin();
                const dmg = Math.max(0, pDamageOut - oDefense);
                setOpponentLives(l => Math.max(0, l - dmg));
            } else if (winner === 'OPPONENT') {
                audioController.playLose();
                const dmg = Math.max(0, oDamageOut - pDefense);
                setPlayerLives(l => Math.max(0, l - dmg));
            }

            // Next Round or End
            setTimeout(() => {
                // If anyone died, useEffect will catch it and set GAME_OVER.
                // Otherwise, restart.
                // Note: We check state inside the timeout, but closure might be stale.
                // Rely on the useEffect [playerLives, opponentLives] to trigger GAME_OVER.
                // We only force INIT if lives are likely positive.
                
                // IMPORTANT: We cannot read fresh state here easily without refs, 
                // but useEffect will handle the transition to GAME_OVER if lives changed.
                // We set a flag or just wait.
                // Let's rely on the useEffect hook listening to lives.
                // However, if lives didn't change (Draw), we need to manually restart.
                setPhase(prev => {
                    if (prev === 'GAME_OVER') return prev; // Already ended
                    return 'INIT';
                });
            }, 3000);
         }, 1500);

       }, 1000);
    }
  }, [phase]);

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 overflow-hidden select-none">
      
      {/* --- UI LAYER --- */}
      <div className="absolute top-4 right-4 z-40 pointer-events-none">
           <ConnectionStatus status="CONNECTED" showLabel={false} />
      </div>

      {/* --- OPPONENT INFO AREA --- */}
      <div className="flex justify-between items-start p-2 md:p-4 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none">
         <div className="flex items-center gap-2 md:gap-4 pointer-events-auto">
            <div className="relative w-12 h-12 md:w-16 md:h-16 bg-zinc-800 rounded-sm border-2 border-zinc-700 overflow-hidden shadow-lg">
                <img src="https://picsum.photos/seed/opponent_lucas/100" className="w-full h-full object-cover grayscale brightness-75" />
                <div className="absolute inset-0 bg-red-900/10"></div>
            </div>
            <div>
                <div className="text-sm md:text-xl font-bold text-red-600 font-mono tracking-widest uppercase text-shadow-glow">
                    {isOnline ? 'SUBJECT 002' : 'UNKNOWN'}
                </div>
                <div className="flex gap-1 mt-1 md:mt-2">
                    {Array.from({length: 5}).map((_, i) => (
                        <div key={i} className={`h-1.5 md:h-2 w-6 md:w-8 rounded-sm skew-x-[-10deg] transition-all duration-500 ${i < opponentLives ? 'bg-red-600 shadow-[0_0_8px_red]' : 'bg-zinc-800 border border-zinc-700'}`}></div>
                    ))}
                </div>
                {/* Active Effects Display for Opponent */}
                <div className="flex gap-1 mt-1">
                    {activeEffects.filter(e => e.target === 'OPPONENT').map((eff, i) => (
                         <div key={i} className="text-[10px] bg-red-900/50 text-red-200 border border-red-500 px-1 rounded animate-pulse" title={eff.sourceCardName}>
                             {eff.type === 'MODIFY_ATTACK' ? `⚔️+${eff.value}` : `🛡️+${eff.value}`}
                         </div>
                    ))}
                </div>
            </div>
         </div>
      </div>

      {/* --- MAIN TABLE AREA --- */}
      <div className="flex-1 relative flex flex-col items-center justify-center perspective-1000">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#27272a_0%,_#09090b_80%)] z-0 opacity-50"></div>
         
         {/* SYNCING / WAITING OVERLAY */}
         {phase === 'SYNCING' && (
             <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
                 <div className="text-red-500 font-bold tracking-widest animate-pulse text-2xl mb-4">
                     正在建立神经连接...
                 </div>
             </div>
         )}

         {/* COIN TOSS ANIMATION */}
         {phase === 'COIN_TOSS' && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                 <div className="animate-spin-y-slow w-32 h-32 relative preserve-3d">
                     <div className="absolute inset-0 rounded-full bg-zinc-200 border-4 border-zinc-400 flex items-center justify-center backface-hidden shadow-xl"><span className="text-blue-900 font-bold text-xl">你</span></div>
                     <div className="absolute inset-0 rounded-full bg-red-900 border-4 border-red-950 flex items-center justify-center rotate-y-180 backface-hidden shadow-xl"><span className="text-white font-bold text-xl">对手</span></div>
                 </div>
             </div>
         )}
         
         {/* Opponent Cards */}
         <div className="w-full overflow-x-auto flex justify-center no-scrollbar mb-auto pt-4 z-10 min-h-[140px]">
             <div className="flex gap-2 md:gap-4 px-4 min-w-min">
                {opponentHand.map((card, idx) => (
                    <Card key={card.id} card={card} className="scale-75 md:scale-90 flex-shrink-0" canInteract={false} />
                ))}
             </div>
         </div>

         {/* CENTER STATUS TEXT */}
         <div className="my-2 h-16 flex items-center justify-center z-20 pointer-events-none min-h-[64px]">
             {phase === 'PLAYING' && (
                 <div className={`text-xl font-bold tracking-widest px-8 py-1 border-y-2 backdrop-blur-sm ${turn === 'PLAYER' ? 'text-blue-400 border-blue-900 bg-blue-950/20' : 'text-red-500 border-red-900 bg-red-950/20'}`}>
                     {turn === 'PLAYER' ? '你的回合' : '对手回合'}
                 </div>
             )}
             {phase === 'RESOLVING' && roundResult && (
                 <div className="flex flex-col items-center animate-bounce-in">
                     <div className={`text-5xl font-bold ${roundResult.winner === 'PLAYER' ? 'text-green-500 drop-shadow-[0_0_10px_green]' : roundResult.winner === 'OPPONENT' ? 'text-red-600 drop-shadow-[0_0_10px_red]' : 'text-yellow-500'}`}>
                         {roundResult.winner === 'PLAYER' ? '胜利' : roundResult.winner === 'OPPONENT' ? '失败' : '平局'}
                     </div>
                     <div className="text-sm font-mono text-zinc-400 mt-1 uppercase tracking-widest">{roundResult.reason}</div>
                 </div>
             )}
         </div>

         {/* Active Effects Center Display (Buffs applied this round) */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none flex flex-col gap-2 opacity-30">
             {activeEffects.map(e => (
                 <div key={e.id} className="text-4xl font-bold text-zinc-500 text-center uppercase">{e.sourceCardName} ACTIVED</div>
             ))}
         </div>

         {/* Player Cards */}
         <div className="w-full overflow-x-auto flex justify-center no-scrollbar mt-auto mb-4 z-10 min-h-[160px]">
             <div className="flex gap-2 md:gap-4 px-4 min-w-min">
                {playerHand.map((card, idx) => (
                    <Card key={card.id} card={card} className="flex-shrink-0" isPeeked={peekedCardId === card.id} onClick={() => handleCardClick(card)} canInteract={!card.isFaceUp} />
                ))}
             </div>
         </div>
      </div>

      {/* --- PLAYER CONTROL AREA --- */}
      <div className="relative w-full bg-black/80 border-t border-zinc-800 flex flex-col z-30">
          <div className="flex justify-between items-center px-4 py-2 bg-zinc-900/50">
               <div className="flex items-center gap-3">
                   <div className="w-8 h-8 md:w-10 md:h-10 border border-zinc-500 overflow-hidden"><img src={getAvatarUrl(user.avatarId)} className="w-full h-full object-cover" /></div>
                   <div className="flex flex-col">
                       <span className="text-zinc-300 font-bold text-xs md:text-sm tracking-wider">{user.username}</span>
                       <div className="flex gap-0.5">
                            {Array.from({length: 5}).map((_, i) => (
                                <div key={i} className={`h-1 md:h-1.5 w-4 md:w-6 skew-x-[-10deg] ${i < playerLives ? 'bg-green-600 shadow-[0_0_5px_lime]' : 'bg-zinc-800'}`}></div>
                            ))}
                       </div>
                       {/* Active Effects Display for Player */}
                       <div className="flex gap-1 mt-1">
                            {activeEffects.filter(e => e.target === 'SELF').map((eff, i) => (
                                <div key={i} className="text-[10px] bg-blue-900/50 text-blue-200 border border-blue-500 px-1 rounded animate-pulse" title={eff.sourceCardName}>
                                    {eff.type === 'MODIFY_ATTACK' ? `⚔️+${eff.value}` : `🛡️+${eff.value}`}
                                </div>
                            ))}
                        </div>
                   </div>
               </div>
          </div>

          <div className="flex flex-col md:flex-row p-2 md:p-4 gap-4 items-center justify-between">
               {/* Trump Cards */}
               <div className="flex-1 w-full md:w-auto overflow-x-auto custom-scrollbar pb-2">
                    <div className="flex gap-2 px-2 min-w-max">
                        {playerTrumps.length === 0 && <div className="text-zinc-600 text-[10px] w-20 flex items-center justify-center border border-zinc-800 border-dashed h-28">空槽位</div>}
                        {playerTrumps.map((trump) => (
                            <TrumpCard key={trump.id} card={trump} onClick={() => handleUseTrump(trump)} disabled={phase !== 'PLAYING' || turn !== 'PLAYER'} />
                        ))}
                    </div>
               </div>

               {/* Action Buttons */}
               <div className="flex gap-4 w-full md:w-auto shrink-0 justify-center pb-2 md:pb-0 min-w-[200px]">
                    {phase === 'PLAYING' && turn === 'PLAYER' ? (
                        <>
                           <Button onClick={() => handleHit('PLAYER')} className="flex-1 md:w-32 bg-green-900/20 hover:bg-green-800 hover:border-green-400 py-3 md:py-3 text-sm">摸牌 (HIT)</Button>
                           <Button onClick={() => handleStay('PLAYER')} className="flex-1 md:w-32 bg-yellow-900/20 hover:bg-yellow-800 hover:border-yellow-400 py-3 md:py-3 text-sm">停牌 (STAY)</Button>
                        </>
                    ) : (
                        <div className="w-full md:w-64 h-12 flex items-center justify-center border border-zinc-800 text-zinc-600 tracking-widest text-xs bg-zinc-950 animate-pulse">
                            {phase === 'GAME_OVER' ? 'GAME OVER' : '等待对手...'}
                        </div>
                    )}
               </div>
          </div>
      </div>

      {/* --- GAME OVER MODAL (Fix for loop continuing) --- */}
      {phase === 'GAME_OVER' && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-1000">
               <div className="text-center space-y-4 max-w-md p-8 border border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
                   <GlitchText 
                        text={playerLives > 0 ? "SURVIVED" : "DEAD"} 
                        as="h1" 
                        className={`text-6xl font-bold tracking-widest ${playerLives > 0 ? 'text-green-500' : 'text-red-600'}`}
                        intensity="high" 
                   />
                   <div className="text-zinc-400 font-mono text-sm uppercase tracking-wider">{winReason || (playerLives > 0 ? "目标达成" : "任务失败")}</div>
                   
                   <div className="py-4">
                       <div className="text-xs text-zinc-500 uppercase">REWARD</div>
                       <div className="text-3xl text-yellow-500 font-bold font-mono">+ {earnedCoins} CREDITS</div>
                   </div>

                   <Button onClick={onExit} variant="primary" className="w-full">
                       返回主菜单
                   </Button>
               </div>
          </div>
      )}

    </div>
  );
};
