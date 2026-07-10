import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { extractApiErrorMessage } from '../../../../services/authService';
import {
  approveClassApplication,
  deleteClass,
  listPublishedClasses,
  listSubjects,
  rejectClassApplication,
} from '../../../../services/classAssignmentService';
import { useToast } from '../../../../components/feedback/ToastProvider';
import { queryKeys } from '../../../../lib/queryKeys';

export function useAdminClasses() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: subjects = [] } = useQuery({
    queryKey: queryKeys.subjects,
    queryFn: listSubjects,
  });

  const { data: publishedResponse, error: loadErrorObj } = useQuery({
    queryKey: queryKeys.publishedClasses,
    queryFn: () => listPublishedClasses(),
  });

  const publishedClasses = publishedResponse?.items ?? [];
  const loadError = loadErrorObj ? extractApiErrorMessage(loadErrorObj, 'Failed to load class data') : '';

  const refreshClasses = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.publishedClasses });

  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [applicationLoadingId, setApplicationLoadingId] = useState('');
  const [confirmApproveId, setConfirmApproveId] = useState('');
  const [confirmRejectId, setConfirmRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const deleteMutation = useMutation({
    mutationFn: deleteClass,
    onSuccess: async () => {
      showToast('Class deleted.', 'success');
      await refreshClasses();
    },
    onError: (err: unknown) => {
      showToast(extractApiErrorMessage(err, 'Failed to delete class'), 'error');
    },
  });

  const approveMutation = useMutation({
    mutationFn: approveClassApplication,
    onSuccess: async () => {
      showToast('Tutor assigned. Other pending applications were rejected.', 'success');
      await refreshClasses();
    },
    onError: (err: unknown) => {
      showToast(extractApiErrorMessage(err, 'Failed to approve application'), 'error');
    },
    onSettled: () => setApplicationLoadingId(''),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectClassApplication(id, reason),
    onSuccess: async () => {
      showToast('Application rejected.', 'success');
      await refreshClasses();
    },
    onError: (err: unknown) => {
      showToast(extractApiErrorMessage(err, 'Failed to reject application'), 'error');
    },
    onSettled: () => setApplicationLoadingId(''),
  });

  const activeClasses = useMemo(
    () => publishedClasses.filter((c) => c.status === 'ACTIVE'),
    [publishedClasses]
  );
  const inactiveClasses = useMemo(
    () => publishedClasses.filter((c) => c.status !== 'ACTIVE'),
    [publishedClasses]
  );
  const classesWithPending = useMemo(
    () => publishedClasses.filter((c) => c.applications.some((a) => a.status === 'PENDING')),
    [publishedClasses]
  );
  const totalPending = useMemo(
    () =>
      classesWithPending.reduce(
        (sum, c) => sum + c.applications.filter((a) => a.status === 'PENDING').length,
        0
      ),
    [classesWithPending]
  );

  async function handleDeleteConfirmed(): Promise<void> {
    const id = deleteTargetId;
    setDeleteTargetId('');
    await deleteMutation.mutateAsync(id);
  }

  async function handleApproveConfirmed(): Promise<void> {
    const id = confirmApproveId;
    setConfirmApproveId('');
    setApplicationLoadingId(id);
    await approveMutation.mutateAsync(id);
  }

  async function handleRejectConfirmed(): Promise<void> {
    const id = confirmRejectId;
    const reason = rejectReason.trim() || undefined;
    setConfirmRejectId('');
    setRejectReason('');
    setApplicationLoadingId(id);
    await rejectMutation.mutateAsync({ id, reason });
  }

  return {
    subjects,
    publishedClasses,
    loadError,
    activeClasses,
    inactiveClasses,
    classesWithPending,
    totalPending,
    refreshClasses,
    deleteTargetId,
    setDeleteTargetId,
    deleteLoading: deleteMutation.isPending,
    handleDeleteConfirmed,
    applicationLoadingId,
    confirmApproveId,
    setConfirmApproveId,
    confirmRejectId,
    setConfirmRejectId,
    rejectReason,
    setRejectReason,
    handleApproveConfirmed,
    handleRejectConfirmed,
  };
}
