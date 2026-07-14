import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import StatCard from '../../../components/tutor/StatCard';
import Spinner from '../../../components/ui/Spinner';
import { extractApiErrorMessage } from '../../../services/authService';
import { getCenterAccount } from '../../../services/centerAccountService';
import { formatYearMonth, getCurrentYearMonth } from '../../../utils/format';
import { queryKeys } from '../../../lib/queryKeys';
import { useAdminDashboard } from './useAdminDashboard';

function AdminDashboardPage() {
  const [month, setMonth] = useState(getCurrentYearMonth());
  const { data, isLoading, error } = useAdminDashboard(month);
  const { data: centerAccount, isLoading: centerLoading } = useQuery({
    queryKey: queryKeys.centerAccount,
    queryFn: getCenterAccount,
  });
  const centerConfigured = !!centerAccount;

  return (
    <PageLayout
      title="Home"
      subtitle="Operations overview for the current payroll month."
      toolbar={
        <label className="page-toolbar-field">
          <span className="input-label">Payroll month</span>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-month" />
        </label>
      }
    >
      {!centerLoading && !centerConfigured ? (
        <div className="error-text mb-0" role="status">
          Center receiving account is not configured. Students cannot pay tuition via VietQR until you{' '}
          <Link to="/app/admin/center-account">set the center account</Link>.
        </div>
      ) : null}

      {isLoading ? <Spinner label="Loading dashboard..." /> : null}
      {error ? <p className="error-text">{extractApiErrorMessage(error, 'Failed to load dashboard')}</p> : null}

      {data ? (
        <>
          <PageSection title={`${formatYearMonth(month)} snapshot`}>
            <div className="stat-card-grid">
              <StatCard label="Active classes" value={data.activeClasses} hint={`${data.awaitingTutor} awaiting tutor`} />
              <StatCard
                label="Pending applications"
                value={data.pendingApplications}
                hint="Tutor applications to review"
                accent="brand"
              />
              <StatCard label="Tutors this month" value={data.tutorCount} />
              <StatCard
                label="Open payouts"
                value={data.openPayouts}
                hint={data.payoutTotal ? `${data.paidPayouts} paid` : 'Close payroll to generate'}
              />
              <StatCard
                label="Unpaid invoices"
                value={data.unpaidInvoices}
                hint={data.invoiceTotal ? `${data.invoiceTotal} total` : 'Close billing to generate'}
              />
            </div>
          </PageSection>

          <PageSection title="Quick actions">
            <div className="quick-action-grid">
              <Link to="/app/admin/classes" className="quick-action-card">
                <strong>Classes</strong>
                <span className="muted">Manage classes and applications</span>
              </Link>
              <Link to={`/app/admin/payouts?month=${month}`} className="quick-action-card">
                <strong>Tutor payouts</strong>
                <span className="muted">Close payroll for {formatYearMonth(month)}</span>
              </Link>
              <Link to={`/app/admin/student-billing?month=${month}`} className="quick-action-card">
                <strong>Student billing</strong>
                <span className="muted">Close tuition for {formatYearMonth(month)}</span>
              </Link>
              <Link
                to="/app/admin/center-account"
                className={`quick-action-card${!centerConfigured ? ' quick-action-card--attention' : ''}`}
              >
                <strong>Center account</strong>
                <span className="muted">
                  {centerConfigured
                    ? 'Receiving account for student VietQR payments'
                    : 'Required — configure before students can pay'}
                </span>
              </Link>
              <Link to="/app/admin/tutors" className="quick-action-card">
                <strong>Tutors</strong>
                <span className="muted">Invite and manage tutors</span>
              </Link>
            </div>
            {data.pendingApplications > 0 ? (
              <div className="form-actions mt-12">
                <Link to="/app/admin/classes" className="btn btn-primary btn-sm">
                  Review {data.pendingApplications} application(s)
                </Link>
              </div>
            ) : null}
          </PageSection>
        </>
      ) : null}
    </PageLayout>
  );
}

export default AdminDashboardPage;
