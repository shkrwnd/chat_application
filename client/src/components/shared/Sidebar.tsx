import { useState } from 'react';
import { RoomItem } from '../rooms/RoomItem';
import { CreateRoomModal } from '../rooms/CreateRoomModal';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import type { Room, User } from '../../types';

interface SidebarProps {
  rooms: Room[];
  activeRoom: Room | null;
  unreadCounts: Record<string, number>;
  onSelectRoom: (room: Room) => void;
  onRoomCreated: (room: Room) => void;
  user: User;
  onLogout: () => void;
}

export function Sidebar({
  rooms,
  activeRoom,
  unreadCounts,
  onSelectRoom,
  onRoomCreated,
  user,
  onLogout,
}: SidebarProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="font-semibold text-white text-sm">ChatRoom</span>
        </div>
      </div>

      {/* Rooms section */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rooms</span>
          <button
            onClick={() => setShowModal(true)}
            className="text-gray-500 hover:text-white transition-colors p-0.5 rounded"
            title="Create room"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-xs text-gray-600 px-2">No rooms yet. Create one!</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {rooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                isActive={activeRoom?.id === room.id}
                unreadCount={unreadCounts[room.id] ?? 0}
                onClick={() => onSelectRoom(room)}
              />
            ))}
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-800">
        <Avatar username={user.username} size="sm" />
        <span className="flex-1 text-sm font-medium text-gray-300 truncate">{user.username}</span>
        <Button variant="ghost" size="sm" onClick={onLogout} title="Log out" className="px-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </Button>
      </div>

      <CreateRoomModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={onRoomCreated}
      />
    </div>
  );
}
