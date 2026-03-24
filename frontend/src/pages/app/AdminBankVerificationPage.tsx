import { useEffect, useState } from 'react';
import { BankAccountResponse } from '../../types/bankAccounts';
import { listPendingBankAccounts, verifyBankAccount } from '../../services/bankAccountService';
import { extractApiErrorMessage } from '../../services/authService';

function AdminBankVerificationPage() {
  const [items, setItems] = useState<BankAccountResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  async function loadPending(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await listPendingBankAccounts();
      setItems(response);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load pending bank accounts'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(id: string): Promise<void> {
    setError('');
    try {
      await verifyBankAccount(id, { notes: 'Verified by admin via web portal' });
      await loadPending();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to verify account'));
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  return (
    <div className="card">
      <h2 className="title title-lg">Pending Bank Verification</h2>
      <p className="subtitle">Review tutor bank accounts awaiting verification.</p>
      {loading ? <p className="muted">Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !items.length ? <p className="muted">No pending accounts at the moment.</p> : null}
      {!!items.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Bank</th>
                <th>Account Holder</th>
                <th>Account Number</th>
                <th>Primary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.bankName}</td>
                  <td>{item.accountHolderName}</td>
                  <td>{item.maskedAccountNumber}</td>
                  <td>{item.isPrimary ? 'Yes' : 'No'}</td>
                  <td>
                    <button type="button" className="btn btn-primary table-action" onClick={() => handleVerify(item.id)}>
                      Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default AdminBankVerificationPage;
