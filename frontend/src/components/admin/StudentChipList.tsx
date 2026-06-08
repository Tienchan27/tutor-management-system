interface StudentChipItem {
  email: string;
  name?: string | null;
}

interface StudentChipListProps {
  students: StudentChipItem[];
  onRemove: (email: string) => void;
}

function StudentChipList({ students, onRemove }: StudentChipListProps) {
  if (!students.length) {
    return <p className="muted mb-0">No students added yet.</p>;
  }

  return (
    <div className="chip-list" role="list">
      {students.map((student) => (
        <div key={student.email} className="chip" role="listitem">
          <div className="chip-label">
            <span className="chip-email">{student.email}</span>
            <span className="chip-name">{student.name || student.email}</span>
          </div>
          <button
            type="button"
            className="chip-remove"
            aria-label={`Remove ${student.email}`}
            onClick={() => onRemove(student.email)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default StudentChipList;
