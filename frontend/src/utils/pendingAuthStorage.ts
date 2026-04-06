const PENDING_VERIFICATION_EMAIL_KEY = 'tms:pendingVerificationEmail';
const GOOGLE_LINK_OTP_CHALLENGE_KEY = 'tms:googleLinkOtpChallenge';
const PENDING_PASSWORD_RESET_KEY = 'tms:pendingPasswordReset';

export interface GoogleLinkOtpChallengePersisted {
  email: string;
  idToken: string;
}

export interface PendingPasswordResetPersisted {
  email: string;
  requestedAt: number;
}

function safeGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore quota / private mode
  }
}

function safeRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function safeGetLocalItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / private mode
  }
}

function safeRemoveLocalItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getPendingVerificationEmail(): string | null {
  const v = safeGetItem(PENDING_VERIFICATION_EMAIL_KEY);
  return v && v.trim() ? v.trim().toLowerCase() : null;
}

export function setPendingVerificationEmail(email: string): void {
  safeSetItem(PENDING_VERIFICATION_EMAIL_KEY, email.trim().toLowerCase());
}

export function clearPendingVerificationEmail(): void {
  safeRemoveItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export function getGoogleLinkOtpChallenge(): GoogleLinkOtpChallengePersisted | null {
  const raw = safeGetItem(GOOGLE_LINK_OTP_CHALLENGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as GoogleLinkOtpChallengePersisted;
    if (parsed?.email && parsed?.idToken) {
      return parsed;
    }
  } catch {
    // invalid JSON
  }
  safeRemoveItem(GOOGLE_LINK_OTP_CHALLENGE_KEY);
  return null;
}

export function setGoogleLinkOtpChallenge(challenge: GoogleLinkOtpChallengePersisted): void {
  safeSetItem(GOOGLE_LINK_OTP_CHALLENGE_KEY, JSON.stringify(challenge));
}

export function clearGoogleLinkOtpChallenge(): void {
  safeRemoveItem(GOOGLE_LINK_OTP_CHALLENGE_KEY);
}

export function getPendingPasswordReset(): PendingPasswordResetPersisted | null {
  const raw = safeGetLocalItem(PENDING_PASSWORD_RESET_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PendingPasswordResetPersisted;
    if (parsed?.email && typeof parsed?.requestedAt === 'number') {
      return {
        email: parsed.email.trim().toLowerCase(),
        requestedAt: parsed.requestedAt,
      };
    }
  } catch {
    // invalid JSON
  }
  safeRemoveLocalItem(PENDING_PASSWORD_RESET_KEY);
  return null;
}

export function setPendingPasswordReset(email: string, requestedAt: number): void {
  safeSetLocalItem(
    PENDING_PASSWORD_RESET_KEY,
    JSON.stringify({
      email: email.trim().toLowerCase(),
      requestedAt,
    })
  );
}

export function clearPendingPasswordReset(): void {
  safeRemoveLocalItem(PENDING_PASSWORD_RESET_KEY);
}
