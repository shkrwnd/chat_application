import type { Room } from '../../types';

interface HeaderProps {
  room: Room | null;
  memberCount: number;
  onSearchOpen: () => void;
}

export function Header({ room, memberCount, onSearchOpen }: HeaderProps) {
  return (
    <div className="flex-shrink-0 h-14 border-b border-gray-800 flex items-center px-4 gap-3">
      {room ? (
        <>
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
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-400 mr-3">{memberCount} online</span>
          </div>
        </>
      ) : (
        <span className="text-gray-600 text-sm">Select a room</span>
      )}

      <button
        onClick={onSearchOpen}
        title="Search messages (⌘K)"
        className={`${room ? '' : 'ml-auto'} flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-xs`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline px-1 py-0.5 text-xs bg-gray-800 rounded border border-gray-700 text-gray-500">⌘K</kbd>
      </button>
    </div>
  );
}
