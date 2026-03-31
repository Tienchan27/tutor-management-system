import api from './api';
import { ApiMessageResponse } from '../types/common';
import { BankAccountResponse, CreateBankAccountRequest } from '../types/bankAccounts';

export async function listMyBankAccounts(): Promise<BankAccountResponse[]> {
  const response = await api.get<BankAccountResponse[]>('/bank-accounts/me');
  return response.data;
}

export async function createBankAccount(payload: CreateBankAccountRequest): Promise<BankAccountResponse> {
  const response = await api.post<BankAccountResponse>('/bank-accounts', payload);
  return response.data;
}

export async function setPrimaryBankAccount(id: string): Promise<BankAccountResponse> {
  const response = await api.patch<BankAccountResponse>(`/bank-accounts/${id}/set-primary`);
  return response.data;
}

export async function deleteBankAccount(id: string): Promise<ApiMessageResponse> {
  const response = await api.delete<ApiMessageResponse>(`/bank-accounts/${id}`);
  return response.data;
}

