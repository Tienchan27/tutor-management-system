import Button from '../ui/Button';
import StatusPill from '../ui/StatusPill';
import { formatDate, formatVnd } from '../../utils/format';

interface ClassCardProps {
  classLabel: string;
  subjectName: string;
  classStatus: string;
  pricePerHour: number;
  sessionCount: number;
  latestSessionDate: string | null;
  onLogSession: () => void;
  onViewRoster: () => void;
}

function ClassCard({
  classLabel,
  subjectName,
  classStatus,
  pricePerHour,
  sessionCount,
  latestSessionDate,
  onLogSession,
  onViewRoster,
}: ClassCardProps) {
  return (
    <article className="class-card">
      <div className="class-card-header">
        <h3 className="class-card-title">{classLabel}</h3>
        <StatusPill label={classStatus} tone={classStatus === 'ACTIVE' ? 'success' : 'neutral'} />
      </div>
      <p className="class-card-subject muted mb-0">{subjectName}</p>
      <dl className="class-card-meta">
        <div>
          <dt>Rate</dt>
          <dd>{formatVnd(pricePerHour)}/hr</dd>
        </div>
        <div>
          <dt>Sessions</dt>
          <dd>{sessionCount}</dd>
        </div>
        <div>
          <dt>Latest</dt>
          <dd>{latestSessionDate ? formatDate(latestSessionDate) : '—'}</dd>
        </div>
      </dl>
      <div className="class-card-actions">
        <Button type="button" onClick={onLogSession}>
          Log session
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onViewRoster}>
          View roster
        </Button>
      </div>
    </article>
  );
}

export default ClassCard;
