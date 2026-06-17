import { NavItemConfig } from '../types/app';
import {
  Users,
  BookOpen,
  DollarSign,
  Receipt,
  LayoutDashboard,
  Search,
  CalendarDays,
  Wallet,
  GraduationCap,
  FileText,
  CreditCard,
  Bell,
} from 'lucide-react';

export const navigationItems: NavItemConfig[] = [
  { label: 'Tutor Management', path: '/app/admin/tutors', roles: ['ADMIN'], icon: Users },
  { label: 'Class management', path: '/app/admin/class-assignment', roles: ['ADMIN'], icon: BookOpen },
  { label: 'Payouts', path: '/app/admin/payouts', roles: ['ADMIN'], icon: DollarSign },
  { label: 'Student tuition', path: '/app/admin/student-invoices', roles: ['ADMIN'], icon: Receipt },
  { label: 'Overview', path: '/app/tutor/dashboard', roles: ['TUTOR'], icon: LayoutDashboard },
  { label: 'My classes', path: '/app/tutor/classes', roles: ['TUTOR'], icon: BookOpen },
  { label: 'Sessions', path: '/app/tutor/sessions', roles: ['TUTOR'], icon: CalendarDays },
  { label: 'Find classes', path: '/app/tutor/available-classes', roles: ['TUTOR'], icon: Search },
  { label: 'Earnings', path: '/app/tutor/earnings', roles: ['TUTOR'], icon: Wallet },
  { label: 'Classes', path: '/app/student/classes', roles: ['STUDENT'], icon: GraduationCap },
  { label: 'Invoices', path: '/app/student/invoices', roles: ['STUDENT'], icon: FileText },
  { label: 'Payments', path: '/app/student/payments', roles: ['STUDENT'], disabled: true, icon: CreditCard },
  { label: 'Notifications', path: '/app/notifications', roles: ['ADMIN', 'TUTOR', 'STUDENT'], icon: Bell },
];
