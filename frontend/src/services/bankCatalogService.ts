import api from './api';
import { BankCatalogEntry } from '../types/payments';

export async function listBankCatalog(): Promise<BankCatalogEntry[]> {
  const response = await api.get<BankCatalogEntry[]>('/bank-catalog');
  return response.data;
}

export async function syncBankCatalog(): Promise<number> {
  const response = await api.post<{ synced: number }>('/admin/bank-catalog/sync');
  return response.data.synced;
}
