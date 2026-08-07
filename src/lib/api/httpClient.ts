import axios from 'axios';
import { auth } from '../firebase/firebaseClient';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const hasAbsoluteHttpUrl = /^https?:\/\//i.test(configuredBaseUrl ?? '');
const explicitMediaOrigin = (import.meta.env.VITE_MEDIA_ORIGIN || import.meta.env.VITE_PUBLIC_API_ORIGIN || '').toString().trim();

// Production URL strategy:
// - Jika developer set VITE_API_BASE_URL = absolute HTTPS URL (2 separate domains Frontend + Backend) → PAKE ABSOLUTE itu.
// - Jika VITE_API_BASE_URL = relative (mis. "/api") atau UNSET → same-origin /api (monolith / reverse-proxy / backend serves static SPA).
// - Development: default http://localhost:5001/api, kecuali explicit config.
const sameOriginBase = configuredBaseUrl?.startsWith('/') ? configuredBaseUrl : '/api';
export const API_BASE_URL = import.meta.env.PROD
  ? (hasAbsoluteHttpUrl ? configuredBaseUrl! : sameOriginBase)
  : (hasAbsoluteHttpUrl ? configuredBaseUrl! : configuredBaseUrl || 'http://localhost:5001/api');

// getApiOrigin() dipakai resolveMediaUrl untuk uploads receipt/S3 proxy.
// Harus SELALU return origin BACKEND, bukan frontend domain jika terpisah.
// Prioritas:
// 1. VITE_MEDIA_ORIGIN / VITE_PUBLIC_API_ORIGIN (explicit override untuk kasus 2 domain terpisah)
// 2. Jika API_BASE_URL absolute → origin dari URL itu
// 3. Jika relative → window.location.origin (monolith same-origin)
export function getApiOrigin(): string {
  try {
    if (explicitMediaOrigin && /^https?:\/\//i.test(explicitMediaOrigin)) {
      return explicitMediaOrigin.replace(/\/+$/, '');
    }
    if (hasAbsoluteHttpUrl && configuredBaseUrl) {
      const u = new URL(configuredBaseUrl);
      return u.origin;
    }
    if (API_BASE_URL.startsWith('/')) {
      if (typeof window !== 'undefined' && window?.location?.origin) {
        return window.location.origin;
      }
      return 'http://localhost:5001';
    }
    const u = new URL(API_BASE_URL);
    return u.origin;
  } catch {
    return 'http://localhost:5001';
  }
}

export function resolveMediaUrl(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim();
  if (!s) return '';
  if (/^(https?:|blob:|data:)/i.test(s)) return s;
  if (s.startsWith('//')) return s;
  const origin = getApiOrigin();
  if (s.startsWith('/')) {
    return `${origin}${s}`;
  }
  if (/^[a-zA-Z0-9_-]+:\/\//.test(s)) return s;
  return `${origin}/uploads/${s.replace(/^\/+/, '')}`;
}

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

httpClient.interceptors.request.use(async (config) => {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  return config;
});

export default httpClient;
