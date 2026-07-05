import { Link } from 'react-router-dom';
import { AdminTutorDetailResponse } from '../../types/dashboard';
import SlideOver from '../ui/SlideOver';
import SectionBlock from '../ui/SectionBlock';
import Button from '../ui/Button';
import { formatVnd } from '../../utils/format';

interface AdminTutorDetailSlideOverProps {
  open: boolean;
  detail: AdminTutorDetailResponse | null;
  deleteConfirmTutorId: string;
  deleteLoading: boolean;
  onClose: () => void;
  onRevokeTutorRole: (tutorId: string) => void;
}

function AdminTutorDetailSlideOver({
  open,
  detail,
  deleteConfirmTutorId,
  deleteLoading,
  onClose,
  onRevokeTutorRole,
}: AdminTutorDetailSlideOverProps) {
  if (!detail) {
    return null;
  }

  return (
    <SlideOver open={open} title={detail.name} subtitle={detail.email} size="lg" onClose={onClose}>
      <div className="stack-16">
        <SectionBlock title="Contact">
          <div className="grid-3">
            <div>
              <strong>Phone</strong>
              <p className="muted mb-0">{detail.phoneNumber || '—'}</p>
            </div>
            <div>
              <strong>Facebook</strong>
              <p className="muted mb-0">{detail.facebookUrl || '—'}</p>
            </div>
            <div>
              <strong>Address</strong>
              <p className="muted mb-0">{detail.address || '—'}</p>
            </div>
          </div>
        </SectionBlock>

        <SectionBlock title="Payroll">
          {detail.payout ? (
            <p className="muted mb-0">
              Current month payout status: <strong>{detail.payout.status}</strong>. View details on{' '}
              <Link to="/app/admin/payouts">Tutor payouts</Link>.
            </p>
          ) : (
            <p className="muted mb-0">No payout for the current month.</p>
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
                  </tr>
                </thead>
                <tbody>
                  {detail.bankAccounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.bankName}</td>
                      <td>{account.maskedAccountNumber}</td>
                      <td>{account.accountHolderName}</td>
                      <td>{account.primary ? 'Yes' : 'No'}</td>
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
    </SlideOver>
  );
}

export default AdminTutorDetailSlideOver;
