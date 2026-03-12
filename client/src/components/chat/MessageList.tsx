import { useEffect, useRef } from 'react';
import { Message } from './Message';
import type { Message as MessageType } from '../../types';

interface MessageListProps {
  messages: MessageType[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-600 text-sm">No messages yet. Say hello!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
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
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
