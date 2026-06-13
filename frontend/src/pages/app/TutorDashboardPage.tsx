import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTutorClassOverview } from '../../services/dashboardService';
import { listSessionsByPayrollMonth } from '../../services/sessionService';
import { TutorClassOverviewResponse } from '../../types/dashboard';
import { extractApiErrorMessage } from '../../services/authService';
import { realtimeEventBus } from '../../services/realtimeEventBus';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/tutor/StatCard';
import { formatVnd, getCurrentYearMonth } from '../../utils/format';

function TutorDashboardPage() {
  const [classes, setClasses] = useState<TutorClassOverviewResponse[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [estimatedTuition, setEstimatedTuition] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentMonth = getCurrentYearMonth();

  const activeClassCount = useMemo(
    () => classes.filter((c) => c.classStatus === 'ACTIVE').length,
    [classes]
  );

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const [classResponse, sessionsResponse] = await Promise.all([
        getTutorClassOverview(),
        listSessionsByPayrollMonth(currentMonth, 0),
      ]);
      setClasses(classResponse);
      setSessionCount(sessionsResponse.items.length);
      setEstimatedTuition(sessionsResponse.items.reduce((sum, item) => sum + item.tuitionAtLog, 0));
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load overview'));
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    void load();
    const unsub1 = realtimeEventBus.subscribe('PAYOUT_UPDATED', () => window.setTimeout(load, 250));
    const unsub2 = realtimeEventBus.subscribe('DASHBOARD_INVALIDATE', () => window.setTimeout(load, 250));
    const unsub3 = realtimeEventBus.subscribe('SESSION_FINANCIAL_UPDATED', () => window.setTimeout(load, 250));
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [load]);

  return (
    <div className="stack-16">
      <PageHeader title="Overview" subtitle="Your teaching activity at a glance." />

      {loading ? <Spinner label="Loading overview..." /> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <PageSection>
        <div className="stat-card-grid">
          <StatCard label="Sessions this month" value={sessionCount} hint={`Payroll month ${currentMonth}`} accent="amber" />
          <StatCard label="Active classes" value={activeClassCount} accent="blue" />
          <StatCard label="Estimated tuition" value={formatVnd(estimatedTuition)} hint="From logged sessions this month" accent="green" />
        </div>
      </PageSection>

      <PageSection title="Quick links">
        <div className="overview-quick-links">
          <Link to="/app/tutor/classes" className="btn btn-secondary btn-sm">
            My classes
          </Link>
          <Link to="/app/tutor/sessions" className="btn btn-secondary btn-sm">
            Sessions
          </Link>
          <Link to="/app/tutor/available-classes" className="btn btn-secondary btn-sm">
            Find classes
          </Link>
          <Link to="/app/tutor/earnings" className="btn btn-secondary btn-sm">
            Earnings
          </Link>
        </div>
      </PageSection>
    </div>
  );
}

export default TutorDashboardPage;
