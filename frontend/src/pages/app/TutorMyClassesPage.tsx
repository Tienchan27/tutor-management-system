import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTutorClassOverview, getTutorClassRoster } from '../../services/dashboardService';
import { listMySessionClasses } from '../../services/sessionService';
import { TutorClassOverviewResponse, TutorClassRosterResponse } from '../../types/dashboard';
import { TutorSessionClassOptionResponse } from '../../types/sessions';
import { extractApiErrorMessage } from '../../services/authService';
import { realtimeEventBus } from '../../services/realtimeEventBus';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ClassCard from '../../components/tutor/ClassCard';
import ClassRosterDrawer from '../../components/dashboard/ClassRosterDrawer';
import LogSessionModal from '../../components/tutor/LogSessionModal';
import { useToast } from '../../components/feedback/ToastProvider';

function TutorMyClassesPage() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<TutorClassOverviewResponse[]>([]);
  const [mySessionClasses, setMySessionClasses] = useState<TutorSessionClassOptionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inactiveExpanded, setInactiveExpanded] = useState(false);

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logClassId, setLogClassId] = useState('');

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

  async function load(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const [classResponse, sessionClassesResponse] = await Promise.all([
        getTutorClassOverview(),
        listMySessionClasses(),
      ]);
      setClasses(classResponse);
      setMySessionClasses(sessionClassesResponse);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load classes'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const unsub1 = realtimeEventBus.subscribe('DASHBOARD_INVALIDATE', () => window.setTimeout(load, 250));
    const unsub2 = realtimeEventBus.subscribe('SESSION_FINANCIAL_UPDATED', () => window.setTimeout(load, 250));
    return () => {
      unsub1();
      unsub2();
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

  function handleOpenLogSession(classId: string): void {
    setLogClassId(classId);
    setLogModalOpen(true);
  }

  function handleLogSuccess(): void {
    showToast('Session logged successfully', 'success');
    void load();
  }

  const rosterClass = rosterClassId ? classes.find((c) => c.classId === rosterClassId) || null : null;

  const activeClasses = classes.filter((c) => c.classStatus === 'ACTIVE');
  const inactiveClasses = classes.filter((c) => c.classStatus !== 'ACTIVE');

  return (
    <div className="stack-16">
      <PageHeader title="My classes" subtitle="Your assigned classes and quick actions." />

      <PageSection>
        {loading ? <Spinner label="Loading classes..." /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !classes.length ? (
          <>
            <EmptyState title="No assigned classes" description="Apply on Find classes or wait for admin approval." />
            <Link to="/app/tutor/available-classes" className="btn btn-secondary btn-sm">
              Find classes
            </Link>
          </>
        ) : null}
        {!!classes.length ? (
          <div className="class-list">
            {activeClasses.length > 0 ? (
              <>
                <div className="class-section-header class-section-header-active">
                  <span>Active classes</span>
                  <span className="class-section-count">{activeClasses.length}</span>
                </div>
                {activeClasses.map((item) => (
                  <ClassCard
                    key={item.classId}
                    classLabel={displayClassLabel(item)}
                    subjectName={item.subjectName}
                    classStatus={item.classStatus}
                    pricePerHour={item.pricePerHour}
                    sessionCount={item.sessionCount}
                    latestSessionDate={item.latestSessionDate}
                    onLogSession={() => handleOpenLogSession(item.classId)}
                    onViewRoster={() => void handleViewRoster(item.classId)}
                  />
                ))}
              </>
            ) : null}
            {inactiveClasses.length > 0 ? (
              <>
                <button
                  type="button"
                  className="class-section-header class-section-header-inactive"
                  onClick={() => setInactiveExpanded((v) => !v)}
                >
                  <span>Inactive classes</span>
                  <span className="class-section-count">{inactiveClasses.length}</span>
                  <span className={`class-section-chevron${inactiveExpanded ? ' expanded' : ''}`}>▸</span>
                </button>
                {inactiveExpanded
                  ? inactiveClasses.map((item) => (
                      <ClassCard
                        key={item.classId}
                        classLabel={displayClassLabel(item)}
                        subjectName={item.subjectName}
                        classStatus={item.classStatus}
                        pricePerHour={item.pricePerHour}
                        sessionCount={item.sessionCount}
                        latestSessionDate={item.latestSessionDate}
                        onLogSession={() => handleOpenLogSession(item.classId)}
                        onViewRoster={() => void handleViewRoster(item.classId)}
                      />
                    ))
                  : null}
              </>
            ) : null}
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

      <LogSessionModal
        open={logModalOpen}
        classes={mySessionClasses}
        initialClassId={logClassId}
        lockClass={!!logClassId}
        onClose={() => {
          setLogModalOpen(false);
          setLogClassId('');
        }}
        onSuccess={handleLogSuccess}
      />
    </div>
  );
}

export default TutorMyClassesPage;
