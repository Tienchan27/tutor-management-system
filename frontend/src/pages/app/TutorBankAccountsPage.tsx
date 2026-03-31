import { FormEvent, useEffect, useState } from 'react';
import {
  createBankAccount,
  deleteBankAccount,
  listMyBankAccounts,
  setPrimaryBankAccount,
} from '../../services/bankAccountService';
import { BankAccountResponse, CreateBankAccountRequest } from '../../types/bankAccounts';
import { extractApiErrorMessage } from '../../services/authService';

const initialForm: CreateBankAccountRequest = {
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
};

function TutorBankAccountsPage() {
  const [items, setItems] = useState<BankAccountResponse[]>([]);
  const [form, setForm] = useState<CreateBankAccountRequest>(initialForm);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  async function load(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await listMyBankAccounts();
      setItems(response);
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
    setSuccess('');
    try {
      await createBankAccount(form);
      setSuccess('Bank account added.');
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
      await load();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to set primary account'));
    }
  }

  async function handleDelete(id: string): Promise<void> {
    setError('');
    try {
      await deleteBankAccount(id);
      await load();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to delete account'));
    }
  }

  return (
    <div className="stack-16">
      <div className="card">
        <h2 className="title title-lg">Bank Accounts</h2>
        <p className="subtitle">Manage payout destination accounts for salary transfers.</p>
        <form onSubmit={handleCreate} className="stack-16">
          <div className="grid-form">
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
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary compact-btn">
              Add Account
            </button>
          </div>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
      </div>

      <div className="card">
        {loading ? <p className="muted">Loading...</p> : null}
        {!loading && !items.length ? <p className="muted">No bank account found.</p> : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Account</th>
                  <th>Holder</th>
                  <th>Primary</th>
                  <th>Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.bankName}</td>
                    <td>{item.maskedAccountNumber}</td>
                    <td>{item.accountHolderName}</td>
                    <td>{item.isPrimary ? 'Yes' : 'No'}</td>
                    <td>{item.isVerified ? 'Yes' : 'No'}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn btn-outline table-action" onClick={() => handleSetPrimary(item.id)}>
                          Set Primary
                        </button>
                        <button type="button" className="btn btn-outline table-action" onClick={() => handleDelete(item.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default TutorBankAccountsPage;
