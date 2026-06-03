type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return <span className={`status-pill status-pill-${tone}`}>{label}</span>;
}

export default StatusPill;
