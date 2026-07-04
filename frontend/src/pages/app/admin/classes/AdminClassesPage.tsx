import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { extractApiErrorMessage } from '../../../../services/authService';
import PageLayout from '../../../../components/layout/PageLayout';
import PageSection from '../../../../components/layout/PageSection';
import SectionBlock from '../../../../components/ui/SectionBlock';
import Button from '../../../../components/ui/Button';
import StudentChipList from '../../../../components/admin/StudentChipList';
import StatusPill from '../../../../components/ui/StatusPill';
import EmptyState from '../../../../components/ui/EmptyState';
import ConfirmDialog from '../../../../components/feedback/ConfirmDialog';
import Modal from '../../../../components/ui/Modal';
import { useToast } from '../../../../components/feedback/ToastProvider';
import { formatDate, formatVnd } from '../../../../utils/format';
import {
  addClassStudent,
  approveClassApplication,
  deleteClass,
  listPublishedClasses,
  listSubjects,
  lookupStudentByEmail,
  publishClass,
  rejectClassApplication,
  removeClassStudent,
  updateClass,
} from '../../../../services/classAssignmentService';
import { PublishedClassResponse, SubjectOptionResponse } from '../../../../types/classAssignment';
import {
  assignedTutor,
  buildSuggestedClassName,
  classStatusLabel,
  classStatusTone,
  ClassEditSnapshot,
  ClassFormState,
  defaultNameFromEmail,
  isClassFormDirty,
  isLikelyEmail,
  normalizeEmail,
} from './classAssignmentUtils';

function emptyForm(subjects: SubjectOptionResponse[]): ClassFormState {
  const firstSubject = subjects[0];
  return {
    students: [],
    studentEmail: '',
    studentAdding: false,
    subjectId: firstSubject?.id ?? '',
    pricePerHour: firstSubject ? String(firstSubject.defaultPricePerHour) : '',
    isPriceManuallyEdited: false,
    displayName: '',
    isDisplayNameManuallyEdited: false,
    note: '',
  };
}

function AdminClassesPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState('');

  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: listSubjects });
  const { data: publishedResponse, error: loadErrorObj } = useQuery({
    queryKey: ['publishedClasses'],
    queryFn: () => listPublishedClasses(),
  });
  const publishedClasses = publishedResponse?.items ?? [];
  const loadError = loadErrorObj ? extractApiErrorMessage(loadErrorObj, 'Failed to load class data') : '';

  const refreshClasses = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['publishedClasses'] });

  const [activeTab, setActiveTab] = useState<'classes' | 'applications'>('classes');
  const [inactiveExpanded, setInactiveExpanded] = useState(false);

  const [modalMode, setModalMode] = useState<'new' | 'edit' | null>(null);
  const [editingClassId, setEditingClassId] = useState<string>('');
  const [editSnapshot, setEditSnapshot] = useState<ClassEditSnapshot | null>(null);
  const [form, setForm] = useState<ClassFormState>(emptyForm([]));
  const [submitting, setSubmitting] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [applicationLoadingId, setApplicationLoadingId] = useState('');
  const [confirmApproveId, setConfirmApproveId] = useState('');
  const [confirmRejectId, setConfirmRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const isEditMode = modalMode === 'edit';

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === form.subjectId) ?? null,
    [subjects, form.subjectId]
  );

  const suggestedDisplayName = useMemo(
    () => buildSuggestedClassName(selectedSubject?.name ?? '', form.students.map((s) => s.name || 'Student')),
    [selectedSubject, form.students]
  );

  useEffect(() => {
    if (!suggestedDisplayName || form.isDisplayNameManuallyEdited) return;
    setForm((prev) => ({ ...prev, displayName: suggestedDisplayName }));
  }, [suggestedDisplayName, form.isDisplayNameManuallyEdited]);

  function openNewModal(): void {
    setFormError('');
    setEditSnapshot(null);
    setForm(emptyForm(subjects));
    setEditingClassId('');
    setModalMode('new');
  }

  function openEditModal(cls: PublishedClassResponse): void {
    setFormError('');
    const subject = subjects.find((s) => s.name === cls.subjectName);
    const displayName = cls.displayName;
    const pricePerHour = String(cls.pricePerHour);
    const note = cls.note ?? '';
    setEditSnapshot({ displayName, pricePerHour, note });
    setForm({
      students: [],
      studentEmail: '',
      studentAdding: false,
      subjectId: subject?.id ?? subjects[0]?.id ?? '',
      pricePerHour,
      isPriceManuallyEdited: true,
      displayName,
      isDisplayNameManuallyEdited: true,
      note,
    });
    setEditingClassId(cls.classId);
    setModalMode('edit');
  }

  function closeModal(): void {
    setModalMode(null);
    setEditingClassId('');
    setEditSnapshot(null);
    setFormError('');
  }

  async function handleAddStudent(): Promise<void> {
    setFormError('');
    const email = normalizeEmail(form.studentEmail);
    if (!isLikelyEmail(email)) { setFormError('Please enter a valid student email.'); return; }
    if (form.students.some((s) => normalizeEmail(s.email) === email)) { setFormError('This student is already in the list.'); return; }
    setForm((prev) => ({ ...prev, studentAdding: true }));
    let name = defaultNameFromEmail(email);
    let isNew = true;
    try {
      const result = await lookupStudentByEmail(email);
      if (result.exists) {
        name = result.name || name;
        isNew = false;
      }
    } catch {
      // Keep the derived name; treat as a new student on lookup failure.
    }
    setForm((prev) => ({
      ...prev,
      students: [...prev.students, { email, name, isNew }],
      studentEmail: '',
      studentAdding: false,
    }));
  }

  function handleRemoveStudent(email: string): void {
    setForm((prev) => ({ ...prev, students: prev.students.filter((s) => normalizeEmail(s.email) !== normalizeEmail(email)) }));
  }

  async function handleAddStudentToClass(): Promise<void> {
    setFormError('');
    const email = normalizeEmail(form.studentEmail);
    if (!isLikelyEmail(email)) { setFormError('Please enter a valid student email.'); return; }
    setRosterLoading(true);
    try {
      const result = await lookupStudentByEmail(email).catch(() => null);
      const name = result?.name || defaultNameFromEmail(email);
      await addClassStudent(editingClassId, { email, name });
      setForm((prev) => ({ ...prev, studentEmail: '' }));
      await refreshClasses();
    } catch (err: unknown) {
      setFormError(extractApiErrorMessage(err, 'Failed to add student'));
    } finally {
      setRosterLoading(false);
    }
  }

  async function handleRemoveStudentFromClass(studentId: string): Promise<void> {
    setFormError('');
    setRosterLoading(true);
    try {
      await removeClassStudent(editingClassId, studentId);
      await refreshClasses();
    } catch (err: unknown) {
      setFormError(extractApiErrorMessage(err, 'Failed to remove student'));
    } finally {
      setRosterLoading(false);
    }
  }

  function handleSubjectChange(subjectId: string): void {
    const subject = subjects.find((s) => s.id === subjectId);
    setForm((prev) => ({
      ...prev,
      subjectId,
      pricePerHour: prev.isPriceManuallyEdited ? prev.pricePerHour : String(subject?.defaultPricePerHour ?? ''),
    }));
  }

  async function handleSubmit(): Promise<void> {
    setFormError('');
    const price = Number(form.pricePerHour);
    if (!form.subjectId) { setFormError('Please select a subject.'); return; }
    if (!form.pricePerHour || isNaN(price) || price < 1) { setFormError('Please enter a valid tuition fee.'); return; }

    if (modalMode === 'new') {
      if (!form.students.length) { setFormError('Please add at least one student.'); return; }
      setSubmitting(true);
      try {
        await publishClass({
          students: form.students.map(({ email, name }) => ({ email, name })),
          subjectId: form.subjectId,
          pricePerHour: Math.round(price),
          displayName: form.displayName.trim() || null,
          note: form.note.trim() || null,
        });
        closeModal();
        showToast('Class published successfully.', 'success');
        await refreshClasses();
      } catch (err: unknown) {
        setFormError(extractApiErrorMessage(err, 'Failed to publish class'));
      } finally {
        setSubmitting(false);
      }
    } else if (modalMode === 'edit' && editingClassId) {
      setSubmitting(true);
      try {
        await updateClass(editingClassId, {
          displayName: form.displayName.trim() || null,
          pricePerHour: Math.round(price),
          note: form.note.trim() || null,
        });
        closeModal();
        showToast('Class updated.', 'success');
        await refreshClasses();
      } catch (err: unknown) {
        setFormError(extractApiErrorMessage(err, 'Failed to update class'));
      } finally {
        setSubmitting(false);
      }
    }
  }

  async function handleDeleteConfirmed(): Promise<void> {
    const id = deleteTargetId;
    setDeleteTargetId('');
    setDeleteLoading(true);
    try {
      await deleteClass(id);
      showToast('Class deleted.', 'success');
      await refreshClasses();
    } catch (err: unknown) {
      showToast(extractApiErrorMessage(err, 'Failed to delete class'), 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleApproveConfirmed(): Promise<void> {
    const id = confirmApproveId;
    setConfirmApproveId('');
    setApplicationLoadingId(id);
    try {
      await approveClassApplication(id);
      showToast('Tutor assigned. Other pending applications were rejected.', 'success');
      await refreshClasses();
    } catch (err: unknown) {
      showToast(extractApiErrorMessage(err, 'Failed to approve application'), 'error');
    } finally {
      setApplicationLoadingId('');
    }
  }

  async function handleRejectConfirmed(): Promise<void> {
    const id = confirmRejectId;
    const reason = rejectReason.trim() || undefined;
    setConfirmRejectId('');
    setRejectReason('');
    setApplicationLoadingId(id);
    try {
      await rejectClassApplication(id, reason);
      showToast('Application rejected.', 'success');
      await refreshClasses();
    } catch (err: unknown) {
      showToast(extractApiErrorMessage(err, 'Failed to reject application'), 'error');
    } finally {
      setApplicationLoadingId('');
    }
  }

  const modalTitle = isEditMode ? 'Edit class' : 'New class';
  const editingClass = isEditMode
    ? publishedClasses.find((c) => c.classId === editingClassId) ?? null
    : null;

  const activeClasses = publishedClasses.filter((c) => c.status === 'ACTIVE');
  const inactiveClasses = publishedClasses.filter((c) => c.status !== 'ACTIVE');
  const classesWithPending = publishedClasses.filter((c) =>
    c.applications.some((a) => a.status === 'PENDING')
  );
  const totalPending = classesWithPending.reduce(
    (sum, c) => sum + c.applications.filter((a) => a.status === 'PENDING').length,
    0
  );

  // Live preview data.
  const priceNum = Number(form.pricePerHour);
  const previewName = form.displayName.trim() || suggestedDisplayName || (isEditMode ? editingClass?.displayName ?? 'Class' : 'New class');
  const previewSubject = selectedSubject?.name ?? editingClass?.subjectName ?? '';
  const previewStudents: { key: string; label: string; isNew?: boolean }[] = isEditMode
    ? (editingClass?.students ?? []).map((s) => ({ key: s.studentId, label: s.name }))
    : form.students.map((s) => ({ key: s.email, label: s.name || s.email, isNew: s.isNew }));

  const canSubmit =
    !!form.subjectId &&
    !!form.pricePerHour &&
    !isNaN(priceNum) &&
    priceNum >= 1 &&
    (isEditMode || form.students.length > 0);

  const classFormDirty = useMemo(
    () => isClassFormDirty(form, modalMode, editSnapshot, emptyForm(subjects), suggestedDisplayName),
    [form, modalMode, subjects, editSnapshot, suggestedDisplayName]
  );

  return (
    <PageLayout
      title="Classes"
      subtitle="Manage classes and review tutor applications."
      headerActions={
        <Button variant="primary" onClick={openNewModal}>
          + New class
        </Button>
      }
    >

      <PageSection>
        {loadError ? <p className="error-text">{loadError}</p> : null}

        {/* Tabs */}
        <div className="cm-tabs">
          <button
            type="button"
            className={`cm-tab-btn${activeTab === 'classes' ? ' active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            Classes
          </button>
          <button
            type="button"
            className={`cm-tab-btn${activeTab === 'applications' ? ' active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            Applications
            {totalPending > 0 ? <span className="cm-tab-badge">{totalPending}</span> : null}
          </button>
        </div>

        {/* Tab: Classes */}
        {activeTab === 'classes' ? (
          <>
            {!publishedClasses.length && !loadError ? (
              <EmptyState title="No classes yet" description="Publish a class to make it visible to tutors." />
            ) : null}
            {!!publishedClasses.length ? (
              <div className="class-list">
                {activeClasses.length > 0 ? (
                  <>
                    <div className="class-section-header class-section-header-active">
                      <span>Active classes</span>
                      <span className="class-section-count">{activeClasses.length}</span>
                    </div>
                    {activeClasses.map((cls) => (
                      <article
                        key={cls.classId}
                        className="class-row"
                      >
                        <div className="class-row-info">
                          <div className="class-row-name">{cls.displayName}</div>
                          <div className="class-row-subject">{cls.subjectName}</div>
                          {cls.students.length > 0 ? (
                            <div className="ac-card-students mt-6">
                              {cls.students.map((s) => (
                                <span key={s.studentId} className="student-chip-label">{s.name}</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="class-row-stats">
                          <div className="class-stat">
                            <div className="class-stat-label">Fee</div>
                            <div className="class-stat-value">{formatVnd(cls.pricePerHour)}/hr</div>
                          </div>
                          <div className="class-stat">
                            <div className="class-stat-label">Tutor</div>
                            <div className="class-stat-value">
                              {assignedTutor(cls) ?? <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>None yet</span>}
                            </div>
                          </div>
                        </div>
                        <div className="class-row-actions">
                          <StatusPill label={classStatusLabel(cls.status)} tone={classStatusTone(cls.status)} />
                          <button
                            type="button"
                            className="icon-btn"
                            title="Edit class"
                            onClick={() => openEditModal(cls)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            title="Delete class"
                            onClick={() => setDeleteTargetId(cls.classId)}
                            disabled={deleteLoading}
                          >
                            ✕
                          </button>
                        </div>
                      </article>
                    ))}
                  </>
                ) : null}

                {inactiveClasses.length > 0 ? (
                  <>
                    <button
                      type="button"
                      className="class-section-header class-section-header-inactive"
                      onClick={() => setInactiveExpanded((v) => !v)}
                    >
                      <span>Inactive classes</span>
                      <span className="class-section-count">{inactiveClasses.length}</span>
                      <span className={`class-section-chevron${inactiveExpanded ? ' expanded' : ''}`}>▸</span>
                    </button>
                    {inactiveExpanded
                      ? inactiveClasses.map((cls) => (
                          <article key={cls.classId} className="class-row class-row-inactive">
                            <div className="class-row-info">
                              <div className="class-row-name">{cls.displayName}</div>
                              <div className="class-row-subject">{cls.subjectName}</div>
                              {cls.students.length > 0 ? (
                                <div className="ac-card-students mt-6">
                                  {cls.students.map((s) => (
                                    <span key={s.studentId} className="student-chip-label">{s.name}</span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="class-row-stats">
                              <div className="class-stat">
                                <div className="class-stat-label">Fee</div>
                                <div className="class-stat-value">{formatVnd(cls.pricePerHour)}/hr</div>
                              </div>
                              <div className="class-stat">
                                <div className="class-stat-label">Tutor</div>
                                <div className="class-stat-value">
                                  {assignedTutor(cls) ?? <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>None yet</span>}
                                </div>
                              </div>
                            </div>
                            <div className="class-row-actions">
                              <StatusPill label={classStatusLabel(cls.status)} tone={classStatusTone(cls.status)} />
                              <button
                                type="button"
                                className="icon-btn"
                                title="Edit class"
                                onClick={() => openEditModal(cls)}
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-btn-danger"
                                title="Delete class"
                                onClick={() => setDeleteTargetId(cls.classId)}
                                disabled={deleteLoading}
                              >
                                ✕
                              </button>
                            </div>
                          </article>
                        ))
                      : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {/* Tab: Applications (pending only, grouped by class) */}
        {activeTab === 'applications' ? (
          <>
            {classesWithPending.length === 0 ? (
              <EmptyState
                title="No pending applications"
                description="All tutor applications have been reviewed."
              />
            ) : null}
            {classesWithPending.map((cls) => {
              const pendingApps = cls.applications.filter((a) => a.status === 'PENDING');
              return (
                <div key={cls.classId} className="mb-16">
                  <div className="class-section-header class-section-header-active">
                    <span>{cls.displayName}</span>
                    <span className="class-section-count">{pendingApps.length}</span>
                  </div>
                  {pendingApps.map((app) => (
                    <div key={app.applicationId} className="application-row">
                      <div className="application-info">
                        <span className="application-name">{app.tutorName}</span>
                        <span className="application-email muted small">{app.tutorEmail}</span>
                        <span className="application-date muted small">{formatDate(app.appliedAt)}</span>
                      </div>
                      <div className="table-actions">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setConfirmApproveId(app.applicationId)}
                          loading={applicationLoadingId === app.applicationId}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => { setConfirmRejectId(app.applicationId); setRejectReason(''); }}
                          disabled={!!applicationLoadingId}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        ) : null}
      </PageSection>

      <Modal
        open={modalMode !== null}
        title={modalTitle}
        size="xl"
        isDirty={classFormDirty}
        onClose={closeModal}
        footer={(requestClose) => (
          <>
            <Button variant="secondary" onClick={requestClose}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleSubmit()} loading={submitting} disabled={!canSubmit}>
              {isEditMode ? 'Save changes' : 'Publish class'}
            </Button>
          </>
        )}
      >
        <div className="publish-setup-grid">
          <div className="stack-16">
            {formError ? <p className="error-text">{formError}</p> : null}

            <SectionBlock title="Subject">
              <select
                className="text-input"
                value={form.subjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                disabled={isEditMode}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </SectionBlock>

            <SectionBlock title="Fee / hour">
              <div className="fee-row">
                <input
                  className="text-input money-number"
                  type="number"
                  step="1"
                  min="1"
                  value={form.pricePerHour}
                  onChange={(e) => setForm((prev) => ({ ...prev, pricePerHour: e.target.value, isPriceManuallyEdited: true }))}
                />
                {!isEditMode && selectedSubject ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="compact-btn"
                    onClick={() => setForm((prev) => ({ ...prev, pricePerHour: String(selectedSubject.defaultPricePerHour), isPriceManuallyEdited: false }))}
                  >
                    Use default
                  </Button>
                ) : null}
              </div>
            </SectionBlock>

            <SectionBlock title="Students">
              {isEditMode ? (
                <>
                  {editingClass && editingClass.students.length > 0 ? (
                    <div className="chip-list mb-8">
                      {editingClass.students.map((s) => (
                        <span key={s.studentId} className="chip">
                          <span className="chip-label">
                            <span className="chip-name">{s.name}</span>
                          </span>
                          <button
                            type="button"
                            className="chip-remove"
                            aria-label={`Remove ${s.name}`}
                            disabled={rosterLoading}
                            onClick={() => void handleRemoveStudentFromClass(s.studentId)}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted mb-8">No students in this class yet.</p>
                  )}
                  <div className="invite-inline-form mb-8">
                    <input
                      type="email"
                      className="text-input"
                      placeholder="Add student by email"
                      value={form.studentEmail}
                      disabled={rosterLoading}
                      onChange={(e) => setForm((prev) => ({ ...prev, studentEmail: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAddStudentToClass(); } }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="compact-btn"
                      disabled={!isLikelyEmail(form.studentEmail) || rosterLoading}
                      onClick={() => void handleAddStudentToClass()}
                    >
                      Add
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="invite-inline-form mb-8">
                    <input
                      type="email"
                      className="text-input"
                      placeholder="Add student by email"
                      value={form.studentEmail}
                      disabled={form.studentAdding}
                      onChange={(e) => setForm((prev) => ({ ...prev, studentEmail: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAddStudent(); } }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="compact-btn"
                      disabled={!isLikelyEmail(form.studentEmail) || form.studentAdding}
                      onClick={() => void handleAddStudent()}
                    >
                      Add
                    </Button>
                  </div>
                  <StudentChipList students={form.students} onRemove={handleRemoveStudent} />
                </>
              )}
            </SectionBlock>

            <details className="adv-details">
              <summary className="adv-summary">
                <span className="adv-chevron" aria-hidden="true">›</span>
                Class name &amp; note
                <span className="adv-hint">optional</span>
              </summary>
              <div className="stack-12 adv-body">
                <input
                  className="text-input"
                  placeholder="Class name"
                  value={form.displayName}
                  onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value, isDisplayNameManuallyEdited: true }))}
                />
                <textarea
                  className="text-input text-area-notes"
                  placeholder="Note for tutors"
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                />
              </div>
            </details>
          </div>

          <aside className="publish-preview-card">
            <p className="pv-cap">Preview</p>
            <p className="pv-name">{previewName}</p>
            {previewSubject ? <p className="pv-sub">{previewSubject}</p> : null}
            <div className="pv-pills">
              {priceNum >= 1 ? <span className="pv-pill">{formatVnd(priceNum)}/hr</span> : null}
              <span className="pv-pill pv-pill-mint">
                {previewStudents.length} student{previewStudents.length === 1 ? '' : 's'}
              </span>
            </div>
            {previewStudents.length > 0 ? (
              <div className="pv-chips">
                {previewStudents.map((s) => (
                  <span key={s.key} className="student-chip-label">
                    {s.label}
                    {s.isNew ? <span className="chip-new">new</span> : null}
                  </span>
                ))}
              </div>
            ) : null}
            {form.note.trim() ? <p className="pv-note">{form.note.trim()}</p> : null}
          </aside>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete class"
        message="Delete this class? This cannot be undone. Classes with logged sessions cannot be deleted."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={() => void handleDeleteConfirmed()}
        onCancel={() => setDeleteTargetId('')}
      />

      <ConfirmDialog
        open={!!confirmApproveId}
        title="Approve application"
        message="Assign this tutor to the class? All other pending applications will be automatically rejected."
        confirmLabel="Approve"
        confirmVariant="success"
        loading={!!applicationLoadingId}
        onConfirm={() => void handleApproveConfirmed()}
        onCancel={() => setConfirmApproveId('')}
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
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        }
        confirmLabel="Reject"
        confirmVariant="danger"
        loading={!!applicationLoadingId}
        onConfirm={() => void handleRejectConfirmed()}
        onCancel={() => { setConfirmRejectId(''); setRejectReason(''); }}
      />
    </PageLayout>
  );
}

export default AdminClassesPage;
