import type { Room } from '../../types';

interface HeaderProps {
  room: Room | null;
  memberCount: number;
}

export function Header({ room, memberCount }: HeaderProps) {
  if (!room) {
    return (
      <div className="flex-shrink-0 h-14 border-b border-gray-800 flex items-center px-4">
        <span className="text-gray-600 text-sm">Select a room</span>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 h-14 border-b border-gray-800 flex items-center px-4 gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400 text-lg font-light">#</span>
        <h2 className="font-semibold text-white">{room.name}</h2>
      </div>
      {room.description && (
        <>
          <div className="w-px h-4 bg-gray-700" />
          <span className="text-sm text-gray-500 truncate">{room.description}</span>
        </>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-xs text-gray-400">{memberCount} online</span>
      </div>
    </div>
  );
}
