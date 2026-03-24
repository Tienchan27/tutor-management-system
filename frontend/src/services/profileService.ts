import api from './api';
import { ProfileResponse, UpdateProfileRequest } from '../types/profile';

export async function getMyProfile(): Promise<ProfileResponse> {
  const response = await api.get<ProfileResponse>('/users/me/profile');
  return response.data;
}

export async function updateMyProfile(payload: UpdateProfileRequest): Promise<ProfileResponse> {
  const response = await api.patch<ProfileResponse>('/users/me/profile', payload);
  return response.data;
}
