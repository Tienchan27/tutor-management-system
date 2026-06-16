import { Link } from 'react-router-dom';
import { AdminTutorDetailResponse } from '../../types/dashboard';
import Modal from '../ui/Modal';
import SectionBlock from '../ui/SectionBlock';
import Button from '../ui/Button';
import StatusPill from '../ui/StatusPill';
import { formatVnd } from '../../utils/format';
import { payoutTone } from '../../utils/statusTone';

interface AdminTutorDetailDrawerProps {
  open: boolean;
  detail: AdminTutorDetailResponse | null;
  deleteConfirmTutorId: string;
  deleteLoading: boolean;
  onClose: () => void;
  onRevokeTutorRole: (tutorId: string) => void;
}

function AdminTutorDetailDrawer({
  open,
  detail,
  deleteConfirmTutorId,
  deleteLoading,
  onClose,
  onRevokeTutorRole,
}: AdminTutorDetailDrawerProps) {
  if (!detail) {
    return null;
  }

  return (
    <Modal open={open} title={detail.name} subtitle={detail.email} onClose={onClose} size="lg">
      <div className="stack-16">
        <SectionBlock title="Tutor identity and contact">
          <div className="grid-3">
            <div>
              <strong>Name</strong>
              <p className="muted mb-0">{detail.name}</p>
            </div>
            <div>
              <strong>Email</strong>
              <p className="muted mb-0">{detail.email}</p>
            </div>
            <div>
              <strong>Phone</strong>
              <p className="muted mb-0">{detail.phoneNumber || '—'}</p>
            </div>
          </div>
          <p className="muted mb-0">
            <strong>Facebook:</strong> {detail.facebookUrl || '—'}
          </p>
          <p className="muted mb-0">
            <strong>Address:</strong> {detail.address || '—'}
          </p>
        </SectionBlock>

        <SectionBlock title="Payout snapshot">
          {detail.payout ? (
            <>
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
                <StatusPill label={detail.payout.status} tone={payoutTone(detail.payout.status)} />
              </div>
              <p className="muted mb-0">
                Manage QR and payment confirmation on the <Link to="/app/admin/payouts">Payouts</Link> page.
              </p>
            </>
          ) : (
            <p className="muted mb-0">No payout for the selected month.</p>
          )}
        </SectionBlock>

        <SectionBlock title="Bank accounts">
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
        </SectionBlock>

        <SectionBlock title="Managed classes">
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
        </SectionBlock>

        <SectionBlock title="Danger zone">
          <div className="mt-12">
            <Button variant="danger" onClick={() => onRevokeTutorRole(detail.tutorId)} loading={deleteLoading}>
              {deleteConfirmTutorId === detail.tutorId ? 'Confirm revoke role' : 'Revoke tutor role'}
            </Button>
            {deleteConfirmTutorId === detail.tutorId ? <p className="muted mt-8">Click again to confirm.</p> : null}
          </div>
        </SectionBlock>
      </div>
    </Modal>
  );
}

export default AdminTutorDetailDrawer;
