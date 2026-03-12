const express = require('express');
const { verifyToken } = require('../auth');

const router = express.Router();

// In-memory cache: url → { title, description, image }, evicted after 10 min
const cache = new Map();

router.get('/', verifyToken, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  // Validate protocol
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (cache.has(url)) return res.json(cache.get(url));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChatRoomBot/1.0; link preview)' },
    });
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.json({});
    }

    // Read up to 50 KB to avoid loading huge pages
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytes += value.length;
      if (bytes >= 50 * 1024) {
        reader.cancel();
        break;
      }
    }

    const getOg = (property) => {
      const re1 = new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i');
      const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i');
      return (html.match(re1) || html.match(re2))?.[1];
    };

    const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);

    const result = {
      title: getOg('title') || titleMatch?.[1]?.trim() || undefined,
      description: getOg('description') || undefined,
      image: getOg('image') || undefined,
    };

    cache.set(url, result);
    setTimeout(() => cache.delete(url), 10 * 60 * 1000);

    res.json(result);
  } catch {
    res.json({});
  }
});

module.exports = router;
