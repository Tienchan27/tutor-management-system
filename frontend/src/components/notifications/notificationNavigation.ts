import { AppRole } from '../../types/app';

export function getNotificationHref(type: string, role: AppRole | undefined): string | null {
  const payoutTypes = ['PAYOUT_PAID', 'PAYOUT_GENERATED', 'PAYOUT_UPDATED'];
  const classTypes = ['CLASS_APPLICATION_APPROVED', 'CLASS_APPLICATION_REJECTED'];

  if (payoutTypes.includes(type)) {
    if (role === 'ADMIN') return '/app/admin/payouts';
    if (role === 'TUTOR') return '/app/tutor/earnings/payouts';
    return null;
  }

  if (type === 'SESSION_FINANCIAL_EDIT') {
    if (role === 'TUTOR') return '/app/tutor/sessions';
    return null;
  }

  if (classTypes.includes(type)) {
    if (role === 'ADMIN') return '/app/admin/classes';
    if (role === 'TUTOR') return '/app/tutor/marketplace';
    return null;
  }

  if (type === 'TUTOR_INVITATION_ACCEPTED') {
    if (role === 'ADMIN') return '/app/admin/tutors';
    return null;
  }

  return null;
}

export function formatNotificationType(type: string): string {
  switch (type) {
    case 'PAYOUT_PAID':
      return 'Payout';
    case 'PAYOUT_GENERATED':
    case 'PAYOUT_UPDATED':
      return 'Payout update';
    case 'SESSION_FINANCIAL_EDIT':
      return 'Session';
    case 'CLASS_APPLICATION_APPROVED':
    case 'CLASS_APPLICATION_REJECTED':
      return 'Class';
    case 'TUTOR_ROLE_REVOKED':
      return 'Access';
    case 'TUTOR_INVITATION_ACCEPTED':
      return 'Invite';
    default:
      return 'Update';
  }
}
