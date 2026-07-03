import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTutorClassOverview } from '../../../services/dashboardService';
import { listMySessionClasses, listSessionsByPayrollMonth } from '../../../services/sessionService';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Spinner from '../../../components/ui/Spinner';
import StatCard from '../../../components/tutor/StatCard';
import Button from '../../../components/ui/Button';
import LogSessionModal from '../../../components/tutor/LogSessionModal';
import { useToast } from '../../../components/feedback/ToastProvider';
import { formatVnd, getCurrentYearMonth } from '../../../utils/format';

function TutorHomePage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const currentMonth = getCurrentYearMonth();
  const [logModalOpen, setLogModalOpen] = useState(false);

  const { data: sessionClasses = [] } = useQuery({
    queryKey: ['tutorSessionClasses'],
    queryFn: listMySessionClasses,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['tutorHome', currentMonth],
    queryFn: async () => {
      const [classResponse, sessionsResponse] = await Promise.all([
        getTutorClassOverview(),
        listSessionsByPayrollMonth(currentMonth, 0),
      ]);
      return {
        classes: classResponse,
        sessionCount: sessionsResponse.items.length,
        estimatedTuition: sessionsResponse.items.reduce((sum, item) => sum + item.tuitionAtLog, 0),
      };
    },
  });

  const classes = data?.classes ?? [];
  const sessionCount = data?.sessionCount ?? 0;
  const estimatedTuition = data?.estimatedTuition ?? 0;
  const activeClassCount = classes.filter((c) => c.classStatus === 'ACTIVE').length;

  return (
    <PageLayout
      title="Home"
      subtitle="Your teaching activity at a glance."
      headerActions={
        <Button variant="primary" size="sm" onClick={() => setLogModalOpen(true)}>
          Log session
        </Button>
      }
    >
      {isLoading ? <Spinner label="Loading overview..." /> : null}
      {error ? <p className="error-text">{extractApiErrorMessage(error, 'Failed to load overview')}</p> : null}

      <PageSection>
        <div className="stat-card-grid">
          <StatCard label="Sessions this month" value={sessionCount} hint={`Payroll month ${currentMonth}`} accent="brand" />
          <StatCard label="Active classes" value={activeClassCount} />
          <StatCard label="Estimated tuition" value={formatVnd(estimatedTuition)} hint="From logged sessions this month" />
        </div>
      </PageSection>

      <PageSection title="Quick links">
        <div className="quick-action-grid">
          <Link to="/app/tutor/classes" className="quick-action-card">
            <strong>Classes</strong>
            <span className="muted">Roster and log sessions by class</span>
          </Link>
          <Link to="/app/tutor/sessions" className="quick-action-card">
            <strong>Sessions</strong>
            <span className="muted">Session history and edits</span>
          </Link>
          <Link to="/app/tutor/marketplace" className="quick-action-card">
            <strong>Marketplace</strong>
            <span className="muted">Find and apply for classes</span>
          </Link>
          <Link to="/app/tutor/earnings/payouts" className="quick-action-card">
            <strong>Earnings</strong>
            <span className="muted">Payout history and bank accounts</span>
          </Link>
        </div>
      </PageSection>

      <LogSessionModal
        open={logModalOpen}
        classes={sessionClasses}
        onClose={() => setLogModalOpen(false)}
        onSuccess={() => {
          showToast('Session logged successfully', 'success');
          void queryClient.invalidateQueries({ queryKey: ['tutorHome', currentMonth] });
        }}
      />
    </PageLayout>
  );
}

export default TutorHomePage;
