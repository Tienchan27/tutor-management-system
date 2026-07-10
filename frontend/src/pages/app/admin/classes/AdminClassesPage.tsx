import { useState } from 'react';
import PageLayout from '../../../../components/layout/PageLayout';
import PageSection from '../../../../components/layout/PageSection';
import Button from '../../../../components/ui/Button';
import AdminApplicationsTab from './AdminApplicationsTab';
import AdminClassFormModal from './AdminClassFormModal';
import AdminClassListTab from './AdminClassListTab';
import AdminClassesTabs from './AdminClassesTabs';
import ClassConfirmDialogs from './ClassConfirmDialogs';
import { useAdminClasses } from './useAdminClasses';
import { useClassFormModal } from './useClassFormModal';

function AdminClassesPage() {
  const [activeTab, setActiveTab] = useState<'classes' | 'applications'>('classes');

  const {
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
    deleteLoading,
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
  } = useAdminClasses();

  const formModal = useClassFormModal(subjects, publishedClasses, refreshClasses);

  return (
    <PageLayout
      title="Classes"
      subtitle="Manage classes and review tutor applications."
      headerActions={
        <Button variant="primary" onClick={formModal.openNewModal}>
          + New class
        </Button>
      }
    >
      <PageSection>
        {loadError ? <p className="error-text">{loadError}</p> : null}

        <AdminClassesTabs activeTab={activeTab} totalPending={totalPending} onTabChange={setActiveTab} />

        {activeTab === 'classes' ? (
          <AdminClassListTab
            publishedClasses={publishedClasses}
            activeClasses={activeClasses}
            inactiveClasses={inactiveClasses}
            loadError={loadError}
            deleteLoading={deleteLoading}
            onEdit={formModal.openEditModal}
            onDelete={setDeleteTargetId}
          />
        ) : null}

        {activeTab === 'applications' ? (
          <AdminApplicationsTab
            classesWithPending={classesWithPending}
            applicationLoadingId={applicationLoadingId}
            onApprove={setConfirmApproveId}
            onReject={(id) => {
              setConfirmRejectId(id);
              setRejectReason('');
            }}
          />
        ) : null}
      </PageSection>

      <AdminClassFormModal
        open={formModal.modalMode !== null}
        title={formModal.modalTitle}
        isEditMode={formModal.isEditMode}
        form={formModal.form}
        setForm={formModal.setForm}
        formError={formModal.formError}
        submitting={formModal.submitting}
        rosterLoading={formModal.rosterLoading}
        editingClass={formModal.editingClass}
        subjects={formModal.subjects}
        selectedSubject={formModal.selectedSubject}
        canSubmit={formModal.canSubmit}
        classFormDirty={formModal.classFormDirty}
        previewName={formModal.previewName}
        previewSubject={formModal.previewSubject}
        previewStudents={formModal.previewStudents}
        priceNum={formModal.priceNum}
        onClose={formModal.closeModal}
        onSubmit={formModal.handleSubmit}
        onSubjectChange={formModal.handleSubjectChange}
        onAddStudent={formModal.handleAddStudent}
        onRemoveStudent={formModal.handleRemoveStudent}
        onAddStudentToClass={formModal.handleAddStudentToClass}
        onRemoveStudentFromClass={formModal.handleRemoveStudentFromClass}
      />

      <ClassConfirmDialogs
        deleteTargetId={deleteTargetId}
        deleteLoading={deleteLoading}
        onDeleteConfirm={() => void handleDeleteConfirmed()}
        onDeleteCancel={() => setDeleteTargetId('')}
        confirmApproveId={confirmApproveId}
        applicationLoadingId={applicationLoadingId}
        onApproveConfirm={() => void handleApproveConfirmed()}
        onApproveCancel={() => setConfirmApproveId('')}
        confirmRejectId={confirmRejectId}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onRejectConfirm={() => void handleRejectConfirmed()}
        onRejectCancel={() => {
          setConfirmRejectId('');
          setRejectReason('');
        }}
      />
    </PageLayout>
  );
}

export default AdminClassesPage;
