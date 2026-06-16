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
  const isInactive = classStatus !== 'ACTIVE';

  return (
    <article className={`class-row${isInactive ? ' class-row-inactive' : ''}`}>
      <div className="class-row-info">
        <div className="class-row-name">{classLabel}</div>
        <div className="class-row-subject">{subjectName}</div>
      </div>
      <div className="class-row-stats">
        <div className="class-stat">
          <div className="class-stat-label">Rate</div>
          <div className="class-stat-value">{formatVnd(pricePerHour)}/hr</div>
        </div>
        <div className="class-stat">
          <div className="class-stat-label">Sessions</div>
          <div className="class-stat-value">{sessionCount}</div>
        </div>
        <div className="class-stat">
          <div className="class-stat-label">Latest</div>
          <div className="class-stat-value">{latestSessionDate ? formatDate(latestSessionDate) : '—'}</div>
        </div>
      </div>
      <div className="class-row-actions">
        <StatusPill label={classStatus} tone={classStatus === 'ACTIVE' ? 'success' : 'neutral'} />
        <Button type="button" onClick={onLogSession} disabled={isInactive}>
          Log session
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onViewRoster}>
          Roster
        </Button>
      </div>
    </article>
  );
}

export default ClassCard;
