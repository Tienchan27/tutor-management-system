import api from './api';
import {
  AdminTutorDetailResponse,
  InviteTutorRequest,
  InviteTutorResponse,
  TutorClassOverviewResponse,
  TutorClassRosterResponse,
  TutorDashboardResponse,
  TutorSummaryResponse,
} from '../types/dashboard';
import { SliceResponse } from '../types/pagination';

export async function getAdminTutorSummary(
  month: string,
  page = 0,
  size = 50
): Promise<SliceResponse<TutorSummaryResponse>> {
  const response = await api.get<SliceResponse<TutorSummaryResponse>>('/dashboard/admin/tutors/summary', {
    params: { month, page, size },
  });
  return response.data;
}

export async function getAdminTutorDetail(tutorId: string, month: string): Promise<AdminTutorDetailResponse> {
  const response = await api.get<AdminTutorDetailResponse>('/dashboard/admin/tutors/detail', {
    params: { tutorId, month },
  });
  return response.data;
}

export async function getTutorDashboard(): Promise<TutorDashboardResponse[]> {
  const response = await api.get<TutorDashboardResponse[]>('/dashboard/tutor/me');
  return response.data;
}

export async function getTutorClassOverview(): Promise<TutorClassOverviewResponse[]> {
  const response = await api.get<TutorClassOverviewResponse[]>('/dashboard/tutor/classes');
  return response.data;
}

export async function getTutorClassRoster(classId: string): Promise<TutorClassRosterResponse> {
  const response = await api.get<TutorClassRosterResponse>(`/dashboard/tutor/classes/${classId}/roster`);
  return response.data;
}

export async function inviteTutor(payload: InviteTutorRequest): Promise<InviteTutorResponse> {
  const response = await api.post<InviteTutorResponse>('/admin/tutors/invite', payload);
  return response.data;
}

export async function revokeTutorRole(tutorId: string): Promise<{ message: string }> {
  const response = await api.patch<{ message: string }>(`/admin/tutors/${tutorId}/revoke-tutor-role`, null);
  return response.data;
}
