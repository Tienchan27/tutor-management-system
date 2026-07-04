import { TutorClassRosterResponse } from '../../types/dashboard';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { formatVnd } from '../../utils/format';

interface ClassRosterModalProps {
  open: boolean;
  classLabel: string;
  classStatus?: string;
  roster: TutorClassRosterResponse | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}

function ClassRosterModal({
  open,
  classLabel,
  classStatus,
  roster,
  loading,
  error,
  onClose,
}: ClassRosterModalProps) {
  return (
    <Modal
      open={open}
      title="Class roster"
      subtitle={`${classLabel}${classStatus ? ` · ${classStatus}` : ''}`}
      onClose={onClose}
      footer={(requestClose) => (
        <Button variant="secondary" onClick={requestClose}>
          Close
        </Button>
      )}
    >
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <Spinner label="Loading roster..." /> : null}
      {!loading && roster ? (
        <div className="stack-8">
          {!roster.students.length ? (
            <p className="muted">No active students.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col" className="money-cell">Tuition</th>
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
        </div>
      ) : null}
    </Modal>
  );
}

export default ClassRosterModal;
