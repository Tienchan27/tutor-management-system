import api from './api';
import { saveAuthSession } from '../utils/storage';

export async function googleLogin(idToken) {
  const response = await api.post('/auth/google', { idToken });
  saveAuthSession(response.data);
  return response.data;
}

export async function linkGoogleAccount(idToken, currentPassword) {
  return api.post('/auth/google/link', { idToken, currentPassword });
}
