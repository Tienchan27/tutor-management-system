import { formatVnd } from '../../../../utils/format';

interface PreviewStudent {
  key: string;
  label: string;
  isNew?: boolean;
}

interface ClassPublishPreviewProps {
  previewName: string;
  previewSubject: string;
  priceNum: number;
  previewStudents: PreviewStudent[];
  note: string;
}

export default function ClassPublishPreview({
  previewName,
  previewSubject,
  priceNum,
  previewStudents,
  note,
}: ClassPublishPreviewProps) {
  return (
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
      {note.trim() ? <p className="pv-note">{note.trim()}</p> : null}
    </aside>
  );
}
