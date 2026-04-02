import api from './api';
import {
  CreateSessionRequest,
  SessionListItem,
  SessionResponse,
  TutorSessionClassOptionResponse,
  UpdateSessionFinancialRequest,
} from '../types/sessions';
import { SliceResponse } from '../types/pagination';

export async function listSessionsByPayrollMonth(
  payrollMonth: string,
  page = 0,
  size = 50
): Promise<SliceResponse<SessionListItem>> {
  const response = await api.get<SliceResponse<SessionListItem>>('/sessions', {
    params: { payrollMonth, page, size },
  });
  return response.data;
}

export async function createSession(payload: CreateSessionRequest): Promise<SessionResponse> {
  const response = await api.post<SessionResponse>('/sessions', payload);
  return response.data;
}

export async function listMySessionClasses(): Promise<TutorSessionClassOptionResponse[]> {
  const response = await api.get<TutorSessionClassOptionResponse[]>('/sessions/my-classes');
  return response.data;
}

export async function updateSessionFinancial(
  sessionId: string,
  payload: UpdateSessionFinancialRequest
): Promise<SessionResponse> {
  const response = await api.patch<SessionResponse>(`/sessions/${sessionId}/financial`, payload);
  return response.data;
}
