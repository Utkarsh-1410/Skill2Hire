import bcrypt from 'bcryptjs';
import express from 'express';
import { z } from 'zod';

import { signToken } from './jwt.js';
import { requireAuth } from './middleware.js';

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export function createAuthRouter({ db }) {
  const router = express.Router();

  router.post('/register', (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

    const { name, email, password } = parsed.data;
    const existing = db.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = db.createUser({ name, email, passwordHash });
    const token = signToken({ userId: user.id });

    res.json({ token, user });
  });

  router.post('/login', (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

    const { email, password } = parsed.data;
    const userRow = db.getUserByEmail(email);
    if (!userRow) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = bcrypt.compareSync(password, userRow.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ userId: userRow.id });
    const user = db.getUserById(userRow.id);
    res.json({ token, user });
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = db.getUserById(req.auth.userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user });
  });

  return router;
}
