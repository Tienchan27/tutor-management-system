import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import api from '../../services/api';
import { clearAuthSession, markProfileCompleted, setAuthUserName } from '../../utils/storage';
import { normalizeProfilePayload, requirePhoneOrFacebook } from '../../utils/validation';
import { ApiErrorResponse, AuthUser } from '../../types/auth';
import { ProfileResponse } from '../../types/profile';

interface ProfileCompletionProps {
  user: AuthUser | null;
  onCompleted?: () => void;
  onError?: (message: string) => void;
}

interface ProfileFormState {
  name: string;
  phoneNumber: string;
  facebookUrl: string;
  parentPhone: string;
  address: string;
}

function extractApiErrorMessage(error: unknown): string {
  const details = (error as AxiosError<ApiErrorResponse>)?.response?.data?.details;
  if (details && typeof details === 'object') {
    const firstDetail = Object.values(details).find((value) => typeof value === 'string' && value.trim());
    if (firstDetail) {
      return firstDetail;
    }
  }
  return (error as AxiosError<ApiErrorResponse>)?.response?.data?.message || 'Failed to update profile';
}

function ProfileCompletion({ user, onCompleted, onError }: ProfileCompletionProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileFormState>({
    name: user?.name || '',
    phoneNumber: '',
    facebookUrl: '',
    parentPhone: '',
    address: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);

  function updateField<K extends keyof ProfileFormState>(name: K, value: ProfileFormState[K]): void {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  useEffect(() => {
    let mounted = true;
    async function bootstrap(): Promise<void> {
      try {
        const response = await api.get<ProfileResponse>('/users/me/profile');
        if (!mounted) return;
        setForm((prev) => ({
          ...prev,
          name: response.data.name || prev.name,
          phoneNumber: response.data.phoneNumber || '',
          facebookUrl: response.data.facebookUrl || '',
          parentPhone: response.data.parentPhone || '',
          address: response.data.address || '',
        }));
      } catch (error: unknown) {
        const status = (error as AxiosError<ApiErrorResponse>)?.response?.status;
        if (status === 401 || status === 403) {
          clearAuthSession();
          onError?.('Session expired. Please login with Google again.');
          navigate('/');
          return;
        }
      } finally {
        if (mounted) {
          setBootstrapping(false);
        }
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [onError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!requirePhoneOrFacebook(form.phoneNumber, form.facebookUrl)) {
      onError?.('Provide at least phone number or Facebook URL');
      return;
    }

    setLoading(true);
    try {
      const response = await api.patch<ProfileResponse>('/users/me/profile', normalizeProfilePayload(form));
      setAuthUserName(response.data.name);
      markProfileCompleted();
      onCompleted?.();
    } catch (error: unknown) {
      onError?.(extractApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card featured>
      <h2 className="title title-lg">Complete Profile</h2>
      <p className="subtitle">Welcome {user?.name || 'user'}, complete your profile to continue.</p>
      {bootstrapping ? <p className="muted">Loading profile...</p> : null}
      <form className="auth-form" onSubmit={handleSubmit}>
        <Input label="Email (from Google)" value={user?.email || ''} disabled />
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          required
        />
        <Input
          label="Phone Number"
          value={form.phoneNumber}
          onChange={(e) => updateField('phoneNumber', e.target.value)}
        />
        <Input
          label="Facebook URL"
          value={form.facebookUrl}
          onChange={(e) => updateField('facebookUrl', e.target.value)}
        />
        <Input
          label="Parent Phone (optional)"
          value={form.parentPhone}
          onChange={(e) => updateField('parentPhone', e.target.value)}
        />
        <Input label="Address (optional)" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
        <Button type="submit" loading={loading} disabled={bootstrapping}>
          Save Profile
        </Button>
      </form>
    </Card>
  );
}

export default ProfileCompletion;
