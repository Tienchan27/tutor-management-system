import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createSession } from '../../services/sessionService';
import { CreateSessionRequest, TutorSessionClassOptionResponse } from '../../types/sessions';
import { extractApiErrorMessage } from '../../services/authService';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import StudentTuitionDrawer, { StudentTuitionRow } from '../sessions/StudentTuitionDrawer';
import { formatVnd, getCurrentYearMonth } from '../../utils/format';

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
}

function buildInitialForm(classId: string): CreateSessionRequest {
  return {
    classId,
    date: getTodayDate(),
    durationHours: 1,
    salaryRateAtLog: 0.75,
    studentTuitions: [],
    payrollMonth: getCurrentYearMonth(),
    note: '',
  };
}

interface LogSessionModalProps {
  open: boolean;
  classes: TutorSessionClassOptionResponse[];
  initialClassId?: string;
  lockClass?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function LogSessionModal({
  open,
  classes,
  initialClassId = '',
  lockClass = false,
  onClose,
  onSuccess,
}: LogSessionModalProps) {
  const [form, setForm] = useState<CreateSessionRequest>(buildInitialForm(initialClassId));
  const [tuitionDrawerOpen, setTuitionDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === form.classId) || null,
    [classes, form.classId]
  );

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

  useEffect(() => {
    if (!open) {
      return;
    }
    setError('');
    setTuitionDrawerOpen(false);
    const nextClassId = initialClassId || '';
    setForm(buildInitialForm(nextClassId));
    const nextClass = classes.find((c) => c.id === nextClassId) || null;
    if (nextClass) {
      const tuitionPerStudent = Math.round(nextClass.pricePerHour * 1);
      setForm((prev) => ({
        ...prev,
        classId: nextClassId,
        studentTuitions: nextClass.students.map((s) => ({ studentId: s.id, tuitionAtLog: tuitionPerStudent })),
      }));
    }
    // `classes` intentionally omitted: form should only reset when the modal opens or the initial class changes,
    // not whenever the parent re-renders with a new classes array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialClassId]);

  function overwriteAllStudentTuitions(
    nextDurationHours: number,
    nextClass: TutorSessionClassOptionResponse | null
  ): void {
    const tuitionPerStudent = Math.round((nextClass?.pricePerHour ?? 0) * nextDurationHours);
    setForm((prev) => ({
      ...prev,
      durationHours: nextDurationHours,
      studentTuitions: nextClass?.students?.map((s) => ({ studentId: s.id, tuitionAtLog: tuitionPerStudent })) ?? [],
    }));
  }

  function handleClassChange(classId: string): void {
    const nextClass = classes.find((c) => c.id === classId) || null;
    setTuitionDrawerOpen(false);
    setForm((prev) => ({ ...prev, classId }));
    overwriteAllStudentTuitions(form.durationHours, nextClass);
  }

  function handleResetToDefault(): void {
    if (!selectedClass) {
      return;
    }
    overwriteAllStudentTuitions(form.durationHours, selectedClass);
  }

  function handleTuitionApply(rows: StudentTuitionRow[]): void {
    setForm((prev) => ({
      ...prev,
      studentTuitions: rows.map((row) => ({ studentId: row.studentId, tuitionAtLog: row.tuitionAtLog })),
    }));
    setTuitionDrawerOpen(false);
  }

  function handleTuitionChange(studentId: string, tuitionAtLog: number): void {
    setForm((prev) => {
      const exists = prev.studentTuitions.some((t) => t.studentId === studentId);
      if (!exists) {
        return {
          ...prev,
          studentTuitions: [...prev.studentTuitions, { studentId, tuitionAtLog }],
        };
      }
      return {
        ...prev,
        studentTuitions: prev.studentTuitions.map((t) =>
          t.studentId === studentId ? { ...t, tuitionAtLog } : t
        ),
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedClass) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createSession({
        ...form,
        salaryRateAtLog: selectedClass.defaultSalaryRate,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to create session'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        title="Log session"
        subtitle="Record a completed teaching session."
        size="lg"
        onClose={onClose}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="log-session-form" loading={submitting} disabled={!form.classId}>
              Log session
            </Button>
          </>
        }
      >
        <form id="log-session-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="session-form-grid">
            <label className="input-wrapper input-wrapper-tight">
              <span className="input-label">Class</span>
              <select
                className="text-input"
                value={form.classId}
                onChange={(event) => handleClassChange(event.target.value)}
                required
                disabled={!classes.length || (lockClass && !!initialClassId)}
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
                onChange={(event) => setForm({ ...form, date: event.target.value })}
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
                onChange={(event) =>
                  overwriteAllStudentTuitions(Number(event.target.value), selectedClass)
                }
                required
                disabled={!form.classId}
              />
            </label>

            <label className="input-wrapper input-wrapper-tight">
              <span className="input-label">Class rate</span>
              <input
                className="text-input"
                type="text"
                readOnly
                value={selectedClass ? `${formatVnd(selectedClass.pricePerHour)}/hr` : '—'}
                disabled={!form.classId}
              />
            </label>

            <label className="input-wrapper input-wrapper-tight">
              <span className="input-label">Note</span>
              <input
                className="text-input"
                placeholder="Optional note"
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                disabled={!form.classId}
              />
            </label>
          </div>

          <details className="session-advanced mt-12">
            <summary className="session-advanced-summary">Advanced</summary>
            <label className="input-wrapper input-wrapper-tight mt-12">
              <span className="input-label">Payroll month</span>
              <input
                className="text-input"
                type="month"
                value={form.payrollMonth}
                onChange={(event) => setForm({ ...form, payrollMonth: event.target.value })}
                disabled={!form.classId}
              />
            </label>
          </details>

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
              <Button type="button" variant="ghost" className="compact-btn" onClick={() => setTuitionDrawerOpen(true)}>
                Edit tuitions
              </Button>
            </div>
          ) : null}

          {!classes.length ? (
            <p className="muted mt-12">You need at least one assigned class before logging a session.</p>
          ) : null}
          {error ? <p className="error-text mt-12">{error}</p> : null}
        </form>
      </Modal>

      <StudentTuitionDrawer
        open={tuitionDrawerOpen}
        students={tuitionRows}
        defaultTuitionPerStudent={defaultTuitionPerStudent}
        onClose={() => setTuitionDrawerOpen(false)}
        onSave={handleTuitionApply}
        onResetToDefault={handleResetToDefault}
        onTuitionChange={handleTuitionChange}
      />
    </>
  );
}

export default LogSessionModal;
