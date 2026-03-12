const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { verifySocketToken } = require('../auth');

// Map<roomId, Map<socketId, { userId, username }>>
const roomUsers = new Map();

function registerHandlers(io, socket) {
  const user = verifySocketToken(socket.handshake.auth?.token);

  if (!user) {
    socket.disconnect(true);
    return;
  }

  socket.userId = user.id;
  socket.username = user.username;

  socket.on('join_room', (roomId) => {
    socket.join(roomId);

    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
    roomUsers.get(roomId).set(socket.id, { userId: user.id, username: user.username });

    io.to(roomId).emit('active_users', Array.from(roomUsers.get(roomId).values()));
    socket.to(roomId).emit('user_joined', { userId: user.id, username: user.username });
  });

  socket.on('leave_room', (roomId) => {
    leaveRoom(io, socket, roomId);
  });

  socket.on('send_message', ({ roomId, content }) => {
    if (!content || !content.trim()) return;

    const message = {
      id: uuidv4(),
      room_id: roomId,
      user_id: user.id,
      username: user.username,
      content: content.trim(),
      created_at: Date.now(),
    };

    db.prepare(
      'INSERT INTO messages (id, room_id, user_id, username, content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(message.id, message.room_id, message.user_id, message.username, message.content, message.created_at);

    io.to(roomId).emit('message', message);
  });

  socket.on('typing_start', (roomId) => {
    socket.to(roomId).emit('typing', { username: user.username, isTyping: true });
  });

  socket.on('typing_stop', (roomId) => {
    socket.to(roomId).emit('typing', { username: user.username, isTyping: false });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) leaveRoom(io, socket, roomId);
    }
  });
}

function leaveRoom(io, socket, roomId) {
  socket.leave(roomId);

  const room = roomUsers.get(roomId);
  if (!room) return;

  room.delete(socket.id);

  if (room.size === 0) {
    roomUsers.delete(roomId);
  } else {
    io.to(roomId).emit('active_users', Array.from(room.values()));
  }

  socket.to(roomId).emit('user_left', { userId: socket.userId, username: socket.username });
}

module.exports = { registerHandlers };
