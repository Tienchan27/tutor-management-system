import { useEffect, useMemo, useState } from 'react';
import { getTutorClassOverview, getTutorDashboard, getTutorClassRoster } from '../../services/dashboardService';
import { listMySessionClasses } from '../../services/sessionService';
import { TutorClassOverviewResponse, TutorClassRosterResponse, TutorDashboardResponse } from '../../types/dashboard';
import { TutorSessionClassOptionResponse } from '../../types/sessions';
import { extractApiErrorMessage } from '../../services/authService';
import { realtimeEventBus } from '../../services/realtimeEventBus';

function TutorDashboardPage() {
  const [items, setItems] = useState<TutorDashboardResponse[]>([]);
  const [classes, setClasses] = useState<TutorClassOverviewResponse[]>([]);
  const [mySessionClasses, setMySessionClasses] = useState<TutorSessionClassOptionResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [rosterLoading, setRosterLoading] = useState<boolean>(false);
  const [rosterError, setRosterError] = useState<string>('');
  const [roster, setRoster] = useState<TutorClassRosterResponse | null>(null);
  const [rosterClassId, setRosterClassId] = useState<string>('');

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

    const unsub1 = realtimeEventBus.subscribe('PAYOUT_UPDATED', () => {
      window.setTimeout(() => load(), 250);
    });
    const unsub2 = realtimeEventBus.subscribe('DASHBOARD_INVALIDATE', () => {
      window.setTimeout(() => load(), 250);
    });
    const unsub3 = realtimeEventBus.subscribe('SESSION_FINANCIAL_UPDATED', () => {
      window.setTimeout(() => load(), 250);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  async function handleViewRoster(classId: string): Promise<void> {
    if (rosterClassId === classId && roster) {
      return;
    }
    setRosterLoading(true);
    setRosterError('');
    setRoster(null);
    setRosterClassId(classId);
    try {
      const response = await getTutorClassRoster(classId);
      setRoster(response);
    } catch (err: unknown) {
      setRosterError(extractApiErrorMessage(err, 'Failed to load class roster'));
    } finally {
      setRosterLoading(false);
    }
  }

  function handleCloseRoster(): void {
    setRoster(null);
    setRosterError('');
    setRosterLoading(false);
    setRosterClassId('');
  }

  const rosterClass = rosterClassId ? classes.find((c) => c.classId === rosterClassId) || null : null;
  const rosterClassLabel = rosterClass ? displayClassLabel(rosterClass) : '';

  return (
    <div className="stack-16">
      <div className="card">
        <h2 className="title title-lg">Tutor Dashboard</h2>
        <p className="subtitle">Track your monthly teaching revenue and salary status.</p>
        {loading ? <p className="muted">Loading...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !items.length ? <p className="muted">No payout records yet.</p> : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Gross Revenue</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.year}-${item.month}`}>
                    <td>{item.year}-{`${item.month}`.padStart(2, '0')}</td>
                    <td>{item.grossRevenue.toLocaleString()}</td>
                    <td>{item.netSalary.toLocaleString()}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3 className="section-title">Your classes overview</h3>
        {!loading && !classes.length ? <p className="muted">No assigned classes yet.</p> : null}
        {!!classes.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Class name</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Price/Hour</th>
                  <th>Salary Rate</th>
                  <th>Sessions</th>
                  <th>Latest Session</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classes.map((item) => (
                  <tr key={item.classId}>
                    <td>{displayClassLabel(item)}</td>
                    <td>{item.subjectName}</td>
                    <td>{item.classStatus}</td>
                    <td>{item.pricePerHour.toLocaleString()}</td>
                    <td>{(item.defaultSalaryRate * 100).toFixed(2)}%</td>
                    <td>{item.sessionCount}</td>
                    <td>{item.latestSessionDate || '-'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-soft-teal table-action"
                        onClick={() => handleViewRoster(item.classId)}
                        disabled={rosterLoading && rosterClassId === item.classId}
                      >
                        {rosterClassId === item.classId && roster ? 'Viewing' : rosterLoading && rosterClassId === item.classId ? 'Loading...' : 'View roster'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {rosterError ? <p className="error-text">{rosterError}</p> : null}
      {rosterClassId ? (
        <div className="card">
          <div className="page-header mb-8">
            <div>
              <h3 className="section-title">Roster</h3>
              <p className="subtitle mt-6">
                {rosterClass ? `${rosterClassLabel} • ${rosterClass.classStatus}` : 'Selected class'}
              </p>
            </div>
            <button type="button" className="btn btn-soft compact-btn" onClick={handleCloseRoster}>
              Close
            </button>
          </div>

          {rosterLoading ? <p className="muted">Loading roster...</p> : null}
          {!rosterLoading && roster ? (
            <p className="muted mb-8">
              Tuition amounts reflect the per-student allocation from the latest recorded session for this class. Until a session
              exists, amounts show as 0.
            </p>
          ) : null}
          {!rosterLoading && roster && !roster.students.length ? <p className="muted">No active students.</p> : null}
          {!rosterLoading && roster && !!roster.students.length ? (
            <div className="table-wrap">
              <table className="table table-comfortable">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Tuition (VND)</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.students.map((s) => (
                    <tr key={s.studentId}>
                      <td>{s.studentName}</td>
                      <td>{s.tuitionAtLog.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default TutorDashboardPage;
