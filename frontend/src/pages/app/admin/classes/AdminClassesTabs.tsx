interface AdminClassesTabsProps {
  activeTab: 'classes' | 'applications';
  totalPending: number;
  onTabChange: (tab: 'classes' | 'applications') => void;
}

export default function AdminClassesTabs({ activeTab, totalPending, onTabChange }: AdminClassesTabsProps) {
  return (
    <div className="cm-tabs">
      <button
        type="button"
        className={`cm-tab-btn${activeTab === 'classes' ? ' active' : ''}`}
        onClick={() => onTabChange('classes')}
      >
        Classes
      </button>
      <button
        type="button"
        className={`cm-tab-btn${activeTab === 'applications' ? ' active' : ''}`}
        onClick={() => onTabChange('applications')}
      >
        Applications
        {totalPending > 0 ? <span className="cm-tab-badge">{totalPending}</span> : null}
      </button>
    </div>
  );
}
