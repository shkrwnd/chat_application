import { cn } from '../../utils/cn';
import { Badge } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import type { Room, RoomMember } from '../../types';

interface RoomItemProps {
  room: Room;
  isActive: boolean;
  unreadCount: number;
  members: RoomMember[];
  onClick: () => void;
}

export function RoomItem({ room, isActive, unreadCount, members, onClick }: RoomItemProps) {
  const hasUnread = unreadCount > 0 && !isActive;
  const visible = members.slice(0, 3);
  const overflow = members.length - visible.length;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex flex-col py-2 pr-3 rounded-lg text-left transition-all group',
        isActive
          ? 'bg-indigo-600/20 pl-3'
          : hasUnread
            ? 'border-l-2 border-indigo-400 pl-2.5 hover:bg-gray-800'
            : 'pl-3 hover:bg-gray-800'
      )}
    >
      {/* Room name row */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-sm flex-1 truncate transition-colors',
            isActive
              ? 'text-white font-medium'
              : hasUnread
                ? 'text-white font-semibold'
                : 'text-gray-400 font-medium group-hover:text-white'
          )}
        >
          # {room.name}
        </span>
        {hasUnread && <Badge count={unreadCount} />}
      </div>

      {/* Online members row */}
      {members.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex -space-x-1.5">
            {visible.map((m) => (
              <Avatar
                key={m.userId}
                username={m.username}
                size="sm"
                className="w-4 h-4 text-[9px] ring-1 ring-gray-900"
              />
            ))}
          </div>
          <span className="text-[11px] text-gray-500 truncate leading-none">
            {visible.map((m) => m.username).join(', ')}
            {overflow > 0 && ` +${overflow}`}
          </span>
        </div>
      )}
    </button>
  );
}
