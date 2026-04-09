import type { KeywordSource } from '@jackpotkeywords/shared';

const SOURCE_CONFIG: Record<KeywordSource, { label: string; color: string }> = {
  ai: { label: 'AI', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  autocomplete: { label: 'Expanded', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  planner_related: { label: 'Related', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  youtube: { label: 'YT', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  amazon: { label: 'AMZ', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  ebay: { label: 'EB', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  bing: { label: 'Bing', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  duckduckgo: { label: 'DDG', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  pinterest: { label: 'Pin', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
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
