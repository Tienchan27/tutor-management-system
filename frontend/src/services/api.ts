import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { clearAuthSession, getAccessToken, getRefreshToken } from '../utils/storage';

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
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
  return PUBLIC_AUTH_ENDPOINTS.has(path);
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
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearAuthSession();
          return Promise.reject(error);
        }
        const response = await axios.post<RefreshTokenResponse>(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: rotatedRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', rotatedRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAuthSession();
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
