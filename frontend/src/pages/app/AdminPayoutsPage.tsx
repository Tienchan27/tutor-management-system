import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  confirmPayoutPaid,
  generateMonthlyPayouts,
  generatePayoutQr,
  listPayoutsByMonth,
  overrideNetSalary,
} from '../../services/payoutService';
import { TutorPayout, TutorPayoutPayment } from '../../types/payouts';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import StatusPill from '../../components/ui/StatusPill';
import ConfirmDialog from '../../components/feedback/ConfirmDialog';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatVnd, formatYearMonth, getCurrentYearMonth } from '../../utils/format';
import { payoutTone } from '../../utils/statusTone';

function AdminPayoutsPage() {
  const { showToast } = useToast();
  const [month, setMonth] = useState<string>(getCurrentYearMonth());
  const [items, setItems] = useState<TutorPayout[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<TutorPayoutPayment | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);
  const [overrideLoadingId, setOverrideLoadingId] = useState('');
  const [netSalaryDraftById, setNetSalaryDraftById] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  const loadMonth = useCallback(async (): Promise<void> => {
    setViewLoading(true);
    setError('');
    try {
      const response = await listPayoutsByMonth(month);
      setItems(response);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load payouts'));
    } finally {
      setViewLoading(false);
    }
  }, [month]);

  async function handleClosePayroll(): Promise<void> {
    setCloseLoading(true);
    setError('');
    try {
      const response = await generateMonthlyPayouts(month);
      setItems(response);
      setConfirmClose(false);
      showToast('Tutor payroll closed for ' + formatYearMonth(month), 'success');
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to close tutor payroll'));
    } finally {
      setCloseLoading(false);
    }
  }

  async function handleGenerateQr(payoutId: string): Promise<void> {
    setError('');
    try {
      const payment = await generatePayoutQr(payoutId);
      setSelectedPayment(payment);
      showToast('QR reference generated', 'success');
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to generate payout QR'));
    }
  }

  async function handleConfirmPaid(payoutId: string): Promise<void> {
    setError('');
    try {
      await confirmPayoutPaid(payoutId);
      await loadMonth();
      showToast('Payout marked as paid', 'success');
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
      await loadMonth();
      showToast('Net salary updated', 'success');
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to override net salary'));
    } finally {
      setOverrideLoadingId('');
    }
  }

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  function copyText(value: string, label: string): void {
    navigator.clipboard.writeText(value).then(
      () => showToast(`${label} copied`, 'success'),
      () => showToast('Copy failed', 'error')
    );
  }

  return (
    <div className="stack-16">
      <PageHeader
        title="Payouts"
        subtitle="View and close tutor payroll by month."
        actions={
          <>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-month" />
            <Button variant="primary" onClick={() => setConfirmClose(true)} disabled={closeLoading}>
              Close payroll
            </Button>
          </>
        }
      />

      <PageSection title="Results" subtitle={formatYearMonth(month)}>
        {error ? <p className="error-text">{error}</p> : null}
        {viewLoading ? <Spinner label="Loading payouts..." /> : null}
        {!viewLoading && !items.length ? (
          <EmptyState
            title="No payouts for this month"
            description="No payouts for this month. Close payroll to generate."
          />
        ) : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Tutor</th>
                  <th scope="col" className="money-cell">
                    Gross
                  </th>
                  <th scope="col" className="money-cell">
                    Net
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.tutor?.email || 'Tutor'}</td>
                    <td className="money-cell">{formatVnd(item.grossRevenue)}</td>
                    <td className="money-cell">{formatVnd(item.netSalary)}</td>
                    <td>
                      <StatusPill label={item.status} tone={payoutTone(item.status)} />
                    </td>
                    <td>
                      <div className="table-actions-stack">
                        <div className="table-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleGenerateQr(item.id)}
                            disabled={item.status === 'PAID'}
                          >
                            Generate QR
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleConfirmPaid(item.id)}
                            disabled={item.status === 'PAID'}
                          >
                            Confirm paid
                          </Button>
                        </div>
                      </div>
                      {item.status === 'LOCKED' ? (
                        <div className="table-actions table-actions-left mt-8">
                          <input
                            className="table-input money-number table-input-narrow"
                            type="number"
                            step="1"
                            value={netSalaryDraftById[item.id] ?? item.netSalary}
                            onChange={(event) =>
                              setNetSalaryDraftById((prev) => ({
                                ...prev,
                                [item.id]: Math.round(Number(event.target.value)),
                              }))
                            }
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={overrideLoadingId === item.id}
                            onClick={() => handleOverrideNetSalary(item)}
                          >
                            Save override
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PageSection>

      {selectedPayment ? (
        <PageSection title="QR payment details">
          <p>
            <strong>Reference:</strong> {selectedPayment.qrRef}
          </p>
          <p>
            <strong>Status:</strong> {selectedPayment.status}
          </p>
          <div className="section-actions">
            <Button variant="secondary" size="sm" onClick={() => copyText(selectedPayment.qrRef, 'Reference')}>
              Copy reference
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const match = selectedPayment.qrPayload.match(/AMOUNT=(\d+)/);
                if (match) {
                  copyText(match[1], 'Amount');
                }
              }}
            >
              Copy amount
            </Button>
          </div>
          <div className="qr-panel">
            <QRCodeSVG value={selectedPayment.qrPayload} size={200} level="M" />
          </div>
          <pre className="pre-wrap muted">{selectedPayment.qrPayload}</pre>
        </PageSection>
      ) : null}

      <ConfirmDialog
        open={confirmClose}
        title="Close tutor payroll?"
        message={
          <>
            This will lock payouts for <strong>{formatYearMonth(month)}</strong> based on logged sessions. Existing PAID
            and LOCKED records are preserved.
          </>
        }
        confirmLabel="Close payroll"
        confirmVariant="success"
        loading={closeLoading}
        onConfirm={handleClosePayroll}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}

export default AdminPayoutsPage;
