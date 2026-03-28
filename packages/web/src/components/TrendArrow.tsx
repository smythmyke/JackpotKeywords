import type { TrendDirection } from '@jackpotkeywords/shared';

const TREND_CONFIG: Record<TrendDirection, { arrow: string; color: string; label: string }> = {
  rising: { arrow: '\u2191', color: 'text-score-green', label: 'Rising strongly' },
  rising_slight: { arrow: '\u2197', color: 'text-score-green/70', label: 'Trending up' },
  stable: { arrow: '\u2192', color: 'text-gray-400', label: 'Stable' },
  declining_slight: { arrow: '\u2198', color: 'text-score-yellow', label: 'Slight decline' },
  declining: { arrow: '\u2193', color: 'text-score-red', label: 'Declining' },
};

interface TrendArrowProps {
  direction: TrendDirection;
  info?: string;
}

export default function TrendArrow({ direction, info }: TrendArrowProps) {
  const config = TREND_CONFIG[direction];

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`} title={info || config.label}>
      <span className="text-lg leading-none">{config.arrow}</span>
      {info && <span className="text-xs opacity-70">{info}</span>}
    </span>
  );
}
