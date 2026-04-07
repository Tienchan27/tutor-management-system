import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { clearAuthSession, getAccessToken } from '../utils/storage';
import { refreshSessionFromStorage } from './sessionRefresh';

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/login',
  '/auth/refresh',
  '/auth/google',
]);

function normalizePath(url?: string): string {
  if (!url) {
    return '';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url;
    }
  }
  return url.startsWith('/') ? url : `/${url}`;
}

function isPublicAuthEndpoint(url?: string): boolean {
  const path = normalizePath(url);
  if (PUBLIC_AUTH_ENDPOINTS.has(path)) {
    return true;
  }
  // Some runtime/build combinations keep "/api" prefix in axios config.url.
  if (path.startsWith('/api/')) {
    const withoutApiPrefix = path.substring(4);
    return PUBLIC_AUTH_ENDPOINTS.has(withoutApiPrefix);
  }
  return false;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = getAccessToken();
  if (token && !isPublicAuthEndpoint(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError): Promise<AxiosResponse> => {
    const originalRequest = (error.config || {}) as RetryRequestConfig;
    const requestIsPublicAuth = isPublicAuthEndpoint(originalRequest.url);
    if (error.response?.status === 401 && !originalRequest._retry && !requestIsPublicAuth) {
      originalRequest._retry = true;
      const result = await refreshSessionFromStorage();
      if (result === 'ok') {
        const accessToken = getAccessToken();
        if (!accessToken) {
          clearAuthSession();
          return Promise.reject(error);
        }
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      }
      clearAuthSession();
      if (result === 'failed') {
        window.location.href = '/';
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default api;
