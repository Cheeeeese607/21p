
import React, { useState, useEffect } from 'react';
import { AppStage, User, IncomingInvite } from './types';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginScreen } from './components/LoginScreen';
import { MainMenu } from './components/MainMenu';
import { MatchmakingScreen } from './components/MatchmakingScreen';
import { GameScreen } from './components/Game/GameScreen';
import { InviteModal } from './components/InviteModal';
import { audioController } from './utils/AudioController';
import { io, Socket } from 'socket.io-client';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.LOADING);
  const [user, setUser] = useState<User | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  
  // Socket State
  const [socket, setSocket] = useState<Socket | null>(null);

  // Online Match State
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'HOST' | 'GUEST' | null>(null);
  
  // Invite State
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null);

  useEffect(() => {
      const savedBg = localStorage.getItem('custom_bg');
      if (savedBg) setBackgroundUrl(savedBg);
  }, []);

  // Socket Connection Management
  useEffect(() => {
      if (user) {
          // Initialize socket connection
          const newSocket = io({
              query: { userId: user.id }
          });

          setSocket(newSocket);

          const interval = setInterval(() => {
              newSocket.emit('heartbeat');
          }, 10000);

          newSocket.on('receive_invite', (invite: IncomingInvite) => {
              console.log('Invite Received:', invite);
              audioController.playCoinToss(); // Sound alert
              setIncomingInvite(invite);
          });

          newSocket.on('match_found', (data) => {
             console.log("Match Found via Socket:", data);
             setActiveRoomId(data.roomId);
             setPlayerRole(data.role);
             setIncomingInvite(null); 
             setStage(AppStage.ONLINE_MATCH);
          });

          return () => {
              clearInterval(interval);
              newSocket.off('receive_invite');
              newSocket.off('match_found');
              newSocket.disconnect();
              setSocket(null);
          };
      }
  }, [user]);

  const handleAcceptInvite = () => {
      if (socket && incomingInvite) {
          socket.emit('respond_invite', { senderId: incomingInvite.senderId, accepted: true });
          setIncomingInvite(null);
      }
  };

  const handleDeclineInvite = () => {
      if (socket && incomingInvite) {
          socket.emit('respond_invite', { senderId: incomingInvite.senderId, accepted: false });
          setIncomingInvite(null);
      }
  };

  const handleLoadingComplete = () => {
    setStage(AppStage.LOGIN);
  };

  const handleLogin = (user: User) => {
    setUser(user);
    setStage(AppStage.MAIN_MENU);
  };

  const handleUpdateUser = (updatedUser: User) => {
      setUser(updatedUser);
      // Relative API path
      fetch('/api/user/update', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
              id: updatedUser.id,
              username: updatedUser.username,
              avatarId: updatedUser.avatarId
          })
      });
  };

  const handleMatchComplete = (coinsEarned: number) => {
      if (user) {
          fetch('/api/user/credits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, amount: coinsEarned })
          }).catch(console.error);

          setUser({
              ...user,
              credits: user.credits + coinsEarned,
              stats: {
                  ...user.stats,
                  gamesPlayed: user.stats.gamesPlayed + 1,
              }
          });
      }
  };

  const handleLogout = () => {
    // Setting user to null triggers the cleanup effect which disconnects socket
    setUser(null);
    setStage(AppStage.LOGIN);
  };

  const handleGoToMatchmaking = () => {
    setStage(AppStage.MATCHMAKING);
  };

  const handleGoToTestMatch = () => {
      setStage(AppStage.TEST_MATCH);
  };

  const handleBackToMenu = () => {
    setActiveRoomId(null);
    setPlayerRole(null);
    setStage(AppStage.MAIN_MENU);
  };

  const handleToggleAudio = () => {
    const newState = !isAudioOn;
    setIsAudioOn(newState);
    audioController.setMuted(!newState);
  };

  const handleSetBackground = (url: string) => {
      setBackgroundUrl(url);
      localStorage.setItem('custom_bg', url);
  };

  const handleRandomMatch = () => {
      setStage(AppStage.GAME_LOBBY);
  };

  const handleJoinRoom = (code: string) => {
    setStage(AppStage.GAME_LOBBY);
  };

  const renderStage = () => {
    switch (stage) {
      case AppStage.LOADING:
        return <LoadingScreen onComplete={handleLoadingComplete} />;
      
      case AppStage.LOGIN:
        return <LoginScreen onLogin={handleLogin} />;
      
      case AppStage.MAIN_MENU:
        if (!user) return null;
        return (
          <MainMenu 
            user={user} 
            socket={socket}
            onVersusClick={handleGoToMatchmaking}
            onTestMatchClick={handleGoToTestMatch}
            onSettingsClick={() => {}} 
            onLogout={handleLogout} 
            isAudioOn={isAudioOn}
            onToggleAudio={handleToggleAudio}
            onUpdateUser={handleUpdateUser}
            onSetBackground={handleSetBackground}
          />
        );
      
      case AppStage.MATCHMAKING:
        return (
          <MatchmakingScreen 
            onBack={handleBackToMenu}
            onJoinRoom={handleJoinRoom}
            onRandomMatch={handleRandomMatch}
            socket={socket}
          />
        );

      case AppStage.TEST_MATCH:
          if (!user) return null;
          return (
            <GameScreen 
                user={user} 
                onExit={handleBackToMenu} 
                onMatchComplete={handleMatchComplete}
            />
          );
      
      case AppStage.ONLINE_MATCH:
          if (!user || !activeRoomId || !playerRole) return null;
          return (
            <GameScreen
                user={user}
                onExit={handleBackToMenu}
                onMatchComplete={handleMatchComplete}
                isOnline={true}
                socket={socket}
                roomId={activeRoomId}
                initialRole={playerRole}
            />
          );

      case AppStage.GAME_LOBBY:
        return (
          <div className="flex flex-col items-center justify-center h-screen w-full bg-black text-red-600 font-mono p-4 text-center z-20 relative">
             <div className="text-4xl mb-4 animate-pulse">CONNECTION ESTABLISHED</div>
             <p className="text-zinc-500 mb-8">WAITING FOR OPPONENT...</p>
             <button onClick={handleBackToMenu} className="border border-zinc-700 px-6 py-2 text-zinc-400 hover:text-white hover:border-white transition-colors">ABORT MISSION</button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen w-full bg-black text-white selection:bg-red-900 selection:text-white relative">
       {backgroundUrl && (
           <div 
             className="fixed inset-0 bg-cover bg-center z-0 transition-all duration-1000"
             style={{ backgroundImage: `url(${backgroundUrl})`, opacity: 0.3, filter: 'grayscale(100%) blur(2px)' }}
           ></div>
       )}
      {renderStage()}
      <InviteModal 
          invite={incomingInvite}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
      />
    </main>
  );
};

export default App;
