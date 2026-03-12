import { useEffect } from 'react';
import { Avatar } from './avatar';

interface MessageToastProps {
  roomName: string;
  username: string;
  content: string;
  onClose: () => void;
  onClick: () => void;
}

export function MessageToast({ roomName, username, content, onClose, onClick }: MessageToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2">
      <button
        onClick={() => { onClick(); onClose(); }}
        className="w-full text-left p-3 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-indigo-400 truncate">#{roomName}</span>
        </div>
        <div className="flex items-start gap-2">
          <Avatar username={username} size="sm" className="w-6 h-6 text-[10px] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-white">{username} </span>
            <span className="text-xs text-gray-400 line-clamp-2">{content}</span>
          </div>
        </div>
      </button>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
