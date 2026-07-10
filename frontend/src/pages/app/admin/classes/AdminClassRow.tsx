import { PublishedClassResponse } from '../../../../types/classAssignment';
import { formatVnd } from '../../../../utils/format';
import StatusPill from '../../../../components/ui/StatusPill';
import { assignedTutor, classStatusLabel, classStatusTone } from './classAssignmentUtils';

interface AdminClassRowProps {
  cls: PublishedClassResponse;
  inactive?: boolean;
  deleteLoading: boolean;
  onEdit: (cls: PublishedClassResponse) => void;
  onDelete: (classId: string) => void;
}

export default function AdminClassRow({ cls, inactive, deleteLoading, onEdit, onDelete }: AdminClassRowProps) {
  return (
    <article className={`class-row${inactive ? ' class-row-inactive' : ''}`}>
      <div className="class-row-info">
        <div className="class-row-name">{cls.displayName}</div>
        <div className="class-row-subject">{cls.subjectName}</div>
        {cls.students.length > 0 ? (
          <div className="ac-card-students mt-6">
            {cls.students.map((s) => (
              <span key={s.studentId} className="student-chip-label">{s.name}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="class-row-stats">
        <div className="class-stat">
          <div className="class-stat-label">Fee</div>
          <div className="class-stat-value">{formatVnd(cls.pricePerHour)}/hr</div>
        </div>
        <div className="class-stat">
          <div className="class-stat-label">Tutor</div>
          <div className="class-stat-value">
            {assignedTutor(cls) ?? <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>None yet</span>}
          </div>
        </div>
      </div>
      <div className="class-row-actions">
        <StatusPill label={classStatusLabel(cls.status)} tone={classStatusTone(cls.status)} />
        <button type="button" className="icon-btn" title="Edit class" onClick={() => onEdit(cls)}>
          ✎
        </button>
        <button
          type="button"
          className="icon-btn icon-btn-danger"
          title="Delete class"
          onClick={() => onDelete(cls.classId)}
          disabled={deleteLoading}
        >
          ✕
        </button>
      </div>
    </article>
  );
}
