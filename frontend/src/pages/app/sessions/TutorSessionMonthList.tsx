import { SessionListItem, TutorSessionClassOptionResponse } from '../../../types/sessions';
import Button from '../../../components/ui/Button';
import { formatVnd } from '../../../utils/format';

interface TutorSessionMonthListProps {
  month: string;
  items: SessionListItem[];
  classes: TutorSessionClassOptionResponse[];
  classFilterId: string;
  loading: boolean;
  sessionHasNext: boolean;
  sessionLoadingMore: boolean;
  onMonthChange: (month: string) => void;
  onClassFilterChange: (classId: string) => void;
  onLoadMore: () => void;
  onEdit: (item: SessionListItem) => void;
  onDelete: (item: SessionListItem) => void;
}

function TutorSessionMonthList({
  month,
  items,
  classes,
  classFilterId,
  loading,
  sessionHasNext,
  sessionLoadingMore,
  onMonthChange,
  onClassFilterChange,
  onLoadMore,
  onEdit,
  onDelete,
}: TutorSessionMonthListProps) {
  const classNameById = new Map(classes.map((c) => [c.id, c.className]));

  function resolveClassName(classId: string): string {
    return classNameById.get(classId) ?? 'Unknown class';
  }

  return (
    <div>
      <div className="sticky-toolbar section-header">
        <div>
          <h3 className="section-title">Session history</h3>
          <p className="subtitle mb-0">Payroll month {month}</p>
        </div>
        <div className="session-list-filters">
          <select
            className="text-input input-filter"
            value={classFilterId}
            onChange={(event) => onClassFilterChange(event.target.value)}
            aria-label="Filter by class"
          >
            <option value="">All classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.className}
              </option>
            ))}
          </select>
          <input type="month" className="input-month" value={month} onChange={(event) => onMonthChange(event.target.value)} />
        </div>
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
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{resolveClassName(item.classId)}</td>
                    <td>{item.durationHours}h</td>
                    <td className="money-cell">{formatVnd(item.tuitionAtLog)}</td>
                    <td>
                      <div className="table-actions table-actions-left">
                        <button type="button" className="icon-btn" title="Edit session" onClick={() => onEdit(item)}>
                          ✎
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          title="Delete session"
                          onClick={() => onDelete(item)}
                        >
                          ✕
                        </button>
                      </div>
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
