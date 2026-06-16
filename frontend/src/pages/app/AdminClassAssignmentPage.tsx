import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import PageSection from '../../components/layout/PageSection';
import SectionBlock from '../../components/ui/SectionBlock';
import Button from '../../components/ui/Button';
import Stepper from '../../components/ui/Stepper';
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
  listPublishedClasses,
  listSubjects,
  lookupStudentByEmail,
  publishClass,
  rejectClassApplication,
} from '../../services/classAssignmentService';
import { PublishClassStudentInput, PublishedClassResponse, SubjectOptionResponse } from '../../types/classAssignment';

interface PublishStudentDraft {
  email: string;
  name: string;
}

const PUBLISH_STEPS = [
  { id: 'students', label: 'Students' },
  { id: 'setup', label: 'Class setup' },
  { id: 'review', label: 'Review' },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isLikelyEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function defaultNameFromEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const localPart = normalized.split('@')[0] || 'student';
  const safeLocal = localPart.trim();
  if (!safeLocal) {
    return 'Student';
  }
  return `${safeLocal[0].toUpperCase()}${safeLocal.slice(1)}`;
}

function buildSuggestedClassName(subjectName: string, studentNames: string[]): string {
  if (!subjectName) {
    return '';
  }
  if (!studentNames.length) {
    return `[${subjectName}] Class`;
  }
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

function AdminClassAssignmentPage() {
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<SubjectOptionResponse[]>([]);
  const [publishedClasses, setPublishedClasses] = useState<PublishedClassResponse[]>([]);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [applicationLoadingId, setApplicationLoadingId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [publishStep, setPublishStep] = useState<string>('students');
  const [studentDraft, setStudentDraft] = useState<PublishStudentDraft>({ email: '', name: '' });
  const [students, setStudents] = useState<PublishClassStudentInput[]>([]);
  const [studentLookupHint, setStudentLookupHint] = useState<string>('');
  const [studentLookupLoading, setStudentLookupLoading] = useState<boolean>(false);
  const [subjectId, setSubjectId] = useState<string>('');
  const [pricePerHour, setPricePerHour] = useState<string>('');
  const [isPriceManuallyEdited, setIsPriceManuallyEdited] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [isDisplayNameManuallyEdited, setIsDisplayNameManuallyEdited] = useState<boolean>(false);
  const [lastAutoDisplayName, setLastAutoDisplayName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [publishedClassName, setPublishedClassName] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Confirm dialogs
  const [confirmApproveId, setConfirmApproveId] = useState<string>('');
  const [confirmRejectId, setConfirmRejectId] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId) || null,
    [subjects, subjectId]
  );
  const suggestedDisplayName = useMemo(
    () => buildSuggestedClassName(selectedSubject?.name || '', students.map((student) => student.name || 'Student')),
    [selectedSubject, students]
  );

  useEffect(() => {
    if (!suggestedDisplayName) {
      return;
    }
    const current = displayName;
    const shouldAutofill =
      !isDisplayNameManuallyEdited || current.trim() === '' || current === lastAutoDisplayName;
    if (!shouldAutofill) {
      return;
    }
    setDisplayName(suggestedDisplayName);
    setLastAutoDisplayName(suggestedDisplayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedDisplayName]);

  function handleResetDisplayNameToSuggested(): void {
    setDisplayName(suggestedDisplayName);
    setLastAutoDisplayName(suggestedDisplayName);
    setIsDisplayNameManuallyEdited(false);
  }

  const loadAssignmentData = useCallback(async (): Promise<void> => {
    try {
      const [subjectResponse, publishedResponse] = await Promise.all([listSubjects(), listPublishedClasses()]);
      setSubjects(subjectResponse);
      setPublishedClasses(publishedResponse.items);
      if (subjectResponse.length > 0) {
        const nextSubjectId = subjectId || subjectResponse[0].id;
        setSubjectId(nextSubjectId);
        if (!isPriceManuallyEdited) {
          const nextSubject = subjectResponse.find((subject) => subject.id === nextSubjectId) || subjectResponse[0];
          setPricePerHour(nextSubject.defaultPricePerHour.toString());
        }
      }
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load class assignment data'));
    }
  }, [subjectId, isPriceManuallyEdited]);

  useEffect(() => {
    loadAssignmentData();

    const unsubscribe = realtimeEventBus.subscribe('DASHBOARD_INVALIDATE', (event) => {
      if (event.scope?.startsWith('role:ADMIN')) {
        window.setTimeout(() => {
          loadAssignmentData();
        }, 250);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadAssignmentData]);

  async function handleStudentLookupOnBlur(): Promise<void> {
    setStudentLookupHint('');
    const normalized = normalizeEmail(studentDraft.email);
    if (!isLikelyEmail(normalized)) {
      return;
    }
    setStudentLookupLoading(true);
    try {
      const response = await lookupStudentByEmail(normalized);
      setStudentDraft((prev) => {
        if (normalizeEmail(prev.email) !== normalized) {
          return prev;
        }
        return {
          email: response.email,
          name: response.name || prev.name || defaultNameFromEmail(response.email),
        };
      });
      if (response.exists) {
        setStudentLookupHint('Student found — name filled in automatically.');
      } else {
        setStudentLookupHint('New student — enter a display name below.');
      }
    } catch {
      setStudentLookupHint('');
    } finally {
      setStudentLookupLoading(false);
    }
  }

  function handleAddStudent(): void {
    setError('');
    const email = normalizeEmail(studentDraft.email);
    const name = studentDraft.name.trim() || defaultNameFromEmail(email);

    if (!isLikelyEmail(email)) {
      setError('Please enter a valid student email before adding.');
      return;
    }
    if (students.some((student) => normalizeEmail(student.email) === email)) {
      setError('This student is already in the class list.');
      return;
    }

    setStudents((prev) => [...prev, { email, name }]);
    setStudentDraft({ email: '', name: '' });
    setStudentLookupHint('');
  }

  function handleEmailKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddStudent();
    }
  }

  function handleRemoveStudent(email: string): void {
    setStudents((prev) => prev.filter((student) => normalizeEmail(student.email) !== normalizeEmail(email)));
  }

  function handleSubjectChange(nextSubjectId: string): void {
    setSubjectId(nextSubjectId);
    if (!isPriceManuallyEdited) {
      const subject = subjects.find((item) => item.id === nextSubjectId);
      if (subject) {
        setPricePerHour(subject.defaultPricePerHour.toString());
      }
    }
  }

  function handleResetToSubjectPrice(): void {
    if (!selectedSubject) {
      return;
    }
    setPricePerHour(selectedSubject.defaultPricePerHour.toString());
    setIsPriceManuallyEdited(false);
  }

  function goToNextStep(): void {
    setError('');
    if (publishStep === 'students') {
      if (!students.length) {
        setError('Please add at least one student before continuing.');
        return;
      }
      setPublishStep('setup');
      return;
    }
    if (publishStep === 'setup') {
      if (!subjectId) {
        setError('Please select a subject.');
        return;
      }
      const price = Number(pricePerHour);
      if (!pricePerHour || isNaN(price) || price < 1) {
        setError('Please enter a valid tuition fee (minimum 1).');
        return;
      }
      setPublishStep('review');
    }
  }

  function goToPreviousStep(): void {
    setError('');
    if (publishStep === 'setup') {
      setPublishStep('students');
      return;
    }
    if (publishStep === 'review') {
      setPublishStep('setup');
    }
  }

  async function handlePublishClass(): Promise<void> {
    setError('');
    if (!students.length) {
      setError('Please add at least one student before publishing.');
      return;
    }
    setPublishing(true);
    try {
      const finalName = displayName.trim() || suggestedDisplayName;
      await publishClass({
        students,
        subjectId,
        pricePerHour: pricePerHour ? Math.round(Number(pricePerHour)) : null,
        displayName: displayName.trim() || null,
        note: note.trim() || null,
      });
      setPublishedClassName(finalName);
      setStudents([]);
      setStudentDraft({ email: '', name: '' });
      setDisplayName('');
      setIsDisplayNameManuallyEdited(false);
      setLastAutoDisplayName('');
      setNote('');
      setStudentLookupHint('');
      setPublishStep('students');
      if (selectedSubject) {
        setPricePerHour(selectedSubject.defaultPricePerHour.toString());
      } else {
        setPricePerHour('');
      }
      setIsPriceManuallyEdited(false);
      setShowSuccessModal(true);
      await loadAssignmentData();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to publish class'));
    } finally {
      setPublishing(false);
    }
  }

  async function handleApproveConfirmed(): Promise<void> {
    const id = confirmApproveId;
    setConfirmApproveId('');
    setApplicationLoadingId(id);
    try {
      await approveClassApplication(id);
      showToast('Tutor assigned. Other pending applications were rejected.', 'success');
      await loadAssignmentData();
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
      showToast('Application rejected', 'success');
      await loadAssignmentData();
    } catch (err: unknown) {
      showToast(extractApiErrorMessage(err, 'Failed to reject application'), 'error');
    } finally {
      setApplicationLoadingId('');
    }
  }

  const previewCard = (
    <div className="card publish-preview-card">
      <h4 className="section-title mb-8">Preview</h4>
      <p className="muted mb-8">
        <strong>Class:</strong> {displayName.trim() || suggestedDisplayName || '—'}
      </p>
      <p className="muted mb-8">
        <strong>Subject:</strong> {selectedSubject?.name || '—'}
      </p>
      <p className="muted mb-8">
        <strong>Rate:</strong> {pricePerHour ? `${formatVnd(Number(pricePerHour))}/hr` : '—'}
      </p>
      <p className="muted mb-8">
        <strong>Students:</strong> {students.length}
      </p>
      {note.trim() ? (
        <p className="muted mb-0">
          <strong>Note:</strong> {note.trim()}
        </p>
      ) : null}
    </div>
  );

  const publishForm = (
    <PageSection title="Publish new class">
      {error ? <p className="error-text">{error}</p> : null}
      <Stepper steps={PUBLISH_STEPS} activeStepId={publishStep} />
      <div className="stack-16">
        {publishStep === 'students' ? (
          <SectionBlock title="Add students">
            <div className="grid-form grid-form-no-margin">
              <input
                type="email"
                className="text-input"
                placeholder="Student email"
                value={studentDraft.email}
                onChange={(event) => setStudentDraft((prev) => ({ ...prev, email: event.target.value }))}
                onBlur={() => void handleStudentLookupOnBlur()}
                onKeyDown={handleEmailKeyDown}
              />
              <input
                className="text-input"
                placeholder="Student name"
                value={studentDraft.name}
                onChange={(event) => setStudentDraft((prev) => ({ ...prev, name: event.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStudent(); } }}
              />
              <Button type="button" variant="secondary" className="compact-btn" onClick={handleAddStudent} disabled={studentLookupLoading}>
                {studentLookupLoading ? 'Checking...' : 'Add student'}
              </Button>
            </div>
            {studentLookupHint ? <p className="muted mb-0">{studentLookupHint}</p> : null}
            <StudentChipList students={students} onRemove={handleRemoveStudent} />
          </SectionBlock>
        ) : null}

        {publishStep === 'setup' ? (
          <div className="publish-setup-grid">
            <div className="stack-16">
              <SectionBlock title="Subject and pricing">
                <div className="grid-form grid-form-no-margin">
                  <select className="text-input" value={subjectId} onChange={(event) => handleSubjectChange(event.target.value)}>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="text-input money-number"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Tuition fee"
                    value={pricePerHour}
                    onChange={(event) => {
                      setPricePerHour(event.target.value);
                      setIsPriceManuallyEdited(true);
                    }}
                  />
                  <Button type="button" variant="ghost" className="compact-btn" onClick={handleResetToSubjectPrice}>
                    Use subject default price
                  </Button>
                </div>
              </SectionBlock>
              <SectionBlock title="Class details">
                <div className="grid-form grid-form-no-margin">
                  <input
                    className="text-input"
                    placeholder="Class display name"
                    value={displayName}
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      setIsDisplayNameManuallyEdited(true);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="compact-btn"
                    onClick={handleResetDisplayNameToSuggested}
                    disabled={!suggestedDisplayName}
                  >
                    Reset to suggested
                  </Button>
                </div>
                {suggestedDisplayName && isDisplayNameManuallyEdited ? (
                  <p className="muted mb-0">Suggested: {suggestedDisplayName}</p>
                ) : null}
                <textarea
                  className="text-input text-area-notes"
                  placeholder="Note (optional)"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </SectionBlock>
            </div>
            {previewCard}
          </div>
        ) : null}

        {publishStep === 'review' ? (
          <SectionBlock title="Review and publish">
            <StudentChipList students={students} onRemove={handleRemoveStudent} />
            <div className="card-divider" />
            <p className="muted mb-8">
              <strong>Display name:</strong> {displayName.trim() || suggestedDisplayName}
            </p>
            <p className="muted mb-8">
              <strong>Subject:</strong> {selectedSubject?.name}
            </p>
            <p className="muted mb-8">
              <strong>Rate:</strong> {formatVnd(Number(pricePerHour || 0))}/hr
            </p>
            {note.trim() ? (
              <p className="muted mb-0">
                <strong>Note:</strong> {note.trim()}
              </p>
            ) : null}
          </SectionBlock>
        ) : null}

        <div className="form-actions">
          {publishStep !== 'students' ? (
            <Button type="button" variant="secondary" onClick={goToPreviousStep}>
              Back
            </Button>
          ) : null}
          {publishStep !== 'review' ? (
            <Button type="button" onClick={goToNextStep}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={() => void handlePublishClass()} loading={publishing}>
              Publish class
            </Button>
          )}
        </div>
      </div>
    </PageSection>
  );

  const publishedPanel = (
    <PageSection title="Published classes">
      {!publishedClasses.length ? (
        <EmptyState title="No published classes" description="Publish a class to make it visible to tutors." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Class</th>
                <th scope="col">Status</th>
                <th scope="col">Students</th>
                <th scope="col">Applications</th>
                <th scope="col">Rate</th>
              </tr>
            </thead>
            <tbody>
              {publishedClasses.map((item) => {
                const pendingCount = item.applications.filter((a) => a.status === 'PENDING').length;
                return (
                  <tr key={item.classId}>
                    <td>{item.displayName}</td>
                    <td>
                      <StatusPill label={classStatusLabel(item.status)} tone={classStatusTone(item.status)} />
                    </td>
                    <td>{item.studentNames.join(', ') || '—'}</td>
                    <td>
                      {pendingCount > 0 ? (
                        <StatusPill label={`${pendingCount} pending`} tone="warning" />
                      ) : (
                        <span className="muted">{item.applications.length > 0 ? 'Reviewed' : '—'}</span>
                      )}
                    </td>
                    <td>{formatVnd(item.pricePerHour || 0)}/hr</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageSection>
  );

  const classesWithPending = publishedClasses.filter(
    (c) => c.status === 'AVAILABLE' && c.applications.some((a) => a.status === 'PENDING')
  );

  const applicationsPanel = (
    <PageSection title="Tutor applications">
      {!classesWithPending.length ? (
        <EmptyState title="No pending applications" description="Pending tutor applications will appear here." />
      ) : null}
      {classesWithPending.map((item) => {
        const pendingApps = item.applications.filter((a) => a.status === 'PENDING');
        return (
          <SectionBlock key={item.classId} title={item.displayName}>
            <div className="section-header">
              <p className="muted mb-0">Students: {item.studentNames.join(' - ') || '—'}</p>
              <StatusPill label={`${pendingApps.length} pending`} tone="warning" />
            </div>
            {item.note ? <p className="muted">{item.note}</p> : null}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tutor</th>
                    <th>Status</th>
                    <th>Applied At</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApps.map((application) => (
                    <tr key={application.applicationId}>
                      <td>
                        {application.tutorName} ({application.tutorEmail})
                      </td>
                      <td>
                        <StatusPill
                          label={application.status}
                          tone={applicationStatusTone(application.status)}
                        />
                      </td>
                      <td>{formatDate(application.appliedAt)}</td>
                      <td>
                        <div className="table-actions">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setConfirmApproveId(application.applicationId)}
                            loading={applicationLoadingId === application.applicationId}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => { setConfirmRejectId(application.applicationId); setRejectReason(''); }}
                            disabled={!!applicationLoadingId}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionBlock>
        );
      })}
    </PageSection>
  );

  return (
    <div className="stack-16">
      <PageHeader title="Class assignment" subtitle="Publish classes and review tutor applications." />
      <Tabs
        items={[
          { id: 'publish', label: 'Publish', panel: publishForm },
          { id: 'published', label: 'Published', panel: publishedPanel },
          { id: 'applications', label: 'Applications', panel: applicationsPanel },
        ]}
      />

      <Modal
        open={showSuccessModal}
        title="Class published"
        onClose={() => setShowSuccessModal(false)}
      >
        <div className="stack-16">
          <p className="muted">
            <strong>{publishedClassName || 'The class'}</strong> has been published and is now visible to tutors.
            Tutors can apply and you can review their applications in the Applications tab.
          </p>
          <div className="form-actions">
            <Button variant="primary" onClick={() => setShowSuccessModal(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmApproveId}
        title="Approve application"
        message="Assign this tutor to the class? All other pending applications for this class will be automatically rejected."
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
