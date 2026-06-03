import { useEffect, useMemo, useState } from 'react';
import { getTutorClassOverview, getTutorDashboard, getTutorClassRoster } from '../../services/dashboardService';
import { listMySessionClasses } from '../../services/sessionService';
import { TutorClassOverviewResponse, TutorClassRosterResponse, TutorDashboardResponse } from '../../types/dashboard';
import { TutorSessionClassOptionResponse } from '../../types/sessions';
import { extractApiErrorMessage } from '../../services/authService';
import { realtimeEventBus } from '../../services/realtimeEventBus';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import ClassRosterDrawer from '../../components/dashboard/ClassRosterDrawer';
import { formatDate, formatVnd } from '../../utils/format';

function payoutTone(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'PAID') {
    return 'success';
  }
  if (status === 'LOCKED') {
    return 'warning';
  }
  return 'danger';
}

function TutorDashboardPage() {
  const [items, setItems] = useState<TutorDashboardResponse[]>([]);
  const [classes, setClasses] = useState<TutorClassOverviewResponse[]>([]);
  const [mySessionClasses, setMySessionClasses] = useState<TutorSessionClassOptionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [roster, setRoster] = useState<TutorClassRosterResponse | null>(null);
  const [rosterClassId, setRosterClassId] = useState('');

  const classNameByIdFromSessionApi = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of mySessionClasses) {
      map.set(c.id, c.className);
    }
    return map;
  }, [mySessionClasses]);

  function displayClassLabel(item: TutorClassOverviewResponse): string {
    const fromOverview = item.classDisplayName?.trim();
    if (fromOverview) {
      return fromOverview;
    }
    return classNameByIdFromSessionApi.get(item.classId) || item.subjectName;
  }

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        const [dashboardResponse, classResponse, sessionClassesResponse] = await Promise.all([
          getTutorDashboard(),
          getTutorClassOverview(),
          listMySessionClasses(),
        ]);
        setItems(dashboardResponse);
        setClasses(classResponse);
        setMySessionClasses(sessionClassesResponse);
      } catch (err: unknown) {
        setError(extractApiErrorMessage(err, 'Failed to load tutor dashboard'));
      } finally {
        setLoading(false);
      }
    }
    load();

    const unsub1 = realtimeEventBus.subscribe('PAYOUT_UPDATED', () => window.setTimeout(load, 250));
    const unsub2 = realtimeEventBus.subscribe('DASHBOARD_INVALIDATE', () => window.setTimeout(load, 250));
    const unsub3 = realtimeEventBus.subscribe('SESSION_FINANCIAL_UPDATED', () => window.setTimeout(load, 250));
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  async function handleViewRoster(classId: string): Promise<void> {
    setRosterClassId(classId);
    setRosterLoading(true);
    setRosterError('');
    setRoster(null);
    try {
      setRoster(await getTutorClassRoster(classId));
    } catch (err: unknown) {
      setRosterError(extractApiErrorMessage(err, 'Failed to load class roster'));
    } finally {
      setRosterLoading(false);
    }
  }

  function handleCloseRoster(): void {
    setRoster(null);
    setRosterError('');
    setRosterClassId('');
  }

  const rosterClass = rosterClassId ? classes.find((c) => c.classId === rosterClassId) || null : null;

  return (
    <div className="stack-16">
      <PageHeader title="Dashboard" subtitle="Monthly payout summary and your assigned classes." />

      <PageSection title="Payout history">
        {loading ? <Spinner label="Loading dashboard..." /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !items.length ? (
          <EmptyState title="No payout records yet" description="Payouts appear after admin closes payroll for a month." />
        ) : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col" className="money-cell">
                    Gross
                  </th>
                  <th scope="col" className="money-cell">
                    Net
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.year}-${item.month}`}>
                    <td>
                      {item.year}-{`${item.month}`.padStart(2, '0')}
                    </td>
                    <td className="money-cell">{formatVnd(item.grossRevenue)}</td>
                    <td className="money-cell">{formatVnd(item.netSalary)}</td>
                    <td>
                      <StatusPill label={item.status} tone={payoutTone(item.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PageSection>

      <PageSection title="Your classes">
        {!loading && !classes.length ? (
          <EmptyState title="No assigned classes" description="Apply on the marketplace or wait for admin approval." />
        ) : null}
        {!!classes.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Status</th>
                  <th scope="col">Rate</th>
                  <th scope="col">Sessions</th>
                  <th scope="col">Latest</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {classes.map((item) => (
                  <tr key={item.classId}>
                    <td>{displayClassLabel(item)}</td>
                    <td>{item.subjectName}</td>
                    <td>{item.classStatus}</td>
                    <td>{formatVnd(item.pricePerHour)}/hr</td>
                    <td>{item.sessionCount}</td>
                    <td>{item.latestSessionDate ? formatDate(item.latestSessionDate) : '—'}</td>
                    <td>
                      <Button variant="soft" size="sm" onClick={() => handleViewRoster(item.classId)}>
                        View roster
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PageSection>

      <ClassRosterDrawer
        open={!!rosterClassId}
        classLabel={rosterClass ? displayClassLabel(rosterClass) : 'Class'}
        classStatus={rosterClass?.classStatus}
        roster={roster}
        loading={rosterLoading}
        error={rosterError}
        onClose={handleCloseRoster}
      />
    </div>
  );
}

export default TutorDashboardPage;
