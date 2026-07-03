import { FormEvent, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminTutorDetail, getAdminTutorSummary, inviteTutor, revokeTutorRole } from '../../../services/dashboardService';
import { TutorSummaryResponse } from '../../../types/dashboard';
import { extractApiErrorMessage } from '../../../services/authService';
import PageLayout from '../../../components/layout/PageLayout';
import PageSection from '../../../components/layout/PageSection';
import AdminTutorDetailDrawer from '../../../components/admin/AdminTutorDetailDrawer';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/feedback/ToastProvider';
import { getCurrentYearMonth } from '../../../utils/format';

function AdminTutorsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const month = getCurrentYearMonth();
  const [detailTutorId, setDetailTutorId] = useState<string>('');
  const [deleteConfirmTutorId, setDeleteConfirmTutorId] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  const {
    data: summaryData,
    isLoading: loading,
    error: summaryErrorObj,
    fetchNextPage,
    hasNextPage: summaryHasNext,
    isFetchingNextPage: summaryLoadingMore,
  } = useInfiniteQuery({
    queryKey: ['adminTutorSummary', month],
    queryFn: ({ pageParam }) => getAdminTutorSummary(month, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasNext ? allPages.length : undefined),
  });

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: TutorSummaryResponse[] = [];
    for (const page of summaryData?.pages ?? []) {
      for (const row of page.items) {
        if (!seen.has(row.tutorId)) {
          seen.add(row.tutorId);
          out.push(row);
        }
      }
    }
    return out;
  }, [summaryData]);

  const { data: detail = null, error: detailErrorObj } = useQuery({
    queryKey: ['adminTutorDetail', detailTutorId, month],
    queryFn: () => getAdminTutorDetail(detailTutorId, month),
    enabled: !!detailTutorId,
  });

  const error =
    actionError ||
    (summaryErrorObj ? extractApiErrorMessage(summaryErrorObj, 'Failed to load tutors') : '') ||
    (detailErrorObj ? extractApiErrorMessage(detailErrorObj, 'Failed to load tutor detail') : '');

  const inviteMutation = useMutation({
    mutationFn: () => inviteTutor({ email: inviteEmail }),
    onSuccess: (response) => {
      showToast(response.message, 'success');
      setInviteEmail('');
      void queryClient.invalidateQueries({ queryKey: ['adminTutorSummary', month] });
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to invite tutor')),
  });

  const revokeMutation = useMutation({
    mutationFn: (tutorId: string) => revokeTutorRole(tutorId),
    onSuccess: () => {
      handleCloseDetail();
      showToast('Tutor role revoked', 'success');
      void queryClient.invalidateQueries({ queryKey: ['adminTutorSummary', month] });
    },
    onError: (err) => setActionError(extractApiErrorMessage(err, 'Failed to revoke tutor role')),
  });

  function loadDetail(tutorId: string): void {
    setActionError('');
    setDetailTutorId(tutorId);
  }

  function handleCloseDetail(): void {
    setDetailTutorId('');
    setDeleteConfirmTutorId('');
  }

  function handleInviteTutor(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setActionError('');
    inviteMutation.mutate();
  }

  function handleRevokeTutorRole(tutorId: string): void {
    if (deleteConfirmTutorId !== tutorId) {
      setDeleteConfirmTutorId(tutorId);
      return;
    }
    setActionError('');
    revokeMutation.mutate(tutorId);
  }

  return (
    <PageLayout title="Tutors" subtitle="Invite tutors and manage tutor profiles.">
      <PageSection title="Invite tutor">
        <form onSubmit={handleInviteTutor} className="invite-inline-form">
          <input
            type="email"
            className="text-input"
            placeholder="Tutor email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <Button type="submit" loading={inviteMutation.isPending} size="sm">
            Invite
          </Button>
        </form>
      </PageSection>

      <PageSection title="Tutor list">
        {loading ? <Spinner label="Loading tutors..." /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !items.length ? (
          <EmptyState title="No tutors yet" description="Invite a tutor to get started." />
        ) : null}
        {!!items.length ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Tutor</th>
                    <th scope="col">Email</th>
                    <th scope="col" className="num-cell">
                      Classes
                    </th>
                    <th scope="col"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.tutorId} className={detailTutorId === item.tutorId ? 'row-selected' : ''}>
                      <td>{item.tutorName}</td>
                      <td>{item.tutorEmail}</td>
                      <td className="num-cell">{item.classesReceivingThisMonth}</td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => loadDetail(item.tutorId)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summaryHasNext ? (
              <div className="form-actions mt-12">
                <Button variant="secondary" onClick={() => void fetchNextPage()} loading={summaryLoadingMore}>
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </PageSection>

      <AdminTutorDetailDrawer
        open={!!detailTutorId && !!detail}
        detail={detail}
        deleteConfirmTutorId={deleteConfirmTutorId}
        deleteLoading={revokeMutation.isPending}
        onClose={handleCloseDetail}
        onRevokeTutorRole={handleRevokeTutorRole}
      />
    </PageLayout>
  );
}

export default AdminTutorsPage;
