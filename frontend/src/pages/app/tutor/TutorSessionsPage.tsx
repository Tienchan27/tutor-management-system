import { useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteSession,
  listMySessionClasses,
  listSessionsByPayrollMonth,
  updateSession,
} from '../../../services/sessionService';
import { SessionListItem } from '../../../types/sessions';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import Button from '../../../components/ui/Button';
import LogSessionModal from '../../../components/tutor/LogSessionModal';
import SessionFinancialSlideOver from '../../../components/sessions/SessionFinancialSlideOver';
import ConfirmDialog from '../../../components/feedback/ConfirmDialog';
import { useToast } from '../../../components/feedback/ToastProvider';
import { getCurrentYearMonth } from '../../../utils/format';
import { queryKeys } from '../../../lib/queryKeys';
import TutorSessionMonthList from '../sessions/TutorSessionMonthList';

function TutorSessionsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState<string>(getCurrentYearMonth());
  const [classFilterId, setClassFilterId] = useState<string>('');
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<SessionListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionListItem | null>(null);
  const [actionError, setActionError] = useState<string>('');

  const { data: classes = [], error: classesErrorObj } = useQuery({
    queryKey: queryKeys.tutorSessionClasses,
    queryFn: listMySessionClasses,
  });

  const {
    data: sessionsData,
    isLoading: loading,
    error: sessionsErrorObj,
    fetchNextPage,
    hasNextPage: sessionHasNext,
    isFetchingNextPage: sessionLoadingMore,
  } = useInfiniteQuery({
    queryKey: queryKeys.tutorSessions.month(month),
    queryFn: ({ pageParam }) => listSessionsByPayrollMonth(month, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasNext ? allPages.length : undefined),
  });

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: SessionListItem[] = [];
    for (const page of sessionsData?.pages ?? []) {
      for (const row of page.items) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          out.push(row);
        }
      }
    }
    return out;
  }, [sessionsData]);

  const filteredItems = useMemo(() => {
    if (!classFilterId) return items;
    return items.filter((item) => item.classId === classFilterId);
  }, [items, classFilterId]);

  const error =
    actionError ||
    (sessionsErrorObj ? extractApiErrorMessage(sessionsErrorObj, 'Failed to load sessions') : '') ||
    (classesErrorObj ? extractApiErrorMessage(classesErrorObj, 'Failed to load tutor classes') : '');

  const refreshSessions = () => queryClient.invalidateQueries({ queryKey: queryKeys.tutorSessions.month(month) });

  const editMutation = useMutation({
    mutationFn: ({ item, reason }: { item: SessionListItem; reason: string }) =>
      updateSession(item.id, {
        date: item.date,
        durationHours: item.durationHours,
        tuitionAtLog: item.tuitionAtLog,
        payrollMonth: item.payrollMonth,
        note: item.note,
        reason,
      }),
    onSuccess: () => {
      setEditItem(null);
      showToast('Session updated', 'success');
      void refreshSessions();
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to update session')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      setDeleteTarget(null);
      showToast('Session deleted', 'success');
      void refreshSessions();
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to delete session')),
  });

  return (
    <PageLayout
      title="Sessions"
      subtitle="Session history and edits by month."
      headerActions={
        <Button variant="primary" size="sm" onClick={() => setLogModalOpen(true)}>
          Log session
        </Button>
      }
    >
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
          onLoadMore={() => void fetchNextPage()}
          onEdit={setEditItem}
          onDelete={setDeleteTarget}
        />
      </PageSection>

      <LogSessionModal
        open={logModalOpen}
        classes={classes}
        onClose={() => setLogModalOpen(false)}
        onSuccess={() => {
          showToast('Session logged successfully', 'success');
          void refreshSessions();
        }}
      />

      <SessionFinancialSlideOver
        open={!!editItem}
        item={editItem}
        loading={editMutation.isPending}
        onClose={() => setEditItem(null)}
        onSave={(item, reason) => editMutation.mutate({ item, reason })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete session"
        message="Delete this logged session? This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageLayout>
  );
}

export default TutorSessionsPage;
