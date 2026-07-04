import { AppRole, NavItemConfig } from '../types/app';
import {
  Users,
  BookOpen,
  DollarSign,
  Receipt,
  Search,
  CalendarDays,
  Wallet,
  GraduationCap,
  FileText,
  Home,
  Landmark,
} from 'lucide-react';

export const navigationItems: NavItemConfig[] = [
  { label: 'Home', path: '/app/admin/dashboard', roles: ['ADMIN'], icon: Home },
  { label: 'Classes', path: '/app/admin/classes', roles: ['ADMIN'], icon: BookOpen },
  { label: 'Tutors', path: '/app/admin/tutors', roles: ['ADMIN'], icon: Users },
  {
    label: 'Tutor payouts',
    path: '/app/admin/payouts',
    roles: ['ADMIN'],
    icon: DollarSign,
    group: 'Monthly close',
  },
  {
    label: 'Student billing',
    path: '/app/admin/student-billing',
    roles: ['ADMIN'],
    icon: Receipt,
    group: 'Monthly close',
  },
  {
    label: 'Center account',
    path: '/app/admin/center-account',
    roles: ['ADMIN'],
    icon: Landmark,
    group: 'Settings',
  },

  { label: 'Home', path: '/app/tutor/home', roles: ['TUTOR'], icon: Home },
  { label: 'Classes', path: '/app/tutor/classes', roles: ['TUTOR'], icon: BookOpen },
  { label: 'Sessions', path: '/app/tutor/sessions', roles: ['TUTOR'], icon: CalendarDays },
  { label: 'Marketplace', path: '/app/tutor/marketplace', roles: ['TUTOR'], icon: Search },
  { label: 'Earnings', path: '/app/tutor/earnings', roles: ['TUTOR'], icon: Wallet, group: 'Pay' },

  { label: 'Home', path: '/app/student/home', roles: ['STUDENT'], icon: Home },
  { label: 'Classes', path: '/app/student/classes', roles: ['STUDENT'], icon: GraduationCap },
  { label: 'Billing', path: '/app/student/billing', roles: ['STUDENT'], icon: FileText },
];

export interface NavGroup {
  group: string | null;
  items: NavItemConfig[];
}

export function getNavigationGroups(role: AppRole): NavGroup[] {
  const items = navigationItems.filter((item) => item.roles.includes(role) && !item.disabled);
  const groups: NavGroup[] = [];
  let currentGroup: string | null | undefined = undefined;

  for (const item of items) {
    const group = item.group ?? null;
    if (group !== currentGroup) {
      groups.push({ group, items: [item] });
      currentGroup = group;
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }

  const disabledItems = navigationItems.filter((item) => item.roles.includes(role) && item.disabled);
  if (disabledItems.length) {
    groups.push({ group: null, items: disabledItems });
  }

  return groups;
}
