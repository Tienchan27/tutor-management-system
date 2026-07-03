import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createBankAccount, listMyBankAccounts } from '../services/bankAccountService';
import { extractApiErrorMessage } from '../services/authService';
import { CreateBankAccountRequest } from '../types/bankAccounts';
import { setNeedsTutorOnboarding } from '../utils/storage';

const initialForm: CreateBankAccountRequest = {
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
};

function TutorOnboardingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateBankAccountRequest>(initialForm);
  const [submitError, setSubmitError] = useState<string>('');

  const { data: items = [], isLoading: loading, error: loadErrorObj } = useQuery({
    queryKey: ['tutorBankAccounts'],
    queryFn: listMyBankAccounts,
  });

  // If the tutor already has an account, skip onboarding.
  useEffect(() => {
    if (items.length > 0) {
      setNeedsTutorOnboarding(false);
      navigate('/app', { replace: true });
    }
  }, [items.length, navigate]);

  const createMutation = useMutation({
    mutationFn: () => createBankAccount(form),
    onSuccess: () => {
      setNeedsTutorOnboarding(false);
      navigate('/app', { replace: true });
    },
    onError: (err) => setSubmitError(extractApiErrorMessage(err, 'Failed to create bank account')),
  });

  const submitting = createMutation.isPending;
  const error = submitError || (loadErrorObj ? extractApiErrorMessage(loadErrorObj, 'Failed to load bank accounts') : '');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitError('');
    createMutation.mutate();
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="card">
          <h2 className="title title-lg">Tutor onboarding</h2>
          <p className="subtitle">Before entering the workspace, add at least one bank account for salary payouts.</p>
          {loading ? <p className="muted">Checking your account status...</p> : null}
          <form onSubmit={handleSubmit} className="grid-form">
            <input
              className="text-input"
              placeholder="Bank name"
              value={form.bankName}
              onChange={(event) => setForm((prev) => ({ ...prev, bankName: event.target.value }))}
              required
            />
            <input
              className="text-input"
              placeholder="Account number"
              value={form.accountNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
              required
            />
            <input
              className="text-input"
              placeholder="Account holder name"
              value={form.accountHolderName}
              onChange={(event) => setForm((prev) => ({ ...prev, accountHolderName: event.target.value }))}
              required
            />
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting || loading}>
              {submitting ? 'Saving...' : 'Save and continue'}
            </button>
          </form>
          {error ? <p className="error-text">{error}</p> : null}
          {!!items.length ? <p className="muted">Existing accounts found: {items.length}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default TutorOnboardingPage;
