import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listStudentClasses } from '../../../services/studentClassService';
import { listMyInvoices } from '../../../services/studentInvoiceService';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import StatCard from '../../../components/tutor/StatCard';
import Spinner from '../../../components/ui/Spinner';
import { formatDate } from '../../../utils/format';
import { queryKeys } from '../../../lib/queryKeys';

function StudentHomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.studentHome,
    queryFn: async () => {
      const [classes, invoices] = await Promise.all([listStudentClasses(), listMyInvoices()]);
      const unpaid = invoices.filter((i) => i.status !== 'PAID');
      const nextDue = unpaid
        .map((i) => i.dueDate)
        .filter(Boolean)
        .sort()[0];
      return {
        classCount: classes.length,
        unpaidCount: unpaid.length,
        nextDue: nextDue ?? null,
      };
    },
  });

  return (
    <PageLayout title="Home" subtitle="Your classes and billing at a glance.">
      {isLoading ? <Spinner label="Loading..." /> : null}
      {error ? <p className="error-text">{extractApiErrorMessage(error, 'Failed to load home')}</p> : null}
      {data ? (
        <PageSection>
          <div className="stat-card-grid">
            <StatCard label="Active classes" value={data.classCount} accent="brand" />
            <StatCard label="Unpaid invoices" value={data.unpaidCount} />
            <StatCard
              label="Next due date"
              value={data.nextDue ? formatDate(data.nextDue) : '—'}
              hint={data.unpaidCount ? `${data.unpaidCount} open` : 'All paid'}
            />
          </div>
          {data.unpaidCount > 0 ? (
            <div className="form-actions mt-12">
              <Link to="/app/student/billing" className="btn btn-primary btn-sm">
                Pay tuition
              </Link>
              <p className="muted mb-0">
                Open Billing and scan the VietQR with your banking app to transfer.
              </p>
            </div>
          ) : null}
        </PageSection>
      ) : null}
    </PageLayout>
  );
}

export default StudentHomePage;
