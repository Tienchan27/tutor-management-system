import { ReactNode, useRef } from 'react';
import { useOverlayDialog } from '../../hooks/useOverlayDialog';
import Button from '../ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
  confirmVariant?: 'primary' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  danger = false,
  confirmVariant,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const resolvedVariant = confirmVariant ?? (danger ? 'danger' : 'primary');

  useOverlayDialog(open, onCancel, panelRef);

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-overlay dialog-overlay-elevated" role="presentation" onClick={onCancel}>
      <div
        ref={panelRef}
        className="modal-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="confirm-dialog-title" className="modal-title">
            {title}
          </h2>
        </div>
        <div className="modal-body">{message}</div>
        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={resolvedVariant} type="button" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
