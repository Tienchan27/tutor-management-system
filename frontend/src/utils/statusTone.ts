export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

export function payoutTone(status: string): StatusTone {
  if (status === 'PAID') {
    return 'success';
  }
  if (status === 'LOCKED' || status === 'PENDING') {
    return 'warning';
  }
  return 'danger';
}

export function invoiceTone(status: string): StatusTone {
  const normalized = status.toUpperCase();
  if (normalized === 'PAID') {
    return 'success';
  }
  if (normalized === 'OVERDUE') {
    return 'danger';
  }
  if (normalized === 'CANCELLED') {
    return 'neutral';
  }
  return 'warning';
}
