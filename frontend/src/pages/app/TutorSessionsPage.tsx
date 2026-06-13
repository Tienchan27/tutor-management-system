import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listMySessionClasses,
  listSessionsByPayrollMonth,
  updateSessionFinancial,
} from '../../services/sessionService';
import { SessionListItem, TutorSessionClassOptionResponse } from '../../types/sessions';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Button from '../../components/ui/Button';
import SessionFinancialDrawer from '../../components/sessions/SessionFinancialDrawer';
import LogSessionModal from '../../components/tutor/LogSessionModal';
import { useToast } from '../../components/feedback/ToastProvider';
import { getCurrentYearMonth } from '../../utils/format';
import TutorSessionMonthList from './sessions/TutorSessionMonthList';

function TutorSessionsPage() {
  const { showToast } = useToast();
  const [month, setMonth] = useState<string>(getCurrentYearMonth());
  const [classFilterId, setClassFilterId] = useState<string>('');
  const [editItem, setEditItem] = useState<SessionListItem | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [items, setItems] = useState<SessionListItem[]>([]);
  const [classes, setClasses] = useState<TutorSessionClassOptionResponse[]>([]);
  const [sessionHasNext, setSessionHasNext] = useState<boolean>(false);
  const [sessionPage, setSessionPage] = useState<number>(0);
  const [sessionLoadingMore, setSessionLoadingMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [logModalOpen, setLogModalOpen] = useState(false);

  const filteredItems = useMemo(() => {
    if (!classFilterId) {
      return items;
    }
    return items.filter((item) => item.classId === classFilterId);
  }, [items, classFilterId]);

  const loadSessions = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const response = await listSessionsByPayrollMonth(month, 0);
      setItems(response.items);
      setSessionPage(0);
      setSessionHasNext(response.hasNext);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load sessions'));
    } finally {
      setLoading(false);
    }
  }, [month]);

  async function loadMoreSessions(): Promise<void> {
    if (!sessionHasNext || sessionLoadingMore) {
      return;
    }
    setSessionLoadingMore(true);
    setError('');
    try {
      const nextPage = sessionPage + 1;
      const response = await listSessionsByPayrollMonth(month, nextPage);
      setItems((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        const merged = [...prev];
        for (const row of response.items) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        return merged;
      });
      setSessionPage(nextPage);
      setSessionHasNext(response.hasNext);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load more sessions'));
    } finally {
      setSessionLoadingMore(false);
    }
  }

  const loadClasses = useCallback(async (): Promise<void> => {
    try {
      setClasses(await listMySessionClasses());
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load tutor classes'));
    }
  }, []);

  useEffect(() => {
    void loadClasses();
    void loadSessions();
  }, [loadClasses, loadSessions]);

  async function handleUpdateFinancial(item: SessionListItem, reason: string): Promise<void> {
    if (!reason) {
      setError('Update reason is required for financial changes.');
      return;
    }
    setError('');
    setSaveLoading(true);
    try {
      await updateSessionFinancial(item.id, {
        tuitionAtLog: item.tuitionAtLog,
        salaryRateAtLog: item.salaryRateAtLog,
        payrollMonth: item.payrollMonth,
        note: item.note || '',
        reason,
      });
      showToast('Financials updated', 'success');
      setEditItem(null);
      await loadSessions();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to update session'));
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <div className="stack-16">
      <PageHeader
        title="Sessions"
        subtitle="Review and edit logged sessions by month."
        actions={
          <Button variant="primary" size="sm" onClick={() => setLogModalOpen(true)}>
            Log session
          </Button>
        }
      />

      <PageSection>
        {error ? <p className="error-text">{error}</p> : null}
        <TutorSessionMonthList
          month={month}
          items={filteredItems}
          classes={classes}
          classFilterId={classFilterId}
          loading={loading}
          sessionHasNext={sessionHasNext && !classFilterId}
          sessionLoadingMore={sessionLoadingMore}
          onMonthChange={setMonth}
          onClassFilterChange={setClassFilterId}
          onEdit={setEditItem}
          onLoadMore={() => void loadMoreSessions()}
        />
      </PageSection>

      <SessionFinancialDrawer
        open={!!editItem}
        item={editItem}
        loading={saveLoading}
        showSalaryRate={false}
        onClose={() => setEditItem(null)}
        onSave={(item, reason) => void handleUpdateFinancial(item, reason)}
      />

      <LogSessionModal
        open={logModalOpen}
        classes={classes}
        onClose={() => setLogModalOpen(false)}
        onSuccess={() => {
          showToast('Session logged successfully', 'success');
          void loadSessions();
        }}
      />
    </div>
  );
}

export default TutorSessionsPage;
