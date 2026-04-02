import { AppRole } from './app';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  picture: string | null;
  needsProfileCompletion: boolean;
  needsTutorOnboarding: boolean;
  roles: AppRole[];
  activeRole: AppRole;
}

export interface AuthSessionPayload {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  picture?: string | null;
  needsProfileCompletion?: boolean;
  needsTutorOnboarding?: boolean;
  roles?: AppRole[];
  activeRole?: AppRole;
  isNewUser?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface AuthTokensResponse {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  needsProfileCompletion: boolean;
  needsTutorOnboarding: boolean;
  roles: AppRole[];
  activeRole: AppRole;
}

export interface GoogleAuthResponse extends AuthTokensResponse {
  picture?: string | null;
  isNewUser?: boolean;
  authStatus?: 'AUTHENTICATED' | 'PENDING_LINK_OTP';
  challengeEmail?: string | null;
}

export interface VerifyGoogleLinkOtpPayload {
  email: string;
  idToken: string;
  otp: string;
}

export interface UserProfile {
  name?: string;
  email?: string;
  phoneNumber?: string | null;
  facebookUrl?: string | null;
}

export interface ApiErrorResponse {
  code?: string;
  message?: string;
  details?: Record<string, string>;
}
