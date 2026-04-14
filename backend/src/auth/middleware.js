import { verifyToken } from './jwt.js';

export function requireAuth(req, res, next) {
  const header = String(req.headers.authorization || '');
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = verifyToken(m[1]);
    req.auth = { userId: payload.sub };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
