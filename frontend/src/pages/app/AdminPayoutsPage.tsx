import { useState } from 'react';
import { confirmPayoutPaid, generateMonthlyPayouts, generatePayoutQr, overrideNetSalary } from '../../services/payoutService';
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
  const [overrideLoadingId, setOverrideLoadingId] = useState<string>('');
  const [netSalaryDraftById, setNetSalaryDraftById] = useState<Record<string, number>>({});
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

  async function handleOverrideNetSalary(payout: TutorPayout): Promise<void> {
    setError('');
    setOverrideLoadingId(payout.id);
    try {
      const nextNetSalary = netSalaryDraftById[payout.id] ?? payout.netSalary;
      await overrideNetSalary(payout.id, nextNetSalary);
      setNetSalaryDraftById((prev) => {
        const copy = { ...prev };
        delete copy[payout.id];
        return copy;
      });
      await handleGenerate();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to override net salary'));
    } finally {
      setOverrideLoadingId('');
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
                        <button
                          type="button"
                          className="btn btn-outline table-action"
                          onClick={() => handleGenerateQr(item.id)}
                          disabled={item.status === 'PAID'}
                        >
                          Generate QR
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary table-action"
                          onClick={() => handleConfirmPaid(item.id)}
                          disabled={item.status === 'PAID'}
                        >
                          Confirm Paid
                        </button>
                      </div>

                      {item.status === 'LOCKED' ? (
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            className="table-input money-number"
                            type="number"
                            step="1"
                            value={netSalaryDraftById[item.id] ?? item.netSalary}
                            onChange={(event) => setNetSalaryDraftById((prev) => ({ ...prev, [item.id]: Math.round(Number(event.target.value)) }))}
                            style={{ maxWidth: 160 }}
                          />
                          <button
                            type="button"
                            className="btn btn-outline table-action"
                            disabled={overrideLoadingId === item.id}
                            onClick={() => handleOverrideNetSalary(item)}
                          >
                            {overrideLoadingId === item.id ? 'Saving...' : 'Save Override'}
                          </button>
                        </div>
                      ) : null}
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
