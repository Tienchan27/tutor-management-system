export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  picture: string | null;
  needsProfileCompletion: boolean;
}

export interface AuthSessionPayload {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  picture?: string | null;
  needsProfileCompletion?: boolean;
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

export interface AuthTokensResponse {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  name?: string;
  email?: string;
  phoneNumber?: string | null;
  facebookUrl?: string | null;
}

export interface ApiErrorResponse {
  message?: string;
  details?: Record<string, string>;
}
