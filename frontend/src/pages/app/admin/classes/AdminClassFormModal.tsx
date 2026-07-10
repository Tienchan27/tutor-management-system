import { Dispatch, SetStateAction } from 'react';
import Button from '../../../../components/ui/Button';
import Modal from '../../../../components/ui/Modal';
import SectionBlock from '../../../../components/ui/SectionBlock';
import { PublishedClassResponse, SubjectOptionResponse } from '../../../../types/classAssignment';
import { ClassFormState } from './classAssignmentUtils';
import ClassFormStudentsSection from './ClassFormStudentsSection';
import ClassPublishPreview from './ClassPublishPreview';

interface AdminClassFormModalProps {
  open: boolean;
  title: string;
  isEditMode: boolean;
  form: ClassFormState;
  setForm: Dispatch<SetStateAction<ClassFormState>>;
  formError: string;
  submitting: boolean;
  rosterLoading: boolean;
  editingClass: PublishedClassResponse | null;
  subjects: SubjectOptionResponse[];
  selectedSubject: SubjectOptionResponse | null;
  canSubmit: boolean;
  classFormDirty: boolean;
  previewName: string;
  previewSubject: string;
  previewStudents: { key: string; label: string; isNew?: boolean }[];
  priceNum: number;
  onClose: () => void;
  onSubmit: () => void;
  onSubjectChange: (subjectId: string) => void;
  onAddStudent: () => void;
  onRemoveStudent: (email: string) => void;
  onAddStudentToClass: () => void;
  onRemoveStudentFromClass: (studentId: string) => void;
}

export default function AdminClassFormModal({
  open,
  title,
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
  onClose,
  onSubmit,
  onSubjectChange,
  onAddStudent,
  onRemoveStudent,
  onAddStudentToClass,
  onRemoveStudentFromClass,
}: AdminClassFormModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      size="xl"
      isDirty={classFormDirty}
      onClose={onClose}
      footer={(requestClose) => (
        <>
          <Button variant="secondary" onClick={requestClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void onSubmit()} loading={submitting} disabled={!canSubmit}>
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
              onChange={(e) => onSubjectChange(e.target.value)}
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
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pricePerHour: e.target.value, isPriceManuallyEdited: true }))
                }
              />
              {!isEditMode && selectedSubject ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="compact-btn"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      pricePerHour: String(selectedSubject.defaultPricePerHour),
                      isPriceManuallyEdited: false,
                    }))
                  }
                >
                  Use default
                </Button>
              ) : null}
            </div>
          </SectionBlock>

          <SectionBlock title="Students">
            <ClassFormStudentsSection
              isEditMode={isEditMode}
              form={form}
              setForm={setForm}
              editingClass={editingClass}
              rosterLoading={rosterLoading}
              onAddStudent={onAddStudent}
              onRemoveStudent={onRemoveStudent}
              onAddStudentToClass={onAddStudentToClass}
              onRemoveStudentFromClass={onRemoveStudentFromClass}
            />
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
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    displayName: e.target.value,
                    isDisplayNameManuallyEdited: true,
                  }))
                }
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

        <ClassPublishPreview
          previewName={previewName}
          previewSubject={previewSubject}
          priceNum={priceNum}
          previewStudents={previewStudents}
          note={form.note}
        />
      </div>
    </Modal>
  );
}
