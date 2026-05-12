import axios from 'axios';
import { supabase } from './supabase';

const root = import.meta.env.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
  : '';

export const api = axios.create({
  baseURL: root ? `${root}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    let msg = err.response?.data?.message || err.message || 'Request failed';
    const code = (err as { code?: string }).code;
    if (code === 'ERR_NETWORK' || msg === 'Network Error') {
      const apiRoot = import.meta.env.VITE_API_URL || '(not set)';
      msg =
        `Cannot reach API (${apiRoot}). Production: set VITE_API_URL to your Render URL in Vercel env and redeploy.`;
    }
    return Promise.reject(new Error(msg));
  },
);
