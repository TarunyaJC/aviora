/**
 * Token storage policy (documented in UI_DESIGN.md):
 * - Access token: sessionStorage (cleared when the tab closes; short TTL anyway).
 * - Refresh token: localStorage (survives reloads; rotation on every refresh).
 * - Passwords / card data / secrets are never persisted client-side.
 */

const ACCESS_KEY = 'aviora.access';
const REFRESH_KEY = 'aviora.refresh';

export function saveTokens(access: string, refresh: string): void {
  try {
    sessionStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* storage unavailable (private mode) — session simply won't persist */
  }
}

export function readAccessToken(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function readRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  try {
    sessionStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* noop */
  }
}
