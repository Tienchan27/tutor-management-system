import { SessionListItem, TutorSessionClassOptionResponse } from '../../../types/sessions';
import Button from '../../../components/ui/Button';
import { formatVnd } from '../../../utils/format';

interface TutorSessionMonthListProps {
  month: string;
  items: SessionListItem[];
  classes: TutorSessionClassOptionResponse[];
  loading: boolean;
  sessionHasNext: boolean;
  sessionLoadingMore: boolean;
  onMonthChange: (month: string) => void;
  onEdit: (item: SessionListItem) => void;
  onLoadMore: () => void;
}

function TutorSessionMonthList({
  month,
  items,
  classes,
  loading,
  sessionHasNext,
  sessionLoadingMore,
  onMonthChange,
  onEdit,
  onLoadMore,
}: TutorSessionMonthListProps) {
  const classNameById = new Map(classes.map((c) => [c.id, c.className]));

  function resolveClassName(classId: string): string {
    return classNameById.get(classId) ?? 'Unknown class';
  }

  return (
    <div className="card">
      <div className="sticky-toolbar section-header">
        <div>
          <h3 className="section-title">Monthly list</h3>
          <p className="subtitle mb-0">Payroll month {month}</p>
        </div>
        <input type="month" className="input-month" value={month} onChange={(event) => onMonthChange(event.target.value)} />
      </div>
      {loading ? <p className="muted">Loading...</p> : null}
      {!loading && !items.length ? <p className="muted">No sessions for this payroll month.</p> : null}
      {items.length ? (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Class</th>
                  <th scope="col">Duration</th>
                  <th scope="col" className="money-cell">
                    Tuition
                  </th>
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
                      <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(item)}>
                        Edit financials
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sessionHasNext ? (
            <div className="form-actions mt-12">
              <Button type="button" variant="secondary" onClick={onLoadMore} disabled={sessionLoadingMore}>
                {sessionLoadingMore ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default TutorSessionMonthList;
