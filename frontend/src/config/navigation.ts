import { NavItemConfig } from '../types/app';

export const navigationItems: NavItemConfig[] = [
  { label: 'Tutor Management', path: '/app/admin/tutors', roles: ['ADMIN'] },
  { label: 'Class Assignment', path: '/app/admin/class-assignment', roles: ['ADMIN'] },
  { label: 'Payouts', path: '/app/admin/payouts', roles: ['ADMIN'] },
  { label: 'Tutor Dashboard', path: '/app/tutor/dashboard', roles: ['TUTOR'] },
  { label: 'Class Marketplace', path: '/app/tutor/available-classes', roles: ['TUTOR'] },
  { label: 'Sessions', path: '/app/tutor/sessions', roles: ['TUTOR'] },
  { label: 'Bank Accounts', path: '/app/tutor/bank-accounts', roles: ['TUTOR'] },
  { label: 'Classes', path: '/app/student/classes', roles: ['STUDENT'] },
  { label: 'Invoices', path: '/app/student/invoices', roles: ['STUDENT'] },
  { label: 'Payments', path: '/app/student/payments', roles: ['STUDENT'] },
  { label: 'Notifications', path: '/app/notifications', roles: ['ADMIN', 'TUTOR', 'STUDENT'] },
  { label: 'Account', path: '/app/account', roles: ['ADMIN', 'TUTOR', 'STUDENT'] },
];
