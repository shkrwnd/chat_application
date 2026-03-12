import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatLayout } from '../layouts/ChatLayout';
import { Sidebar } from '../components/shared/Sidebar';
import { Header } from '../components/shared/Header';
import { UserList } from '../components/shared/UserList';
import { SearchModal } from '../components/shared/SearchModal';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { getRooms } from '../services/roomService';
import { getMessages } from '../services/messageService';
import type { Room, Message, RoomMember, SearchResult } from '../types';

export function ChatPage() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUsers, setActiveUsers] = useState<RoomMember[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<string | undefined>();

  // Used to highlight a specific message after room switch + history load
  const pendingHighlightRef = useRef<string | null>(null);

  useEffect(() => {
    getRooms().then(setRooms).catch(console.error);
  }, []);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setActiveRoom((current) => {
        if (!current || current.id !== msg.room_id) {
          setUnreadCounts((counts) => ({
            ...counts,
            [msg.room_id]: (counts[msg.room_id] ?? 0) + 1,
          }));
        }
        return current;
      });
    };

    const handleActiveUsers = (users: RoomMember[]) => setActiveUsers(users);

    const handleTyping = ({ username, isTyping }: { username: string; isTyping: boolean }) => {
      setTypingUsers((prev) =>
        isTyping ? [...new Set([...prev, username])] : prev.filter((u) => u !== username)
      );
    };

    socket.on('message', handleMessage);
    socket.on('active_users', handleActiveUsers);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('message', handleMessage);
      socket.off('active_users', handleActiveUsers);
      socket.off('typing', handleTyping);
    };
  }, [socket]);

  const selectRoom = useCallback(
    async (room: Room) => {
      if (activeRoom?.id === room.id) return;
      if (activeRoom) socket?.emit('leave_room', activeRoom.id);

      setActiveRoom(room);
      setMessages([]);
      setActiveUsers([]);
      setTypingUsers([]);
      setHighlightMessageId(undefined);
      setUnreadCounts((prev) => ({ ...prev, [room.id]: 0 }));

      try {
        const history = await getMessages(room.id);
        setMessages(history);

        // Apply pending highlight from search navigation
        if (pendingHighlightRef.current) {
          const id = pendingHighlightRef.current;
          pendingHighlightRef.current = null;
          // Small delay so the DOM has rendered the messages
          setTimeout(() => setHighlightMessageId(id), 100);
        }
      } catch (e) {
        console.error(e);
        pendingHighlightRef.current = null;
      }

      socket?.emit('join_room', room.id);
    },
    [socket, activeRoom]
  );

  const handleRoomCreated = useCallback(
    (room: Room) => {
      setRooms((prev) => [room, ...prev]);
      selectRoom(room);
    },
    [selectRoom]
  );

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      const room = rooms.find((r) => r.id === result.room_id);
      if (!room) return;

      pendingHighlightRef.current = result.id;

      if (activeRoom?.id === room.id) {
        // Already in this room — just highlight
        pendingHighlightRef.current = null;
        setTimeout(() => setHighlightMessageId(result.id), 50);
      } else {
        selectRoom(room);
      }
    },
    [rooms, activeRoom, selectRoom]
  );

  return (
    <>
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSearchSelect}
      />
      <ChatLayout
        sidebar={
          <Sidebar
            rooms={rooms}
            activeRoom={activeRoom}
            unreadCounts={unreadCounts}
            onSelectRoom={selectRoom}
            onRoomCreated={handleRoomCreated}
            user={user!}
            onLogout={logout}
          />
        }
        main={
          <div className="flex flex-col h-full">
            <Header
              room={activeRoom}
              memberCount={activeUsers.length}
              onSearchOpen={() => setSearchOpen(true)}
            />
            {activeRoom ? (
              <>
                <MessageList
                  messages={messages}
                  currentUserId={user!.id}
                  highlightMessageId={highlightMessageId}
                />
                <MessageInput roomId={activeRoom.id} typingUsers={typingUsers} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 font-medium">Select a room to start chatting</p>
                  <p className="text-gray-600 text-sm mt-1">Choose from the sidebar or create a new one</p>
                </div>
              </div>
            )}
          </div>
        }
        userList={<UserList users={activeUsers} currentUserId={user!.id} />}
      />
    </>
  );
}
