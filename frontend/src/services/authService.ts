import { AxiosResponse } from 'axios';
import api from './api';
import { saveAuthSession } from '../utils/storage';
import {
  ApiErrorResponse,
  AuthTokensResponse,
  VerifyGoogleLinkOtpPayload,
  GoogleAuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyOtpPayload,
} from '../types/auth';

export async function login(payload: LoginPayload): Promise<AuthTokensResponse> {
  const response = await api.post<AuthTokensResponse>('/auth/login', payload);
  const data = response.data;
  saveAuthSession({
    userId: data.userId,
    email: data.email,
    name: data.name || data.email?.split('@')[0] || 'User',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    needsProfileCompletion: !!data.needsProfileCompletion,
    needsTutorOnboarding: !!data.needsTutorOnboarding,
    roles: data.roles,
    activeRole: data.activeRole,
  });
  return data;
}

export async function register(payload: RegisterPayload): Promise<AxiosResponse<unknown>> {
  return api.post('/auth/register', payload);
}

export async function resendOtp(email: string): Promise<void> {
  await api.post('/auth/resend-otp', null, {
    params: { email },
  });
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<AuthTokensResponse> {
  const response = await api.post<AuthTokensResponse>('/auth/verify-otp', payload);
  const data = response.data;
  saveAuthSession({
    userId: data.userId,
    email: data.email,
    name: data.name || data.email?.split('@')[0] || 'User',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    needsProfileCompletion: !!data.needsProfileCompletion,
    needsTutorOnboarding: !!data.needsTutorOnboarding,
    roles: data.roles,
    activeRole: data.activeRole,
  });
  return data;
}

export async function switchRole(activeRole: 'ADMIN' | 'TUTOR' | 'STUDENT'): Promise<AuthTokensResponse> {
  const response = await api.post<AuthTokensResponse>('/auth/switch-role', { activeRole });
  const data = response.data;
  saveAuthSession({
    userId: data.userId,
    email: data.email,
    name: data.name || data.email?.split('@')[0] || 'User',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    needsProfileCompletion: !!data.needsProfileCompletion,
    needsTutorOnboarding: !!data.needsTutorOnboarding,
    roles: data.roles,
    activeRole: data.activeRole,
  });
  return data;
}

export async function verifyGoogleLinkOtp(payload: VerifyGoogleLinkOtpPayload): Promise<GoogleAuthResponse> {
  const response = await api.post<GoogleAuthResponse>('/auth/google/verify-link-otp', payload);
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/forgot-password', payload);
  return response.data;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/reset-password', payload);
  return response.data;
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const maybeError = error as { response?: { data?: ApiErrorResponse } };
  return maybeError?.response?.data?.message || fallback;
}
