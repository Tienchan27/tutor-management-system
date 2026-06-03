import { useCallback, useState } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string;
  run: () => Promise<void>;
  setData: (value: T | null) => void;
}

export function useAsync<T>(task: () => Promise<T>, initial: T | null = null): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await task();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [task]);

  return { data, loading, error, run, setData };
}
