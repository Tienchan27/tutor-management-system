import { useQuery } from '@tanstack/react-query';
import { listStudentClasses } from '../../../services/studentClassService';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import StatusPill from '../../../components/ui/StatusPill';
import { formatVnd } from '../../../utils/format';

function StudentClassesPage() {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['studentClasses'],
    queryFn: listStudentClasses,
  });

  return (
    <PageLayout title="Classes" subtitle="Active enrollments.">
      <PageSection>
        {error ? <p className="error-text">{extractApiErrorMessage(error, 'Failed to load classes')}</p> : null}
        {isLoading ? <Spinner label="Loading classes..." /> : null}
        {!isLoading && !items.length ? (
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
    </PageLayout>
  );
}

export default StudentClassesPage;
