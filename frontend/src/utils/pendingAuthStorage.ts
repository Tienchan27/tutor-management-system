const PENDING_VERIFICATION_EMAIL_KEY = 'tms:pendingVerificationEmail';
const GOOGLE_LINK_OTP_CHALLENGE_KEY = 'tms:googleLinkOtpChallenge';

export interface GoogleLinkOtpChallengePersisted {
  email: string;
  idToken: string;
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
