import { FormEvent, ReactNode } from 'react';
import { CreateSessionRequest, TutorSessionClassOptionResponse } from '../../../types/sessions';
import Button from '../../../components/ui/Button';
import StudentTuitionDrawer, { StudentTuitionRow } from '../../../components/sessions/StudentTuitionDrawer';
import { formatVnd } from '../../../utils/format';

interface TutorSessionCreateFormProps {
  classes: TutorSessionClassOptionResponse[];
  form: CreateSessionRequest;
  salaryRatePercent: number;
  error: string;
  tuitionDrawerOpen: boolean;
  onFormChange: (next: CreateSessionRequest) => void;
  onSalaryRateChange: (percent: number) => void;
  onClassChange: (classId: string, nextClass: TutorSessionClassOptionResponse | null) => void;
  onDurationChange: (hours: number, nextClass: TutorSessionClassOptionResponse | null) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenTuitionDrawer: () => void;
  onCloseTuitionDrawer: () => void;
  onTuitionChange: (studentId: string, tuitionAtLog: number) => void;
  onTuitionReset: () => void;
  onTuitionApply: (rows: StudentTuitionRow[]) => void;
}

function TutorSessionCreateForm({
  classes,
  form,
  salaryRatePercent,
  error,
  tuitionDrawerOpen,
  onFormChange,
  onSalaryRateChange,
  onClassChange,
  onDurationChange,
  onReset,
  onSubmit,
  onOpenTuitionDrawer,
  onCloseTuitionDrawer,
  onTuitionChange,
  onTuitionReset,
  onTuitionApply,
}: TutorSessionCreateFormProps) {
  const selectedClass = classes.find((c) => c.id === form.classId) || null;
  const defaultTuitionPerStudent = selectedClass
    ? Math.round(selectedClass.pricePerHour * form.durationHours)
    : 0;
  const totalTuition = form.studentTuitions.reduce((sum, item) => sum + (item.tuitionAtLog || 0), 0);

  const tuitionRows: StudentTuitionRow[] =
    selectedClass?.students.map((student) => {
      const row = form.studentTuitions.find((t) => t.studentId === student.id);
      return {
        studentId: student.id,
        name: student.name,
        tuitionAtLog: row?.tuitionAtLog ?? 0,
      };
    }) ?? [];

  function handleTuitionApply(rows: StudentTuitionRow[]): void {
    onTuitionApply(rows);
    onCloseTuitionDrawer();
  }

  return (
    <PageSectionCard>
      <h3 className="section-title">Log session</h3>
      <form onSubmit={onSubmit}>
        <div className="session-form-grid">
          <label className="input-wrapper input-wrapper-tight">
            <span className="input-label">Class</span>
            <select
              className="text-input"
              value={form.classId}
              onChange={(event) => {
                const next = classes.find((c) => c.id === event.target.value) || null;
                onClassChange(event.target.value, next);
              }}
              required
              disabled={!classes.length}
            >
              <option value="">Select class</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.className}
                </option>
              ))}
            </select>
          </label>

          <label className="input-wrapper input-wrapper-tight">
            <span className="input-label">Date</span>
            <input
              className="text-input"
              type="date"
              value={form.date}
              onChange={(event) => onFormChange({ ...form, date: event.target.value })}
              required
              disabled={!form.classId}
            />
          </label>

          <label className="input-wrapper input-wrapper-tight">
            <span className="input-label">Duration (hours)</span>
            <input
              className="text-input"
              type="number"
              step="0.25"
              value={form.durationHours}
              onChange={(event) => onDurationChange(Number(event.target.value), selectedClass)}
              required
              disabled={!form.classId}
            />
          </label>

          <label className="input-wrapper input-wrapper-tight">
            <span className="input-label">Payroll month</span>
            <input
              className="text-input"
              type="month"
              value={form.payrollMonth}
              onChange={(event) => onFormChange({ ...form, payrollMonth: event.target.value })}
              disabled={!form.classId}
            />
          </label>

          <label className="input-wrapper input-wrapper-tight">
            <span className="input-label">Salary rate (%)</span>
            <input
              className="text-input"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={salaryRatePercent}
              onChange={(event) => onSalaryRateChange(Number(event.target.value))}
              required
              disabled={!form.classId}
            />
          </label>

          <label className="input-wrapper input-wrapper-tight">
            <span className="input-label">Note</span>
            <input
              className="text-input"
              placeholder="Optional note"
              value={form.note}
              onChange={(event) => onFormChange({ ...form, note: event.target.value })}
              disabled={!form.classId}
            />
          </label>
        </div>

        {selectedClass ? (
          <div className="session-tuition-summary mt-12">
            <div>
              <p className="mb-0">
                <strong>Students ({selectedClass.students.length})</strong>
              </p>
              <p className="muted small mb-0">
                Default/student: {formatVnd(defaultTuitionPerStudent)} · Total: {formatVnd(totalTuition)}
              </p>
            </div>
            <Button type="button" variant="ghost" className="compact-btn" onClick={onOpenTuitionDrawer}>
              Edit tuitions
            </Button>
          </div>
        ) : null}

        {!classes.length ? <p className="muted mt-12">You need at least one assigned class before creating a session.</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <div className="form-actions">
          <Button type="button" variant="ghost" className="compact-btn" onClick={onReset} disabled={!form.classId}>
            Reset
          </Button>
          <Button type="submit" className="compact-btn" disabled={!form.classId}>
            Log session
          </Button>
        </div>
      </form>

      <StudentTuitionDrawer
        open={tuitionDrawerOpen}
        students={tuitionRows}
        defaultTuitionPerStudent={defaultTuitionPerStudent}
        onClose={onCloseTuitionDrawer}
        onSave={handleTuitionApply}
        onResetToDefault={onTuitionReset}
        onTuitionChange={onTuitionChange}
      />
    </PageSectionCard>
  );
}

function PageSectionCard({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

export default TutorSessionCreateForm;
