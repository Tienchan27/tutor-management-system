interface ProfileFormInput {
  phoneNumber: string;
  facebookUrl: string;
  parentPhone: string;
  address: string;
}

export interface NormalizedProfilePayload {
  phoneNumber: string | null;
  facebookUrl: string | null;
  parentPhone: string | null;
  address: string | null;
}

export function requirePhoneOrFacebook(phoneNumber: string, facebookUrl: string): boolean {
  const hasPhone = !!phoneNumber?.trim();
  const hasFacebook = !!facebookUrl?.trim();
  return hasPhone || hasFacebook;
}

function normalizePhoneValue(value: string): string | null {
  if (!value) {
    return null;
  }
  const cleaned = value.replace(/[\s.-]/g, '').trim();
  return cleaned || null;
}

function normalizeFacebookUrl(value: string): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function normalizeProfilePayload(form: ProfileFormInput): NormalizedProfilePayload {
  return {
    phoneNumber: normalizePhoneValue(form.phoneNumber),
    facebookUrl: normalizeFacebookUrl(form.facebookUrl),
    parentPhone: normalizePhoneValue(form.parentPhone),
    address: form.address?.trim() || null,
  };
}
