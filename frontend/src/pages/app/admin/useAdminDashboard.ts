import { useQuery } from '@tanstack/react-query';
import { getAdminDashboardSnapshot } from '../../../services/dashboardService';
import { queryKeys } from '../../../lib/queryKeys';

export function useAdminDashboard(month: string) {
  return useQuery({
    queryKey: queryKeys.adminDashboard.month(month),
    queryFn: () => getAdminDashboardSnapshot(month),
  });
}
