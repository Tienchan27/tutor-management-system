import api from './api';
import { TutorDashboardResponse, TutorSummaryResponse } from '../types/dashboard';

export async function getAdminTutorSummary(month: string): Promise<TutorSummaryResponse[]> {
  const response = await api.get<TutorSummaryResponse[]>('/dashboard/admin/tutors/summary', {
    params: { month },
  });
  return response.data;
}

export async function getAdminTutorDetail(tutorId: string, month: string): Promise<TutorDashboardResponse> {
  const response = await api.get<TutorDashboardResponse>('/dashboard/admin/tutors/detail', {
    params: { tutorId, month },
  });
  return response.data;
}

export async function getTutorDashboard(): Promise<TutorDashboardResponse[]> {
  const response = await api.get<TutorDashboardResponse[]>('/dashboard/tutor/me');
  return response.data;
}
