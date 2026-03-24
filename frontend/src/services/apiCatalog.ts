import { ApiDomainGroup } from '../types/apiCatalog';

export const apiCatalog: ApiDomainGroup[] = [
  {
    domain: 'Authentication',
    endpoints: [
      {
        name: 'Register',
        method: 'POST',
        path: '/auth/register',
        auth: 'none',
        body: { name: 'John Doe', email: 'john@example.com', password: 'Password123!' },
      },
      {
        name: 'Verify OTP',
        method: 'POST',
        path: '/auth/verify-otp',
        auth: 'none',
        body: { email: 'john@example.com', otp: '123456' },
      },
      {
        name: 'Resend OTP',
        method: 'POST',
        path: '/auth/resend-otp',
        auth: 'none',
        query: { email: 'john@example.com' },
      },
      {
        name: 'Login',
        method: 'POST',
        path: '/auth/login',
        auth: 'none',
        body: { email: 'john@example.com', password: 'Password123!' },
      },
      {
        name: 'Refresh Token',
        method: 'POST',
        path: '/auth/refresh',
        auth: 'none',
        body: { refreshToken: 'PASTE_REFRESH_TOKEN' },
      },
      {
        name: 'Logout',
        method: 'POST',
        path: '/auth/logout',
        auth: 'bearer',
      },
      {
        name: 'Google Login',
        method: 'POST',
        path: '/auth/google',
        auth: 'none',
        body: { idToken: 'PASTE_GOOGLE_ID_TOKEN' },
      },
      {
        name: 'Link Google Account',
        method: 'POST',
        path: '/auth/google/link',
        auth: 'bearer',
        body: { idToken: 'PASTE_GOOGLE_ID_TOKEN', currentPassword: 'Password123!' },
      },
    ],
  },
  {
    domain: 'User Profile',
    endpoints: [
      { name: 'Get My Profile', method: 'GET', path: '/users/me/profile', auth: 'bearer' },
      {
        name: 'Update My Profile',
        method: 'PATCH',
        path: '/users/me/profile',
        auth: 'bearer',
        body: {
          phoneNumber: '0912345678',
          facebookUrl: 'https://facebook.com/example',
          parentPhone: null,
          address: null,
        },
      },
    ],
  },
  {
    domain: 'Bank Accounts',
    endpoints: [
      {
        name: 'Create Bank Account',
        method: 'POST',
        path: '/bank-accounts',
        auth: 'bearer',
        body: {
          bankName: 'Vietcombank',
          accountNumber: '1234567890',
          accountHolderName: 'John Doe',
          notes: 'Primary account',
        },
      },
      { name: 'List My Bank Accounts', method: 'GET', path: '/bank-accounts/me', auth: 'bearer' },
      {
        name: 'Set Primary Bank Account',
        method: 'PATCH',
        path: '/bank-accounts/{id}/set-primary',
        auth: 'bearer',
        pathParams: { id: 'BANK_ACCOUNT_UUID' },
      },
      {
        name: 'Delete Bank Account',
        method: 'DELETE',
        path: '/bank-accounts/{id}',
        auth: 'bearer',
        pathParams: { id: 'BANK_ACCOUNT_UUID' },
      },
    ],
  },
  {
    domain: 'Admin Bank Accounts',
    endpoints: [
      {
        name: 'Pending Verification Queue',
        method: 'GET',
        path: '/admin/bank-accounts/pending',
        auth: 'bearer',
        requiredRole: 'ADMIN',
      },
      {
        name: 'Verify Bank Account',
        method: 'POST',
        path: '/admin/bank-accounts/{id}/verify',
        auth: 'bearer',
        requiredRole: 'ADMIN',
        pathParams: { id: 'BANK_ACCOUNT_UUID' },
        body: { verified: true, notes: 'Verified by admin' },
      },
    ],
  },
  {
    domain: 'Sessions',
    endpoints: [
      {
        name: 'Create Session',
        method: 'POST',
        path: '/sessions',
        auth: 'bearer',
        body: {
          classId: 'CLASS_UUID',
          date: '2026-03-23',
          durationHours: 2,
          tuitionAtLog: 500000,
          salaryRateAtLog: 0.75,
          payrollMonth: '2026-03',
          note: 'Session note',
        },
      },
      { name: 'Get Sessions by Month', method: 'GET', path: '/sessions', auth: 'bearer', query: { payrollMonth: '2026-03' } },
      {
        name: 'Update Session Financial',
        method: 'PATCH',
        path: '/sessions/{sessionId}/financial',
        auth: 'bearer',
        pathParams: { sessionId: 'SESSION_UUID' },
        body: {
          tuitionAtLog: 550000,
          salaryRateAtLog: 0.8,
          payrollMonth: '2026-03',
          reason: 'Manual adjustment',
          note: 'Updated by tutor',
        },
      },
    ],
  },
  {
    domain: 'Payouts',
    endpoints: [
      {
        name: 'Generate Monthly Payouts',
        method: 'POST',
        path: '/payouts/generate',
        auth: 'bearer',
        query: { month: '2026-03' },
      },
      {
        name: 'Generate Payout QR',
        method: 'POST',
        path: '/payouts/{payoutId}/qr',
        auth: 'bearer',
        pathParams: { payoutId: 'PAYOUT_UUID' },
      },
      {
        name: 'Confirm Payout Paid',
        method: 'POST',
        path: '/payouts/{payoutId}/confirm-paid',
        auth: 'bearer',
        pathParams: { payoutId: 'PAYOUT_UUID' },
      },
    ],
  },
  {
    domain: 'Notifications',
    endpoints: [
      { name: 'Get My Notifications', method: 'GET', path: '/notifications/me', auth: 'bearer' },
      {
        name: 'Mark Notification Read',
        method: 'POST',
        path: '/notifications/{id}/read',
        auth: 'bearer',
        pathParams: { id: 'NOTIFICATION_UUID' },
      },
    ],
  },
  {
    domain: 'Dashboard',
    endpoints: [
      {
        name: 'Admin Tutor Summary',
        method: 'GET',
        path: '/dashboard/admin/tutors/summary',
        auth: 'bearer',
        requiredRole: 'ADMIN',
        query: { month: '2026-03' },
      },
      {
        name: 'Admin Tutor Detail',
        method: 'GET',
        path: '/dashboard/admin/tutors/detail',
        auth: 'bearer',
        requiredRole: 'ADMIN',
        query: { tutorId: 'TUTOR_UUID', month: '2026-03' },
      },
      {
        name: 'Tutor Self Dashboard',
        method: 'GET',
        path: '/dashboard/tutor/me',
        auth: 'bearer',
        requiredRole: 'TUTOR|ADMIN',
      },
    ],
  },
];
