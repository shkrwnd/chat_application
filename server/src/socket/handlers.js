const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { verifySocketToken } = require('../auth');

// Map<roomId, Map<socketId, { userId, username }>>
const roomUsers = new Map();

// Map<roomId, Map<userId, { username, messageId }>>
const readReceipts = new Map();

// Map<userId, { username, status: 'online'|'away', socketCount }>
const userStatuses = new Map();

function registerHandlers(io, socket) {
  const user = verifySocketToken(socket.handshake.auth?.token);

  if (!user) {
    socket.disconnect(true);
    return;
  }

  socket.userId = user.id;
  socket.username = user.username;

  // Track online presence — multiple tabs share the same userId
  if (userStatuses.has(user.id)) {
    const s = userStatuses.get(user.id);
    userStatuses.set(user.id, { ...s, socketCount: s.socketCount + 1, status: 'online' });
  } else {
    userStatuses.set(user.id, { username: user.username, status: 'online', socketCount: 1 });
  }
  io.emit('user_status_change', { userId: user.id, username: user.username, status: 'online' });

  // Send the current status snapshot to this socket only
  const statuses = Array.from(userStatuses.entries()).map(([uid, data]) => ({
    userId: uid,
    username: data.username,
    status: data.status,
  }));
  socket.emit('user_statuses', statuses);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);

    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
    roomUsers.get(roomId).set(socket.id, { userId: user.id, username: user.username });

    db.prepare(
      'INSERT OR REPLACE INTO room_members (room_id, user_id, socket_id, joined_at) VALUES (?, ?, ?, ?)'
    ).run(roomId, user.id, socket.id, Date.now());

    const members = Array.from(roomUsers.get(roomId).values());
    io.to(roomId).emit('active_users', members);
    socket.to(roomId).emit('user_joined', { userId: user.id, username: user.username });
    // Broadcast to ALL clients so every sidebar stays in sync
    io.emit('room_members_update', { roomId, members });

    // Send existing read receipts for this room to the joiner
    if (readReceipts.has(roomId)) {
      const receipts = Object.fromEntries(readReceipts.get(roomId));
      socket.emit('room_read_receipts', { roomId, receipts });
    }
  });

  socket.on('leave_room', (roomId) => {
    leaveRoom(io, socket, roomId);
  });

  socket.on('send_message', ({ roomId, content, attachments }) => {
    const trimmed = (content || '').trim();
    const safeAttachments = Array.isArray(attachments) ? attachments : [];
    if (!trimmed && safeAttachments.length === 0) return;

    const message = {
      id: uuidv4(),
      room_id: roomId,
      user_id: user.id,
      username: user.username,
      content: trimmed,
      attachments: safeAttachments,
      created_at: Date.now(),
    };

    db.prepare(
      'INSERT INTO messages (id, room_id, user_id, username, content, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(message.id, message.room_id, message.user_id, message.username, message.content, JSON.stringify(safeAttachments), message.created_at);

    io.to(roomId).emit('message', message);
  });

  socket.on('typing_start', (roomId) => {
    socket.to(roomId).emit('typing', { username: user.username, isTyping: true });
  });

  socket.on('typing_stop', (roomId) => {
    socket.to(roomId).emit('typing', { username: user.username, isTyping: false });
  });

  // Read receipt: client tells server "I've read up to messageId in roomId"
  socket.on('read_messages', ({ roomId, messageId }) => {
    if (!roomId || !messageId) return;
    if (!readReceipts.has(roomId)) readReceipts.set(roomId, new Map());
    readReceipts.get(roomId).set(user.id, { username: user.username, messageId });
    // Broadcast to everyone in the room so their UI updates
    io.to(roomId).emit('messages_read', {
      roomId,
      userId: user.id,
      username: user.username,
      messageId,
    });
  });

  // Presence: client sends 'online' when tab is visible, 'away' when hidden
  socket.on('user_status', ({ status }) => {
    if (status !== 'online' && status !== 'away') return;
    const current = userStatuses.get(user.id);
    if (!current) return;
    userStatuses.set(user.id, { ...current, status });
    io.emit('user_status_change', { userId: user.id, username: user.username, status });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) leaveRoom(io, socket, roomId);
    }

    const current = userStatuses.get(user.id);
    if (current) {
      if (current.socketCount <= 1) {
        userStatuses.delete(user.id);
        io.emit('user_status_change', { userId: user.id, username: user.username, status: 'offline' });
      } else {
        userStatuses.set(user.id, { ...current, socketCount: current.socketCount - 1 });
      }
    }
  });
}

function leaveRoom(io, socket, roomId) {
  socket.leave(roomId);

  db.prepare('DELETE FROM room_members WHERE room_id = ? AND socket_id = ?').run(roomId, socket.id);

  const room = roomUsers.get(roomId);
  if (!room) return;

  room.delete(socket.id);

  const members = room.size === 0 ? [] : Array.from(room.values());
  if (room.size === 0) {
    roomUsers.delete(roomId);
  } else {
    io.to(roomId).emit('active_users', members);
  }

  socket.to(roomId).emit('user_left', { userId: socket.userId, username: socket.username });
  // Broadcast to ALL clients so every sidebar stays in sync
  io.emit('room_members_update', { roomId, members });
}

module.exports = { registerHandlers };
