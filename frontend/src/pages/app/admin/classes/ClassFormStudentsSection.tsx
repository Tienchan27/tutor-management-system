import { Dispatch, SetStateAction } from 'react';
import Button from '../../../../components/ui/Button';
import StudentChipList from '../../../../components/admin/StudentChipList';
import { PublishedClassResponse } from '../../../../types/classAssignment';
import { ClassFormState, isLikelyEmail } from './classAssignmentUtils';

interface ClassFormStudentsSectionProps {
  isEditMode: boolean;
  form: ClassFormState;
  setForm: Dispatch<SetStateAction<ClassFormState>>;
  editingClass: PublishedClassResponse | null;
  rosterLoading: boolean;
  onAddStudent: () => void;
  onRemoveStudent: (email: string) => void;
  onAddStudentToClass: () => void;
  onRemoveStudentFromClass: (studentId: string) => void;
}

export default function ClassFormStudentsSection({
  isEditMode,
  form,
  setForm,
  editingClass,
  rosterLoading,
  onAddStudent,
  onRemoveStudent,
  onAddStudentToClass,
  onRemoveStudentFromClass,
}: ClassFormStudentsSectionProps) {
  if (isEditMode) {
    return (
      <>
        {editingClass && editingClass.students.length > 0 ? (
          <div className="chip-list mb-8">
            {editingClass.students.map((s) => (
              <span key={s.studentId} className="chip">
                <span className="chip-label">
                  <span className="chip-name">{s.name}</span>
                </span>
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={`Remove ${s.name}`}
                  disabled={rosterLoading}
                  onClick={() => void onRemoveStudentFromClass(s.studentId)}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="muted mb-8">No students in this class yet.</p>
        )}
        <div className="invite-inline-form mb-8">
          <input
            type="email"
            className="text-input"
            placeholder="Add student by email"
            value={form.studentEmail}
            disabled={rosterLoading}
            onChange={(e) => setForm((prev) => ({ ...prev, studentEmail: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void onAddStudentToClass();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="compact-btn"
            disabled={!isLikelyEmail(form.studentEmail) || rosterLoading}
            onClick={() => void onAddStudentToClass()}
          >
            Add
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="invite-inline-form mb-8">
        <input
          type="email"
          className="text-input"
          placeholder="Add student by email"
          value={form.studentEmail}
          disabled={form.studentAdding}
          onChange={(e) => setForm((prev) => ({ ...prev, studentEmail: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void onAddStudent();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="compact-btn"
          disabled={!isLikelyEmail(form.studentEmail) || form.studentAdding}
          onClick={() => void onAddStudent()}
        >
          Add
        </Button>
      </div>
      <StudentChipList students={form.students} onRemove={onRemoveStudent} />
    </>
  );
}
