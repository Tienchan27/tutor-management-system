import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTutorClassOverview, getTutorMonthSnapshot } from '../../../services/dashboardService';
import { listMySessionClasses } from '../../../services/sessionService';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Spinner from '../../../components/ui/Spinner';
import StatCard from '../../../components/tutor/StatCard';
import Button from '../../../components/ui/Button';
import LogSessionModal from '../../../components/tutor/LogSessionModal';
import { useToast } from '../../../components/feedback/ToastProvider';
import { formatVnd, getCurrentYearMonth } from '../../../utils/format';
import { queryKeys } from '../../../lib/queryKeys';

function TutorHomePage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const currentMonth = getCurrentYearMonth();
  const [logModalOpen, setLogModalOpen] = useState(false);

  const { data: sessionClasses = [] } = useQuery({
    queryKey: queryKeys.tutorSessionClasses,
    queryFn: listMySessionClasses,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.tutorHome.month(currentMonth),
    queryFn: async () => {
      const [classes, snapshot] = await Promise.all([
        getTutorClassOverview(),
        getTutorMonthSnapshot(currentMonth),
      ]);
      return {
        classes,
        sessionCount: snapshot.sessionCount,
        estimatedTuition: snapshot.totalTuition,
      };
    },
  });

  const classes = data?.classes ?? [];
  const sessionCount = data?.sessionCount ?? 0;
  const estimatedTuition = data?.estimatedTuition ?? 0;
  const activeClassCount = classes.filter((c) => c.classStatus === 'ACTIVE').length;

  function refreshAfterLogSession(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tutorHome.month(currentMonth) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.tutorSessions.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.tutorSessionClasses });
    void queryClient.invalidateQueries({ queryKey: queryKeys.tutorMyClasses });
  }

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

      <LogSessionModal
        open={logModalOpen}
        classes={sessionClasses}
        onClose={() => setLogModalOpen(false)}
        onSuccess={() => {
          showToast('Session logged successfully', 'success');
          refreshAfterLogSession();
        }}
      />
    </PageLayout>
  );
}

export default TutorHomePage;
