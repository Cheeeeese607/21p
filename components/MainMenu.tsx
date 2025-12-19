
import React, { useState, useEffect } from 'react';
import { User, Friend, FriendStatus, LeaderboardEntry } from '../types';
import { GlitchText } from './GlitchText';
import { audioController } from '../utils/AudioController';
import { SettingsModal } from './SettingsModal';
import { AnnouncementModal } from './AnnouncementModal';
import { Button } from './Button';
import { ConnectionStatus } from './ConnectionStatus';
import { Socket } from 'socket.io-client';

interface MainMenuProps {
  user: User;
  socket: Socket | null;
  onVersusClick: () => void;
  onTestMatchClick: () => void;
  onSettingsClick: () => void;
  onLogout: () => void;
  isAudioOn: boolean;
  onToggleAudio: () => void;
  onUpdateUser: (updatedUser: User) => void;
  onSetBackground: (url: string) => void;
}

type Tab = 'GAME' | 'FRIENDS' | 'RANKING' | 'STORE' | 'PROFILE';

const AVATAR_PRESETS = [
    'avatar_1', 'avatar_2', 'avatar_3', 'avatar_4'
];

export const MainMenu: React.FC<MainMenuProps> = ({ 
    user, 
    socket,
    onVersusClick, 
    onTestMatchClick, 
    onLogout, 
    isAudioOn, 
    onToggleAudio,
    onUpdateUser,
    onSetBackground
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('GAME');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  const [addFriendName, setAddFriendName] = useState('');
  const [friendError, setFriendError] = useState<string | null>(null);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.username);
  const [editAvatar, setEditAvatar] = useState(user.avatarId);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Announcement Logic
  useEffect(() => {
      const today = new Date().toDateString();
      const lastShown = localStorage.getItem('last_announcement_date');
      if (lastShown !== today) {
          setIsAnnouncementOpen(true);
      }
  }, []);

  const handleAnnouncementClose = () => {
      setIsAnnouncementOpen(false);
      localStorage.setItem('last_announcement_date', new Date().toDateString());
  };

  useEffect(() => {
    if (activeTab === 'FRIENDS') {
      fetchFriends();
      const interval = setInterval(fetchFriends, 5000);
      return () => clearInterval(interval);
    }
    if (activeTab === 'RANKING') {
        fetchLeaderboard();
    }
  }, [activeTab, user.id]);

  useEffect(() => {
      if (!socket) return;
      const handleInviteDeclined = ({ userId }: { userId: string }) => {
          setInvitedFriends(prev => {
              const newSet = new Set(prev);
              if (newSet.has(userId)) {
                  newSet.delete(userId);
                  const friendName = friends.find(f => f.id === userId)?.username || 'User';
                  setFriendError(`${friendName} declined.`);
                  audioController.playLose();
                  setTimeout(() => setFriendError(null), 3000);
              }
              return newSet;
          });
      };
      socket.on('invite_declined', handleInviteDeclined);
      return () => { socket.off('invite_declined', handleInviteDeclined); };
  }, [friends, socket]);

  const fetchFriends = async () => {
    try {
      const res = await fetch(`/api/friends/${user.id}`);
      if (res.ok) {
        setFriends(await res.json());
      }
    } catch (err) { console.error(err); }
  };

  const fetchLeaderboard = async () => {
      try {
          const res = await fetch('/api/leaderboard');
          if (res.ok) {
              setLeaderboard(await res.json());
          }
      } catch (err) { console.error(err); }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendName.trim()) return;
    setIsAddingFriend(true);
    setFriendError(null);
    try {
      const res = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendUsername: addFriendName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setAddFriendName('');
        fetchFriends();
        audioController.playClick();
      } else {
        setFriendError(data.error);
        audioController.playLose();
      }
    } catch (err) {
      setFriendError("Server Error");
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleDeleteFriend = async (friendId: string) => {
    if (!confirm("Confirm termination?")) return;
    try {
      await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId })
      });
      fetchFriends();
    } catch (err) { console.error(err); }
  };

  const handleOpenSettings = () => { setIsSettingsOpen(true); };

  const handleSaveProfile = () => {
      if (editName.trim().length === 0) return;
      let finalAvatar = editAvatar;
      if (customAvatarUrl.trim().length > 5) { finalAvatar = customAvatarUrl.trim(); }
      onUpdateUser({ ...user, username: editName.trim().substring(0, 12), avatarId: finalAvatar });
      setIsEditingProfile(false);
      audioController.playClick();
  };

  const handleCancelProfile = () => {
      setEditName(user.username);
      setEditAvatar(user.avatarId);
      setCustomAvatarUrl('');
      setIsEditingProfile(false);
  };

  const handleInvite = (friend: Friend) => {
      audioController.playClick();
      if (socket) {
          socket.emit('send_invite', {
              targetUserId: friend.id,
              senderName: user.username,
              senderAvatar: user.avatarId
          });
      }
      setInvitedFriends(prev => { const newSet = new Set(prev); newSet.add(friend.id); return newSet; });
      setTimeout(() => {
          setInvitedFriends(prev => {
              if (prev.has(friend.id)) { const newSet = new Set(prev); newSet.delete(friend.id); return newSet; }
              return prev;
          });
      }, 30000);
  };

  const getAvatarUrl = (id: string | null | undefined) => {
      if (!id) return `https://picsum.photos/seed/bio1/200`;
      if (id.startsWith('http')) return id;
      const seed = id === 'avatar_1' ? 'bio1' : id === 'avatar_2' ? 'bio2' : id === 'avatar_3' ? 'bio3' : 'bio4';
      return `https://picsum.photos/seed/${seed}/200`;
  };

  return (
    <div className="flex flex-col h-screen w-full relative z-10 overflow-hidden bg-transparent">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        isAudioOn={isAudioOn}
        onToggleAudio={onToggleAudio}
        onSetBackground={onSetBackground}
      />

      <AnnouncementModal
        isOpen={isAnnouncementOpen}
        onClose={handleAnnouncementClose}
      />

      {/* Navbar - Optimized for Mobile */}
      <nav className="flex-none h-16 md:h-20 bg-black/90 border-b border-zinc-800 backdrop-blur-md flex items-center justify-between px-2 md:px-8 z-30 shrink-0 relative">
         <div className="scanline-panel absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-r from-black/50 via-transparent to-black/50"></div>
         
         {/* Left: Status */}
         <div className="flex items-center gap-2 md:gap-4 shrink-0">
             <ConnectionStatus status={socket ? "CONNECTED" : "CONNECTING"} showLabel={false} />
             <div className="h-6 w-px bg-zinc-800 hidden md:block"></div>
             <span className="text-zinc-600 text-[8px] md:text-[10px] tracking-widest hidden md:block">BAKER_SERVER_NODE_07</span>
             <span className="text-red-600 font-bold tracking-tighter md:hidden text-lg">21</span>
         </div>
         
         {/* Center: Navigation (Condensed on Mobile) */}
         <div className="flex gap-0 md:gap-4 absolute left-1/2 -translate-x-1/2 justify-center">
            <NavButton label="游戏" subLabel="GAME" active={activeTab === 'GAME'} onClick={() => setActiveTab('GAME')} />
            <NavButton label="好友" subLabel="ALLIES" active={activeTab === 'FRIENDS'} onClick={() => setActiveTab('FRIENDS')} />
            <NavButton label="榜单" subLabel="RANK" active={activeTab === 'RANKING'} onClick={() => setActiveTab('RANKING')} />
            <NavButton label="商店" subLabel="SHOP" active={activeTab === 'STORE'} onClick={() => setActiveTab('STORE')} />
            <NavButton label="个人" subLabel="ME" active={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} />
         </div>

         {/* Right: Credits */}
         <div className="w-auto flex justify-end items-center gap-2 md:gap-4 shrink-0">
             <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-900/50 px-2 py-1 rounded">
                <span className="text-[8px] md:text-[10px] text-zinc-500 uppercase hidden md:inline">CREDITS</span>
                <span className="text-red-500 font-mono font-bold text-xs md:text-sm">{user.credits}</span>
             </div>
         </div>
      </nav>

      <div className="flex-1 relative overflow-hidden flex flex-col w-full max-w-7xl mx-auto">
         <div className="flex-1 relative p-4 md:p-12 w-full h-full overflow-y-auto custom-scrollbar">
            
            <TabPanel active={activeTab === 'GAME'}>
                <div className="h-full flex flex-col justify-center max-w-2xl">
                    <div className="mb-8 md:mb-12 space-y-2 animate-slide-in">
                        <div className="inline-block border border-red-900/50 bg-red-950/20 px-2 py-1 text-[10px] md:text-xs text-red-500 mb-2">SYSTEM // ONLINE</div>
                        <GlitchText text="PROJECT: 21" as="h1" className="text-5xl md:text-8xl font-bold text-white tracking-tighter" intensity="high" />
                        <p className="text-zinc-500 tracking-widest text-xs md:text-sm pl-1">BIOHAZARD CONTAINMENT PROTOCOL</p>
                    </div>

                    <div className="space-y-4 md:space-y-6 w-full md:w-4/5 animate-slide-in" style={{ animationDelay: '0.1s' }}>
                        <MenuOption title="VERSUS [1v1]" desc="Online Multiplayer." onClick={onVersusClick} isOnline />
                        <MenuOption title="TEST MATCH" desc="Practice Simulation." onClick={onTestMatchClick} variant="secondary" />
                        <MenuOption title="SETTINGS" desc="System Config." onClick={() => { audioController.playClick(); handleOpenSettings(); }} variant="secondary" />
                    </div>
                </div>
            </TabPanel>

            <TabPanel active={activeTab === 'FRIENDS'}>
                <div className="h-full flex flex-col w-full animate-fade-in max-w-4xl mx-auto">
                    <div className="flex items-end justify-between border-b border-zinc-800 pb-4 mb-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-zinc-300 tracking-wider">ALLIES</h2>
                        <span className="text-zinc-500 font-mono text-xs">ONLINE: {friends.filter(f => f.status === 'ONLINE').length} / {friends.length}</span>
                    </div>

                    <form onSubmit={handleAddFriend} className="mb-6 flex gap-2 items-end">
                       <div className="flex-1">
                          <input type="text" value={addFriendName} onChange={(e) => setAddFriendName(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-700 p-2 text-white text-sm focus:border-red-500 outline-none font-mono uppercase" placeholder="ADD USERNAME..." />
                       </div>
                       <Button type="submit" className="py-2 text-xs px-4" disabled={isAddingFriend}>{isAddingFriend ? '...' : '+'}</Button>
                    </form>
                    {friendError && <div className="text-red-500 text-xs mb-4 animate-pulse">ERROR: {friendError}</div>}

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {friends.length === 0 && <div className="text-zinc-600 text-center py-8 border border-dashed border-zinc-800 text-xs">NO CONTACTS FOUND</div>}
                        {friends.map((friend) => (
                            <div key={friend.id} className="bg-zinc-900/40 border border-zinc-800 p-3 flex items-center gap-4">
                                <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 relative overflow-hidden shrink-0">
                                    <img src={getAvatarUrl(friend.avatarId)} className={`w-full h-full object-cover ${friend.status === 'OFFLINE' ? 'grayscale opacity-50' : ''}`} />
                                    <div className={`absolute bottom-0 right-0 w-2 h-2 border border-black ${friend.status === 'ONLINE' ? 'bg-green-500' : friend.status === 'IN_GAME' ? 'bg-orange-500' : 'bg-zinc-600'}`}></div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-sm md:text-base font-bold truncate text-zinc-300">{friend.username}</div>
                                    <div className="text-[8px] md:text-[10px] uppercase text-zinc-500">{friend.status}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {friend.status === 'ONLINE' && (
                                        <button 
                                            onClick={() => handleInvite(friend)}
                                            disabled={invitedFriends.has(friend.id)}
                                            className="px-2 py-1 border border-zinc-600 text-[10px] text-zinc-400 hover:text-white hover:border-green-500"
                                        >
                                            {invitedFriends.has(friend.id) ? 'SENT' : 'INVITE'}
                                        </button>
                                    )}
                                    <button onClick={() => handleDeleteFriend(friend.id)} className="w-6 h-6 flex items-center justify-center border border-zinc-800 text-zinc-600 hover:text-red-500" title="Delete">×</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </TabPanel>

            <TabPanel active={activeTab === 'RANKING'}>
                 <div className="h-full flex flex-col w-full animate-fade-in max-w-4xl mx-auto">
                    <div className="border-b border-zinc-800 pb-4 mb-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-zinc-300 tracking-wider">GLOBAL RANKING</h2>
                        <p className="text-xs text-zinc-500">TOP SURVIVORS BY CREDITS</p>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] text-zinc-500 uppercase border-b border-zinc-800">
                                    <th className="py-2 pl-2">#</th>
                                    <th className="py-2">Subject</th>
                                    <th className="py-2 text-right">Wins</th>
                                    <th className="py-2 pr-2 text-right">Credits</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((entry, idx) => (
                                    <tr key={idx} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                                        <td className="py-3 pl-2 text-zinc-600 font-mono text-xs">{idx + 1}</td>
                                        <td className="py-3 flex items-center gap-3">
                                            <img src={getAvatarUrl(entry.avatarId)} className="w-6 h-6 object-cover border border-zinc-700 hidden md:block" />
                                            <span className={`font-bold text-sm ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-700' : 'text-zinc-400'}`}>{entry.username}</span>
                                        </td>
                                        <td className="py-3 text-right text-zinc-500 text-xs font-mono">{entry.wins}</td>
                                        <td className="py-3 pr-2 text-right text-red-500 font-mono font-bold text-sm">{entry.credits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
            </TabPanel>

            <TabPanel active={activeTab === 'STORE'}>
                <div className="h-full flex flex-col w-full animate-fade-in">
                    <div className="flex items-end justify-between border-b border-zinc-800 pb-4 mb-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-zinc-300 tracking-wider">DEPOT</h2>
                        <span className="text-red-500 font-mono text-sm">CR: {user.credits}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-20">
                        {[1,2,3,4,5,6,7,8].map(i => (
                            <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-3 flex flex-col justify-between group hover:border-red-900/50 relative">
                                <div className="w-full aspect-square bg-black/50 border border-zinc-800/50 flex items-center justify-center mb-2"><span className="text-zinc-700 text-4xl">?</span></div>
                                <div className="text-xs text-zinc-300 font-bold mb-1">LOOT BOX 0{i}</div>
                                <button className="w-full py-1 bg-zinc-800 text-[10px] text-zinc-400 font-bold hover:bg-red-900 hover:text-white transition-colors">BUY</button>
                            </div>
                        ))}
                    </div>
                </div>
            </TabPanel>

            <TabPanel active={activeTab === 'PROFILE'}>
                 <div className="h-full flex items-center justify-center animate-fade-in w-full">
                   <div className="w-full max-w-3xl bg-zinc-900/80 border border-zinc-700 p-6 backdrop-blur-md relative shadow-2xl flex flex-col md:flex-row gap-6">
                       
                       <div className="flex flex-col gap-4 items-center shrink-0">
                           <div className="w-24 h-24 md:w-32 md:h-32 bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center shrink-0 overflow-hidden relative">
                                <img src={getAvatarUrl(isEditingProfile ? (customAvatarUrl || editAvatar) : user.avatarId)} className="w-full h-full object-cover grayscale contrast-125" />
                           </div>
                           {isEditingProfile && (
                               <div className="w-full max-w-[200px]">
                                   <div className="grid grid-cols-4 gap-2 mb-2">
                                       {AVATAR_PRESETS.map((id) => (
                                           <button key={id} onClick={() => { setEditAvatar(id); setCustomAvatarUrl(''); }} className={`w-8 h-8 border ${editAvatar === id && !customAvatarUrl ? 'border-red-500' : 'border-zinc-700'}`}><img src={getAvatarUrl(id)} className="w-full h-full object-cover" /></button>
                                       ))}
                                   </div>
                                   <input type="text" placeholder="URL..." value={customAvatarUrl} onChange={(e) => setCustomAvatarUrl(e.target.value)} className="w-full bg-black border border-zinc-700 p-1 text-[10px] text-zinc-300" />
                               </div>
                           )}
                       </div>

                       <div className="flex-1 w-full min-w-0"> 
                            <div className="flex justify-between items-start mb-6 w-full">
                                <div className="flex-1 mr-4 min-w-0">
                                    {isEditingProfile ? (
                                        <div className="w-full">
                                            <label className="text-[10px] text-zinc-500 block">NAME</label>
                                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={12} className="w-full bg-zinc-950/50 border-b border-zinc-500 text-xl md:text-2xl font-bold text-white py-1 focus:border-red-500 font-mono" />
                                        </div>
                                    ) : (
                                        <h3 className="text-2xl md:text-3xl text-white font-bold tracking-wide truncate">{user.username}</h3>
                                    )}
                                </div>
                                <div className="shrink-0">
                                    {isEditingProfile ? (
                                        <div className="flex gap-2"><Button onClick={handleCancelProfile} variant="secondary" className="px-2 py-1 text-[10px]">X</Button><Button onClick={handleSaveProfile} variant="primary" className="px-2 py-1 text-[10px]">OK</Button></div>
                                    ) : (
                                        <button onClick={() => { setIsEditingProfile(true); setEditName(user.username); setEditAvatar(user.avatarId); setCustomAvatarUrl(user.avatarId.startsWith('http') ? user.avatarId : ''); }} className="text-[10px] text-zinc-500 border-b border-zinc-700 hover:text-white uppercase">Edit</button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="space-y-2 font-mono text-xs md:text-sm w-full bg-black/20 p-4 border border-zinc-800/50">
                                <StatRow label="Credits" value={user.credits} />
                                <StatRow label="Matches" value={user.stats.gamesPlayed} />
                                <StatRow label="Wins" value={user.stats.wins} />
                                <StatRow label="Lost Fingers" value={user.stats.fingersLost} isWarning />
                            </div>
                       </div>

                       <div className="md:absolute md:bottom-6 md:right-6 flex justify-center w-full md:w-auto mt-4 md:mt-0">
                           <button onClick={onLogout} className="px-4 py-2 border border-red-900/30 text-red-500 text-[10px] hover:bg-red-950/50 transition-all uppercase">LOGOUT</button>
                       </div>
                   </div>
                </div>
            </TabPanel>
         </div>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ label: string; subLabel: string; active: boolean; onClick: () => void }> = ({ label, subLabel, active, onClick }) => (
    <button onClick={() => { audioController.playClick(); onClick(); }} className={`relative px-2 md:px-6 py-3 flex flex-col items-center justify-center transition-all duration-300 group ${active ? 'text-red-500' : 'text-zinc-500'}`}>
        <span className={`text-xs md:text-lg font-bold ${active ? 'scale-110' : 'scale-100'} transition-transform`}>{label}</span>
        <span className="text-[8px] tracking-widest uppercase opacity-70 font-mono hidden md:block">{subLabel}</span>
        <div className={`absolute bottom-0 left-0 w-full h-[2px] bg-red-600 transition-all duration-300 ${active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}></div>
    </button>
);
const TabPanel: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => {
    if (!active) return null;
    return <div className="w-full h-full animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-forwards">{children}</div>;
};
const MenuOption: React.FC<{ title: string; desc: string; onClick: () => void; variant?: 'primary' | 'secondary'; isOnline?: boolean; active?: boolean; }> = ({ title, desc, onClick, variant = 'primary', isOnline, active }) => (
  <button onClick={onClick} className="group text-left relative pl-4 md:pl-6 py-3 md:py-4 transition-all duration-300 hover:pl-8 md:hover:pl-10 w-full border-l-2 border-transparent hover:border-red-600 bg-gradient-to-r from-transparent hover:from-red-950/10 to-transparent">
    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-600 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
    <div className="flex items-baseline gap-2 md:gap-3"><h2 className={`text-xl md:text-3xl font-bold uppercase tracking-wider transition-colors ${variant === 'primary' ? 'text-zinc-300 group-hover:text-red-500' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{title}</h2>{isOnline && (<span className="text-[8px] md:text-[10px] bg-green-900/30 text-green-500 px-1 border border-green-800 animate-pulse">NET</span>)}</div>
    <p className="text-zinc-600 text-[8px] md:text-xs uppercase tracking-widest mt-1 truncate">{desc}</p>
  </button>
);
const StatRow: React.FC<{ label: string; value: string | number; isWarning?: boolean }> = ({ label, value, isWarning }) => (
  <div className="flex justify-between items-end border-b border-zinc-700/50 border-dashed pb-2">
    <span className="text-zinc-500 uppercase tracking-wider text-[10px] md:text-xs">{label}</span>
    <span className={`font-bold font-mono ${isWarning ? 'text-red-600' : 'text-zinc-300'}`}>{value}</span>
  </div>
);
