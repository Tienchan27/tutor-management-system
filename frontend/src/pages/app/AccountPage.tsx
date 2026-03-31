import { FormEvent, useEffect, useState } from 'react';
import { getMyProfile, updateMyProfile } from '../../services/profileService';
import { ProfileResponse, UpdateProfileRequest } from '../../types/profile';
import { extractApiErrorMessage } from '../../services/authService';
import { setAuthUserName } from '../../utils/storage';

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
        name: response.name || '',
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
        name: form.name || null,
        phoneNumber: form.phoneNumber || null,
        facebookUrl: form.facebookUrl || null,
        parentPhone: form.parentPhone || null,
        address: form.address || null,
      });
      setProfile(response);
      setAuthUserName(response.name);
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
            <form onSubmit={handleSubmit} className="stack-16">
              <div className="panel">
                <h3 className="section-title">Personal</h3>
                <div className="grid-form" style={{ marginTop: 12 }}>
                  <label className="input-wrapper">
                    <span className="input-label">Full name</span>
                    <div className="input-frame">
                      <input
                        className="input-control"
                        value={form.name || ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Your name"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="panel">
                <h3 className="section-title">Contact</h3>
                <div className="grid-form" style={{ marginTop: 12 }}>
                  <label className="input-wrapper">
                    <span className="input-label">Phone number</span>
                    <div className="input-frame">
                      <input
                        className="input-control"
                        value={form.phoneNumber || ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                        placeholder="e.g. 09xxxxxxxx"
                      />
                    </div>
                  </label>
                  <label className="input-wrapper">
                    <span className="input-label">Facebook URL</span>
                    <div className="input-frame">
                      <input
                        className="input-control"
                        value={form.facebookUrl || ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, facebookUrl: event.target.value }))}
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="panel">
                <h3 className="section-title">Guardian</h3>
                <div className="grid-form" style={{ marginTop: 12 }}>
                  <label className="input-wrapper">
                    <span className="input-label">Parent phone</span>
                    <div className="input-frame">
                      <input
                        className="input-control"
                        value={form.parentPhone || ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, parentPhone: event.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="panel">
                <h3 className="section-title">Address</h3>
                <div className="grid-form" style={{ marginTop: 12 }}>
                  <label className="input-wrapper">
                    <span className="input-label">Address</span>
                    <div className="input-frame">
                      <input
                        className="input-control"
                        value={form.address || ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="panel">
                <h3 className="section-title">Security</h3>
                <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
                  Security settings will appear here (password, Google link, sessions). For now, you can update your profile details above.
                </p>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary compact-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AccountPage;
