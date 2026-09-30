import { create } from 'zustand';
import { apiClient, ApiClientError } from '@/services/apiClient';
import { clearTokens, readRefreshToken, saveTokens } from '@/services/authToken';
import type { AuthPayload, SessionUser } from '@/types/domain';

interface AuthState {
  user: SessionUser | null;
  /** 'restoring' until the first restoreSession() attempt resolves — guards wait for it. */
  status: 'restoring' | 'idle' | 'loading' | 'authenticated';
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  ensureFreshToken: () => Promise<string>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'restoring',

  async login(email, password) {
    set({ status: 'loading' });
    const payload = await apiClient<AuthPayload>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    saveTokens(payload.tokens.accessToken, payload.tokens.refreshToken);
    set({ user: payload.user, status: 'authenticated' });
  },

  async register(name, email, password) {
    set({ status: 'loading' });
    const payload = await apiClient<AuthPayload>('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    saveTokens(payload.tokens.accessToken, payload.tokens.refreshToken);
    set({ user: payload.user, status: 'authenticated' });
  },

  async logout() {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } catch {
      /* logout even if the API call fails */
    }
    clearTokens();
    set({ user: null, status: 'idle' });
  },

  async restoreSession() {
    if (!readRefreshToken()) {
      set({ status: 'idle' });
      return;
    }
    try {
      const user = await apiClient<SessionUser>('/api/auth/me', {
        method: 'GET',
        auth: true,
      });
      set({ user, status: 'authenticated' });
    } catch {
      // Access expired — try the refresh flow once before giving up.
      try {
        await get().ensureFreshToken();
        const user = await apiClient<SessionUser>('/api/auth/me', { method: 'GET', auth: true });
        set({ user, status: 'authenticated' });
      } catch {
        clearTokens();
        set({ user: null, status: 'idle' });
      }
    }
  },

  async ensureFreshToken() {
    const refresh = readRefreshToken();
    if (!refresh) throw new ApiClientError(401, 'NO_SESSION', 'Not signed in');
    const payload = await apiClient<AuthPayload>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: refresh },
    });
    saveTokens(payload.tokens.accessToken, payload.tokens.refreshToken);
    set({ user: payload.user, status: 'authenticated' });
    return payload.tokens.accessToken;
  },
}));
