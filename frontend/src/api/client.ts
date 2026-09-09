import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { RefreshResponse } from '../types';

// In-memory access token storage (NOT in localStorage to protect against XSS)
let memoryAccessToken: string | null = null;

// Auth error callback to notify AuthContext when a session expires completely
let onAuthFailedCallback: (() => void) | null = null;

export const setAccessToken = (token: string | null) => {
  memoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return memoryAccessToken;
};

export const setOnAuthFailed = (callback: () => void) => {
  onAuthFailedCallback = callback;
};

// Create main Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  // Crucial: sends and receives httpOnly cookies (refreshToken) with requests
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Queue management for concurrent 401s
let isRefreshing = false;
interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach in-memory Access Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 and refresh token automatically
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Endpoints that should not trigger refresh retry logic
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/signup') ||
      originalRequest.url?.includes('/auth/refresh');

    // Only retry once on 401 for non-auth requests
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // If a refresh is already underway, wait in line for the new token
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint directly using a clean axios call (with credentials for cookie)
        const refreshResponse = await axios.post<RefreshResponse>(
          `${import.meta.env.VITE_API_URL || ''}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.accessToken;
        setAccessToken(newAccessToken);

        // Notify and unlock all queued requests with the new token
        processQueue(null, newAccessToken);

        // Retry the original request with the fresh token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token is expired or invalid
        processQueue(refreshError, null);
        setAccessToken(null);
        if (onAuthFailedCallback) {
          onAuthFailedCallback();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
