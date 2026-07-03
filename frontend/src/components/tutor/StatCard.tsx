import { ReactNode } from 'react';

type StatCardAccent = 'brand';
type TrendDirection = 'up' | 'down' | 'neutral';

interface StatCardTrend {
  value: string;
  direction: TrendDirection;
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: StatCardAccent;
  trend?: StatCardTrend;
}

const TREND_ARROWS: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

function StatCard({ label, value, hint, accent, trend }: StatCardProps) {
  return (
    <div className={`stat-card${accent ? ' stat-card-accent-brand' : ''}`}>
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
      {trend ? (
        <div className={`stat-card-trend stat-card-trend-${trend.direction}`}>
          <span aria-hidden="true">{TREND_ARROWS[trend.direction]}</span>
          <span>{trend.value}</span>
        </div>
      ) : null}
      {hint ? <p className="stat-card-hint mb-0">{hint}</p> : null}
    </div>
  );
}

export default StatCard;
