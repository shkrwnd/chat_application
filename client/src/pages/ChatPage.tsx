import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatLayout } from '../layouts/ChatLayout';
import { Sidebar } from '../components/shared/Sidebar';
import { Header } from '../components/shared/Header';
import { UserList } from '../components/shared/UserList';
import { SearchModal } from '../components/shared/SearchModal';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';
import { MessageToast } from '../components/ui/MessageToast';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useNotifications } from '../hooks/useNotifications';
import { getRooms } from '../services/roomService';
import { getMessages } from '../services/messageService';
import type { Room, Message, RoomMember, SearchResult, ReadReceipt, UserStatus } from '../types';

export function ChatPage() {
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUsers, setActiveUsers] = useState<RoomMember[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [roomMembers, setRoomMembers] = useState<Record<string, RoomMember[]>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<string | undefined>();
  const [inAppToast, setInAppToast] = useState<{ roomId: string; roomName: string; username: string; content: string } | null>(null);

  // Presence state
  // readReceipts[roomId][userId] = ReadReceipt
  const [readReceipts, setReadReceipts] = useState<Record<string, Record<string, ReadReceipt>>>({});
  // userStatuses[userId] = 'online' | 'away'  (absent = offline)
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({});

  const pendingHighlightRef = useRef<string | null>(null);
  // Stable ref to rooms so socket handlers never read stale state
  const roomsRef = useRef<Room[]>([]);
  useEffect(() => { roomsRef.current = rooms; }, [rooms]);

  // Track whether socket has ever connected, to avoid showing banner on initial load
  const wasConnectedRef = useRef(false);
  useEffect(() => { if (connected) wasConnectedRef.current = true; }, [connected]);
  const showReconnectBanner = wasConnectedRef.current && !connected;

  // Page title: reflect total unread count
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) ChatRoom` : 'ChatRoom';
    return () => { document.title = 'ChatRoom'; };
  }, [totalUnread]);

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

      // Join first so server registers us in the room before we emit read_messages
      socket?.emit('join_room', room.id);

      try {
        const history = await getMessages(room.id);
        setMessages(history);

        // Mark the last message as read
        if (history.length > 0) {
          socket?.emit('read_messages', { roomId: room.id, messageId: history[history.length - 1].id });
        }

        if (pendingHighlightRef.current) {
          const id = pendingHighlightRef.current;
          pendingHighlightRef.current = null;
          setTimeout(() => setHighlightMessageId(id), 100);
        }
      } catch (e) {
        console.error(e);
        pendingHighlightRef.current = null;
      }
    },
    [socket, activeRoom]
  );

  // Browser notifications
  const { permission: notificationPermission, requestPermission, notify } = useNotifications({
    onNotificationClick: useCallback(
      (roomId: string) => {
        const room = roomsRef.current.find((r) => r.id === roomId);
        if (room) selectRoom(room);
      },
      [selectRoom]
    ),
  });

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

  // Track tab visibility and report presence status to server
  useEffect(() => {
    if (!socket) return;
    const handleVisibility = () => {
      socket.emit('user_status', { status: document.hidden ? 'away' : 'online' });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [socket]);

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
          const room = roomsRef.current.find((r) => r.id === msg.room_id);
          // OS notification when tab is hidden/unfocused
          notify(`# ${room?.name ?? 'ChatRoom'}`, `${msg.username}: ${msg.content}`, msg.room_id);
          // In-app toast when tab is focused
          if (document.visibilityState === 'visible' && document.hasFocus()) {
            setInAppToast({ roomId: msg.room_id, roomName: room?.name ?? msg.room_id, username: msg.username, content: msg.content });
          }
        } else {
          // Message arrived in the active room — immediately mark as read
          socket.emit('read_messages', { roomId: msg.room_id, messageId: msg.id });
        }
        return current;
      });
    };

    const handleActiveUsers = (users: RoomMember[]) => setActiveUsers(users);

    const handleRoomMembersUpdate = ({ roomId, members }: { roomId: string; members: RoomMember[] }) => {
      setRoomMembers((prev) => ({ ...prev, [roomId]: members }));
    };

    const handleTyping = ({ username, isTyping }: { username: string; isTyping: boolean }) => {
      setTypingUsers((prev) =>
        isTyping ? [...new Set([...prev, username])] : prev.filter((u) => u !== username)
      );
    };

    // Read receipts
    const handleMessagesRead = ({ roomId, userId, username, messageId }: { roomId: string; userId: string; username: string; messageId: string }) => {
      setReadReceipts((prev) => ({
        ...prev,
        [roomId]: { ...(prev[roomId] ?? {}), [userId]: { userId, username, messageId } },
      }));
    };

    const handleRoomReadReceipts = ({ roomId, receipts }: { roomId: string; receipts: Record<string, { username: string; messageId: string }> }) => {
      const converted: Record<string, ReadReceipt> = {};
      Object.entries(receipts).forEach(([uid, r]) => {
        converted[uid] = { userId: uid, username: r.username, messageId: r.messageId };
      });
      setReadReceipts((prev) => ({ ...prev, [roomId]: { ...(prev[roomId] ?? {}), ...converted } }));
    };

    // Presence
    const handleUserStatuses = (statuses: { userId: string; username: string; status: UserStatus }[]) => {
      setUserStatuses(() => {
        const next: Record<string, UserStatus> = {};
        statuses.forEach(({ userId, status }) => { if (status !== 'offline') next[userId] = status; });
        return next;
      });
    };

    const handleUserStatusChange = ({ userId, status }: { userId: string; status: UserStatus }) => {
      setUserStatuses((prev) => {
        if (status === 'offline') {
          const next = { ...prev };
          delete next[userId];
          return next;
        }
        return { ...prev, [userId]: status };
      });
    };

    socket.on('message', handleMessage);
    socket.on('active_users', handleActiveUsers);
    socket.on('room_members_update', handleRoomMembersUpdate);
    socket.on('typing', handleTyping);
    socket.on('messages_read', handleMessagesRead);
    socket.on('room_read_receipts', handleRoomReadReceipts);
    socket.on('user_statuses', handleUserStatuses);
    socket.on('user_status_change', handleUserStatusChange);

    return () => {
      socket.off('message', handleMessage);
      socket.off('active_users', handleActiveUsers);
      socket.off('room_members_update', handleRoomMembersUpdate);
      socket.off('typing', handleTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('room_read_receipts', handleRoomReadReceipts);
      socket.off('user_statuses', handleUserStatuses);
      socket.off('user_status_change', handleUserStatusChange);
    };
  }, [socket, notify]);

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
        pendingHighlightRef.current = null;
        setTimeout(() => setHighlightMessageId(result.id), 50);
      } else {
        selectRoom(room);
      }
    },
    [rooms, activeRoom, selectRoom]
  );

  const activeRoomReceipts = activeRoom ? (readReceipts[activeRoom.id] ?? {}) : {};

  return (
    <>
      {inAppToast && (
        <MessageToast
          roomName={inAppToast.roomName}
          username={inAppToast.username}
          content={inAppToast.content}
          onClose={() => setInAppToast(null)}
          onClick={() => {
            const room = roomsRef.current.find((r) => r.id === inAppToast.roomId);
            if (room) selectRoom(room);
          }}
        />
      )}
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
            roomMembers={roomMembers}
            onSelectRoom={selectRoom}
            onRoomCreated={handleRoomCreated}
            user={user!}
            onLogout={logout}
            notificationPermission={notificationPermission}
            onRequestPermission={requestPermission}
          />
        }
        main={
          <div className="flex flex-col h-full">
            {/* Reconnect banner */}
            {showReconnectBanner && (
              <div className="flex-shrink-0 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-yellow-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs text-yellow-400 font-medium">Connection lost — reconnecting…</span>
              </div>
            )}

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
                  readReceipts={activeRoomReceipts}
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
        userList={<UserList users={activeUsers} currentUserId={user!.id} userStatuses={userStatuses} />}
      />
    </>
  );
}
