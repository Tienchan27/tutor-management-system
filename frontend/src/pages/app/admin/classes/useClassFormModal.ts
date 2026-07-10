import { useEffect, useMemo, useState } from 'react';
import { extractApiErrorMessage } from '../../../../services/authService';
import {
  addClassStudent,
  lookupStudentByEmail,
  publishClass,
  removeClassStudent,
  updateClass,
} from '../../../../services/classAssignmentService';
import { PublishedClassResponse, SubjectOptionResponse } from '../../../../types/classAssignment';
import { useToast } from '../../../../components/feedback/ToastProvider';
import {
  buildSuggestedClassName,
  ClassEditSnapshot,
  ClassFormState,
  defaultNameFromEmail,
  emptyForm,
  isClassFormDirty,
  isLikelyEmail,
  normalizeEmail,
} from './classAssignmentUtils';

export function useClassFormModal(
  subjects: SubjectOptionResponse[],
  publishedClasses: PublishedClassResponse[],
  refreshClasses: () => Promise<void>
) {
  const { showToast } = useToast();
  const [modalMode, setModalMode] = useState<'new' | 'edit' | null>(null);
  const [editingClassId, setEditingClassId] = useState('');
  const [editSnapshot, setEditSnapshot] = useState<ClassEditSnapshot | null>(null);
  const [form, setForm] = useState<ClassFormState>(emptyForm([]));
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);

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

  const editingClass = isEditMode
    ? publishedClasses.find((c) => c.classId === editingClassId) ?? null
    : null;

  const priceNum = Number(form.pricePerHour);
  const previewName =
    form.displayName.trim() ||
    suggestedDisplayName ||
    (isEditMode ? editingClass?.displayName ?? 'Class' : 'New class');
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
    if (!isLikelyEmail(email)) {
      setFormError('Please enter a valid student email.');
      return;
    }
    if (form.students.some((s) => normalizeEmail(s.email) === email)) {
      setFormError('This student is already in the list.');
      return;
    }
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
    setForm((prev) => ({
      ...prev,
      students: prev.students.filter((s) => normalizeEmail(s.email) !== normalizeEmail(email)),
    }));
  }

  async function handleAddStudentToClass(): Promise<void> {
    setFormError('');
    const email = normalizeEmail(form.studentEmail);
    if (!isLikelyEmail(email)) {
      setFormError('Please enter a valid student email.');
      return;
    }
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
    if (!form.subjectId) {
      setFormError('Please select a subject.');
      return;
    }
    if (!form.pricePerHour || isNaN(price) || price < 1) {
      setFormError('Please enter a valid tuition fee.');
      return;
    }

    if (modalMode === 'new') {
      if (!form.students.length) {
        setFormError('Please add at least one student.');
        return;
      }
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

  return {
    modalMode,
    modalTitle: isEditMode ? 'Edit class' : 'New class',
    isEditMode,
    form,
    setForm,
    formError,
    submitting,
    rosterLoading,
    editingClass,
    subjects,
    selectedSubject,
    canSubmit,
    classFormDirty,
    previewName,
    previewSubject,
    previewStudents,
    priceNum,
    openNewModal,
    openEditModal,
    closeModal,
    handleAddStudent,
    handleRemoveStudent,
    handleAddStudentToClass,
    handleRemoveStudentFromClass,
    handleSubjectChange,
    handleSubmit,
  };
}
