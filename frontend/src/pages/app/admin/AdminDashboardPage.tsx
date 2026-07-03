import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import StatCard from '../../../components/tutor/StatCard';
import Spinner from '../../../components/ui/Spinner';
import { extractApiErrorMessage } from '../../../services/authService';
import { formatYearMonth, getCurrentYearMonth } from '../../../utils/format';
import { useAdminDashboard } from './useAdminDashboard';

function AdminDashboardPage() {
  const [month, setMonth] = useState(getCurrentYearMonth());
  const { data, isLoading, error } = useAdminDashboard(month);

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
