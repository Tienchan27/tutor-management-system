import api from './api';
import { CenterBankAccount, UpdateCenterBankAccountRequest } from '../types/payments';

export async function getCenterAccount(): Promise<CenterBankAccount | null> {
  const response = await api.get<CenterBankAccount | null>('/admin/center-account');
  return response.data;
}

export async function updateCenterAccount(payload: UpdateCenterBankAccountRequest): Promise<CenterBankAccount> {
  const response = await api.put<CenterBankAccount>('/admin/center-account', payload);
  return response.data;
}
