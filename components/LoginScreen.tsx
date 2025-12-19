
import React, { useState } from 'react';
import { Button } from './Button';
import { GlitchText } from './GlitchText';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg("CREDENTIALS REQUIRED");
      return;
    }

    if (mode === 'REGISTER' && inviteCode !== '123456') {
      setErrorMsg("INVALID INVITATION CODE");
      return;
    }

    setIsSubmitting(true);

    try {
      // Relative paths for production
      const endpoint = mode === 'LOGIN' ? '/api/login' : '/api/register';
      const payload = mode === 'LOGIN' 
        ? { username, password } 
        : { username, password, inviteCode };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        // Success
        setTimeout(() => {
          onLogin(data);
        }, 500); // Small delay for effect
      } else {
        setErrorMsg(data.error?.toUpperCase() || "CONNECTION REFUSED");
        setIsSubmitting(false);
      }

    } catch (err) {
      setErrorMsg("SERVER UNREACHABLE");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-full relative z-10">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-[-1] opacity-30 grayscale contrast-125"
        style={{ backgroundImage: 'url(https://picsum.photos/1920/1080?grayscale&blur=2)' }}
      ></div>

      <div className="w-full max-w-lg p-8 border border-zinc-800 bg-black/80 backdrop-blur-md shadow-2xl relative transition-all duration-500">
        {/* Decorative elements */}
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-red-700"></div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-red-700"></div>

        <div className="mb-8 text-center">
          <GlitchText 
            text={mode === 'LOGIN' ? "SYSTEM ACCESS" : "SUBJECT REGISTRATION"} 
            as="h2" 
            className="text-3xl text-zinc-100 font-bold mb-2 tracking-widest"
            intensity="high"
          />
          <p className="text-zinc-500 text-sm uppercase">
            {mode === 'LOGIN' ? "Enter credentials to proceed" : "Authorization code required"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 group">
            <label className="block text-xs uppercase text-red-900/80 tracking-widest">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950/50 border-b-2 border-zinc-700 text-zinc-100 px-4 py-2 focus:outline-none focus:border-red-600 focus:bg-red-950/10 transition-all font-mono text-lg uppercase"
              autoFocus
            />
          </div>

          <div className="space-y-2 group">
             <label className="block text-xs uppercase text-red-900/80 tracking-widest">Password</label>
             <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950/50 border-b-2 border-zinc-700 text-zinc-100 px-4 py-2 focus:outline-none focus:border-red-600 focus:bg-red-950/10 transition-all font-mono text-lg"
            />
          </div>

          {mode === 'REGISTER' && (
             <div className="space-y-2 group animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs uppercase text-red-500 tracking-widest">Invitation Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  maxLength={6}
                  className="w-full bg-red-950/10 border-b-2 border-red-900/50 text-red-100 px-4 py-2 focus:outline-none focus:border-red-500 transition-all font-mono text-lg tracking-[0.5em] text-center"
                  placeholder="------"
                />
             </div>
          )}

          {errorMsg && (
            <div className="text-red-500 text-xs font-mono text-center bg-red-950/30 p-2 border border-red-900/50 animate-pulse">
              ERROR: {errorMsg}
            </div>
          )}

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full" 
              isLoading={isSubmitting}
            >
              {mode === 'LOGIN' ? 'LOGIN' : 'REGISTER'}
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-4 border-t border-zinc-900 text-center">
           <button 
             type="button"
             onClick={() => {
                setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                setErrorMsg(null);
             }}
             className="text-xs text-zinc-600 hover:text-red-400 uppercase tracking-wider transition-colors border-b border-transparent hover:border-red-400"
           >
             {mode === 'LOGIN' ? "[ APPLY FOR NEW SUBJECT ID ]" : "[ RETURN TO LOGIN ]"}
           </button>
        </div>
      </div>
    </div>
  );
};
