import { Avatar } from '../ui/avatar';
import { formatTimestamp } from '../../utils/formatters';
import type { Message as MessageType } from '../../types';

interface MessageProps {
  message: MessageType;
  isOwn: boolean;
  isGrouped: boolean; // consecutive message from same user
}

export function Message({ message, isOwn, isGrouped }: MessageProps) {
  return (
    <div className={`flex gap-3 px-4 ${isGrouped ? 'pt-0.5' : 'pt-4'} group`}>
      <div className="w-8 flex-shrink-0 flex items-start pt-0.5">
        {!isGrouped && <Avatar username={message.username} size="md" />}
      </div>
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={`text-sm font-semibold ${isOwn ? 'text-indigo-400' : 'text-white'}`}>
              {message.username}
            </span>
            <span className="text-xs text-gray-600">{formatTimestamp(message.created_at)}</span>
          </div>
        )}
        <p className="text-sm text-gray-300 leading-relaxed break-words">{message.content}</p>
      </div>
    </div>
  );
}
