import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';

import meRouter from './routes/me.js';
import usersRouter from './routes/users.js';
import metaRouter from './routes/meta.js';
import meetingsRouter from './routes/meetings.js';
import decisionsRouter from './routes/decisions.js';
import actionsRouter from './routes/actions.js';
import attachmentsRouter from './routes/attachments.js';
import dashboardRouter from './routes/dashboard.js';
import searchRouter from './routes/search.js';

const app = express();

/** Normalize origin for comparison (scheme + host, no trailing slash, stable casing). */
function normalizeOrigin(origin) {
  if (!origin) return '';
  try {
    const u = new URL(origin);
    return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
  } catch {
    return origin.trim().replace(/\/$/, '');
  }
}

/** Comma-separated: local + production frontends (e.g. http://localhost:5173,https://xxx.vercel.app) */
const corsOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

/** Default ON: preview URLs (https://*.vercel.app) work without extra Render env. Set CORS_ALLOW_VERCEL_PREVIEWS=false to disable. */
const allowVercelPreviewOrigins = process.env.CORS_ALLOW_VERCEL_PREVIEWS !== 'false';

const allowedOriginSet = new Set(corsOrigins);

function corsAllowsOrigin(origin) {
  if (!corsOrigins.length) return true;
  if (!origin) return true;
  const n = normalizeOrigin(origin);
  if (allowedOriginSet.has(n)) return true;
  if (allowVercelPreviewOrigins) {
    try {
      const u = new URL(origin);
      if (u.protocol === 'https:' && u.hostname.endsWith('.vercel.app')) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (corsAllowsOrigin(origin)) callback(null, true);
      else callback(null, false);
    },
    credentials: true,
  }),
);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'segwitz-meeting-api' });
});

app.use('/api/me', meRouter);
app.use('/api/users', usersRouter);
app.use('/api', metaRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/action-items', actionsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/search', searchRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API listening on port ${env.port}`);
});
