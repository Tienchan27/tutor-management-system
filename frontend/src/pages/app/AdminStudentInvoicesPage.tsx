import { useState } from 'react';
import { closeStudentTuition, listAdminInvoices } from '../../services/adminInvoiceService';
import { StudentInvoice } from '../../types/invoices';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import ConfirmDialog from '../../components/feedback/ConfirmDialog';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatDate, formatVnd, formatYearMonth, getCurrentYearMonth } from '../../utils/format';

function AdminStudentInvoicesPage() {
  const { showToast } = useToast();
  const [month, setMonth] = useState(getCurrentYearMonth());
  const [items, setItems] = useState<StudentInvoice[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [lastResult, setLastResult] = useState('');

  async function loadMonth(): Promise<void> {
    setViewLoading(true);
    setError('');
    try {
      setItems(await listAdminInvoices(month));
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load invoices'));
    } finally {
      setViewLoading(false);
    }
  }

  async function handleClose(): Promise<void> {
    setCloseLoading(true);
    setError('');
    try {
      const result = await closeStudentTuition(month, false);
      setItems(result.invoices);
      setLastResult(`Created ${result.createdCount}, skipped ${result.skippedCount}.`);
      setConfirmClose(false);
      showToast('Student tuition closed for ' + formatYearMonth(month), 'success');
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to close student tuition'));
    } finally {
      setCloseLoading(false);
    }
  }

  return (
    <div className="stack-16">
      <PageHeader
        title="Student tuition"
        subtitle="Close monthly tuition from logged sessions."
        actions={
          <>
            <input type="month" className="input-month" value={month} onChange={(e) => setMonth(e.target.value)} />
            <Button variant="secondary" onClick={loadMonth} loading={viewLoading}>
              View month
            </Button>
            <Button variant="primary" onClick={() => setConfirmClose(true)}>
              Close student tuition
            </Button>
          </>
        }
      />
      <PageSection title="Invoices" subtitle={formatYearMonth(month)}>
        {error ? <p className="error-text">{error}</p> : null}
        {lastResult ? <p className="muted">{lastResult}</p> : null}
        {viewLoading ? <Spinner label="Loading invoices..." /> : null}
        {!viewLoading && !items.length ? (
          <EmptyState title="No invoices" description="View month or close tuition to generate invoices." />
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
        title="Close student tuition?"
        message={
          <>
            Generate invoices for <strong>{formatYearMonth(month)}</strong> from session tuition logs. Existing
            invoices are skipped unless recalculate is enabled later.
          </>
        }
        confirmLabel="Close student tuition"
        danger
        loading={closeLoading}
        onConfirm={handleClose}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}

export default AdminStudentInvoicesPage;
