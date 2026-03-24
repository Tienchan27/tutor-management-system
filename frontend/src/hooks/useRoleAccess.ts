import { useEffect, useState } from 'react';
import { AppRole } from '../types/app';
import { resolveRolesByApi } from '../services/accessService';

interface RoleAccessState {
  roles: AppRole[];
  loading: boolean;
  error: string;
}

export function useRoleAccess(): RoleAccessState {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    async function resolve(): Promise<void> {
      try {
        setLoading(true);
        setError('');
        const nextRoles = await resolveRolesByApi();
        if (mounted) {
          setRoles(nextRoles);
        }
      } catch {
        if (mounted) {
          setRoles(['STUDENT']);
          setError('Unable to resolve role access from API, fallback to student view.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    resolve();
    return () => {
      mounted = false;
    };
  }, []);

  return { roles, loading, error };
}
