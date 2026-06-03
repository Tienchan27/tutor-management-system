import { useEffect, useState } from 'react';
import { applyClass, listAvailableClasses } from '../../services/classAssignmentService';
import { AvailableClassResponse } from '../../types/classAssignment';
import { extractApiErrorMessage } from '../../services/authService';
import { realtimeEventBus } from '../../services/realtimeEventBus';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatVnd } from '../../utils/format';

function TutorClassMarketplacePage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<AvailableClassResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [error, setError] = useState('');

  async function load(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await listAvailableClasses();
      setItems(response.items);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load available classes'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const unsubscribe = realtimeEventBus.subscribe('MARKETPLACE_UPDATED', () => {
      window.setTimeout(() => load(), 250);
    });
    return () => unsubscribe();
  }, []);

  async function handleApply(classId: string): Promise<void> {
    setActionLoadingId(classId);
    setError('');
    try {
      await applyClass(classId);
      showToast('Application submitted', 'success');
      await load();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to apply for class'));
    } finally {
      setActionLoadingId('');
    }
  }

  return (
    <div className="stack-16">
      <PageHeader
        title="Class marketplace"
        subtitle="Browse classes published by admin and apply for assignment."
        actions={
          <Button variant="secondary" size="sm" onClick={load} loading={loading}>
            Refresh
          </Button>
        }
      />
      <PageSection>
        {error ? <p className="error-text">{error}</p> : null}
        {loading ? <Spinner label="Loading classes..." /> : null}
        {!loading && !items.length ? (
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
                        disabled={item.hasApplied || actionLoadingId === item.classId}
                        loading={actionLoadingId === item.classId}
                        onClick={() => handleApply(item.classId)}
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
    </div>
  );
}

export default TutorClassMarketplacePage;
