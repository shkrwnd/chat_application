import { cn } from '../../utils/cn';
import { Badge } from '../ui/badge';
import type { Room } from '../../types';

interface RoomItemProps {
  room: Room;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
}

export function RoomItem({ room, isActive, unreadCount, onClick }: RoomItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors group',
        isActive
          ? 'bg-indigo-600/20 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      )}
    >
      <span
        className={cn(
          'text-sm font-medium flex-1 truncate',
          isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
        )}
      >
        # {room.name}
      </span>
      {unreadCount > 0 && !isActive && <Badge count={unreadCount} />}
    </button>
  );
}
