import { useState } from 'react';
import { confirmPayoutPaid, generateMonthlyPayouts, generatePayoutQr } from '../../services/payoutService';
import { TutorPayout, TutorPayoutPayment } from '../../types/payouts';
import { extractApiErrorMessage } from '../../services/authService';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

function AdminPayoutsPage() {
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [items, setItems] = useState<TutorPayout[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<TutorPayoutPayment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  async function handleGenerate(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await generateMonthlyPayouts(month);
      setItems(response);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to generate monthly payouts'));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateQr(payoutId: string): Promise<void> {
    setError('');
    try {
      const payment = await generatePayoutQr(payoutId);
      setSelectedPayment(payment);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to generate payout QR'));
    }
  }

  async function handleConfirmPaid(payoutId: string): Promise<void> {
    setError('');
    try {
      await confirmPayoutPaid(payoutId);
      await handleGenerate();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to confirm payout'));
    }
  }

  return (
    <div className="stack-16">
      <div className="card">
        <div className="page-header">
          <div>
            <h2 className="title title-lg">Payout Management</h2>
            <p className="subtitle">Generate, review, and confirm tutor payouts by month.</p>
          </div>
          <div className="toolbar">
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-month" />
            <button type="button" onClick={handleGenerate} className="btn btn-primary compact-btn" disabled={loading}>
              {loading ? 'Loading...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {error ? <p className="error-text">{error}</p> : null}
        {!items.length ? <p className="muted">No payout data loaded. Select a month and generate payouts.</p> : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Gross</th>
                  <th>Net</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.tutor?.email || 'Tutor'}</td>
                    <td>{item.grossRevenue.toLocaleString()}</td>
                    <td>{item.netSalary.toLocaleString()}</td>
                    <td>{item.status}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn btn-outline table-action" onClick={() => handleGenerateQr(item.id)}>
                          Generate QR
                        </button>
                        <button type="button" className="btn btn-primary table-action" onClick={() => handleConfirmPaid(item.id)}>
                          Confirm Paid
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

      {selectedPayment ? (
        <div className="card">
          <h3 className="section-title">Latest QR payload</h3>
          <p><strong>Reference:</strong> {selectedPayment.qrRef}</p>
          <p><strong>Status:</strong> {selectedPayment.status}</p>
          <div className="panel">
            <pre className="pre-wrap">{selectedPayment.qrPayload}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminPayoutsPage;
