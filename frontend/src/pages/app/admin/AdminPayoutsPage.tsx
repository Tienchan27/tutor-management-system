import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  confirmPayoutPaid,
  generateMonthlyPayouts,
  generatePayoutQr,
  listPayoutsByMonth,
  overrideNetSalary,
} from '../../../services/payoutService';
import { TutorPayout, TutorPayoutPayment } from '../../../types/payouts';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import Spinner from '../../../components/ui/Spinner';
import StatusPill from '../../../components/ui/StatusPill';
import ConfirmDialog from '../../../components/feedback/ConfirmDialog';
import { useToast } from '../../../components/feedback/ToastProvider';
import { formatVnd, formatYearMonth, getCurrentYearMonth } from '../../../utils/format';
import { payoutTone } from '../../../utils/statusTone';

function AdminPayoutsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [month, setMonth] = useState<string>(searchParams.get('month') || getCurrentYearMonth());
  const [selectedPayment, setSelectedPayment] = useState<TutorPayoutPayment | null>(null);
  const [netSalaryDraftById, setNetSalaryDraftById] = useState<Record<string, number>>({});
  const [actionError, setActionError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get('month');
    if (fromUrl) setMonth(fromUrl);
  }, [searchParams]);

  const { data: items = [], isLoading: viewLoading, error: loadErrorObj } = useQuery({
    queryKey: ['adminPayouts', month],
    queryFn: () => listPayoutsByMonth(month),
  });

  const refreshPayouts = () => queryClient.invalidateQueries({ queryKey: ['adminPayouts', month] });
  const error = actionError || (loadErrorObj ? extractApiErrorMessage(loadErrorObj, 'Failed to load payouts') : '');

  const closeMutation = useMutation({
    mutationFn: () => generateMonthlyPayouts(month),
    onSuccess: (response) => {
      queryClient.setQueryData(['adminPayouts', month], response);
      setConfirmClose(false);
      showToast('Tutor payroll closed for ' + formatYearMonth(month), 'success');
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to close tutor payroll')),
  });

  const qrMutation = useMutation({
    mutationFn: (payoutId: string) => generatePayoutQr(payoutId),
    onSuccess: (payment) => {
      setSelectedPayment(payment);
      showToast('QR reference generated', 'success');
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to generate payout QR')),
  });

  const confirmPaidMutation = useMutation({
    mutationFn: (payoutId: string) => confirmPayoutPaid(payoutId),
    onSuccess: () => {
      void refreshPayouts();
      showToast('Payout marked as paid', 'success');
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to confirm payout')),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ payout, value }: { payout: TutorPayout; value: number }) => overrideNetSalary(payout.id, value),
    onSuccess: (_data, vars) => {
      setNetSalaryDraftById((prev) => {
        const copy = { ...prev };
        delete copy[vars.payout.id];
        return copy;
      });
      void refreshPayouts();
      showToast('Net salary updated', 'success');
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to override net salary')),
  });

  return (
    <PageLayout
      title="Tutor payouts"
      subtitle="View and close tutor payroll by month."
      toolbar={
        <>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-month" />
          <Button variant="primary" onClick={() => setConfirmClose(true)} disabled={closeMutation.isPending}>
            Close payroll
          </Button>
        </>
      }
    >
      <PageSection title={`${formatYearMonth(month)} payouts`}>
        {error ? <p className="error-text">{error}</p> : null}
        {viewLoading ? <Spinner label="Loading payouts..." /> : null}
        {!viewLoading && !items.length ? (
          <EmptyState title="No payouts for this month" description="Close payroll to generate payouts." />
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
                            onClick={() => qrMutation.mutate(item.id)}
                            disabled={item.status === 'PAID'}
                          >
                            Generate QR
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => confirmPaidMutation.mutate(item.id)}
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
                            loading={overrideMutation.isPending && overrideMutation.variables?.payout.id === item.id}
                            onClick={() =>
                              overrideMutation.mutate({
                                payout: item,
                                value: netSalaryDraftById[item.id] ?? item.netSalary,
                              })
                            }
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                navigator.clipboard.writeText(selectedPayment.qrRef).then(
                  () => showToast('Reference copied', 'success'),
                  () => showToast('Copy failed', 'error')
                )
              }
            >
              Copy reference
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
            This will lock payouts for <strong>{formatYearMonth(month)}</strong> based on logged sessions.
          </>
        }
        confirmLabel="Close payroll"
        confirmVariant="success"
        loading={closeMutation.isPending}
        onConfirm={() => closeMutation.mutate()}
        onCancel={() => setConfirmClose(false)}
      />
    </PageLayout>
  );
}

export default AdminPayoutsPage;
