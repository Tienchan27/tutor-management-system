import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBankAccount, listMyBankAccounts } from '../services/bankAccountService';
import { extractApiErrorMessage } from '../services/authService';
import { BankAccountResponse, CreateBankAccountRequest } from '../types/bankAccounts';
import { setNeedsTutorOnboarding } from '../utils/storage';

const initialForm: CreateBankAccountRequest = {
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
};

function TutorOnboardingPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BankAccountResponse[]>([]);
  const [form, setForm] = useState<CreateBankAccountRequest>(initialForm);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const loadAccounts = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const response = await listMyBankAccounts();
      setItems(response);
      if (response.length > 0) {
        setNeedsTutorOnboarding(false);
        navigate('/app', { replace: true });
      }
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load bank accounts'));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createBankAccount(form);
      setNeedsTutorOnboarding(false);
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to create bank account'));
    } finally {
      setSubmitting(false);
    }
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
