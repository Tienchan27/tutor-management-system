import { formatVnd } from '../../utils/format';

export interface StudentTuitionRow {
  studentId: string;
  name: string;
  tuitionAtLog: number;
}

interface StudentTuitionEditorProps {
  students: StudentTuitionRow[];
  onTuitionChange: (studentId: string, tuitionAtLog: number) => void;
}

function StudentTuitionEditor({ students, onTuitionChange }: StudentTuitionEditorProps) {
  const total = students.reduce((sum, row) => sum + row.tuitionAtLog, 0);

  return (
    <div className="table-wrap">
      <table className="table table-comfortable">
        <thead>
          <tr>
            <th>Student</th>
            <th className="money-cell">Tuition (VND)</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.studentId}>
              <td>{student.name}</td>
              <td className="money-cell">
                <input
                  className="table-input money-number table-input-medium"
                  type="number"
                  step="1"
                  min="0"
                  value={student.tuitionAtLog}
                  onChange={(event) =>
                    onTuitionChange(student.studentId, Math.round(Number(event.target.value)))
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="table-footer-row">
            <td>Total</td>
            <td className="money-cell">{formatVnd(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default StudentTuitionEditor;
