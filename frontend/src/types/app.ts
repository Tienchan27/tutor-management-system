import type { LucideIcon } from 'lucide-react';

export type AppRole = 'ADMIN' | 'TUTOR' | 'STUDENT';

export interface NavItemConfig {
  label: string;
  path: string;
  roles: AppRole[];
  disabled?: boolean;
  icon?: LucideIcon;
  group?: string;
}
