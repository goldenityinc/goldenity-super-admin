import axios from 'axios';
import { auth } from '../firebase/firebaseClient';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const hasAbsoluteHttpUrl = /^https?:\/\//i.test(configuredBaseUrl ?? '');

// In production, use same-origin /api to avoid browser CORS preflight failures.
const API_BASE_URL = import.meta.env.PROD
  ? (hasAbsoluteHttpUrl ? '/api' : configuredBaseUrl || '/api')
  : configuredBaseUrl || 'http://localhost:5001/api';

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
