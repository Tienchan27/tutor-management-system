import { FormEvent, useEffect, useState } from 'react';
import { createSession, listSessionsByPayrollMonth, updateSessionFinancial } from '../../services/sessionService';
import { CreateSessionRequest, SessionResponse } from '../../types/sessions';
import { extractApiErrorMessage } from '../../services/authService';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

const initialForm: CreateSessionRequest = {
  classId: '',
  date: '',
  durationHours: 1,
  tuitionAtLog: 0,
  salaryRateAtLog: 0.75,
  payrollMonth: getCurrentMonth(),
  note: '',
};

function TutorSessionsPage() {
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [items, setItems] = useState<SessionResponse[]>([]);
  const [form, setForm] = useState<CreateSessionRequest>(initialForm);
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

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await createSession(form);
      setSuccess('Session created successfully.');
      setForm({ ...initialForm, payrollMonth: month });
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
        <form className="grid-form" onSubmit={handleCreate}>
          <input
            className="text-input"
            placeholder="Class ID (UUID)"
            value={form.classId}
            onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
            required
          />
          <input
            className="text-input"
            type="date"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            required
          />
          <input
            className="text-input"
            type="number"
            step="0.25"
            placeholder="Duration hours"
            value={form.durationHours}
            onChange={(event) => setForm((prev) => ({ ...prev, durationHours: Number(event.target.value) }))}
            required
          />
          <input
            className="text-input"
            type="number"
            step="0.01"
            placeholder="Tuition at log"
            value={form.tuitionAtLog}
            onChange={(event) => setForm((prev) => ({ ...prev, tuitionAtLog: Number(event.target.value) }))}
            required
          />
          <input
            className="text-input"
            type="number"
            step="0.01"
            placeholder="Salary rate at log"
            value={form.salaryRateAtLog}
            onChange={(event) => setForm((prev) => ({ ...prev, salaryRateAtLog: Number(event.target.value) }))}
            required
          />
          <input
            className="text-input"
            type="month"
            value={form.payrollMonth}
            onChange={(event) => setForm((prev) => ({ ...prev, payrollMonth: event.target.value }))}
          />
          <input
            className="text-input"
            placeholder="Note"
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
          />
          <button type="submit" className="btn btn-primary compact-btn">
            Create Session
          </button>
        </form>
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
                  <th>Rate</th>
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
                        className="table-input"
                        type="number"
                        step="0.01"
                        value={item.tuitionAtLog}
                        onChange={(event) => updateSessionRow(item.id, 'tuitionAtLog', Number(event.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="0.01"
                        value={item.salaryRateAtLog}
                        onChange={(event) => updateSessionRow(item.id, 'salaryRateAtLog', Number(event.target.value))}
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
