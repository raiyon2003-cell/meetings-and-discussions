import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios';
import { supabase } from './supabase';

type RetryConfig = InternalAxiosRequestConfig & { _retryAfterRefresh?: boolean };

const AUTH_OP_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]);
}

/** Read JWT `exp` (seconds since epoch) without verifying the signature. */
function readJwtExpSeconds(accessToken: string): number | null {
  try {
    const part = accessToken.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Returns a usable access token for the API. Refreshes when missing, expired,
 * or within 2 minutes of expiry so `getSession()` never sends a stale JWT.
 */
async function getAccessTokenForApi(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await withTimeout(supabase.auth.getSession(), AUTH_OP_TIMEOUT_MS, 'getSession');
    let accessToken = session?.access_token ?? null;
    if (!accessToken) return null;

    const exp = readJwtExpSeconds(accessToken);
    const now = Math.floor(Date.now() / 1000);
    const stale = exp != null && exp < now + 120;
    if (stale) {
      const { data, error } = await withTimeout(
        supabase.auth.refreshSession(),
        AUTH_OP_TIMEOUT_MS,
        'refreshSession',
      );
      if (!error && data.session?.access_token) {
        accessToken = data.session.access_token;
      }
    }
    return accessToken;
  } catch {
    return null;
  }
}

/** Raw value from env (used in error copy / diagnostics). */
const configuredApiRoot = import.meta.env.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
  : '';

/**
 * In `npm run dev`, prefer same-origin `/api` when the env points at loopback.
 * That uses the Vite proxy (see vite.config.ts) and avoids browser CORS / host
 * mismatches (e.g. page on localhost:5173 calling 127.0.0.1:4000).
 * Production builds still use VITE_API_URL as-is (e.g. Render URL on Vercel).
 */
function effectiveApiRoot(): string {
  if (!configuredApiRoot) return '';
  if (!import.meta.env.DEV) return configuredApiRoot;
  try {
    const u = new URL(
      configuredApiRoot.startsWith('http') ? configuredApiRoot : `http://${configuredApiRoot}`,
    );
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1') {
      return '';
    }
  } catch {
    /* invalid URL — fall through */
  }
  return configuredApiRoot;
}

const root = effectiveApiRoot();

export const api = axios.create({
  baseURL: root ? `${root}/api` : '/api',
  /** Without this, a down API (e.g. backend not running) hangs forever and auth bootstrap never finishes. */
  timeout: 12_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessTokenForApi();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err: unknown) => {
    if (!isAxiosError(err) || !err.config) {
      return Promise.reject(err instanceof Error ? err : new Error('Request failed'));
    }

    const original = err.config as RetryConfig;
    const status = err.response?.status;
    const hadAuth = Boolean(original.headers?.Authorization);

    if (
      status === 401 &&
      hadAuth &&
      !original._retryAfterRefresh &&
      typeof original.headers?.Authorization === 'string'
    ) {
      original._retryAfterRefresh = true;
      try {
        const { data, error } = await withTimeout(
          supabase.auth.refreshSession(),
          AUTH_OP_TIMEOUT_MS,
          'refreshSession',
        );
        if (!error && data.session?.access_token) {
          original.headers.Authorization = `Bearer ${data.session.access_token}`;
          return api.request(original);
        }
      } catch {
        /* fall through to reject */
      }
    }

    let msg =
      (err.response?.data as { message?: string } | undefined)?.message || err.message || 'Request failed';
    const code = err.code;
    if (code === 'ERR_NETWORK' || msg === 'Network Error') {
      if (import.meta.env.DEV && !root) {
        msg =
          'Cannot reach the API through the Vite dev proxy (expects backend on port 4000).\n\n' +
          'Start the API in another terminal, then refresh:\n' +
          '  cd backend && npm run dev\n\n' +
          'If you intentionally call a remote API in dev, set VITE_API_URL to a non-loopback URL.';
      } else if (!configuredApiRoot) {
        msg =
          'Cannot reach the API: VITE_API_URL is not set. In Vercel, set it to your Render API base URL (no trailing slash), then redeploy.';
      } else {
        msg =
          `The API at ${configuredApiRoot} did not respond in the browser. Common causes: (1) CORS — on Render, set FRONTEND_URL to your exact Vercel origin (https://your-app.vercel.app), comma-separated with localhost if needed, then redeploy the API; (2) the Render service is sleeping — open ${configuredApiRoot}/health once to wake it, then refresh.`;
      }
    } else if (status === 401 && (msg === 'Invalid or expired token' || msg.toLowerCase().includes('invalid or expired'))) {
      msg =
        'Invalid or expired token. Try: (1) Sign out and sign in again. (2) Ensure backend `SUPABASE_URL` is the **same** Supabase project as frontend `VITE_SUPABASE_URL` in Settings → API.';
    }

    return Promise.reject(new Error(msg));
  },
);

/** Base URL for opening `/health` in the browser (not proxied). */
export function apiDirectOriginForHealth(): string {
  if (configuredApiRoot) return configuredApiRoot;
  if (import.meta.env.DEV) return 'http://127.0.0.1:4000';
  return '';
}
