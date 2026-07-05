import { useEffect, useState } from 'react';
import { SessionListItem } from '../../types/sessions';
import Button from '../ui/Button';
import SlideOver from '../ui/SlideOver';
import { formatVnd } from '../../utils/format';

interface SessionFinancialSlideOverProps {
  open: boolean;
  item: SessionListItem | null;
  loading?: boolean;
  showSalaryRate?: boolean;
  onClose: () => void;
  onSave: (item: SessionListItem, reason: string) => void;
}

function SessionFinancialSlideOver({
  open,
  item,
  loading,
  showSalaryRate = false,
  onClose,
  onSave,
}: SessionFinancialSlideOverProps) {
  const [draft, setDraft] = useState<SessionListItem | null>(item);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setDraft(item);
    setReason('');
  }, [item, open]);

  if (!item) {
    return null;
  }

  const current = draft || item;
  const canSave = reason.trim().length > 0;
  const isDirty =
    current.date !== item.date ||
    current.durationHours !== item.durationHours ||
    current.tuitionAtLog !== item.tuitionAtLog ||
    current.salaryRateAtLog !== item.salaryRateAtLog ||
    current.payrollMonth !== item.payrollMonth ||
    (current.note || '') !== (item.note || '');

  return (
    <SlideOver
      open={open}
      title="Edit session"
      subtitle="Correct a session you logged. A reason is recorded for the audit trail."
      isDirty={isDirty}
      onClose={onClose}
      footer={(requestClose) => (
        <>
          <Button variant="secondary" onClick={requestClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={loading} disabled={!canSave} onClick={() => onSave(current, reason.trim())}>
            Save changes
          </Button>
        </>
      )}
    >
      <label className="input-wrapper input-wrapper-tight">
        <span className="input-label">Date</span>
        <input
          className="text-input"
          type="date"
          value={current.date}
          onChange={(e) => setDraft({ ...current, date: e.target.value })}
        />
      </label>
      <label className="input-wrapper input-wrapper-tight">
        <span className="input-label">Duration (hours)</span>
        <input
          className="text-input"
          type="number"
          step="0.5"
          min="0.5"
          value={current.durationHours}
          onChange={(e) => setDraft({ ...current, durationHours: Number(e.target.value) })}
        />
      </label>
      <label className="input-wrapper input-wrapper-tight">
        <span className="input-label">Tuition (VND)</span>
        <input
          className="text-input"
          type="number"
          value={current.tuitionAtLog}
          onChange={(e) => setDraft({ ...current, tuitionAtLog: Math.round(Number(e.target.value)) })}
        />
      </label>
      {showSalaryRate ? (
        <label className="input-wrapper input-wrapper-tight">
          <span className="input-label">Salary rate (%)</span>
          <input
            className="text-input"
            type="number"
            step="0.01"
            value={(current.salaryRateAtLog * 100).toFixed(2)}
            onChange={(e) => setDraft({ ...current, salaryRateAtLog: Number(e.target.value) / 100 })}
          />
        </label>
      ) : null}
      <label className="input-wrapper input-wrapper-tight">
        <span className="input-label">Payroll month</span>
        <input
          className="text-input"
          type="month"
          value={current.payrollMonth}
          onChange={(e) => setDraft({ ...current, payrollMonth: e.target.value })}
        />
      </label>
      <label className="input-wrapper input-wrapper-tight">
        <span className="input-label">Note</span>
        <input
          className="text-input"
          value={current.note || ''}
          onChange={(e) => setDraft({ ...current, note: e.target.value })}
        />
      </label>
      <label className="input-wrapper input-wrapper-tight">
        <span className="input-label">Reason (required)</span>
        <input
          className="text-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this change needed?"
        />
      </label>
      <p className="muted mb-0">Tuition: {formatVnd(current.tuitionAtLog)}</p>
    </SlideOver>
  );
}

export default SessionFinancialSlideOver;
