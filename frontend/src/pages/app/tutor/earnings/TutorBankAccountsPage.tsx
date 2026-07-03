import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBankAccount,
  deleteBankAccount,
  listMyBankAccounts,
  setPrimaryBankAccount,
} from '../../../../services/bankAccountService';
import { CreateBankAccountRequest } from '../../../../types/bankAccounts';
import { extractApiErrorMessage } from '../../../../services/authService';
import PageSection from '../../../../components/layout/PageSection';
import SectionBlock from '../../../../components/ui/SectionBlock';
import Button from '../../../../components/ui/Button';
import Spinner from '../../../../components/ui/Spinner';
import EmptyState from '../../../../components/ui/EmptyState';
import StatusPill from '../../../../components/ui/StatusPill';
import { useToast } from '../../../../components/feedback/ToastProvider';

const initialForm: CreateBankAccountRequest = {
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
};

function TutorBankAccountsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateBankAccountRequest>(initialForm);
  const [bankError, setBankError] = useState('');

  const { data: items = [], isLoading: bankLoading } = useQuery({
    queryKey: ['tutorBankAccounts'],
    queryFn: listMyBankAccounts,
  });

  const invalidateBanks = () => queryClient.invalidateQueries({ queryKey: ['tutorBankAccounts'] });

  const createMutation = useMutation({
    mutationFn: () => createBankAccount(form),
    onSuccess: () => {
      showToast('Bank account added', 'success');
      setForm(initialForm);
      setBankError('');
      void invalidateBanks();
    },
    onError: (err) => setBankError(extractApiErrorMessage(err, 'Failed to add bank account')),
  });

  const primaryMutation = useMutation({
    mutationFn: (id: string) => setPrimaryBankAccount(id),
    onSuccess: () => {
      showToast('Primary account updated', 'success');
      void invalidateBanks();
    },
    onError: (err) => setBankError(extractApiErrorMessage(err, 'Failed to set primary account')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBankAccount(id),
    onSuccess: () => {
      showToast('Bank account removed', 'success');
      void invalidateBanks();
    },
    onError: (err) => setBankError(extractApiErrorMessage(err, 'Failed to delete account')),
  });

  function handleCreate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setBankError('');
    createMutation.mutate();
  }

  return (
    <PageSection title="Bank accounts">
      <SectionBlock title="Add account">
        <form onSubmit={handleCreate} className="stack-16">
          <div className="grid-form">
            <input
              className="text-input"
              placeholder="Bank name"
              value={form.bankName}
              onChange={(e) => setForm((prev) => ({ ...prev, bankName: e.target.value }))}
              required
            />
            <input
              className="text-input"
              placeholder="Account number"
              value={form.accountNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
              required
            />
            <input
              className="text-input"
              placeholder="Account holder name"
              value={form.accountHolderName}
              onChange={(e) => setForm((prev) => ({ ...prev, accountHolderName: e.target.value }))}
              required
            />
          </div>
          <div className="form-actions">
            <Button type="submit" loading={createMutation.isPending}>
              Add account
            </Button>
          </div>
        </form>
        {bankError ? <p className="error-text">{bankError}</p> : null}
      </SectionBlock>

      <SectionBlock title="Your accounts">
        {bankLoading ? <Spinner label="Loading accounts..." /> : null}
        {!bankLoading && !items.length ? (
          <EmptyState title="No bank accounts" description="Add an account to receive payouts." />
        ) : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Bank</th>
                  <th scope="col">Account</th>
                  <th scope="col">Holder</th>
                  <th scope="col">Primary</th>
                  <th scope="col">Verified</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.bankName}</td>
                    <td>{item.maskedAccountNumber}</td>
                    <td>{item.accountHolderName}</td>
                    <td>
                      <StatusPill
                        label={item.isPrimary ? 'Primary' : 'Secondary'}
                        tone={item.isPrimary ? 'success' : 'neutral'}
                      />
                    </td>
                    <td>
                      <StatusPill
                        label={item.isVerified ? 'Verified' : 'Pending'}
                        tone={item.isVerified ? 'success' : 'warning'}
                      />
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => primaryMutation.mutate(item.id)}
                          disabled={item.isPrimary}
                        >
                          Set primary
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => deleteMutation.mutate(item.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionBlock>
    </PageSection>
  );
}

export default TutorBankAccountsPage;
