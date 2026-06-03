import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminTutorDetail, getAdminTutorSummary, inviteTutor, revokeTutorRole } from '../../services/dashboardService';
import { AdminTutorDetailResponse, TutorSummaryResponse } from '../../types/dashboard';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import StatusPill from '../../components/ui/StatusPill';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatVnd, getCurrentYearMonth } from '../../utils/format';

function AdminTutorManagementPage() {
  const { showToast } = useToast();
  function payoutStatusClass(status: string): string {
    if (status === 'PAID') {
      return 'success';
    }
    if (status === 'LOCKED') {
      return 'warning';
    }
    return 'danger';
  }

  const [month, setMonth] = useState<string>(getCurrentYearMonth());
  const [items, setItems] = useState<TutorSummaryResponse[]>([]);
  const [detail, setDetail] = useState<AdminTutorDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [deleteConfirmTutorId, setDeleteConfirmTutorId] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [summaryHasNext, setSummaryHasNext] = useState<boolean>(false);
  const [summaryPage, setSummaryPage] = useState<number>(0);
  const [summaryLoadingMore, setSummaryLoadingMore] = useState<boolean>(false);

  async function loadSummary(): Promise<void> {
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
  }

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
    setError('');
    try {
      const response = await getAdminTutorDetail(tutorId, month);
      setDetail(response);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load tutor detail'));
    }
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
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function handleRevokeTutorRole(tutorId: string): Promise<void> {
    if (deleteConfirmTutorId !== tutorId) {
      setDeleteConfirmTutorId(tutorId);
      return;
    }
    setDeleteLoading(true);
    setError('');
    try {
      await revokeTutorRole(tutorId);
      setDetail(null);
      setDeleteConfirmTutorId('');
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
      <div className="admin-tutor-layout">
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
                    <th scope="col" className="money-cell">Gross</th>
                    <th scope="col" className="money-cell">Net</th>
                    <th scope="col">Classes</th>
                    <th scope="col">Status</th>
                    <th scope="col"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.tutorId} className={detail?.tutorId === item.tutorId ? 'row-selected' : ''}>
                      <td>{item.tutorName}</td>
                      <td className="money-cell">{formatVnd(item.grossRevenue)}</td>
                      <td className="money-cell">{formatVnd(item.netSalary)}</td>
                      <td>{item.classesReceivingThisMonth}</td>
                      <td>
                        <StatusPill label={item.payoutStatus} tone={payoutStatusClass(item.payoutStatus) as 'success' | 'warning' | 'danger'} />
                      </td>
                      <td>
                        <Button variant="soft" size="sm" onClick={() => loadDetail(item.tutorId)}>
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
                <Button variant="soft" onClick={() => void loadMoreSummary()} loading={summaryLoadingMore}>
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
        </PageSection>

        {detail ? (
        <PageSection title={detail.name}>
          <section className="card-region">
            <h4 className="subsection-title">Tutor identity and contact</h4>
            <div className="grid-3 mb-12 mt-12">
              <div className="panel">
                <strong>Name</strong>
                <p>{detail.name}</p>
              </div>
              <div className="panel">
                <strong>Email</strong>
                <p>{detail.email}</p>
              </div>
              <div className="panel">
                <strong>Phone</strong>
                <p>{detail.phoneNumber || '-'}</p>
              </div>
            </div>
            <div className="panel">
              <p className="mb-6"><strong>Facebook:</strong> {detail.facebookUrl || '-'}</p>
              <p className="mb-0"><strong>Address:</strong> {detail.address || '-'}</p>
            </div>
          </section>

          <section className="card-region">
            <h4 className="subsection-title">Payout snapshot</h4>
            {detail.payout ? (
              <div className="panel mt-12">
                <div className="stat-row">
                  <span>
                    Month{' '}
                    <strong>
                      {detail.payout.year}-{`${detail.payout.month}`.padStart(2, '0')}
                    </strong>
                  </span>
                  <span>
                    Gross <strong>{formatVnd(detail.payout.grossRevenue)}</strong>
                  </span>
                  <span>
                    Net <strong>{formatVnd(detail.payout.netSalary)}</strong>
                  </span>
                  <StatusPill label={detail.payout.status} tone={payoutStatusClass(detail.payout.status) as 'success' | 'warning' | 'danger'} />
                </div>
                <p className="muted mt-12">
                  Manage QR and payment confirmation on the{' '}
                  <Link to="/app/admin/payouts">Payouts</Link> page.
                </p>
              </div>
            ) : (
              <p className="muted mt-12">No payout for the selected month.</p>
            )}
          </section>

          <section className="card-region">
            <h4 className="subsection-title">Bank accounts</h4>
            {!detail.bankAccounts.length ? <p className="muted mt-12">No bank accounts.</p> : null}
            {!!detail.bankAccounts.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Bank</th>
                      <th>Account</th>
                      <th>Holder</th>
                      <th>Primary</th>
                      <th>Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.bankAccounts.map((account) => (
                      <tr key={account.id}>
                        <td>{account.bankName}</td>
                        <td>{account.maskedAccountNumber}</td>
                        <td>{account.accountHolderName}</td>
                        <td>{account.primary ? 'Yes' : 'No'}</td>
                        <td>{account.verified ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="card-region">
            <h4 className="subsection-title">Managed classes</h4>
            {!detail.managedClasses.length ? <p className="muted mt-12">No managed classes.</p> : null}
            {!!detail.managedClasses.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Class name</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th className="money-cell">Price/Hour</th>
                      <th>Salary rate</th>
                      <th>Sessions</th>
                      <th>Latest Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.managedClasses.map((managedClass) => (
                      <tr key={managedClass.classId}>
                        <td>{managedClass.classDisplayName || managedClass.subjectName}</td>
                        <td>{managedClass.subjectName}</td>
                        <td>{managedClass.classStatus}</td>
                        <td className="money-cell">{formatVnd(managedClass.pricePerHour)}</td>
                        <td>{(managedClass.defaultSalaryRate * 100).toFixed(2)}%</td>
                        <td>{managedClass.sessionCount}</td>
                        <td>{managedClass.latestSessionDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="card-region">
            <h4 className="subsection-title">Danger zone</h4>
            <div className="mt-12">
              <Button
                variant="danger"
                onClick={() => handleRevokeTutorRole(detail.tutorId)}
                loading={deleteLoading}
              >
                {deleteConfirmTutorId === detail.tutorId ? 'Confirm revoke role' : 'Revoke tutor role'}
              </Button>
              {deleteConfirmTutorId === detail.tutorId ? <p className="muted mt-8">Click again to confirm.</p> : null}
            </div>
          </section>
        </PageSection>
      ) : (
        <div className="card admin-tutor-detail-empty">
          <p>Select a tutor from the list to view details.</p>
        </div>
      )}
      </div>
    </div>
  );
}

export default AdminTutorManagementPage;
