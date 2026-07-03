import { useQuery } from '@tanstack/react-query';
import { getTutorDashboard } from '../../../../services/dashboardService';
import { extractApiErrorMessage } from '../../../../services/authService';
import PageSection from '../../../../components/layout/PageSection';
import Spinner from '../../../../components/ui/Spinner';
import EmptyState from '../../../../components/ui/EmptyState';
import StatusPill from '../../../../components/ui/StatusPill';
import { formatVnd } from '../../../../utils/format';
import { payoutTone } from '../../../../utils/statusTone';

function TutorPayoutsPage() {
  const { data: payouts = [], isLoading, error } = useQuery({
    queryKey: ['tutorPayouts'],
    queryFn: getTutorDashboard,
  });

  return (
    <PageSection title="Payout history">
      {isLoading ? <Spinner label="Loading payouts..." /> : null}
      {error ? <p className="error-text">{extractApiErrorMessage(error, 'Failed to load payout history')}</p> : null}
      {!isLoading && !payouts.length ? <EmptyState title="No payout records yet" /> : null}
      {!!payouts.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className="money-cell">
                  Gross
                </th>
                <th scope="col" className="money-cell">
                  Net
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((item) => (
                <tr key={`${item.year}-${item.month}`}>
                  <td>
                    {item.year}-{`${item.month}`.padStart(2, '0')}
                  </td>
                  <td className="money-cell">{formatVnd(item.grossRevenue)}</td>
                  <td className="money-cell">{formatVnd(item.netSalary)}</td>
                  <td>
                    <StatusPill label={item.status} tone={payoutTone(item.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </PageSection>
  );
}

export default TutorPayoutsPage;
