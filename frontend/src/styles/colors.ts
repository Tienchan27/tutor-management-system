/**
 * @deprecated Use CSS variables in frontend/src/styles/globals.css as the single source of truth.
 */
export const colors = {
  neutral: {
    white: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    background: '#F8FAFC',
    sidebar: '#F1F5F9',
    subtle: '#EEF2F7',
  },
  primary: {
    main: '#F59E0B',
    dark: '#D97706',
    light: '#FFFBEB',
  },
  success: '#2F9E5F',
  warning: '#C88A1E',
  error: '#DC4A4A',
  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
} as const;
