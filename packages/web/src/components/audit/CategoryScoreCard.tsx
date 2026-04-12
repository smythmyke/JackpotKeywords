import { SEO_AUDIT_CATEGORY_LABELS, type SeoAuditCategory } from '@jackpotkeywords/shared';

interface CategoryScoreCardProps {
  category: SeoAuditCategory;
  score: number;
  passed: number;
  total: number;
  active?: boolean;
  onClick?: () => void;
}

export default function CategoryScoreCard({ category, score, passed, total, active, onClick }: CategoryScoreCardProps) {
  const color = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
  const barColor = {
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
  }[color];
  const ringColor = {
    green: 'ring-green-400/30',
    yellow: 'ring-yellow-400/30',
    red: 'ring-red-400/30',
  }[color];

  return (
    <button
      onClick={onClick}
      className={`bg-gray-900 border rounded-xl p-4 text-left transition hover:border-gray-600 ${
        active ? `border-gray-600 ring-2 ${ringColor}` : 'border-gray-800'
      }`}
    >
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
        {SEO_AUDIT_CATEGORY_LABELS[category]}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-2xl font-bold ${
          color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {score}
        </span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1.5">
        {passed} / {total} checks passed
      </div>
    </button>
  );
}
