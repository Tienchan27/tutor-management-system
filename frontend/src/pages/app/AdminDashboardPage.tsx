import { useEffect, useState } from 'react';
import { getAdminTutorDetail, getAdminTutorSummary } from '../../services/dashboardService';
import { TutorDashboardResponse, TutorSummaryResponse } from '../../types/dashboard';
import { extractApiErrorMessage } from '../../services/authService';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

function AdminDashboardPage() {
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [items, setItems] = useState<TutorSummaryResponse[]>([]);
  const [detail, setDetail] = useState<TutorDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  async function loadSummary(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await getAdminTutorSummary(month);
      setItems(response);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load admin summary'));
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(tutorId: string): Promise<void> {
    setError('');
    try {
      const response = await getAdminTutorDetail(tutorId, month);
      setDetail(response);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load tutor detail'));
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  return (
    <div className="stack-16">
      <div className="card">
        <div className="page-header">
          <div>
            <h2 className="title title-lg">Admin Dashboard</h2>
            <p className="subtitle">Monthly tutor payout overview and performance summary.</p>
          </div>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-month" />
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Tutor summary</h3>
        {loading ? <p className="muted">Loading...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !items.length ? <p className="muted">No summary available for this month.</p> : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Gross Revenue</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.tutorId}>
                    <td>{item.tutorEmail}</td>
                    <td>{item.grossRevenue.toLocaleString()}</td>
                    <td>{item.netSalary.toLocaleString()}</td>
                    <td>{item.payoutStatus}</td>
                    <td>
                      <button className="btn btn-outline table-action" onClick={() => loadDetail(item.tutorId)} type="button">
                        View detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {detail ? (
        <div className="card">
          <h3 className="section-title">Selected tutor detail</h3>
          <div className="grid-3">
            <div className="panel">
              <strong>Period</strong>
              <p>{detail.year}-{`${detail.month}`.padStart(2, '0')}</p>
            </div>
            <div className="panel">
              <strong>Gross revenue</strong>
              <p>{detail.grossRevenue.toLocaleString()}</p>
            </div>
            <div className="panel">
              <strong>Net salary</strong>
              <p>{detail.netSalary.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminDashboardPage;
