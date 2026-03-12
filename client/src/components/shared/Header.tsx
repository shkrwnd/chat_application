import type { Room } from '../../types';
import type { CallType } from '../../hooks/useWebRTC';

interface HeaderProps {
  room: Room | null;
  memberCount: number;
  onSearchOpen: () => void;
  callActive: boolean;
  callParticipantCount: number;
  onJoinCall: (type: CallType) => void;
}

export function Header({ room, memberCount, onSearchOpen, callActive, callParticipantCount, onJoinCall }: HeaderProps) {
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
            <span className="text-xs text-gray-400 mr-2">{memberCount} online</span>
          </div>
        </>
      ) : (
        <span className="text-gray-600 text-sm">Select a room</span>
      )}

      {/* Call buttons — only shown when a room is selected and not already in a call */}
      {room && !callActive && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Voice call */}
          <button
            onClick={() => onJoinCall('voice')}
            title={callParticipantCount > 0 ? `Join voice call (${callParticipantCount} in call)` : 'Start voice call'}
            className="relative flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {callParticipantCount > 0 && (
              <span className="text-[10px] font-medium text-green-400">{callParticipantCount}</span>
            )}
          </button>

          {/* Video call */}
          <button
            onClick={() => onJoinCall('video')}
            title={callParticipantCount > 0 ? `Join video call (${callParticipantCount} in call)` : 'Start video call'}
            className="relative flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.871v6.258a1 1 0 01-1.447.894L15 14M5 18H3a2 2 0 01-2-2V8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5z" />
            </svg>
            {callParticipantCount > 0 && (
              <span className="text-[10px] font-medium text-green-400">{callParticipantCount}</span>
            )}
          </button>
        </div>
      )}

      <button
        onClick={onSearchOpen}
        title="Search messages (⌘K)"
        className={`${room && !callActive ? '' : room ? '' : 'ml-auto'} flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-xs flex-shrink-0`}
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
