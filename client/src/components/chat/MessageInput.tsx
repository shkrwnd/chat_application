import { useState, useRef, useCallback, type KeyboardEvent, type FormEvent } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { TypingIndicator } from './TypingIndicator';
import { uploadFile } from '../../services/uploadService';
import { resolveBackendUrl } from '../../utils/backendUrl';
import type { Attachment } from '../../types';

interface MessageInputProps {
  roomId: string;
  typingUsers: string[];
}

const TYPING_TIMEOUT_MS = 2000;

export function MessageInput({ roomId, typingUsers }: MessageInputProps) {
  const { socket } = useSocket();
  const [content, setContent] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be picked again
    e.target.value = '';

    setUploading(true);
    try {
      const attachment = await uploadFile(file);
      setPendingAttachments((prev) => [...prev, attachment]);
    } catch {
      // silently ignore upload errors — could show a toast here
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(index: number) {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function send() {
    const trimmed = content.trim();
    if ((!trimmed && pendingAttachments.length === 0) || !socket) return;
    socket.emit('send_message', { roomId, content: trimmed, attachments: pendingAttachments });
    setContent('');
    setPendingAttachments([]);
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

  const canSend = (content.trim().length > 0 || pendingAttachments.length > 0) && !uploading;

  return (
    <div className="flex-shrink-0 px-4 pb-4">
      <TypingIndicator typingUsers={typingUsers} />

      {/* Pending attachment previews */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingAttachments.map((att, i) => (
            <div key={i} className="relative group">
              {att.type.startsWith('image/') ? (
                <img
                  src={resolveBackendUrl(att.url)}
                  alt={att.filename}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-700"
                />
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-400 max-w-[160px]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">{att.filename}</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 hover:bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,text/*,video/mp4,video/webm"
          onChange={handleFileChange}
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 w-10 h-10 text-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center rounded-xl hover:bg-gray-800 transition-colors"
          title="Attach file"
        >
          {uploading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>

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
          disabled={!canSend}
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
