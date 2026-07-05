import { ReactNode, useId, useRef } from 'react';
import { useOverlayDialog } from '../../hooks/useOverlayDialog';
import { useDismissGuard } from '../../hooks/useDismissGuard';
import ConfirmDialog from '../feedback/ConfirmDialog';

type ModalFooter = ReactNode | ((requestClose: () => void) => ReactNode);

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ModalFooter;
  size?: 'md' | 'lg' | 'xl';
  isDirty?: boolean;
  closeOnBackdrop?: boolean;
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
  isDirty = false,
  closeOnBackdrop = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { requestClose, discardDialog } = useDismissGuard(open, isDirty, onClose);

  useOverlayDialog(open, requestClose, panelRef);

  if (!open) {
    return null;
  }

  const resolvedFooter = typeof footer === 'function' ? footer(requestClose) : footer;

  return (
    <>
      <div
        className="dialog-overlay"
        role="presentation"
        onClick={closeOnBackdrop ? requestClose : undefined}
      >
        <div
          ref={panelRef}
          className={`modal-panel${size === 'lg' ? ' modal-panel-lg' : ''}${size === 'xl' ? ' modal-panel-xl' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <div>
              <h2 id={titleId} className="modal-title">
                {title}
              </h2>
              {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
            </div>
            <button type="button" className="modal-close" aria-label="Close" onClick={requestClose}>
              ✕
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {resolvedFooter ? <div className="modal-footer">{resolvedFooter}</div> : null}
        </div>
      </div>
      <ConfirmDialog
        open={discardDialog.open}
        title="Discard changes?"
        message="You have unsaved changes. Discard them and close?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        danger
        onConfirm={discardDialog.onConfirm}
        onCancel={discardDialog.onCancel}
      />
    </>
  );
}

export default Modal;
