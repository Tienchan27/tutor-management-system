import { FormEvent, useEffect, useState } from 'react';
import { getAdminTutorDetail, getAdminTutorSummary, inviteTutor, revokeTutorRole } from '../../services/dashboardService';
import { AdminTutorDetailResponse, TutorSummaryResponse } from '../../types/dashboard';
import { extractApiErrorMessage } from '../../services/authService';
import { confirmPayoutPaid, generateMonthlyPayouts, generatePayoutQr, overrideNetSalary } from '../../services/payoutService';
import { TutorPayoutPayment } from '../../types/payouts';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

function AdminTutorManagementPage() {
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [items, setItems] = useState<TutorSummaryResponse[]>([]);
  const [detail, setDetail] = useState<AdminTutorDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [payoutActionLoading, setPayoutActionLoading] = useState<string>('');
  const [overrideLoadingId, setOverrideLoadingId] = useState<string>('');
  const [netSalaryDraftById, setNetSalaryDraftById] = useState<Record<string, number>>({});
  const [selectedPayment, setSelectedPayment] = useState<TutorPayoutPayment | null>(null);
  const [deleteConfirmTutorId, setDeleteConfirmTutorId] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteMessage, setInviteMessage] = useState<string>('');
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

  async function refreshAfterPayoutAction(): Promise<void> {
    if (!detail?.tutorId) {
      return;
    }
    setError('');
    try {
      await loadSummary();
      await loadDetail(detail.tutorId);
    } catch {
      // error already handled in called functions
    }
  }

  async function handleInviteTutor(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setInviteMessage('');
    setInviteLoading(true);
    try {
      const response = await inviteTutor({ email: inviteEmail });
      setInviteMessage(response.message);
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

  async function handleGenerateForMonth(): Promise<void> {
    if (!detail?.tutorId) {
      return;
    }
    setPayoutActionLoading('generate_month');
    setError('');
    try {
      await generateMonthlyPayouts(month);
      await refreshAfterPayoutAction();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to generate monthly payouts'));
    } finally {
      setPayoutActionLoading('');
    }
  }

  async function handleGenerateQr(payoutId: string): Promise<void> {
    setPayoutActionLoading(payoutId);
    setError('');
    try {
      const payment = await generatePayoutQr(payoutId);
      setSelectedPayment(payment);
      await refreshAfterPayoutAction();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to generate payout QR'));
    } finally {
      setPayoutActionLoading('');
    }
  }

  async function handleConfirmPaid(payoutId: string): Promise<void> {
    setPayoutActionLoading(`confirm_${payoutId}`);
    setError('');
    try {
      await confirmPayoutPaid(payoutId);
      await refreshAfterPayoutAction();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to confirm paid'));
    } finally {
      setPayoutActionLoading('');
    }
  }

  async function handleOverrideNetSalary(payoutId: string): Promise<void> {
    setError('');
    setOverrideLoadingId(payoutId);
    try {
      const nextNetSalary = netSalaryDraftById[payoutId] ?? (detail?.payout?.netSalary ?? 0);
      await overrideNetSalary(payoutId, nextNetSalary);
      await refreshAfterPayoutAction();
      setNetSalaryDraftById((prev) => {
        const copy = { ...prev };
        delete copy[payoutId];
        return copy;
      });
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to override net salary'));
    } finally {
      setOverrideLoadingId('');
    }
  }

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
      setSelectedPayment(null);
      await loadSummary();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to revoke tutor role'));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="stack-16">
      <div className="card">
        <div className="page-header">
          <div>
            <h2 className="title title-lg">Tutor Management</h2>
            <p className="subtitle">Invite tutors and review payout snapshots by month.</p>
          </div>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input-month" />
        </div>
        <form onSubmit={handleInviteTutor} className="stack-16">
          <div className="grid-form">
            <input
              type="email"
              className="text-input"
              placeholder="New tutor email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary compact-btn" type="submit" disabled={inviteLoading}>
              {inviteLoading ? 'Adding...' : 'Add Tutor'}
            </button>
          </div>
        </form>
        {inviteMessage ? <p className="success-text">{inviteMessage}</p> : null}
      </div>

      <div className="card">
        <h3 className="section-title">Tutor summary</h3>
        {loading ? <p className="muted">Loading...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && !items.length ? <p className="muted">No summary available for this month.</p> : null}
        {!!items.length ? (
          <>
            <p className="muted mb-8">
              Showing {items.length} tutor{items.length === 1 ? '' : 's'}
              {summaryHasNext ? ' — more available.' : '.'}
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tutor</th>
                    <th>Gross Revenue</th>
                    <th>Net Salary</th>
                    <th>Classes (this month)</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.tutorId}>
                      <td>{item.tutorName} ({item.tutorEmail})</td>
                      <td>{item.grossRevenue.toLocaleString()}</td>
                      <td>{item.netSalary.toLocaleString()}</td>
                      <td>{item.classesReceivingThisMonth}</td>
                      <td>{item.payoutStatus}</td>
                      <td>
                        <button className="btn btn-soft-teal table-action" onClick={() => loadDetail(item.tutorId)} type="button">
                          View detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summaryHasNext ? (
              <div className="form-actions mt-12">
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={() => void loadMoreSummary()}
                  disabled={summaryLoadingMore}
                >
                  {summaryLoadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {detail ? (
        <div className="card">
          <h3 className="section-title">Selected tutor detail</h3>
          <div className="grid-3 mb-12">
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
          <p className="muted">Facebook: {detail.facebookUrl || '-'}</p>
          <p className="muted">Address: {detail.address || '-'}</p>
          {detail.payout ? (
            <div className="panel mb-12">
              <strong>Selected month payout</strong>
              <p>
                {detail.payout.year}-{`${detail.payout.month}`.padStart(2, '0')} | Gross: {detail.payout.grossRevenue.toLocaleString()} |
                Net: {detail.payout.netSalary.toLocaleString()} | Status: {detail.payout.status}
              </p>

              <div className="mt-12">
                <h4 className="section-title mb-8">Monthly payout actions</h4>

                {detail.payout.status === 'LOCKED' ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    <input
                      className="table-input money-number"
                      type="number"
                      step="1"
                      value={netSalaryDraftById[detail.payout!.payoutId] ?? detail.payout.netSalary}
                      onChange={(event) => setNetSalaryDraftById((prev) => ({ ...prev, [detail.payout!.payoutId]: Math.round(Number(event.target.value)) }))}
                      style={{ maxWidth: 160 }}
                      disabled={overrideLoadingId === detail.payout!.payoutId}
                    />
                    <button
                      type="button"
                      className="btn btn-soft table-action"
                      onClick={() => handleOverrideNetSalary(detail.payout!.payoutId)}
                      disabled={overrideLoadingId === detail.payout!.payoutId}
                    >
                      {overrideLoadingId === detail.payout!.payoutId ? 'Saving...' : 'Save Override'}
                    </button>
                  </div>
                ) : null}

                <div className="table-actions table-actions-left">
                  <button
                    type="button"
                    className="btn btn-brand table-action"
                    onClick={() => handleGenerateQr(detail.payout!.payoutId)}
                    disabled={detail.payout.status === 'PAID' || payoutActionLoading === detail.payout!.payoutId}
                  >
                    {payoutActionLoading === detail.payout!.payoutId ? 'Generating...' : 'Generate QR'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary table-action"
                    onClick={() => handleConfirmPaid(detail.payout!.payoutId)}
                    disabled={detail.payout.status === 'PAID' || payoutActionLoading === `confirm_${detail.payout!.payoutId}`}
                  >
                    {payoutActionLoading === `confirm_${detail.payout!.payoutId}` ? 'Confirming...' : 'Confirm Paid'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">No payout generated for selected month.</p>
          )}

          {!detail.payout ? (
            <div className="mt-12">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateForMonth}
                disabled={payoutActionLoading === 'generate_month'}
              >
                {payoutActionLoading === 'generate_month' ? 'Generating...' : 'Generate payouts for this month'}
              </button>
            </div>
          ) : null}

          {selectedPayment ? (
            <div className="panel mt-12">
              <strong>Latest QR payload</strong>
              <p className="muted mb-6">
                Reference: {selectedPayment.qrRef} | Status: {selectedPayment.status}
              </p>
              <pre className="pre-wrap" style={{ margin: 0 }}>{selectedPayment.qrPayload}</pre>
            </div>
          ) : null}

          <h4 className="section-title">Bank accounts</h4>
          {!detail.bankAccounts.length ? <p className="muted">No bank accounts.</p> : null}
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

          <h4 className="section-title">Managed classes</h4>
          {!detail.managedClasses.length ? <p className="muted">No managed classes.</p> : null}
          {!!detail.managedClasses.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Class name</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Price/Hour</th>
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
                      <td>{managedClass.pricePerHour.toLocaleString()}</td>
                      <td>{(managedClass.defaultSalaryRate * 100).toFixed(2)}%</td>
                      <td>{managedClass.sessionCount}</td>
                      <td>{managedClass.latestSessionDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-16">
            <h4 className="section-title">Tutor actions</h4>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => handleRevokeTutorRole(detail.tutorId)}
              disabled={deleteLoading}
            >
              {deleteConfirmTutorId === detail.tutorId ? 'Confirm revoke tutor role' : 'Delete tutor (revoke TUTOR role)'}
            </button>
            {deleteConfirmTutorId === detail.tutorId ? <p className="muted mt-8">Click again to confirm.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminTutorManagementPage;
