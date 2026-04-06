import { useEffect, useState } from 'react';
import { AppRole } from '../types/app';
import { resolveRolesByApi } from '../services/accessService';
import { realtimeEventBus } from '../services/realtimeEventBus';

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

    const unsubscribe = realtimeEventBus.subscribe('ROLE_CHANGED', async () => {
      // Re-resolve roles so UI unlocks/locks features without logout.
      await resolve();
    });
    return () => {
      unsubscribe();
      mounted = false;
    };
  }, []);

  return { roles, loading, error };
}
