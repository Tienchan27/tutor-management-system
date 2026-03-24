import api from './api';
import { NotificationResponse } from '../types/notifications';

export async function listMyNotifications(): Promise<NotificationResponse[]> {
  const response = await api.get<NotificationResponse[]>('/notifications/me');
  return response.data;
}

export async function markNotificationRead(notificationId: string): Promise<NotificationResponse> {
  const response = await api.post<NotificationResponse>(`/notifications/${notificationId}/read`);
  return response.data;
}
