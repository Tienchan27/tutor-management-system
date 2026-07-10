import ConfirmDialog from '../../../../components/feedback/ConfirmDialog';

interface ClassConfirmDialogsProps {
  deleteTargetId: string;
  deleteLoading: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  confirmApproveId: string;
  applicationLoadingId: string;
  onApproveConfirm: () => void;
  onApproveCancel: () => void;
  confirmRejectId: string;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onRejectConfirm: () => void;
  onRejectCancel: () => void;
}

export default function ClassConfirmDialogs({
  deleteTargetId,
  deleteLoading,
  onDeleteConfirm,
  onDeleteCancel,
  confirmApproveId,
  applicationLoadingId,
  onApproveConfirm,
  onApproveCancel,
  confirmRejectId,
  rejectReason,
  onRejectReasonChange,
  onRejectConfirm,
  onRejectCancel,
}: ClassConfirmDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete class"
        message="Delete this class? This cannot be undone. Classes with logged sessions cannot be deleted."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={onDeleteConfirm}
        onCancel={onDeleteCancel}
      />

      <ConfirmDialog
        open={!!confirmApproveId}
        title="Approve application"
        message="Assign this tutor to the class? All other pending applications will be automatically rejected."
        confirmLabel="Approve"
        confirmVariant="success"
        loading={!!applicationLoadingId}
        onConfirm={onApproveConfirm}
        onCancel={onApproveCancel}
      />

      <ConfirmDialog
        open={!!confirmRejectId}
        title="Reject application"
        message={
          <div className="stack-8">
            <p className="mb-0">Are you sure you want to reject this application?</p>
            <textarea
              className="text-input text-area-notes"
              placeholder="Reason (optional)"
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
            />
          </div>
        }
        confirmLabel="Reject"
        confirmVariant="danger"
        loading={!!applicationLoadingId}
        onConfirm={onRejectConfirm}
        onCancel={onRejectCancel}
      />
    </>
  );
}
