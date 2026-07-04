import { useCallback, useEffect, useState } from 'react';

interface DiscardDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function useDismissGuard(
  open: boolean,
  isDirty: boolean,
  onClose: () => void
): { requestClose: () => void; discardDialog: DiscardDialogProps } {
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setDiscardOpen(false);
    }
  }, [open]);

  const requestClose = useCallback(() => {
    if (discardOpen) {
      return;
    }
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }, [discardOpen, isDirty, onClose]);

  const discardDialog: DiscardDialogProps = {
    open: discardOpen,
    onConfirm: () => {
      setDiscardOpen(false);
      onClose();
    },
    onCancel: () => setDiscardOpen(false),
  };

  return { requestClose, discardDialog };
}
