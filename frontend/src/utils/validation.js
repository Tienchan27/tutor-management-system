export function requirePhoneOrFacebook(phoneNumber, facebookUrl) {
  const hasPhone = !!phoneNumber?.trim();
  const hasFacebook = !!facebookUrl?.trim();
  return hasPhone || hasFacebook;
}

export function normalizeProfilePayload(form) {
  return {
    phoneNumber: form.phoneNumber?.trim() || null,
    facebookUrl: form.facebookUrl?.trim() || null,
    parentPhone: form.parentPhone?.trim() || null,
    address: form.address?.trim() || null,
  };
}
