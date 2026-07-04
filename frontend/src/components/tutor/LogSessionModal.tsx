import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createSession } from '../../services/sessionService';
import { CreateSessionRequest, TutorSessionClassOptionResponse } from '../../types/sessions';
import { extractApiErrorMessage } from '../../services/authService';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ConfirmDialog from '../feedback/ConfirmDialog';
import StudentTuitionEditor from '../sessions/StudentTuitionEditor';
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

function tuitionsEqual(
  a: CreateSessionRequest['studentTuitions'],
  b: CreateSessionRequest['studentTuitions']
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const map = new Map(b.map((tuition) => [tuition.studentId, tuition.tuitionAtLog]));
  return a.every((tuition) => map.get(tuition.studentId) === tuition.tuitionAtLog);
}

function sessionFormsEqual(a: CreateSessionRequest, b: CreateSessionRequest): boolean {
  return (
    a.classId === b.classId &&
    a.date === b.date &&
    a.durationHours === b.durationHours &&
    a.payrollMonth === b.payrollMonth &&
    (a.note ?? '') === (b.note ?? '') &&
    tuitionsEqual(a.studentTuitions, b.studentTuitions)
  );
}

function hasCustomTuitions(
  studentTuitions: CreateSessionRequest['studentTuitions'],
  tutorClass: TutorSessionClassOptionResponse | null,
  durationHours: number
): boolean {
  if (!tutorClass) {
    return false;
  }
  const defaultPerStudent = Math.round(tutorClass.pricePerHour * durationHours);
  return studentTuitions.some((tuition) => {
    const enrolled = tutorClass.students.some((student) => student.id === tuition.studentId);
    return enrolled && tuition.tuitionAtLog !== defaultPerStudent;
  });
}

interface PendingTuitionReset {
  durationHours: number;
  classId: string;
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
  const [baselineForm, setBaselineForm] = useState<CreateSessionRequest | null>(null);
  const [pendingTuitionReset, setPendingTuitionReset] = useState<PendingTuitionReset | null>(null);
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

  const tuitionStudents =
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
      setBaselineForm(null);
      setPendingTuitionReset(null);
      return;
    }
    setError('');
    const nextClassId = initialClassId || '';
    const nextClass = classes.find((c) => c.id === nextClassId) || null;
    let nextForm = buildInitialForm(nextClassId);
    if (nextClass) {
      const tuitionPerStudent = Math.round(nextClass.pricePerHour * 1);
      nextForm = {
        ...nextForm,
        classId: nextClassId,
        studentTuitions: nextClass.students.map((s) => ({ studentId: s.id, tuitionAtLog: tuitionPerStudent })),
      };
    }
    setForm(nextForm);
    setBaselineForm(nextForm);
    // `classes` intentionally omitted: form should only reset when the modal opens or the initial class changes,
    // not whenever the parent re-renders with a new classes array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialClassId]);

  const isDirty = baselineForm !== null && !sessionFormsEqual(form, baselineForm);

  function overwriteAllStudentTuitions(
    nextDurationHours: number,
    nextClass: TutorSessionClassOptionResponse | null,
    nextClassId?: string
  ): void {
    const tuitionPerStudent = Math.round((nextClass?.pricePerHour ?? 0) * nextDurationHours);
    setForm((prev) => ({
      ...prev,
      classId: nextClassId ?? prev.classId,
      durationHours: nextDurationHours,
      studentTuitions: nextClass?.students?.map((s) => ({ studentId: s.id, tuitionAtLog: tuitionPerStudent })) ?? [],
    }));
  }

  function requestTuitionOverwrite(nextDurationHours: number, nextClassId: string): void {
    const nextClass = classes.find((c) => c.id === nextClassId) || null;
    const classForCheck =
      nextClassId === form.classId ? selectedClass : classes.find((c) => c.id === form.classId) || null;
    if (hasCustomTuitions(form.studentTuitions, classForCheck, form.durationHours)) {
      setPendingTuitionReset({ durationHours: nextDurationHours, classId: nextClassId });
      return;
    }
    overwriteAllStudentTuitions(nextDurationHours, nextClass, nextClassId);
  }

  function handleClassChange(classId: string): void {
    requestTuitionOverwrite(form.durationHours, classId);
  }

  function handleDurationChange(nextDurationHours: number): void {
    if (!form.classId) {
      return;
    }
    requestTuitionOverwrite(nextDurationHours, form.classId);
  }

  function confirmTuitionReset(): void {
    if (!pendingTuitionReset) {
      return;
    }
    const nextClass = classes.find((c) => c.id === pendingTuitionReset.classId) || null;
    overwriteAllStudentTuitions(
      pendingTuitionReset.durationHours,
      nextClass,
      pendingTuitionReset.classId
    );
    setPendingTuitionReset(null);
  }

  function handleResetToDefault(): void {
    if (!selectedClass) {
      return;
    }
    overwriteAllStudentTuitions(form.durationHours, selectedClass);
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
        isDirty={isDirty}
        onClose={onClose}
        footer={(requestClose) => (
          <>
            <Button type="button" variant="ghost" onClick={requestClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="log-session-form" loading={submitting} disabled={!form.classId}>
              Log session
            </Button>
          </>
        )}
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
                onChange={(event) => handleDurationChange(Number(event.target.value))}
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
            <details className="session-tuition-details mt-12">
              <summary className="session-tuition-summary">
                Students ({selectedClass.students.length}) · Default {formatVnd(defaultTuitionPerStudent)} · Total{' '}
                {formatVnd(totalTuition)}
              </summary>
              <StudentTuitionEditor students={tuitionStudents} onTuitionChange={handleTuitionChange} />
              <div className="mt-12">
                <Button
                  type="button"
                  variant="ghost"
                  className="compact-btn"
                  onClick={handleResetToDefault}
                  disabled={!form.classId}
                >
                  Reset to default
                </Button>
              </div>
            </details>
          ) : null}

          {!classes.length ? (
            <p className="muted mt-12">You need at least one assigned class before logging a session.</p>
          ) : null}
          {error ? <p className="error-text mt-12">{error}</p> : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingTuitionReset}
        title="Reset student tuitions?"
        message="You customized per-student tuitions. Reset them to the new default amounts?"
        confirmLabel="Reset tuitions"
        cancelLabel="Keep current"
        onConfirm={confirmTuitionReset}
        onCancel={() => setPendingTuitionReset(null)}
      />
    </>
  );
}

export default LogSessionModal;
