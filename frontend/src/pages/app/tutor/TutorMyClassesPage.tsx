import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getTutorClassOverview, getTutorClassRoster } from '../../../services/dashboardService';
import { listMySessionClasses } from '../../../services/sessionService';
import { TutorClassOverviewResponse } from '../../../types/dashboard';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import ClassCard from '../../../components/tutor/ClassCard';
import ClassRosterDrawer from '../../../components/dashboard/ClassRosterDrawer';
import LogSessionModal from '../../../components/tutor/LogSessionModal';
import { useToast } from '../../../components/feedback/ToastProvider';

function TutorMyClassesPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [inactiveExpanded, setInactiveExpanded] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logClassId, setLogClassId] = useState('');
  const [rosterClassId, setRosterClassId] = useState('');

  const { data, isLoading: loading, error: loadError } = useQuery({
    queryKey: ['tutorMyClasses'],
    queryFn: async () => {
      const [classResponse, sessionClassesResponse] = await Promise.all([
        getTutorClassOverview(),
        listMySessionClasses(),
      ]);
      return { classes: classResponse, mySessionClasses: sessionClassesResponse };
    },
  });
  const classes = data?.classes ?? [];
  const mySessionClasses = data?.mySessionClasses ?? [];
  const error = loadError ? extractApiErrorMessage(loadError, 'Failed to load classes') : '';

  const { data: roster = null, isLoading: rosterLoading, error: rosterErrorObj } = useQuery({
    queryKey: ['tutorClassRoster', rosterClassId],
    queryFn: () => getTutorClassRoster(rosterClassId),
    enabled: !!rosterClassId,
  });
  const rosterError = rosterErrorObj ? extractApiErrorMessage(rosterErrorObj, 'Failed to load class roster') : '';

  const classNameByIdFromSessionApi = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of mySessionClasses) {
      map.set(c.id, c.className);
    }
    return map;
  }, [mySessionClasses]);

  function displayClassLabel(item: TutorClassOverviewResponse): string {
    const fromOverview = item.classDisplayName?.trim();
    if (fromOverview) return fromOverview;
    return classNameByIdFromSessionApi.get(item.classId) || item.subjectName;
  }

  const rosterClass = rosterClassId ? classes.find((c) => c.classId === rosterClassId) || null : null;
  const activeClasses = classes.filter((c) => c.classStatus === 'ACTIVE');
  const inactiveClasses = classes.filter((c) => c.classStatus !== 'ACTIVE');

  return (
    <PageLayout title="Classes" subtitle="Your primary workspace — roster and log sessions by class.">
      <PageSection>
        {loading ? <Spinner label="Loading classes..." /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !classes.length ? (
          <>
            <EmptyState title="No assigned classes" description="Apply on Marketplace or wait for admin approval." />
            <Link to="/app/tutor/marketplace" className="btn btn-secondary btn-sm">
              Marketplace
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
                    onLogSession={() => {
                      setLogClassId(item.classId);
                      setLogModalOpen(true);
                    }}
                    onViewRoster={() => setRosterClassId(item.classId)}
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
                        onLogSession={() => {
                          setLogClassId(item.classId);
                          setLogModalOpen(true);
                        }}
                        onViewRoster={() => setRosterClassId(item.classId)}
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
        onClose={() => setRosterClassId('')}
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
        onSuccess={() => {
          showToast('Session logged successfully', 'success');
          void queryClient.invalidateQueries({ queryKey: ['tutorMyClasses'] });
        }}
      />
    </PageLayout>
  );
}

export default TutorMyClassesPage;
