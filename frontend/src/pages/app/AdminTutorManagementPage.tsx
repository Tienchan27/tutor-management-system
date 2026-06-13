import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { getAdminTutorDetail, getAdminTutorSummary, inviteTutor, revokeTutorRole } from '../../services/dashboardService';
import { AdminTutorDetailResponse, TutorSummaryResponse } from '../../types/dashboard';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import AdminTutorDetailDrawer from '../../components/admin/AdminTutorDetailDrawer';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatVnd, getCurrentYearMonth } from '../../utils/format';
import { payoutTone } from '../../utils/statusTone';

function AdminTutorManagementPage() {
  const { showToast } = useToast();
  const [month, setMonth] = useState<string>(getCurrentYearMonth());
  const [items, setItems] = useState<TutorSummaryResponse[]>([]);
  const [detail, setDetail] = useState<AdminTutorDetailResponse | null>(null);
  const [detailTutorId, setDetailTutorId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [deleteConfirmTutorId, setDeleteConfirmTutorId] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [summaryHasNext, setSummaryHasNext] = useState<boolean>(false);
  const [summaryPage, setSummaryPage] = useState<number>(0);
  const [summaryLoadingMore, setSummaryLoadingMore] = useState<boolean>(false);
  const detailTutorIdRef = useRef(detailTutorId);
  detailTutorIdRef.current = detailTutorId;

  const loadSummary = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const response = await getAdminTutorSummary(month, 0);
      setItems(response.items);
      setSummaryPage(0);
      setSummaryHasNext(response.hasNext);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load admin summary'));
    } finally {
      setLoading(false);
    }
  }, [month]);

  async function loadMoreSummary(): Promise<void> {
    if (!summaryHasNext || summaryLoadingMore) {
      return;
    }
    setSummaryLoadingMore(true);
    setError('');
    try {
      const nextPage = summaryPage + 1;
      const response = await getAdminTutorSummary(month, nextPage);
      setItems((prev) => {
        const seen = new Set(prev.map((r) => r.tutorId));
        const merged = [...prev];
        for (const row of response.items) {
          if (!seen.has(row.tutorId)) {
            seen.add(row.tutorId);
            merged.push(row);
          }
        }
        return merged;
      });
      setSummaryPage(nextPage);
      setSummaryHasNext(response.hasNext);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load more tutors'));
    } finally {
      setSummaryLoadingMore(false);
    }
  }

  async function loadDetail(tutorId: string): Promise<void> {
    setDetailTutorId(tutorId);
    setError('');
    try {
      const response = await getAdminTutorDetail(tutorId, month);
      setDetail(response);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load tutor detail'));
      setDetailTutorId('');
    }
  }

  function handleCloseDetail(): void {
    setDetail(null);
    setDetailTutorId('');
    setDeleteConfirmTutorId('');
  }

  async function handleInviteTutor(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setInviteLoading(true);
    try {
      const response = await inviteTutor({ email: inviteEmail });
      showToast(response.message, 'success');
      setInviteEmail('');
      await loadSummary();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to invite tutor'));
    } finally {
      setInviteLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
    // Read detailTutorId via ref so this effect only triggers on month change (via loadSummary identity).
    const currentDetailId = detailTutorIdRef.current;
    if (currentDetailId) {
      void (async () => {
        try {
          const response = await getAdminTutorDetail(currentDetailId, month);
          setDetail(response);
        } catch (err: unknown) {
          setError(extractApiErrorMessage(err, 'Failed to refresh tutor detail'));
        }
      })();
    }
  }, [loadSummary, month]);

  async function handleRevokeTutorRole(tutorId: string): Promise<void> {
    if (deleteConfirmTutorId !== tutorId) {
      setDeleteConfirmTutorId(tutorId);
      return;
    }
    setDeleteLoading(true);
    setError('');
    try {
      await revokeTutorRole(tutorId);
      handleCloseDetail();
      showToast('Tutor role revoked', 'success');
      await loadSummary();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to revoke tutor role'));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="stack-16">
      <PageHeader
        title="Tutor management"
        subtitle="Invite tutors and review monthly payout snapshots."
        actions={
          <>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-month" />
            <form onSubmit={handleInviteTutor} className="invite-inline-form">
              <input
                type="email"
                className="text-input"
                placeholder="Tutor email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <Button type="submit" loading={inviteLoading} size="sm">
                Invite
              </Button>
            </form>
          </>
        }
      />
      <PageSection title="Tutor list">
        {loading ? <Spinner label="Loading tutors..." /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !items.length ? (
          <EmptyState title="No tutors for this month" description="Change month or invite a new tutor." />
        ) : null}
        {!!items.length ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Tutor</th>
                    <th scope="col" className="money-cell">
                      Gross
                    </th>
                    <th scope="col" className="money-cell">
                      Net
                    </th>
                    <th scope="col">Classes</th>
                    <th scope="col">Status</th>
                    <th scope="col"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.tutorId} className={detailTutorId === item.tutorId ? 'row-selected' : ''}>
                      <td>{item.tutorName}</td>
                      <td className="money-cell">{formatVnd(item.grossRevenue)}</td>
                      <td className="money-cell">{formatVnd(item.netSalary)}</td>
                      <td>{item.classesReceivingThisMonth}</td>
                      <td>
                        <StatusPill label={item.payoutStatus} tone={payoutTone(item.payoutStatus)} />
                      </td>
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
                <Button variant="secondary" onClick={() => void loadMoreSummary()} loading={summaryLoadingMore}>
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
        deleteLoading={deleteLoading}
        onClose={handleCloseDetail}
        onRevokeTutorRole={handleRevokeTutorRole}
      />
    </div>
  );
}

export default AdminTutorManagementPage;
