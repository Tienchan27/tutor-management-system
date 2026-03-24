export type AppRole = 'ADMIN' | 'TUTOR' | 'STUDENT';

export interface NavItemConfig {
  label: string;
  path: string;
  roles: AppRole[];
}
