import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { extractApiErrorMessage } from '../../services/authService';
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

function AdminClassAssignmentPage() {
  const [subjects, setSubjects] = useState<SubjectOptionResponse[]>([]);
  const [publishedClasses, setPublishedClasses] = useState<PublishedClassResponse[]>([]);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [applicationLoadingId, setApplicationLoadingId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
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
      // Admin queue changes can come from tutor apply/withdraw or admin review actions.
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
        setStudentLookupHint('Existing student found. Name has been auto-filled and is still editable.');
      } else {
        setStudentLookupHint('No student found with this email. You can set the name manually.');
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
      setError('This student email is already in the class list.');
      return;
    }

    setStudents((prev) => [...prev, { email, name }]);
    setStudentDraft({ email: '', name: '' });
    setStudentLookupHint('');
  }

  function handleRemoveStudent(email: string): void {
    setStudents((prev) => prev.filter((student) => normalizeEmail(student.email) !== normalizeEmail(email)));
  }

  function handleUpdateStudentName(email: string, nextName: string): void {
    setStudents((prev) =>
      prev.map((student) =>
        normalizeEmail(student.email) === normalizeEmail(email)
          ? { ...student, name: nextName }
          : student
      )
    );
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

  async function handlePublishClass(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!students.length) {
      setError('Please add at least one student before publishing.');
      return;
    }
    setPublishing(true);
    try {
      await publishClass({
        students,
        subjectId,
        pricePerHour: pricePerHour ? Math.round(Number(pricePerHour)) : null,
        displayName: displayName.trim() || null,
        note: note.trim() || null,
      });
      setStudents([]);
      setStudentDraft({ email: '', name: '' });
      setDisplayName('');
      setIsDisplayNameManuallyEdited(false);
      setLastAutoDisplayName('');
      setNote('');
      setStudentLookupHint('');
      if (selectedSubject) {
        setPricePerHour(selectedSubject.defaultPricePerHour.toString());
      } else {
        setPricePerHour('');
      }
      setIsPriceManuallyEdited(false);
      setSuccess('Class published successfully.');
      await loadAssignmentData();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to publish class'));
    } finally {
      setPublishing(false);
    }
  }

  async function handleApprove(applicationId: string): Promise<void> {
    setApplicationLoadingId(applicationId);
    setError('');
    setSuccess('');
    try {
      await approveClassApplication(applicationId);
      setSuccess('Application approved.');
      await loadAssignmentData();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to approve application'));
    } finally {
      setApplicationLoadingId('');
    }
  }

  async function handleReject(applicationId: string): Promise<void> {
    setApplicationLoadingId(applicationId);
    setError('');
    setSuccess('');
    try {
      await rejectClassApplication(applicationId);
      setSuccess('Application rejected.');
      await loadAssignmentData();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to reject application'));
    } finally {
      setApplicationLoadingId('');
    }
  }

  return (
    <div className="stack-16">
      <div className="card">
        <div className="page-header">
          <div>
            <h2 className="title title-lg">Class Assignment</h2>
            <p className="subtitle">Publish classes and manage tutor application queue.</p>
          </div>
        </div>
        {success ? <p className="success-text">{success}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <div className="card">
        <h3 className="section-title">Publish class for tutor assignment</h3>
        <form onSubmit={handlePublishClass} className="stack-16">
          <div className="grid-form">
            <input
              type="email"
              className="text-input"
              placeholder="Student email"
              value={studentDraft.email}
              onChange={(event) => setStudentDraft((prev) => ({ ...prev, email: event.target.value }))}
              onBlur={handleStudentLookupOnBlur}
            />
            <input
              className="text-input"
              placeholder="Student name"
              value={studentDraft.name}
              onChange={(event) => setStudentDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <button type="button" className="btn btn-soft-teal compact-btn" onClick={handleAddStudent} disabled={studentLookupLoading}>
              {studentLookupLoading ? 'Checking...' : 'Add student'}
            </button>
          </div>
          {studentLookupHint ? <p className="muted">{studentLookupHint}</p> : null}

          {!!students.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student email</th>
                    <th>Student name</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.email}>
                      <td>{student.email}</td>
                      <td>
                        <input
                          className="text-input"
                          value={student.name || ''}
                          onChange={(event) => handleUpdateStudentName(student.email, event.target.value)}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-soft table-action"
                          onClick={() => handleRemoveStudent(student.email)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No students added yet.</p>
          )}

          <div className="grid-form">
            <select className="text-input" value={subjectId} onChange={(event) => handleSubjectChange(event.target.value)} required>
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
              placeholder="Tuition fee"
              value={pricePerHour}
              onChange={(event) => {
                setPricePerHour(event.target.value);
                setIsPriceManuallyEdited(true);
              }}
            />
            <button type="button" className="btn btn-soft compact-btn" onClick={handleResetToSubjectPrice}>
              Use subject default price
            </button>
          </div>

          <div className="grid-form">
            <input
              className="text-input"
              placeholder="Class display name"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setIsDisplayNameManuallyEdited(true);
              }}
            />
            <button
              type="button"
              className="btn btn-soft compact-btn"
              onClick={handleResetDisplayNameToSuggested}
              disabled={!suggestedDisplayName}
            >
              Reset to suggested
            </button>
          </div>
          {suggestedDisplayName && isDisplayNameManuallyEdited ? (
            <p className="muted">Suggested: {suggestedDisplayName}</p>
          ) : null}

          <textarea
            className="text-input"
            style={{ minHeight: 96, resize: 'vertical' }}
            placeholder="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <div className="form-actions">
            <button className="btn btn-primary compact-btn" type="submit" disabled={publishing}>
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="section-title">Tutor applications queue</h3>
        {!publishedClasses.length ? <p className="muted">No available classes for assignment.</p> : null}
        {publishedClasses.map((item) => (
          <div key={item.classId} className="panel" style={{ marginBottom: 12 }}>
            <p><strong>{item.displayName}</strong></p>
            <p className="muted">Students: {item.studentNames.join(' - ') || '-'}</p>
            <p className="muted">Applications: {item.applications.length}</p>
            {item.note ? <p className="muted">Note: {item.note}</p> : null}
            {!!item.applications.length ? (
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
                    {item.applications.map((application) => (
                      <tr key={application.applicationId}>
                        <td>{application.tutorName} ({application.tutorEmail})</td>
                        <td>{application.status}</td>
                        <td>{new Date(application.appliedAt).toLocaleString()}</td>
                        <td>
                          {application.status === 'PENDING' ? (
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn btn-soft-teal table-action"
                                onClick={() => handleApprove(application.applicationId)}
                                disabled={applicationLoadingId === application.applicationId}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-soft table-action"
                                onClick={() => handleReject(application.applicationId)}
                                disabled={applicationLoadingId === application.applicationId}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No tutor applications yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminClassAssignmentPage;
