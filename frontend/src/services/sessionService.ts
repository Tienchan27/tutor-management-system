import api from './api';
import { CreateSessionRequest, SessionResponse, UpdateSessionFinancialRequest } from '../types/sessions';

export async function listSessionsByPayrollMonth(payrollMonth: string): Promise<SessionResponse[]> {
  const response = await api.get<SessionResponse[]>('/sessions', {
    params: { payrollMonth },
  });
  return response.data;
}

export async function createSession(payload: CreateSessionRequest): Promise<SessionResponse> {
  const response = await api.post<SessionResponse>('/sessions', payload);
  return response.data;
}

export async function updateSessionFinancial(
  sessionId: string,
  payload: UpdateSessionFinancialRequest
): Promise<SessionResponse> {
  const response = await api.patch<SessionResponse>(`/sessions/${sessionId}/financial`, payload);
  return response.data;
}
