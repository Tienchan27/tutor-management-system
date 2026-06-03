import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createSession,
  listMySessionClasses,
  listSessionsByPayrollMonth,
  updateSessionFinancial,
} from '../../services/sessionService';
import { CreateSessionRequest, SessionListItem, TutorSessionClassOptionResponse } from '../../types/sessions';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import SessionFinancialDrawer from '../../components/sessions/SessionFinancialDrawer';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatVnd, getCurrentYearMonth } from '../../utils/format';

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
}

const initialForm: CreateSessionRequest = {
  classId: '',
  date: getTodayDate(),
  durationHours: 1,
  salaryRateAtLog: 0.75,
  studentTuitions: [],
  payrollMonth: getCurrentYearMonth(),
  note: '',
};

function TutorSessionsPage() {
  const { showToast } = useToast();
  const [month, setMonth] = useState<string>(getCurrentYearMonth());
  const [editItem, setEditItem] = useState<SessionListItem | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [items, setItems] = useState<SessionListItem[]>([]);
  const [classes, setClasses] = useState<TutorSessionClassOptionResponse[]>([]);
  const [sessionHasNext, setSessionHasNext] = useState<boolean>(false);
  const [sessionPage, setSessionPage] = useState<number>(0);
  const [sessionLoadingMore, setSessionLoadingMore] = useState<boolean>(false);
  const [form, setForm] = useState<CreateSessionRequest>(initialForm);
  const [salaryRatePercent, setSalaryRatePercent] = useState<number>(75);
  const [studentsOpen, setStudentsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === form.classId) || null,
    [classes, form.classId]
  );

  const defaultTuitionPerStudent = useMemo(() => {
    if (!selectedClass) {
      return 0;
    }
    return Math.round(selectedClass.pricePerHour * form.durationHours);
  }, [selectedClass, form.durationHours]);

  const totalTuition = useMemo(() => {
    return form.studentTuitions.reduce((sum, item) => sum + (item.tuitionAtLog || 0), 0);
  }, [form.studentTuitions]);

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes) {
      map.set(c.id, c.className);
    }
    return map;
  }, [classes]);

  function resolveClassName(classId: string): string {
    return classNameById.get(classId) ?? 'Unknown class';
  }

  async function loadSessions(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await listSessionsByPayrollMonth(month, 0);
      setItems(response.items);
      setSessionPage(0);
      setSessionHasNext(response.hasNext);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load sessions'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreSessions(): Promise<void> {
    if (!sessionHasNext || sessionLoadingMore) {
      return;
    }
    setSessionLoadingMore(true);
    setError('');
    try {
      const nextPage = sessionPage + 1;
      const response = await listSessionsByPayrollMonth(month, nextPage);
      setItems((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        const merged = [...prev];
        for (const row of response.items) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        return merged;
      });
      setSessionPage(nextPage);
      setSessionHasNext(response.hasNext);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load more sessions'));
    } finally {
      setSessionLoadingMore(false);
    }
  }

  async function loadClasses(): Promise<void> {
    try {
      const response = await listMySessionClasses();
      setClasses(response);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load tutor classes'));
    }
  }

  useEffect(() => {
    loadClasses();
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  function resetForm(): void {
    setForm({
      ...initialForm,
      payrollMonth: month,
      date: getTodayDate(),
    });
    setSalaryRatePercent(75);
    setStudentsOpen(false);
  }

  function overwriteAllStudentTuitions(nextDurationHours: number, nextClass: TutorSessionClassOptionResponse | null): void {
    const tuitionPerStudent = Math.round((nextClass?.pricePerHour ?? 0) * nextDurationHours);
    setForm((prev) => ({
      ...prev,
      durationHours: nextDurationHours,
      studentTuitions: nextClass?.students?.map((s) => ({ studentId: s.id, tuitionAtLog: tuitionPerStudent })) ?? [],
    }));
  }

  function handleResetToDefault(): void {
    if (!selectedClass) {
      return;
    }
    overwriteAllStudentTuitions(form.durationHours, selectedClass);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    try {
      await createSession({
        ...form,
        salaryRateAtLog: Number((salaryRatePercent / 100).toFixed(4)),
      });
      showToast('Session logged successfully', 'success');
      resetForm();
      await loadSessions();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to create session'));
    }
  }

  async function handleUpdateFinancial(item: SessionListItem, reason: string): Promise<void> {
    if (!reason) {
      setError('Update reason is required for financial changes.');
      return;
    }
    setError('');
    setSaveLoading(true);
    try {
      await updateSessionFinancial(item.id, {
        tuitionAtLog: item.tuitionAtLog,
        salaryRateAtLog: item.salaryRateAtLog,
        payrollMonth: item.payrollMonth,
        note: item.note || '',
        reason,
      });
      showToast('Financials updated', 'success');
      setEditItem(null);
      await loadSessions();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to update session'));
    } finally {
      setSaveLoading(false);
    }
  }

  const logSessionPanel = (
    <div className="card">
        <h3 className="section-title">Log session</h3>
        <form onSubmit={handleCreate}>
          <div className="grid-form grid-form-no-margin">
            <label className="input-wrapper input-wrapper-tight">
              <span className="input-label">Class</span>
              <select
                className="text-input"
                value={form.classId}
                onChange={(event) => {
                  const next = classes.find((c) => c.id === event.target.value) || null;
                  setStudentsOpen(false);
                  setForm((prev) => ({ ...prev, classId: event.target.value }));
                  overwriteAllStudentTuitions(form.durationHours, next);
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
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
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
                onChange={(event) => {
                  const newDuration = Number(event.target.value);
                  overwriteAllStudentTuitions(newDuration, selectedClass);
                }}
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
                onChange={(event) => setForm((prev) => ({ ...prev, payrollMonth: event.target.value }))}
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
                onChange={(event) => setSalaryRatePercent(Number(event.target.value))}
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
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                disabled={!form.classId}
              />
            </label>
          </div>

          {selectedClass ? (
            <div className="card-region">
              <div className={`accordion ${form.classId ? '' : 'accordion-disabled'}`}>
                <div
                  className="accordion-header"
                  role="button"
                  tabIndex={0}
                  aria-label={studentsOpen ? 'Hide student roster' : 'Edit student roster'}
                  onClick={() => setStudentsOpen((prev) => !prev)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setStudentsOpen((prev) => !prev);
                    }
                  }}
                >
                  <div>
                    <div className="accordion-title">Students ({selectedClass.students.length})</div>
                    <div className="small muted">Changing duration recalculates tuition for all students.</div>
                  </div>
                  <div className="accordion-meta">
                    <span>Default/student: <strong>{formatVnd(defaultTuitionPerStudent)}</strong></span>
                    <span>Total: <strong>{formatVnd(totalTuition)}</strong></span>
                    <span className="muted">{studentsOpen ? 'Hide' : 'Edit'}</span>
                  </div>
                </div>

                {studentsOpen ? (
                  <div className="accordion-body">
                    <div className="toolbar toolbar-no-margin">
                      <button type="button" className="btn btn-soft compact-btn" onClick={handleResetToDefault}>
                        Reset to default
                      </button>
                    </div>

                    <div className="table-wrap">
                      <table className="table table-comfortable">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th className="money-cell">Tuition (VND)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedClass.students.map((student) => {
                            const row = form.studentTuitions.find((t) => t.studentId === student.id);
                            const tuitionAtLog = row?.tuitionAtLog ?? 0;
                            return (
                              <tr key={student.id}>
                                <td>{student.name}</td>
                                <td className="money-cell">
                                  <input
                                    className="table-input money-number table-input-medium"
                                    type="number"
                                    step="1"
                                    value={tuitionAtLog}
                                    onChange={(event) => {
                                      const next = Math.round(Number(event.target.value));
                                      setForm((prev) => ({
                                        ...prev,
                                        studentTuitions: prev.studentTuitions.map((t) =>
                                          t.studentId === student.id ? { ...t, tuitionAtLog: next } : t
                                        ),
                                      }));
                                    }}
                                    required
                                  />
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="table-footer-row">
                            <td>Total</td>
                            <td className="money-cell"><span className="money-value">{formatVnd(totalTuition)}</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="card-region">
            {!classes.length ? <p className="muted">You need at least one assigned class before creating a session.</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
            <div className="form-actions">
              <button type="button" className="btn btn-soft compact-btn" onClick={resetForm} disabled={!form.classId}>
                Reset
              </button>
              <button type="submit" className="btn btn-primary compact-btn" disabled={!form.classId}>
                Log session
              </button>
            </div>
          </div>
        </form>
      </div>
  );

  const monthlyListPanel = (
    <div className="card">
        <div className="section-header">
          <div>
            <h3 className="section-title">Monthly list</h3>
            <p className="subtitle">Payroll month {month}</p>
          </div>
          <input type="month" className="input-month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>
        {loading ? <p className="muted">Loading...</p> : null}
        {!loading && !items.length ? <p className="muted">No sessions for this payroll month.</p> : null}
        {!!items.length ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Class</th>
                    <th scope="col">Duration</th>
                    <th scope="col" className="money-cell">Tuition</th>
                    <th scope="col">Rate</th>
                    <th scope="col"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{resolveClassName(item.classId)}</td>
                      <td>{item.durationHours}h</td>
                      <td className="money-cell">{formatVnd(item.tuitionAtLog)}</td>
                      <td>{(item.salaryRateAtLog * 100).toFixed(0)}%</td>
                      <td>
                        <button type="button" className="btn btn-soft btn-sm" onClick={() => setEditItem(item)}>
                          Edit financials
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sessionHasNext ? (
              <div className="form-actions mt-12">
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={() => void loadMoreSessions()}
                  disabled={sessionLoadingMore}
                >
                  {sessionLoadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
  );

  return (
    <div className="stack-16">
      <PageHeader title="Sessions" subtitle="Log teaching sessions after class and review monthly records." />
      <Tabs
        items={[
          { id: 'log', label: 'Log session', panel: logSessionPanel },
          { id: 'list', label: 'Monthly list', panel: monthlyListPanel },
        ]}
      />
      <SessionFinancialDrawer
        open={!!editItem}
        item={editItem}
        loading={saveLoading}
        onClose={() => setEditItem(null)}
        onSave={(item, reason) => void handleUpdateFinancial(item, reason)}
      />
    </div>
  );
}

export default TutorSessionsPage;
