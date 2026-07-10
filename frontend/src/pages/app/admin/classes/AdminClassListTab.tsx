import { useState } from 'react';
import EmptyState from '../../../../components/ui/EmptyState';
import { PublishedClassResponse } from '../../../../types/classAssignment';
import AdminClassRow from './AdminClassRow';

interface AdminClassListTabProps {
  publishedClasses: PublishedClassResponse[];
  activeClasses: PublishedClassResponse[];
  inactiveClasses: PublishedClassResponse[];
  loadError: string;
  deleteLoading: boolean;
  onEdit: (cls: PublishedClassResponse) => void;
  onDelete: (classId: string) => void;
}

export default function AdminClassListTab({
  publishedClasses,
  activeClasses,
  inactiveClasses,
  loadError,
  deleteLoading,
  onEdit,
  onDelete,
}: AdminClassListTabProps) {
  const [inactiveExpanded, setInactiveExpanded] = useState(false);

  if (!publishedClasses.length && !loadError) {
    return <EmptyState title="No classes yet" description="Publish a class to make it visible to tutors." />;
  }

  if (!publishedClasses.length) {
    return null;
  }

  return (
    <div className="class-list">
      {activeClasses.length > 0 ? (
        <>
          <div className="class-section-header class-section-header-active">
            <span>Active classes</span>
            <span className="class-section-count">{activeClasses.length}</span>
          </div>
          {activeClasses.map((cls) => (
            <AdminClassRow
              key={cls.classId}
              cls={cls}
              deleteLoading={deleteLoading}
              onEdit={onEdit}
              onDelete={onDelete}
            />
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
                <AdminClassRow
                  key={cls.classId}
                  cls={cls}
                  inactive
                  deleteLoading={deleteLoading}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            : null}
        </>
      ) : null}
    </div>
  );
}
