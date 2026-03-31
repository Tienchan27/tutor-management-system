import { FormEvent, useEffect, useState } from 'react';
import {
  createSession,
  listMySessionClasses,
  listSessionsByPayrollMonth,
  updateSessionFinancial,
} from '../../services/sessionService';
import { CreateSessionRequest, SessionResponse, TutorSessionClassOptionResponse } from '../../types/sessions';
import { extractApiErrorMessage } from '../../services/authService';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

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
  payrollMonth: getCurrentMonth(),
  note: '',
};

function TutorSessionsPage() {
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [items, setItems] = useState<SessionResponse[]>([]);
  const [classes, setClasses] = useState<TutorSessionClassOptionResponse[]>([]);
  const [form, setForm] = useState<CreateSessionRequest>(initialForm);
  const [salaryRatePercent, setSalaryRatePercent] = useState<number>(75);
  const [reasonBySession, setReasonBySession] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  async function loadSessions(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await listSessionsByPayrollMonth(month);
      setItems(response);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load sessions'));
    } finally {
      setLoading(false);
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

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await createSession({
        ...form,
        salaryRateAtLog: Number((salaryRatePercent / 100).toFixed(4)),
      });
      setSuccess('Session created successfully.');
      setForm((prev) => ({
        ...initialForm,
        payrollMonth: month,
        date: getTodayDate(),
      }));
      setSalaryRatePercent(75);
      await loadSessions();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to create session'));
    }
  }

  async function handleUpdateFinancial(item: SessionResponse): Promise<void> {
    const reason = reasonBySession[item.id]?.trim();
    if (!reason) {
      setError('Update reason is required for financial changes.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await updateSessionFinancial(item.id, {
        tuitionAtLog: item.tuitionAtLog,
        salaryRateAtLog: item.salaryRateAtLog,
        payrollMonth: item.payrollMonth,
        note: item.note || '',
        reason,
      });
      setSuccess('Session financial data updated.');
      await loadSessions();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to update session'));
    }
  }

  function updateSessionRow<K extends keyof SessionResponse>(id: string, field: K, value: SessionResponse[K]): void {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  return (
    <div className="stack-16">
      <div className="card">
        <div className="page-header">
          <div>
            <h2 className="title title-lg">Session Management</h2>
            <p className="subtitle">Record teaching sessions and maintain financial logs.</p>
          </div>
          <input type="month" className="input-month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Create session</h3>
        <form onSubmit={handleCreate}>
          <div className="session-create-row">
            <label className="input-wrapper session-create-field">
              <span className="input-label">Class</span>
              <select
                className="text-input"
                value={form.classId}
                onChange={(event) => {
                  const selectedClass = classes.find((c) => c.id === event.target.value);
                  const tuitionPerStudent = Math.round((selectedClass?.pricePerHour ?? 0) * form.durationHours);
                  setForm((prev) => ({
                    ...prev,
                    classId: event.target.value,
                    studentTuitions: selectedClass?.students?.map((s) => ({ studentId: s.id, tuitionAtLog: tuitionPerStudent })) ?? [],
                  }));
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

            {form.classId ? (
              <>
              <label className="input-wrapper session-create-field">
                <span className="input-label">Date</span>
                <input
                  className="text-input"
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                  required
                />
              </label>

              <label className="input-wrapper session-create-field">
                <span className="input-label">Duration (hours)</span>
                <input
                  className="text-input"
                  type="number"
                  step="0.25"
                  value={form.durationHours}
                  onChange={(event) => {
                    const newDuration = Number(event.target.value);
                    const selectedClass = classes.find((c) => c.id === form.classId);
                    const tuitionPerStudent = Math.round((selectedClass?.pricePerHour ?? 0) * newDuration);
                    setForm((prev) => ({
                      ...prev,
                      durationHours: newDuration,
                      studentTuitions: prev.studentTuitions.map((t) => ({ ...t, tuitionAtLog: tuitionPerStudent })),
                    }));
                  }}
                  required
                />
              </label>

              {classes.length ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  {(() => {
                    const selectedClass = classes.find((c) => c.id === form.classId);
                    if (!selectedClass) {
                      return null;
                    }

                    const studentTuitionsById = new Map(form.studentTuitions.map((t) => [t.studentId, t.tuitionAtLog]));
                    return (
                      <div className="table-wrap" style={{ marginTop: 12 }}>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Tuition (VND)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedClass.students.map((student) => {
                              const tuitionAtLog = studentTuitionsById.get(student.id) ?? 0;
                              return (
                                <tr key={student.id}>
                                  <td>{student.name}</td>
                                  <td>
                                    <input
                                      className="table-input money-number"
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
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              ) : null}

              <label className="input-wrapper session-create-field">
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
                />
              </label>

              <label className="input-wrapper session-create-field">
                <span className="input-label">Payroll month</span>
                <input
                  className="text-input"
                  type="month"
                  value={form.payrollMonth}
                  onChange={(event) => setForm((prev) => ({ ...prev, payrollMonth: event.target.value }))}
                />
              </label>

              <label className="input-wrapper session-create-field">
                <span className="input-label">Note</span>
                <input
                  className="text-input"
                  placeholder="Optional note"
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                />
              </label>

              </>
            ) : null}
          </div>
          {form.classId ? (
            <div className="form-actions">
              <button type="submit" className="btn btn-primary compact-btn">
                Confirm Session
              </button>
            </div>
          ) : null}
        </form>
        {!classes.length ? <p className="muted">You need at least one assigned class before creating a session.</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
      </div>

      <div className="card">
        <h3 className="section-title">Session list</h3>
        {loading ? <p className="muted">Loading...</p> : null}
        {!loading && !items.length ? <p className="muted">No sessions for this payroll month.</p> : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Class ID</th>
                  <th>Duration</th>
                  <th>Tuition</th>
                  <th>Rate (%)</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{item.tutorClass?.id || '-'}</td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="0.25"
                        value={item.durationHours}
                        onChange={(event) => updateSessionRow(item.id, 'durationHours', Number(event.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        className="table-input money-number"
                        type="number"
                        step="1"
                        value={item.tuitionAtLog}
                        onChange={(event) => updateSessionRow(item.id, 'tuitionAtLog', Math.round(Number(event.target.value)))}
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="0.01"
                        value={(item.salaryRateAtLog * 100).toFixed(2)}
                        onChange={(event) =>
                          updateSessionRow(item.id, 'salaryRateAtLog', Number(event.target.value) / 100)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        placeholder="Reason"
                        value={reasonBySession[item.id] || ''}
                        onChange={(event) => setReasonBySession((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      />
                    </td>
                    <td>
                      <button type="button" className="btn btn-outline table-action" onClick={() => handleUpdateFinancial(item)}>
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default TutorSessionsPage;
