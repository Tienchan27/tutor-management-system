import { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import api from '../../services/api';
import { markProfileCompleted } from '../../utils/storage';
import { normalizeProfilePayload, requirePhoneOrFacebook } from '../../utils/validation';

function ProfileCompletion({ user, onCompleted, onError }) {
  const [form, setForm] = useState({
    phoneNumber: '',
    facebookUrl: '',
    parentPhone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!requirePhoneOrFacebook(form.phoneNumber, form.facebookUrl)) {
      onError?.('Can it nhat phone hoac Facebook URL');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/users/me/profile', normalizeProfilePayload(form));
      markProfileCompleted();
      onCompleted?.();
    } catch (error) {
      onError?.(error?.response?.data?.message || 'Cap nhat ho so that bai');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card featured>
      <h2 className="title" style={{ fontSize: 24 }}>
        Hoan thien ho so
      </h2>
      <p className="subtitle">🎉 Chao mung {user?.name || 'ban'}! Hoan thien thong tin de bat dau.</p>
      <form onSubmit={handleSubmit}>
        <Input label="Email (tu Google)" icon="📧" value={user?.email || ''} disabled />
        <Input
          label="So dien thoai"
          icon="📱"
          value={form.phoneNumber}
          onChange={(e) => updateField('phoneNumber', e.target.value)}
        />
        <Input
          label="Facebook URL"
          icon="👥"
          value={form.facebookUrl}
          onChange={(e) => updateField('facebookUrl', e.target.value)}
        />
        <Input
          label="So dien thoai phu huynh"
          icon="👨‍👩‍👧"
          value={form.parentPhone}
          onChange={(e) => updateField('parentPhone', e.target.value)}
        />
        <Input label="Dia chi" icon="🏠" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
        <Button type="submit" loading={loading}>
          Hoan thanh dang ky
        </Button>
      </form>
    </Card>
  );
}

export default ProfileCompletion;
