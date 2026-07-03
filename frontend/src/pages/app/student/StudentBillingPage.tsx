import { useQuery } from '@tanstack/react-query';
import { listMyInvoices } from '../../../services/studentInvoiceService';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import StatusPill from '../../../components/ui/StatusPill';
import { formatDate, formatVnd, formatYearMonth } from '../../../utils/format';
import { invoiceTone } from '../../../utils/statusTone';

function StudentBillingPage() {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['studentInvoices'],
    queryFn: listMyInvoices,
  });

  return (
    <PageLayout title="Billing" subtitle="Monthly tuition statements.">
      <PageSection>
        {error ? <p className="error-text">{extractApiErrorMessage(error, 'Failed to load invoices')}</p> : null}
        {isLoading ? <Spinner label="Loading invoices..." /> : null}
        {!isLoading && !items.length ? <EmptyState title="No invoices yet" /> : null}
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
    </PageLayout>
  );
}

export default StudentBillingPage;
