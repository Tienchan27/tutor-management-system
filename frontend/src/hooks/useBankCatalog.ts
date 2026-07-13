import { useQuery } from '@tanstack/react-query';
import { ensureBankCatalog, listBankCatalog } from '../services/bankCatalogService';
import { extractApiErrorMessage } from '../services/authService';
import { queryKeys } from '../lib/queryKeys';
import type { BankCatalogEntry } from '../types/payments';

/**
 * Loads the bank catalog; if empty, calls ensure (one-shot sync) then refetches.
 */
export function useBankCatalog(): {
  banks: BankCatalogEntry[];
  isLoading: boolean;
  error: string;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: queryKeys.bankCatalog,
    queryFn: async () => {
      let banks = await listBankCatalog();
      if (!banks.length) {
        await ensureBankCatalog();
        banks = await listBankCatalog();
      }
      return banks;
    },
  });

  return {
    banks: query.data ?? [],
    isLoading: query.isLoading || query.isFetching,
    error: query.error ? extractApiErrorMessage(query.error, 'Failed to load banks') : '',
    refetch: () => {
      void query.refetch();
    },
  };
}
