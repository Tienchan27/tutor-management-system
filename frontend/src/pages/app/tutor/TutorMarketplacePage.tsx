import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyClass, listAvailableClasses } from '../../../services/classAssignmentService';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import StatusPill from '../../../components/ui/StatusPill';
import { useToast } from '../../../components/feedback/ToastProvider';
import { formatVnd } from '../../../utils/format';

function TutorMarketplacePage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['availableClasses'],
    queryFn: () => listAvailableClasses().then((r) => r.items),
  });

  const applyMutation = useMutation({
    mutationFn: (classId: string) => applyClass(classId),
    onSuccess: () => {
      showToast('Application submitted', 'success');
      void queryClient.invalidateQueries({ queryKey: ['availableClasses'] });
    },
    onError: (err) => showToast(extractApiErrorMessage(err, 'Failed to apply for class'), 'error'),
  });

  return (
    <PageLayout
      title="Marketplace"
      subtitle="Browse admin-published classes and apply."
      headerActions={
        <Button variant="secondary" size="sm" onClick={() => void refetch()} loading={isFetching}>
          Refresh
        </Button>
      }
    >
      <PageSection>
        {error ? <p className="error-text">{extractApiErrorMessage(error, 'Failed to load available classes')}</p> : null}
        {isLoading ? <Spinner label="Loading classes..." /> : null}
        {!isLoading && !items.length ? (
          <EmptyState title="No classes available" description="Check back when admin publishes new classes." />
        ) : null}
        {!!items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Students</th>
                  <th scope="col">Rate</th>
                  <th scope="col">Note</th>
                  <th scope="col">Status</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.classId}>
                    <td>{item.displayName}</td>
                    <td>{item.subjectName}</td>
                    <td>{item.studentNames.join(', ') || '—'}</td>
                    <td>{formatVnd(item.pricePerHour)}/hr</td>
                    <td>{item.note ? <span className="muted">{item.note}</span> : <span className="muted">—</span>}</td>
                    <td>
                      <StatusPill
                        label={item.hasApplied ? 'Applied' : 'Open'}
                        tone={item.hasApplied ? 'success' : 'neutral'}
                      />
                    </td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={item.hasApplied || applyMutation.isPending}
                        loading={applyMutation.isPending && applyMutation.variables === item.classId}
                        onClick={() => applyMutation.mutate(item.classId)}
                      >
                        {item.hasApplied ? 'Applied' : 'Apply'}
                      </Button>
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

export default TutorMarketplacePage;
