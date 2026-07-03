import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyProfile, updateMyProfile } from '../../services/profileService';
import { UpdateProfileRequest } from '../../types/profile';
import { extractApiErrorMessage } from '../../services/authService';
import { setAuthUserName } from '../../utils/storage';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import SectionBlock from '../../components/ui/SectionBlock';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/feedback/ToastProvider';

function AccountPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdateProfileRequest>({});
  const [saveError, setSaveError] = useState('');

  const { data: profile = null, isLoading: loading, error: loadErrorObj } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name || '',
      phoneNumber: profile.phoneNumber || '',
      facebookUrl: profile.facebookUrl || '',
      parentPhone: profile.parentPhone || '',
      address: profile.address || '',
    });
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateMyProfile({
        name: form.name || null,
        phoneNumber: form.phoneNumber || null,
        facebookUrl: form.facebookUrl || null,
        parentPhone: form.parentPhone || null,
        address: form.address || null,
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(['myProfile'], response);
      setAuthUserName(response.name);
      showToast('Profile updated successfully', 'success');
    },
    onError: (err) => setSaveError(extractApiErrorMessage(err, 'Failed to update profile')),
  });

  const saving = updateMutation.isPending;
  const error = saveError || (loadErrorObj ? extractApiErrorMessage(loadErrorObj, 'Failed to load account profile') : '');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSaveError('');
    updateMutation.mutate();
  }

  return (
    <div className="stack-16">
      <PageHeader title="Account" subtitle="Manage your profile details used across the system." />
      <PageSection>
        {loading ? <Spinner label="Loading profile..." /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {profile ? (
          <form onSubmit={handleSubmit} className="stack-16">
            <SectionBlock title="Account overview">
              <p className="muted mb-0">
                <strong>Name:</strong> {profile.name}
              </p>
              <p className="muted mb-0">
                <strong>Email:</strong> {profile.email}
              </p>
              <p className="muted mb-0">
                <strong>Status:</strong> {profile.status}
              </p>
            </SectionBlock>

            <SectionBlock title="Personal">
              <label className="input-wrapper input-wrapper-tight">
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
            </SectionBlock>

            <SectionBlock title="Contact">
              <div className="grid-form grid-form-no-margin">
                <label className="input-wrapper input-wrapper-tight">
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
                <label className="input-wrapper input-wrapper-tight">
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
            </SectionBlock>

            <SectionBlock title="Guardian">
              <label className="input-wrapper input-wrapper-tight">
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
            </SectionBlock>

            <SectionBlock title="Address">
              <label className="input-wrapper input-wrapper-tight">
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
            </SectionBlock>

            <div className="form-actions">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </div>
          </form>
        ) : null}
      </PageSection>
    </div>
  );
}

export default AccountPage;
