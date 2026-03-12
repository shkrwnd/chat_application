const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { verifySocketToken } = require('../auth');

// Map<roomId, Map<socketId, { userId, username }>>
const roomUsers = new Map();

// Map<roomId, Map<userId, { username, messageId }>>
const readReceipts = new Map();

// Map<userId, { username, status: 'online'|'away', socketCount }>
const userStatuses = new Map();

// Map<roomId, Map<socketId, { userId, username, type: 'voice'|'video' }>>
const callParticipants = new Map();

// ─── helpers ─────────────────────────────────────────────────────────────────

function findCallSocketId(roomId, targetUserId) {
  const room = callParticipants.get(roomId);
  if (!room) return null;
  for (const [sid, data] of room.entries()) {
    if (data.userId === targetUserId) return sid;
  }
  return null;
}

function broadcastCallState(io, roomId) {
  const room = callParticipants.get(roomId);
  const participants = room
    ? Array.from(room.values()).map((p) => ({ userId: p.userId, username: p.username }))
    : [];
  io.to(roomId).emit('call_state', { roomId, participants });
}

function handleCallLeave(io, socket, roomId) {
  const room = callParticipants.get(roomId);
  if (!room || !room.has(socket.id)) return;

  const { userId, username } = room.get(socket.id);
  room.delete(socket.id);
  if (room.size === 0) callParticipants.delete(roomId);

  socket.to(roomId).emit('call_user_left', { roomId, userId, username });
  broadcastCallState(io, roomId);
}

// ─── main handler ─────────────────────────────────────────────────────────────

function registerHandlers(io, socket) {
  const user = verifySocketToken(socket.handshake.auth?.token);

  if (!user) {
    socket.disconnect(true);
    return;
  }

  socket.userId = user.id;
  socket.username = user.username;

  // ── Presence ──────────────────────────────────────────────────────────────
  if (userStatuses.has(user.id)) {
    const s = userStatuses.get(user.id);
    userStatuses.set(user.id, { ...s, socketCount: s.socketCount + 1, status: 'online' });
  } else {
    userStatuses.set(user.id, { username: user.username, status: 'online', socketCount: 1 });
  }
  io.emit('user_status_change', { userId: user.id, username: user.username, status: 'online' });

  const statuses = Array.from(userStatuses.entries()).map(([uid, data]) => ({
    userId: uid,
    username: data.username,
    status: data.status,
  }));
  socket.emit('user_statuses', statuses);

  // ── Rooms ─────────────────────────────────────────────────────────────────
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
    io.emit('room_members_update', { roomId, members });

    // Send existing read receipts for this room to the joiner
    if (readReceipts.has(roomId)) {
      const receipts = Object.fromEntries(readReceipts.get(roomId));
      socket.emit('room_read_receipts', { roomId, receipts });
    }

    // Send current call state for this room to the joiner
    if (callParticipants.has(roomId)) {
      const participants = Array.from(callParticipants.get(roomId).values()).map((p) => ({
        userId: p.userId,
        username: p.username,
      }));
      socket.emit('call_state', { roomId, participants });
    }
  });

  socket.on('leave_room', (roomId) => {
    leaveRoom(io, socket, roomId);
  });

  // ── Messages ──────────────────────────────────────────────────────────────
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

  // ── Read receipts ─────────────────────────────────────────────────────────
  socket.on('read_messages', ({ roomId, messageId }) => {
    if (!roomId || !messageId) return;
    if (!readReceipts.has(roomId)) readReceipts.set(roomId, new Map());
    readReceipts.get(roomId).set(user.id, { username: user.username, messageId });
    io.to(roomId).emit('messages_read', {
      roomId,
      userId: user.id,
      username: user.username,
      messageId,
    });
  });

  // ── Away / online status ──────────────────────────────────────────────────
  socket.on('user_status', ({ status }) => {
    if (status !== 'online' && status !== 'away') return;
    const current = userStatuses.get(user.id);
    if (!current) return;
    userStatuses.set(user.id, { ...current, status });
    io.emit('user_status_change', { userId: user.id, username: user.username, status });
  });

  // ── Voice / video call signaling ──────────────────────────────────────────
  socket.on('call_join', ({ roomId, type }) => {
    if (!['voice', 'video'].includes(type)) return;
    if (!callParticipants.has(roomId)) callParticipants.set(roomId, new Map());

    const room = callParticipants.get(roomId);

    // Remove any stale entry for this userId (re-join / tab switch)
    for (const [sid, data] of room.entries()) {
      if (data.userId === user.id) { room.delete(sid); break; }
    }

    room.set(socket.id, { userId: user.id, username: user.username, type });

    // Tell the new joiner about everyone already in the call
    const existing = Array.from(room.entries())
      .filter(([sid]) => sid !== socket.id)
      .map(([, data]) => ({ userId: data.userId, username: data.username }));
    socket.emit('call_participants', { roomId, participants: existing });

    // Tell existing participants about the new joiner
    socket.to(roomId).emit('call_user_joined', { roomId, userId: user.id, username: user.username });

    broadcastCallState(io, roomId);
  });

  socket.on('call_leave', ({ roomId }) => {
    handleCallLeave(io, socket, roomId);
  });

  // SDP offer: route directly to target socket
  socket.on('call_offer', ({ roomId, targetUserId, sdp }) => {
    const targetSocketId = findCallSocketId(roomId, targetUserId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit('call_offer', {
      roomId,
      fromUserId: user.id,
      fromUsername: user.username,
      sdp,
    });
  });

  // SDP answer: route directly to target socket
  socket.on('call_answer', ({ roomId, targetUserId, sdp }) => {
    const targetSocketId = findCallSocketId(roomId, targetUserId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit('call_answer', { roomId, fromUserId: user.id, sdp });
  });

  // ICE candidate: route directly to target socket
  socket.on('call_ice_candidate', ({ roomId, targetUserId, candidate }) => {
    const targetSocketId = findCallSocketId(roomId, targetUserId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit('call_ice_candidate', { roomId, fromUserId: user.id, candidate });
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnecting', () => {
    // Leave chat rooms
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) leaveRoom(io, socket, roomId);
    }

    // Leave any active calls
    for (const [roomId] of callParticipants.entries()) {
      handleCallLeave(io, socket, roomId);
    }

    // Update presence
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

// ─── room leave helper ────────────────────────────────────────────────────────

function leaveRoom(io, socket, roomId) {
  socket.leave(roomId);
  db.prepare('DELETE FROM room_members WHERE room_id = ? AND socket_id = ?').run(roomId, socket.id);

  const room = roomUsers.get(roomId);
  if (!room) return;

  room.delete(socket.id);

  const members = room.size === 0 ? [] : Array.from(room.values());
  if (room.size === 0) roomUsers.delete(roomId);
  else io.to(roomId).emit('active_users', members);

  socket.to(roomId).emit('user_left', { userId: socket.userId, username: socket.username });
  io.emit('room_members_update', { roomId, members });
}

module.exports = { registerHandlers };
