import { useEffect, useState } from 'react';
import { listStudentClasses } from '../../services/studentClassService';
import { StudentClass } from '../../types/studentClasses';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import { formatVnd } from '../../utils/format';

function StudentClassesPage() {
  const [items, setItems] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        setItems(await listStudentClasses());
      } catch (err: unknown) {
        setError(extractApiErrorMessage(err, 'Failed to load classes'));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="stack-16">
      <PageHeader title="My classes" subtitle="Active enrollments." />
      <PageSection>
        {error ? <p className="error-text">{error}</p> : null}
        {loading ? <Spinner label="Loading classes..." /> : null}
        {!loading && !items.length ? (
          <EmptyState title="No active classes" description="You are not enrolled in any class yet." />
        ) : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Tutor</th>
                  <th scope="col">Rate</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.classId}>
                    <td>{item.className}</td>
                    <td>{item.subjectName}</td>
                    <td>{item.tutorName}</td>
                    <td>{formatVnd(item.pricePerHour)}/hr</td>
                    <td>
                      <StatusPill label={item.status} tone="success" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PageSection>
    </div>
  );
}

export default StudentClassesPage;
