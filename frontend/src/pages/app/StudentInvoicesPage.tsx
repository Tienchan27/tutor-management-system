import { useEffect, useState } from 'react';
import { listMyInvoices } from '../../services/studentInvoiceService';
import { StudentInvoice } from '../../types/invoices';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import { formatDate, formatVnd, formatYearMonth } from '../../utils/format';
import { invoiceTone } from '../../utils/statusTone';

function StudentInvoicesPage() {
  const [items, setItems] = useState<StudentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        setItems(await listMyInvoices());
      } catch (err: unknown) {
        setError(extractApiErrorMessage(err, 'Failed to load invoices'));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="stack-16">
      <PageHeader title="My invoices" subtitle="Monthly tuition statements." />
      <PageSection>
        {error ? <p className="error-text">{error}</p> : null}
        {loading ? <Spinner label="Loading invoices..." /> : null}
        {!loading && !items.length ? (
          <EmptyState
            title="No invoices yet"
            description="No invoice for this period yet. Invoices appear after admin closes the month."
          />
        ) : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Hours</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatYearMonth(`${item.year}-${`${item.month}`.padStart(2, '0')}`)}</td>
                    <td>{item.totalHours}</td>
                    <td>{formatVnd(item.totalAmount)}</td>
                    <td>{formatDate(item.dueDate)}</td>
                    <td>
                      <StatusPill label={item.status} tone={invoiceTone(item.status)} />
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

export default StudentInvoicesPage;
