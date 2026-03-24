export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'BLOCKED';
  defaultSalaryRate: number;
  phoneNumber: string | null;
  facebookUrl: string | null;
  parentPhone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  phoneNumber?: string | null;
  facebookUrl?: string | null;
  parentPhone?: string | null;
  address?: string | null;
}
