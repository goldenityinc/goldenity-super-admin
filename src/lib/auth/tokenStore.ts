// Token login Super Admin (JWT dari backend Railway). Disimpan di localStorage supaya
// sesi tetap ada setelah refresh; semua akses dibungkus try/catch karena storage bisa diblokir.

const TOKEN_KEY = 'goldenity.superadmin.token';
export const AUTH_EXPIRED_EVENT = 'goldenity:auth-expired';

let memoryToken: string | null = null;

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setStoredToken(token: string) {
  memoryToken = token;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage diblokir: token tetap di memori selama tab terbuka */
  }
}

export function clearStoredToken() {
  memoryToken = null;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

/** Dipanggil saat backend menolak token (401): AuthContext mengeluarkan user ke halaman login. */
export function notifyAuthExpired() {
  clearStoredToken();
  try {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  } catch {
    /* noop */
  }
}
