import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/layout/PageSection';
import SectionBlock from '../../components/ui/SectionBlock';
import Button from '../../components/ui/Button';
import StudentChipList from '../../components/admin/StudentChipList';
import StatusPill from '../../components/ui/StatusPill';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/feedback/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatDate, formatVnd } from '../../utils/format';
import { realtimeEventBus } from '../../services/realtimeEventBus';
import {
  approveClassApplication,
  deleteClass,
  listPublishedClasses,
  listSubjects,
  lookupStudentByEmail,
  publishClass,
  rejectClassApplication,
  updateClass,
} from '../../services/classAssignmentService';
import { PublishClassStudentInput, PublishedClassResponse, SubjectOptionResponse } from '../../types/classAssignment';

interface StudentDraft {
  email: string;
  name: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isLikelyEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function defaultNameFromEmail(email: string): string {
  const local = normalizeEmail(email).split('@')[0] || 'student';
  return local ? `${local[0].toUpperCase()}${local.slice(1)}` : 'Student';
}

function buildSuggestedClassName(subjectName: string, studentNames: string[]): string {
  if (!subjectName) return '';
  if (!studentNames.length) return `[${subjectName}] Class`;
  return `[${subjectName}] ${studentNames.join(' - ')}`;
}

function classStatusTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'AVAILABLE') return 'warning';
  return 'neutral';
}

function classStatusLabel(status: string): string {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'AVAILABLE') return 'Awaiting tutor';
  return status;
}

function applicationStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'PENDING') return 'warning';
  return 'neutral';
}

function assignedTutor(cls: PublishedClassResponse): string | null {
  return cls.applications.find((a) => a.status === 'APPROVED')?.tutorName ?? null;
}

interface ClassFormState {
  students: PublishClassStudentInput[];
  studentDraft: StudentDraft;
  studentLookupHint: string;
  studentLookupLoading: boolean;
  subjectId: string;
  pricePerHour: string;
  isPriceManuallyEdited: boolean;
  displayName: string;
  isDisplayNameManuallyEdited: boolean;
  lastAutoDisplayName: string;
  note: string;
}

function emptyForm(subjects: SubjectOptionResponse[]): ClassFormState {
  const firstSubject = subjects[0];
  return {
    students: [],
    studentDraft: { email: '', name: '' },
    studentLookupHint: '',
    studentLookupLoading: false,
    subjectId: firstSubject?.id ?? '',
    pricePerHour: firstSubject ? String(firstSubject.defaultPricePerHour) : '',
    isPriceManuallyEdited: false,
    displayName: '',
    isDisplayNameManuallyEdited: false,
    lastAutoDisplayName: '',
    note: '',
  };
}

function AdminClassAssignmentPage() {
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<SubjectOptionResponse[]>([]);
  const [publishedClasses, setPublishedClasses] = useState<PublishedClassResponse[]>([]);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');

  const [activeTab, setActiveTab] = useState<'classes' | 'applications'>('classes');
  const [inactiveExpanded, setInactiveExpanded] = useState(false);

  const [modalMode, setModalMode] = useState<'new' | 'edit' | null>(null);
  const [editingClassId, setEditingClassId] = useState<string>('');
  const [form, setForm] = useState<ClassFormState>(emptyForm([]));
  const [submitting, setSubmitting] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [applicationLoadingId, setApplicationLoadingId] = useState('');
  const [confirmApproveId, setConfirmApproveId] = useState('');
  const [confirmRejectId, setConfirmRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

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
    setForm((prev) => ({ ...prev, displayName: suggestedDisplayName, lastAutoDisplayName: suggestedDisplayName }));
  }, [suggestedDisplayName, form.isDisplayNameManuallyEdited]);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const [subjectList, publishedResponse] = await Promise.all([listSubjects(), listPublishedClasses()]);
      setSubjects(subjectList);
      setPublishedClasses(publishedResponse.items);
    } catch (err: unknown) {
      setLoadError(extractApiErrorMessage(err, 'Failed to load class data'));
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = realtimeEventBus.subscribe('DASHBOARD_INVALIDATE', (event) => {
      if (event.scope?.startsWith('role:ADMIN')) {
        window.setTimeout(() => loadData(), 250);
      }
    });
    return () => unsub();
  }, [loadData]);

  function openNewModal(): void {
    setFormError('');
    setForm(emptyForm(subjects));
    setEditingClassId('');
    setModalMode('new');
  }

  function openEditModal(cls: PublishedClassResponse): void {
    setFormError('');
    const subject = subjects.find((s) => s.name === cls.subjectName);
    setForm({
      students: [],
      studentDraft: { email: '', name: '' },
      studentLookupHint: '',
      studentLookupLoading: false,
      subjectId: subject?.id ?? subjects[0]?.id ?? '',
      pricePerHour: String(cls.pricePerHour),
      isPriceManuallyEdited: true,
      displayName: cls.displayName,
      isDisplayNameManuallyEdited: true,
      lastAutoDisplayName: '',
      note: cls.note ?? '',
    });
    setEditingClassId(cls.classId);
    setModalMode('edit');
  }

  function closeModal(): void {
    setModalMode(null);
    setEditingClassId('');
    setFormError('');
  }

  async function handleStudentLookup(): Promise<void> {
    setForm((prev) => ({ ...prev, studentLookupHint: '' }));
    const normalized = normalizeEmail(form.studentDraft.email);
    if (!isLikelyEmail(normalized)) return;
    setForm((prev) => ({ ...prev, studentLookupLoading: true }));
    try {
      const result = await lookupStudentByEmail(normalized);
      setForm((prev) => {
        if (normalizeEmail(prev.studentDraft.email) !== normalized) return prev;
        return {
          ...prev,
          studentDraft: { email: result.email, name: result.name || prev.studentDraft.name || defaultNameFromEmail(result.email) },
          studentLookupHint: result.exists ? 'Student found — name filled in automatically.' : 'New student — enter a display name below.',
          studentLookupLoading: false,
        };
      });
    } catch {
      setForm((prev) => ({ ...prev, studentLookupLoading: false }));
    }
  }

  function handleAddStudent(): void {
    setFormError('');
    const email = normalizeEmail(form.studentDraft.email);
    const name = form.studentDraft.name.trim() || defaultNameFromEmail(email);
    if (!isLikelyEmail(email)) { setFormError('Please enter a valid student email before adding.'); return; }
    if (form.students.some((s) => normalizeEmail(s.email) === email)) { setFormError('This student is already in the list.'); return; }
    setForm((prev) => ({
      ...prev,
      students: [...prev.students, { email, name }],
      studentDraft: { email: '', name: '' },
      studentLookupHint: '',
    }));
  }

  function handleEmailKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') { e.preventDefault(); handleAddStudent(); }
  }

  function handleRemoveStudent(email: string): void {
    setForm((prev) => ({ ...prev, students: prev.students.filter((s) => normalizeEmail(s.email) !== normalizeEmail(email)) }));
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
          students: form.students,
          subjectId: form.subjectId,
          pricePerHour: Math.round(price),
          displayName: form.displayName.trim() || null,
          note: form.note.trim() || null,
        });
        closeModal();
        showToast('Class published successfully.', 'success');
        await loadData();
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
        await loadData();
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
      await loadData();
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
      await loadData();
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
      await loadData();
    } catch (err: unknown) {
      showToast(extractApiErrorMessage(err, 'Failed to reject application'), 'error');
    } finally {
      setApplicationLoadingId('');
    }
  }

  const isEditMode = modalMode === 'edit';
  const modalTitle = isEditMode ? 'Edit class' : 'New class';

  const activeClasses = publishedClasses.filter((c) => c.status === 'ACTIVE');
  const inactiveClasses = publishedClasses.filter((c) => c.status !== 'ACTIVE');
  const classesWithPending = publishedClasses.filter((c) =>
    c.applications.some((a) => a.status === 'PENDING')
  );
  const totalPending = classesWithPending.reduce(
    (sum, c) => sum + c.applications.filter((a) => a.status === 'PENDING').length,
    0
  );

  return (
    <div className="stack-16">
      <PageHeader
        title="Class management"
        subtitle="Manage classes and review tutor applications."
        actions={
          <Button variant="primary" onClick={openNewModal}>
            + New class
          </Button>
        }
      />

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
                          {cls.studentNames.length > 0 ? (
                            <div className="ac-card-students mt-6">
                              {cls.studentNames.map((name) => (
                                <span key={name} className="student-chip-label">{name}</span>
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
                              {cls.studentNames.length > 0 ? (
                                <div className="ac-card-students mt-6">
                                  {cls.studentNames.map((name) => (
                                    <span key={name} className="student-chip-label">{name}</span>
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

      <Modal open={modalMode !== null} title={modalTitle} onClose={closeModal}>
        <div className="stack-16">
          {formError ? <p className="error-text">{formError}</p> : null}

          {!isEditMode ? (
            <SectionBlock title="Students">
              <div className="grid-form grid-form-no-margin">
                <input
                  type="email"
                  className="text-input"
                  placeholder="Student email — press Enter to add"
                  value={form.studentDraft.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentDraft: { ...prev.studentDraft, email: e.target.value } }))}
                  onBlur={() => void handleStudentLookup()}
                  onKeyDown={handleEmailKeyDown}
                />
                <input
                  className="text-input"
                  placeholder="Student name"
                  value={form.studentDraft.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentDraft: { ...prev.studentDraft, name: e.target.value } }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStudent(); } }}
                />
                <Button type="button" variant="secondary" className="compact-btn" onClick={handleAddStudent} disabled={form.studentLookupLoading}>
                  {form.studentLookupLoading ? 'Checking...' : 'Add'}
                </Button>
              </div>
              {form.studentLookupHint ? <p className="muted mb-0">{form.studentLookupHint}</p> : null}
              <StudentChipList students={form.students} onRemove={handleRemoveStudent} />
            </SectionBlock>
          ) : null}

          <SectionBlock title="Subject and pricing">
            <div className="grid-form grid-form-no-margin">
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
              <input
                className="text-input money-number"
                type="number"
                step="1"
                min="1"
                placeholder="Tuition fee (₫/hr)"
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

          <SectionBlock title="Class details">
            <input
              className="text-input"
              placeholder="Class display name"
              value={form.displayName}
              onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value, isDisplayNameManuallyEdited: true }))}
            />
            {suggestedDisplayName && form.isDisplayNameManuallyEdited && !isEditMode ? (
              <p className="muted mb-4">Suggested: {suggestedDisplayName}</p>
            ) : null}
            <textarea
              className="text-input text-area-notes"
              placeholder="Note for tutors (optional)"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </SectionBlock>

          <div className="form-actions">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleSubmit()} loading={submitting}>
              {isEditMode ? 'Save changes' : 'Publish class'}
            </Button>
          </div>
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
        confirmVariant="primary"
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
    </div>
  );
}

export default AdminClassAssignmentPage;
