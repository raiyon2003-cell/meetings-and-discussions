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
      const apiRoot = import.meta.env.VITE_API_URL
        ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
        : '';
      if (!apiRoot) {
        msg =
          'Cannot reach the API: VITE_API_URL is not set. In Vercel, set it to your Render API base URL (no trailing slash), then redeploy.';
      } else {
        msg =
          `The API at ${apiRoot} did not respond in the browser. Common causes: (1) CORS — on Render, set FRONTEND_URL to your exact Vercel origin (https://your-app.vercel.app), comma-separated with localhost if needed, then redeploy the API; (2) the Render service is sleeping — open ${apiRoot}/health once to wake it, then refresh.`;
      }
    }
    return Promise.reject(new Error(msg));
  },
);
