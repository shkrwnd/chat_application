const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { verifyToken } = require('../auth');

const router = express.Router();

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

  const messages = db.prepare(query).all(...params).reverse();
  res.json(messages);
});

module.exports = router;
