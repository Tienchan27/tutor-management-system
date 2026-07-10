import Button from '../../../../components/ui/Button';
import EmptyState from '../../../../components/ui/EmptyState';
import { formatDate } from '../../../../utils/format';
import { PublishedClassResponse } from '../../../../types/classAssignment';

interface AdminApplicationsTabProps {
  classesWithPending: PublishedClassResponse[];
  applicationLoadingId: string;
  onApprove: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
}

export default function AdminApplicationsTab({
  classesWithPending,
  applicationLoadingId,
  onApprove,
  onReject,
}: AdminApplicationsTabProps) {
  if (classesWithPending.length === 0) {
    return (
      <EmptyState
        title="No pending applications"
        description="All tutor applications have been reviewed."
      />
    );
  }

  return (
    <>
      {classesWithPending.map((cls) => {
        const pendingApps = cls.applications.filter((a) => a.status === 'PENDING');
        return (
          <div key={cls.classId} className="mb-16">
            <div className="class-section-header class-section-header-active">
              <span>{cls.displayName}</span>
              <span className="class-section-count">{pendingApps.length}</span>
            </div>
            {pendingApps.map((app) => (
              <div key={app.applicationId} className="application-row">
                <div className="application-info">
                  <span className="application-name">{app.tutorName}</span>
                  <span className="application-email muted small">{app.tutorEmail}</span>
                  <span className="application-date muted small">{formatDate(app.appliedAt)}</span>
                </div>
                <div className="table-actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onApprove(app.applicationId)}
                    loading={applicationLoadingId === app.applicationId}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onReject(app.applicationId)}
                    disabled={!!applicationLoadingId}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
