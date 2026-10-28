// Tiny in-memory rate limiter (no extra package needed).
// Good for one server instance. If you ever run several instances,
// move this to Redis or use the express-rate-limit package.
function rateLimit({ windowMs, max, message, keyFn }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: message || 'Too many requests. Please try again later.' });
    }
    next();
  };
}

module.exports = rateLimit;
