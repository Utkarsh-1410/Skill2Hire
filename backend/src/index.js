import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { createAppRouter } from './router.js';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('[backend] uncaughtException', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[backend] unhandledRejection', err);
});

const app = express();

app.use(cors());
app.use(express.json({ limit: '6mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', await createAppRouter());

// Express error handler (must be after routes)
app.use((err, req, res, next) => {
  console.error('[backend] express_error', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`[skill2hire-backend] listening on http://localhost:${port}`);
});
