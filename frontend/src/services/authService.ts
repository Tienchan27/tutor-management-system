import { AxiosResponse } from 'axios';
import api from './api';
import { saveAuthSession, setNeedsProfileCompletion } from '../utils/storage';
import {
  ApiErrorResponse,
  AuthTokensResponse,
  LoginPayload,
  RegisterPayload,
  UserProfile,
  VerifyOtpPayload,
} from '../types/auth';

function inferNeedsProfileCompletion(profile: UserProfile): boolean {
  const hasPhone = !!profile?.phoneNumber?.trim?.();
  const hasFacebook = !!profile?.facebookUrl?.trim?.();
  return !(hasPhone || hasFacebook);
}

export async function login(payload: LoginPayload): Promise<AuthTokensResponse> {
  const response = await api.post<AuthTokensResponse>('/auth/login', payload);
  const data = response.data;
  saveAuthSession({
    userId: data.userId,
    email: data.email,
    name: data.email?.split('@')[0] || 'User',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    needsProfileCompletion: true,
  });

  try {
    const profileResponse = await api.get<UserProfile>('/users/me/profile');
    setNeedsProfileCompletion(inferNeedsProfileCompletion(profileResponse.data));
  } catch {
    // Keep conservative default (true) if profile fetch fails.
  }
  return data;
}

export async function register(payload: RegisterPayload): Promise<AxiosResponse<unknown>> {
  return api.post('/auth/register', payload);
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<AuthTokensResponse> {
  const response = await api.post<AuthTokensResponse>('/auth/verify-otp', payload);
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

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const maybeError = error as { response?: { data?: ApiErrorResponse } };
  return maybeError?.response?.data?.message || fallback;
}
