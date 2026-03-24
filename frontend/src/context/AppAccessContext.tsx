import { createContext, ReactNode, useContext } from 'react';
import { AppRole } from '../types/app';

interface AppAccessContextValue {
  roles: AppRole[];
}

const AppAccessContext = createContext<AppAccessContextValue>({ roles: ['STUDENT'] });

interface AppAccessProviderProps {
  roles: AppRole[];
  children: ReactNode;
}

export function AppAccessProvider({ roles, children }: AppAccessProviderProps) {
  return <AppAccessContext.Provider value={{ roles }}>{children}</AppAccessContext.Provider>;
}

export function useAppAccess() {
  return useContext(AppAccessContext);
}
