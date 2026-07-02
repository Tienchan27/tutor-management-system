import api from './api';
import { NotificationResponse } from '../types/notifications';
import { SliceResponse } from '../types/pagination';

export async function listMyNotifications(params?: {
  page?: number;
  size?: number;
  sort?: string;
}): Promise<SliceResponse<NotificationResponse>> {
  const response = await api.get<SliceResponse<NotificationResponse>>('/notifications/me', {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 20,
      sort: params?.sort ?? 'createdAt,desc',
    },
  });
  return response.data;
}

export async function markNotificationRead(notificationId: string): Promise<NotificationResponse> {
  const response = await api.post<NotificationResponse>(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await api.post<{ updated: number }>('/notifications/read-all');
  return response.data.updated;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await api.delete(`/notifications/${notificationId}`);
}
