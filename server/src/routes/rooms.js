const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { verifyToken } = require('../auth');

const router = express.Router();

function parseAttachments(msg) {
  try {
    msg.attachments = msg.attachments ? JSON.parse(msg.attachments) : [];
  } catch {
    msg.attachments = [];
  }
  return msg;
}

router.get('/', verifyToken, (_req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY created_at DESC').all();
  res.json(rooms);
});

router.post('/', verifyToken, (req, res) => {
  const { name, description = '' } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Room name is required' });
  }

  const existing = db.prepare('SELECT id FROM rooms WHERE name = ?').get(name.trim());
  if (existing) {
    return res.status(409).json({ error: 'A room with that name already exists' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO rooms (id, name, description, created_by, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name.trim(), description.trim(), req.user.id, Date.now());

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  res.status(201).json(room);
});

router.get('/search', verifyToken, (req, res) => {
  const { q, limit = '20' } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json([]);
  }

  // Escape SQL LIKE wildcards so literal % and _ in the query are treated as text
  const escaped = q.trim().replace(/[%_\\]/g, '\\$&');
  const pattern = `%${escaped}%`;
  const results = db.prepare(`
    SELECT m.id, m.room_id, r.name AS room_name,
           m.user_id, m.username, m.content, m.created_at
    FROM messages m
    JOIN rooms r ON m.room_id = r.id
    WHERE m.content LIKE ? ESCAPE '\\'
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(pattern, Number(limit));

  res.json(results);
});

router.get('/:id/messages', verifyToken, (req, res) => {
  const { limit = '50', before } = req.query;
  const params = [req.params.id];
  let query = 'SELECT * FROM messages WHERE room_id = ?';

  if (before) {
    query += ' AND created_at < ?';
    params.push(Number(before));
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit));

  const messages = db.prepare(query).all(...params).reverse().map(parseAttachments);
  res.json(messages);
});

module.exports = router;
