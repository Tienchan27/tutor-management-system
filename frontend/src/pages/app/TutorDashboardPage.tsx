import { useEffect, useState } from 'react';
import { getTutorDashboard } from '../../services/dashboardService';
import { TutorDashboardResponse } from '../../types/dashboard';
import { extractApiErrorMessage } from '../../services/authService';

function TutorDashboardPage() {
  const [items, setItems] = useState<TutorDashboardResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        const response = await getTutorDashboard();
        setItems(response);
      } catch (err: unknown) {
        setError(extractApiErrorMessage(err, 'Failed to load tutor dashboard'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="card">
      <h2 className="title title-lg">Tutor Dashboard</h2>
      <p className="subtitle">Track your monthly teaching revenue and salary status.</p>
      {loading ? <p className="muted">Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !items.length ? <p className="muted">No records yet.</p> : null}
      {!!items.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Gross Revenue</th>
                <th>Net Salary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.year}-${item.month}`}>
                  <td>{item.year}-{`${item.month}`.padStart(2, '0')}</td>
                  <td>{item.grossRevenue.toLocaleString()}</td>
                  <td>{item.netSalary.toLocaleString()}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default TutorDashboardPage;
