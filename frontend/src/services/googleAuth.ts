import { AxiosResponse } from 'axios';
import api from './api';
import { saveAuthSession } from '../utils/storage';
import { AuthSessionPayload } from '../types/auth';

export async function googleLogin(idToken: string): Promise<AuthSessionPayload> {
  const response = await api.post<AuthSessionPayload>('/auth/google', { idToken });
  saveAuthSession(response.data);
  return response.data;
}

export async function linkGoogleAccount(idToken: string, currentPassword: string): Promise<AxiosResponse<unknown>> {
  return api.post('/auth/google/link', { idToken, currentPassword });
}
