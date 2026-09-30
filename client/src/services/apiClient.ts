import type { ApiErrorBody, ApiSuccess } from '@/types/api';
import { readAccessToken } from '@/services/authToken';

/** Client-side mirror of server ApiError semantics. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  searchParams?: Record<string, string | number | undefined>;
  /** Attach the stored access token and retry once through the refresh flow on 401. */
  auth?: boolean;
  /** Internal: prevents infinite refresh recursion. */
  isRetry?: boolean;
};

async function rawRequest<TData>(path: string, options: RequestOptions): Promise<TData> {
  const { method = 'GET', body, signal, searchParams, auth } = options;

  const url = new URL(path, window.location.origin);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = readAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.pathname + url.search, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      credentials: 'same-origin',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Cannot reach the AVIORA API. Is the server running?');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(response.status, 'BAD_RESPONSE', 'The API returned an unreadable response.');
  }

  const envelope = payload as Partial<ApiSuccess<TData>> & Partial<ApiErrorBody>;
  if (!response.ok || envelope.success !== true) {
    throw new ApiClientError(
      response.status,
      envelope.errorCode ?? 'UNKNOWN_ERROR',
      envelope.message ?? `Request failed with status ${response.status}`,
    );
  }
  return envelope.data as TData;
}

/**
 * Typed API client. Unwraps the uniform envelope exactly once, attaches bearer
 * tokens for authenticated calls, and retries once through the refresh flow on 401.
 */
export async function apiClient<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
  try {
    return await rawRequest<TData>(path, options);
  } catch (error) {
    const canRefresh =
      options.auth === true &&
      options.isRetry !== true &&
      error instanceof ApiClientError &&
      error.status === 401;

    if (!canRefresh) throw error;

    // Dynamic import avoids a static circular dependency (authStore -> apiClient).
    const { useAuthStore } = await import('@/store/authStore');
    await useAuthStore.getState().ensureFreshToken();
    return rawRequest<TData>(path, { ...options, isRetry: true });
  }
}
