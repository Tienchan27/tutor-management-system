import { FormEvent, useEffect, useState } from 'react';
import {
  createBankAccount,
  deleteBankAccount,
  listMyBankAccounts,
  setPrimaryBankAccount,
} from '../../services/bankAccountService';
import { BankAccountResponse, CreateBankAccountRequest } from '../../types/bankAccounts';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import { useToast } from '../../components/feedback/ToastProvider';

const initialForm: CreateBankAccountRequest = {
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
};

function TutorBankAccountsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<BankAccountResponse[]>([]);
  const [form, setForm] = useState<CreateBankAccountRequest>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      setItems(await listMyBankAccounts());
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load bank accounts'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    try {
      await createBankAccount(form);
      showToast('Bank account added', 'success');
      setForm(initialForm);
      await load();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to add bank account'));
    }
  }

  async function handleSetPrimary(id: string): Promise<void> {
    setError('');
    try {
      await setPrimaryBankAccount(id);
      showToast('Primary account updated', 'success');
      await load();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to set primary account'));
    }
  }

  async function handleDelete(id: string): Promise<void> {
    setError('');
    try {
      await deleteBankAccount(id);
      showToast('Bank account removed', 'success');
      await load();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to delete account'));
    }
  }

  return (
    <div className="stack-16">
      <PageHeader title="Bank accounts" subtitle="Payout destination accounts for salary transfers." />
      <PageSection title="Add account">
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
            <Button type="submit">Add account</Button>
          </div>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
      </PageSection>

      <PageSection title="Your accounts">
        {loading ? <Spinner label="Loading accounts..." /> : null}
        {!loading && !items.length ? (
          <EmptyState title="No bank accounts" description="Add an account to receive tutor payouts." />
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
                      <StatusPill label={item.isPrimary ? 'Primary' : 'Secondary'} tone={item.isPrimary ? 'success' : 'neutral'} />
                    </td>
                    <td>
                      <StatusPill label={item.isVerified ? 'Verified' : 'Pending'} tone={item.isVerified ? 'success' : 'warning'} />
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button variant="ghost" size="sm" onClick={() => handleSetPrimary(item.id)} disabled={item.isPrimary}>
                          Set primary
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
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
      </PageSection>
    </div>
  );
}

export default TutorBankAccountsPage;
