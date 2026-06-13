import { FormEvent, useEffect, useState } from 'react';
import { getTutorDashboard } from '../../services/dashboardService';
import {
  createBankAccount,
  deleteBankAccount,
  listMyBankAccounts,
  setPrimaryBankAccount,
} from '../../services/bankAccountService';
import { TutorDashboardResponse } from '../../types/dashboard';
import { BankAccountResponse, CreateBankAccountRequest } from '../../types/bankAccounts';
import { extractApiErrorMessage } from '../../services/authService';
import { realtimeEventBus } from '../../services/realtimeEventBus';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import SectionBlock from '../../components/ui/SectionBlock';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatVnd } from '../../utils/format';
import { payoutTone } from '../../utils/statusTone';

const initialForm: CreateBankAccountRequest = {
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
};

function TutorEarningsPage() {
  const { showToast } = useToast();
  const [payouts, setPayouts] = useState<TutorDashboardResponse[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutsError, setPayoutsError] = useState('');

  const [items, setItems] = useState<BankAccountResponse[]>([]);
  const [form, setForm] = useState<CreateBankAccountRequest>(initialForm);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState('');

  async function loadPayouts(): Promise<void> {
    setPayoutsLoading(true);
    setPayoutsError('');
    try {
      setPayouts(await getTutorDashboard());
    } catch (err: unknown) {
      setPayoutsError(extractApiErrorMessage(err, 'Failed to load payout history'));
    } finally {
      setPayoutsLoading(false);
    }
  }

  async function loadBankAccounts(): Promise<void> {
    setBankLoading(true);
    setBankError('');
    try {
      setItems(await listMyBankAccounts());
    } catch (err: unknown) {
      setBankError(extractApiErrorMessage(err, 'Failed to load bank accounts'));
    } finally {
      setBankLoading(false);
    }
  }

  useEffect(() => {
    void loadPayouts();
    void loadBankAccounts();
    const unsub = realtimeEventBus.subscribe('PAYOUT_UPDATED', () => window.setTimeout(loadPayouts, 250));
    return () => unsub();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBankError('');
    try {
      await createBankAccount(form);
      showToast('Bank account added', 'success');
      setForm(initialForm);
      await loadBankAccounts();
    } catch (err: unknown) {
      setBankError(extractApiErrorMessage(err, 'Failed to add bank account'));
    }
  }

  async function handleSetPrimary(id: string): Promise<void> {
    setBankError('');
    try {
      await setPrimaryBankAccount(id);
      showToast('Primary account updated', 'success');
      await loadBankAccounts();
    } catch (err: unknown) {
      setBankError(extractApiErrorMessage(err, 'Failed to set primary account'));
    }
  }

  async function handleDelete(id: string): Promise<void> {
    setBankError('');
    try {
      await deleteBankAccount(id);
      showToast('Bank account removed', 'success');
      await loadBankAccounts();
    } catch (err: unknown) {
      setBankError(extractApiErrorMessage(err, 'Failed to delete account'));
    }
  }

  return (
    <div className="stack-16">
      <PageHeader title="Earnings" subtitle="Payout history and bank accounts for salary transfers." />

      <PageSection title="Payout history">
        {payoutsLoading ? <Spinner label="Loading payouts..." /> : null}
        {payoutsError ? <p className="error-text">{payoutsError}</p> : null}
        {!payoutsLoading && !payouts.length ? (
          <EmptyState title="No payout records yet" description="Payouts appear after admin closes payroll." />
        ) : null}
        {!!payouts.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col" className="money-cell">
                    Gross
                  </th>
                  <th scope="col" className="money-cell">
                    Net
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((item) => (
                  <tr key={`${item.year}-${item.month}`}>
                    <td>
                      {item.year}-{`${item.month}`.padStart(2, '0')}
                    </td>
                    <td className="money-cell">{formatVnd(item.grossRevenue)}</td>
                    <td className="money-cell">{formatVnd(item.netSalary)}</td>
                    <td>
                      <StatusPill label={item.status} tone={payoutTone(item.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PageSection>

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
              <Button type="submit">Add account</Button>
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
        </SectionBlock>
      </PageSection>
    </div>
  );
}

export default TutorEarningsPage;
