import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createBankAccount, listMyBankAccounts } from '../services/bankAccountService';
import { extractApiErrorMessage } from '../services/authService';
import { CreateBankAccountRequest } from '../types/bankAccounts';
import { setNeedsTutorOnboarding } from '../utils/storage';
import BankSelect from '../components/payments/BankSelect';
import { useBankCatalog } from '../hooks/useBankCatalog';
import { queryKeys } from '../lib/queryKeys';

const initialForm: CreateBankAccountRequest = {
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
  bankBin: '',
};

function TutorOnboardingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateBankAccountRequest>(initialForm);
  const [submitError, setSubmitError] = useState<string>('');

  const { banks, isLoading: banksLoading, error: banksError, refetch: refetchBanks } = useBankCatalog();

  const { data: items = [], isLoading: loading, error: loadErrorObj } = useQuery({
    queryKey: queryKeys.tutorBankAccounts,
    queryFn: listMyBankAccounts,
  });

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
  const error =
    submitError ||
    banksError ||
    (loadErrorObj ? extractApiErrorMessage(loadErrorObj, 'Failed to load bank accounts') : '');
  const canSubmit =
    !!form.bankBin && !!form.accountNumber.trim() && !!form.accountHolderName.trim() && !banksLoading;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canSubmit) {
      setSubmitError('Select a bank and fill in account details.');
      return;
    }
    setSubmitError('');
    createMutation.mutate();
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="card">
          <h2 className="title title-lg">Tutor onboarding</h2>
          <p className="subtitle">
            Before entering the workspace, add at least one bank account for salary payouts. Choose the bank from the
            catalog so VietQR payouts work.
          </p>
          {loading ? <p className="muted">Checking your account status...</p> : null}
          {banksLoading && !banks.length ? <p className="muted">Loading bank catalog…</p> : null}
          <form onSubmit={handleSubmit} className="grid-form">
            <BankSelect
              banks={banks}
              valueBin={form.bankBin ?? ''}
              disabled={banksLoading && !banks.length}
              onSelect={(bank) =>
                setForm((prev) => ({
                  ...prev,
                  bankName: bank.shortName,
                  bankBin: bank.bin,
                  bankCode: bank.code,
                }))
              }
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
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting || loading || !canSubmit}>
              {submitting ? 'Saving...' : 'Save and continue'}
            </button>
          </form>
          {banksError ? (
            <button type="button" className="btn btn-secondary btn-block" onClick={() => refetchBanks()}>
              Retry loading banks
            </button>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
          {!!items.length ? <p className="muted">Existing accounts found: {items.length}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default TutorOnboardingPage;
