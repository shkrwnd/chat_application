import { useState, useRef, useCallback, type KeyboardEvent, type FormEvent } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { TypingIndicator } from './TypingIndicator';

interface MessageInputProps {
  roomId: string;
  typingUsers: string[];
}

const TYPING_TIMEOUT_MS = 2000;

export function MessageInput({ roomId, typingUsers }: MessageInputProps) {
  const { socket } = useSocket();
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      socket?.emit('typing_stop', roomId);
      isTypingRef.current = false;
    }
  }, [socket, roomId]);

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);

      if (!socket) return;

      if (value.trim()) {
        if (!isTypingRef.current) {
          socket.emit('typing_start', roomId);
          isTypingRef.current = true;
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(stopTyping, TYPING_TIMEOUT_MS);
      } else {
        stopTyping();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    },
    [socket, roomId, stopTyping]
  );

  function send() {
    const trimmed = content.trim();
    if (!trimmed || !socket) return;
    socket.emit('send_message', { roomId, content: trimmed });
    setContent('');
    stopTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send();
  }

  return (
    <div className="flex-shrink-0 px-4 pb-4">
      <TypingIndicator typingUsers={typingUsers} />
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-colors"
          style={{ maxHeight: '120px' }}
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="flex-shrink-0 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
