import { FormEvent, useEffect, useState } from 'react';
import { getMyProfile, updateMyProfile } from '../../services/profileService';
import { ProfileResponse, UpdateProfileRequest } from '../../types/profile';
import { extractApiErrorMessage } from '../../services/authService';

function AccountPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<UpdateProfileRequest>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  async function load(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await getMyProfile();
      setProfile(response);
      setForm({
        phoneNumber: response.phoneNumber || '',
        facebookUrl: response.facebookUrl || '',
        parentPhone: response.parentPhone || '',
        address: response.address || '',
      });
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load account profile'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await updateMyProfile({
        phoneNumber: form.phoneNumber || null,
        facebookUrl: form.facebookUrl || null,
        parentPhone: form.parentPhone || null,
        address: form.address || null,
      });
      setProfile(response);
      setSuccess('Profile updated successfully.');
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to update profile'));
    }
  }

  return (
    <div className="stack-16">
      <div className="card">
        <h2 className="title title-lg">Account</h2>
        <p className="subtitle">Manage your profile details used across the system.</p>
      </div>
      <div className="card">
        {loading ? <p className="muted">Loading...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {profile ? (
          <div className="stack-16">
            <div className="panel">
              <p><strong>Name:</strong> {profile.name}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Status:</strong> {profile.status}</p>
            </div>
            <form onSubmit={handleSubmit} className="grid-form">
              <input
                className="text-input"
                placeholder="Phone number"
                value={form.phoneNumber || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
              />
              <input
                className="text-input"
                placeholder="Facebook URL"
                value={form.facebookUrl || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, facebookUrl: event.target.value }))}
              />
              <input
                className="text-input"
                placeholder="Parent phone"
                value={form.parentPhone || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, parentPhone: event.target.value }))}
              />
              <input
                className="text-input"
                placeholder="Address"
                value={form.address || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              />
              <button type="submit" className="btn btn-primary compact-btn">Save Changes</button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AccountPage;
