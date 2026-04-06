import { useEffect, useState } from 'react';
import { applyClass, listAvailableClasses } from '../../services/classAssignmentService';
import { AvailableClassResponse } from '../../types/classAssignment';
import { extractApiErrorMessage } from '../../services/authService';
import { realtimeEventBus } from '../../services/realtimeEventBus';

function TutorClassMarketplacePage() {
  const [items, setItems] = useState<AvailableClassResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

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
      window.setTimeout(() => {
        load();
      }, 250);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  async function handleApply(classId: string): Promise<void> {
    setActionLoadingId(classId);
    setError('');
    setSuccess('');
    try {
      await applyClass(classId);
      setSuccess('Applied to class successfully.');
      await load();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to apply class'));
    } finally {
      setActionLoadingId('');
    }
  }

  return (
    <div className="stack-16">
      <div className="card">
        <h2 className="title title-lg">Available classes</h2>
        <p className="subtitle">Browse classes published by admin and apply to receive assignment approval.</p>
        {loading ? <p className="muted">Loading...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {!loading && !items.length ? <p className="muted">No classes available right now.</p> : null}
      </div>

      {items.map((item) => (
        <div key={item.classId} className="card">
          <p><strong>{item.displayName}</strong></p>
          <p className="muted">Subject: {item.subjectName}</p>
          <p className="muted">Students: {item.studentNames.join(' - ') || '-'}</p>
          <p className="muted">Tuition fee: {item.pricePerHour.toLocaleString()}</p>
          {item.note ? <p className="muted">Note: {item.note}</p> : null}
          <button
            type="button"
            className="btn btn-primary compact-btn"
            disabled={item.hasApplied || actionLoadingId === item.classId}
            onClick={() => handleApply(item.classId)}
          >
            {item.hasApplied ? 'Applied' : 'Apply'}
          </button>
        </div>
      ))}
    </div>
  );
}

export default TutorClassMarketplacePage;
