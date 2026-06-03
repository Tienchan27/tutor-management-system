import { ReactNode, useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
}

function Tabs({ items, defaultTabId }: TabsProps) {
  const [activeId, setActiveId] = useState<string>(defaultTabId || items[0]?.id || '');

  if (!items.length) {
    return null;
  }

  const active = items.find((item) => item.id === activeId) || items[0];

  return (
    <div className="tabs">
      <div className="tabs-list" role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active.id === item.id}
            className={`tabs-trigger ${active.id === item.id ? 'active' : ''}`}
            onClick={() => setActiveId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="tabs-panel" role="tabpanel">
        {active.panel}
      </div>
    </div>
  );
}

export default Tabs;
