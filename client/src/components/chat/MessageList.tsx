import { useEffect, useRef } from 'react';
import { Message } from './Message';
import type { Message as MessageType } from '../../types';

interface MessageListProps {
  messages: MessageType[];
  currentUserId: string;
  highlightMessageId?: string;
}

export function MessageList({ messages, currentUserId, highlightMessageId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Scroll to bottom only when new messages arrive (not on highlight changes)
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages]);

  // Scroll to highlighted message
  useEffect(() => {
    if (!highlightMessageId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-message-id="${highlightMessageId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightMessageId]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-600 text-sm">No messages yet. Say hello!</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto py-2">
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const isGrouped =
          !!prev &&
          prev.user_id === msg.user_id &&
          msg.created_at - prev.created_at < 5 * 60 * 1000;

        return (
          <Message
            key={msg.id}
            message={msg}
            isOwn={msg.user_id === currentUserId}
            isGrouped={isGrouped}
            highlighted={msg.id === highlightMessageId}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
