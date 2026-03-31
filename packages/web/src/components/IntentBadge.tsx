import type { SearchIntent } from '@jackpotkeywords/shared';
import { INTENT_LABELS } from '@jackpotkeywords/shared';

const INTENT_CONFIG: Record<SearchIntent, { color: string }> = {
  informational: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  transactional: { color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  commercial:    { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  navigational:  { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
};

interface IntentBadgeProps {
  intent: SearchIntent;
}

export default function IntentBadge({ intent }: IntentBadgeProps) {
  const config = INTENT_CONFIG[intent];
  const label = INTENT_LABELS[intent];

  return (
    <span
      className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${config.color}`}
      title={intent.charAt(0).toUpperCase() + intent.slice(1)}
    >
      {label}
    </span>
  );
}
