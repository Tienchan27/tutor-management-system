import api from './api';
import { saveAuthSession } from '../utils/storage';

export async function login(payload) {
  const response = await api.post('/auth/login', payload);
  const data = response.data;
  saveAuthSession({
    userId: data.userId,
    email: data.email,
    name: data.email?.split('@')[0] || 'User',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    needsProfileCompletion: false,
  });
  return data;
}

export async function register(payload) {
  return api.post('/auth/register', payload);
}

export async function verifyOtp(payload) {
  const response = await api.post('/auth/verify-otp', payload);
  const data = response.data;
  saveAuthSession({
    userId: data.userId,
    email: data.email,
    name: data.email?.split('@')[0] || 'User',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    needsProfileCompletion: true,
  });
  return data;
}

export async function logout() {
  await api.post('/auth/logout');
}
