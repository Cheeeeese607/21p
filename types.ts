
export enum AppStage {
  LOADING = 'LOADING',
  LOGIN = 'LOGIN',
  MAIN_MENU = 'MAIN_MENU',
  MATCHMAKING = 'MATCHMAKING',
  GAME_LOBBY = 'GAME_LOBBY',
  TEST_MATCH = 'TEST_MATCH',
  PLAYING = 'PLAYING',
  ONLINE_MATCH = 'ONLINE_MATCH' // New stage for online play
}

export enum GameMode {
  SURVIVAL = 'SURVIVAL',
  VERSUS_LOCAL = 'VERSUS_LOCAL',
  VERSUS_ONLINE = 'VERSUS_ONLINE',
  TUTORIAL = 'TUTORIAL'
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  fingersLost: number; // RE7 Lore flavor
  rank: string;
}

export interface User {
  id: string;
  username: string;
  avatarId: string; // New field for selected avatar
  credits: number; // New field for currency
  stats: PlayerStats;
}

export interface CardData {
  value: number;
  isFaceUp: boolean;
  id: string; // Unique ID for animation keys
}

export type FriendStatus = 'ONLINE' | 'OFFLINE' | 'IN_GAME';

export interface Friend {
  id: string;
  username: string;
  avatarId: string;
  status: FriendStatus;
}

export interface IncomingInvite {
  senderId: string;
  senderName: string;
  senderAvatar: string;
}

export interface LeaderboardEntry {
    username: string;
    avatarId: string;
    credits: number;
    wins: number;
}

// --- Trump Card System ---

export enum TrumpRarity {
  COMMON = 1,   // 1 Star
  UNCOMMON = 2, // 2 Stars
  RARE = 3      // 3 Stars
}

export enum TrumpEffectType {
  MODIFY_ATTACK = 'MODIFY_ATTACK',     // Increase damage dealt
  MODIFY_DEFENSE = 'MODIFY_DEFENSE',   // Decrease damage taken
  DRAW_CARD = 'DRAW_CARD',             // Specific draw logic
  REMOVE_LAST_NUMBER = 'REMOVE_LAST_NUMBER', // Remove number card from table
  REMOVE_LAST_TRUMP = 'REMOVE_LAST_TRUMP'    // Remove active trump effect
}

export interface TrumpCardData {
  id: string; // Unique instance ID
  definitionId: string; // Type ID (e.g., 'attack_1')
  name: string;
  description: string;
  rarity: TrumpRarity;
  effectType: TrumpEffectType;
  value: number; // For attack/defense amount
  target: 'SELF' | 'OPPONENT' | 'BOTH';
  icon: string; // Emoji or simple graphic code
}

export interface ActiveEffect {
  id: string;
  sourceCardName: string;
  type: TrumpEffectType;
  value: number;
  target: 'SELF' | 'OPPONENT';
}
