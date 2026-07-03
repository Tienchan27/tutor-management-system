import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { closeStudentTuition, listAdminInvoices } from '../../../services/adminInvoiceService';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import StatusPill from '../../../components/ui/StatusPill';
import ConfirmDialog from '../../../components/feedback/ConfirmDialog';
import { useToast } from '../../../components/feedback/ToastProvider';
import { formatDate, formatVnd, formatYearMonth, getCurrentYearMonth } from '../../../utils/format';

function AdminStudentBillingPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [month, setMonth] = useState(searchParams.get('month') || getCurrentYearMonth());
  const [confirmClose, setConfirmClose] = useState(false);
  const [lastResult, setLastResult] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const fromUrl = searchParams.get('month');
    if (fromUrl) setMonth(fromUrl);
  }, [searchParams]);

  const { data: items = [], isLoading: viewLoading, error: loadErrorObj } = useQuery({
    queryKey: ['adminInvoices', month],
    queryFn: () => listAdminInvoices(month),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeStudentTuition(month, false),
    onSuccess: (result) => {
      queryClient.setQueryData(['adminInvoices', month], result.invoices);
      setLastResult(`Created ${result.createdCount}, skipped ${result.skippedCount}.`);
      setConfirmClose(false);
      showToast('Student billing closed for ' + formatYearMonth(month), 'success');
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to close student billing')),
  });

  const error = actionError || (loadErrorObj ? extractApiErrorMessage(loadErrorObj, 'Failed to load invoices') : '');

  return (
    <PageLayout
      title="Student billing"
      subtitle="Close monthly tuition from logged sessions."
      toolbar={
        <>
          <input type="month" className="input-month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Button variant="primary" onClick={() => setConfirmClose(true)}>
            Close student billing
          </Button>
        </>
      }
    >
      <PageSection title={`${formatYearMonth(month)} invoices`}>
        {error ? <p className="error-text">{error}</p> : null}
        {lastResult ? <p className="muted">{lastResult}</p> : null}
        {viewLoading ? <Spinner label="Loading invoices..." /> : null}
        {!viewLoading && !items.length ? (
          <EmptyState title="No invoices" description="Close student billing to generate invoices." />
        ) : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Hours</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.studentName}</td>
                    <td>{item.totalHours}</td>
                    <td>{formatVnd(item.totalAmount)}</td>
                    <td>{formatDate(item.dueDate)}</td>
                    <td>
                      <StatusPill label={item.status} tone={item.status === 'PAID' ? 'success' : 'warning'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PageSection>
      <ConfirmDialog
        open={confirmClose}
        title="Close student billing?"
        message={
          <>
            Generate invoices for <strong>{formatYearMonth(month)}</strong> from logged sessions?
          </>
        }
        confirmLabel="Close student billing"
        confirmVariant="success"
        loading={closeMutation.isPending}
        onConfirm={() => closeMutation.mutate()}
        onCancel={() => setConfirmClose(false)}
      />
    </PageLayout>
  );
}

export default AdminStudentBillingPage;
