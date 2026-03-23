import axios from 'axios';
import { clearAuthSession, getAccessToken, getRefreshToken } from '../utils/storage';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearAuthSession();
          return Promise.reject(error);
        }
        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
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
