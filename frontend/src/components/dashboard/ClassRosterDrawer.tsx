import { TutorClassRosterResponse } from '../../types/dashboard';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { formatVnd } from '../../utils/format';

interface ClassRosterDrawerProps {
  open: boolean;
  classLabel: string;
  classStatus?: string;
  roster: TutorClassRosterResponse | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}

function ClassRosterDrawer({
  open,
  classLabel,
  classStatus,
  roster,
  loading,
  error,
  onClose,
}: ClassRosterDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation" onClick={onClose}>
      <div className="dialog-card dialog-card-wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="section-header">
          <div>
            <h2 className="dialog-title">Class roster</h2>
            <p className="subtitle">
              {classLabel}
              {classStatus ? ` • ${classStatus}` : ''}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {loading ? <Spinner label="Loading roster..." /> : null}
        {!loading && roster ? (
          <>
            <p className="muted">
              Tuition amounts reflect per-student allocation from the latest recorded session. Until a session exists,
              amounts show as 0 VND.
            </p>
            {!roster.students.length ? (
              <p className="muted">No active students.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col" className="money-cell">
                        Tuition
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.students.map((s) => (
                      <tr key={s.studentId}>
                        <td>{s.studentName}</td>
                        <td className="money-cell">{formatVnd(s.tuitionAtLog)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default ClassRosterDrawer;
