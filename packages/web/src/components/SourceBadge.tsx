import type { KeywordSource } from '@jackpotkeywords/shared';

const SOURCE_CONFIG: Record<KeywordSource, { label: string; color: string }> = {
  ai: { label: 'AI', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  autocomplete: { label: 'Autocomplete', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  planner_related: { label: 'Related', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

interface SourceBadgeProps {
  source: KeywordSource;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const config = SOURCE_CONFIG[source];

  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${config.color}`}>
      {config.label}
    </span>
  );
}
