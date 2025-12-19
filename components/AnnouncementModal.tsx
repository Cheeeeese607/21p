
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { GlitchText } from './GlitchText';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState({ title: 'LOADING...', content: 'Fetching system data...', date: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
        fetch('/api/announcement')
            .then(res => res.json())
            .then(d => {
                setData(d);
                setEditTitle(d.title);
                setEditContent(d.content);
            })
            .catch(() => setData({ title: 'ERROR', content: 'Connection failed.', date: '' }));
    }
  }, [isOpen]);

  const handleEditSubmit = async () => {
      try {
          const res = await fetch('/api/announcement', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: editTitle, content: editContent, code: editCode })
          });
          const json = await res.json();
          if (res.ok) {
              setData(json.data);
              setIsEditing(false);
              setEditCode('');
              setError('');
          } else {
              setError(json.error);
          }
      } catch (err) {
          setError("Network Error");
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 p-6 md:p-8 relative shadow-[0_0_50px_rgba(255,0,0,0.1)]">
        
        {/* Decorative Tape */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-600/80 text-black font-bold text-[10px] px-4 py-1 rotate-1 shadow-md">CONFIDENTIAL // EYES ONLY</div>

        {!isEditing ? (
            <>
                <div className="mb-6 border-b border-zinc-800 pb-4">
                    <GlitchText text={data.title} as="h2" className="text-2xl md:text-3xl font-bold text-red-500 tracking-widest" intensity="low" />
                    <div className="text-[10px] text-zinc-600 mt-1 font-mono uppercase">POSTED: {new Date(data.date).toLocaleDateString()}</div>
                </div>

                <div className="text-zinc-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-mono min-h-[100px]">
                    {data.content}
                </div>

                <div className="mt-8 flex justify-between items-center pt-4 border-t border-zinc-800">
                     <button onClick={() => setIsEditing(true)} className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-widest">[EDIT]</button>
                     <Button onClick={onClose} className="px-8 py-2 text-sm">ACKNOWLEDGE</Button>
                </div>
            </>
        ) : (
            <div className="space-y-4">
                <h3 className="text-red-500 font-bold uppercase tracking-widest text-sm">SYSTEM OVERRIDE</h3>
                <input 
                    type="text" 
                    value={editTitle} 
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-2 text-white font-bold"
                    placeholder="TITLE"
                />
                <textarea 
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full h-32 bg-black border border-zinc-700 p-2 text-white font-mono text-sm"
                    placeholder="CONTENT"
                />
                <div>
                    <input 
                        type="password"
                        value={editCode}
                        onChange={e => setEditCode(e.target.value)} 
                        className="w-full bg-red-950/20 border border-red-900/50 p-2 text-red-500 text-center tracking-[0.5em] placeholder-red-900"
                        placeholder="ACCESS CODE"
                    />
                    {error && <div className="text-red-500 text-xs mt-1 text-center animate-pulse">{error}</div>}
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsEditing(false)} variant="secondary" className="flex-1 text-xs">CANCEL</Button>
                    <Button onClick={handleEditSubmit} variant="danger" className="flex-1 text-xs">UPDATE</Button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
