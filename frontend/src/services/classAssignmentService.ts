import api from './api';
import {
  ApplyClassResponse,
  AvailableClassResponse,
  PublishClassRequest,
  StudentLookupResponse,
  PublishedClassResponse,
  SubjectOptionResponse,
  TutorClassApplicationResponse,
  UpdateClassRequest,
} from '../types/classAssignment';
import { SliceResponse } from '../types/pagination';

export async function listSubjects(): Promise<SubjectOptionResponse[]> {
  const response = await api.get<SubjectOptionResponse[]>('/admin/classes/subjects');
  return response.data;
}

export async function publishClass(payload: PublishClassRequest): Promise<PublishedClassResponse> {
  const response = await api.post<PublishedClassResponse>('/admin/classes/publish', payload);
  return response.data;
}

export async function lookupStudentByEmail(email: string): Promise<StudentLookupResponse> {
  const response = await api.get<StudentLookupResponse>('/admin/classes/students/lookup', {
    params: { email },
  });
  return response.data;
}

export async function listPublishedClasses(): Promise<SliceResponse<PublishedClassResponse>> {
  const response = await api.get<SliceResponse<PublishedClassResponse>>('/admin/classes/published', {
    params: { page: 0, size: 20, sort: 'createdAt,desc' },
  });
  return response.data;
}

export async function listClassApplications(classId: string): Promise<SliceResponse<TutorClassApplicationResponse>> {
  const response = await api.get<SliceResponse<TutorClassApplicationResponse>>(`/admin/classes/${classId}/applications`, {
    params: { page: 0, size: 20, sort: 'appliedAt,asc' },
  });
  return response.data;
}

export async function approveClassApplication(applicationId: string): Promise<PublishedClassResponse> {
  const response = await api.post<PublishedClassResponse>(`/admin/classes/applications/${applicationId}/approve`);
  return response.data;
}

export async function rejectClassApplication(applicationId: string, reason?: string): Promise<TutorClassApplicationResponse> {
  const response = await api.post<TutorClassApplicationResponse>(`/admin/classes/applications/${applicationId}/reject`, {
    reason: reason || null,
  });
  return response.data;
}

export async function updateClass(classId: string, payload: UpdateClassRequest): Promise<PublishedClassResponse> {
  const response = await api.put<PublishedClassResponse>(`/admin/classes/${classId}`, payload);
  return response.data;
}

export async function deleteClass(classId: string): Promise<void> {
  await api.delete(`/admin/classes/${classId}`);
}

export async function updateClassDisplayName(classId: string, displayName: string): Promise<PublishedClassResponse> {
  const response = await api.patch<PublishedClassResponse>(`/classes/${classId}/display-name`, { displayName });
  return response.data;
}

export async function listAvailableClasses(): Promise<SliceResponse<AvailableClassResponse>> {
  const response = await api.get<SliceResponse<AvailableClassResponse>>('/classes/available', {
    params: { page: 0, size: 20, sort: 'createdAt,desc' },
  });
  return response.data;
}

export async function applyClass(classId: string): Promise<ApplyClassResponse> {
  const response = await api.post<ApplyClassResponse>(`/classes/${classId}/apply`);
  return response.data;
}
