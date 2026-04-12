import type { SeoAuditCheckItem } from '@jackpotkeywords/shared';

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  pass: { icon: '\u2713', color: 'text-green-400' },
  warning: { icon: '!', color: 'text-yellow-400' },
  fail: { icon: '\u2717', color: 'text-red-400' },
  info: { icon: 'i', color: 'text-blue-400' },
};

interface CheckItemProps {
  check: SeoAuditCheckItem;
  paid: boolean;
}

export default function CheckItem({ check, paid }: CheckItemProps) {
  const status = STATUS_ICONS[check.status] || STATUS_ICONS.info;
  const isLocked = !paid && check.recommendation?.startsWith('\u2022\u2022\u2022');

  return (
    <div className="flex gap-3 py-3 border-b border-gray-800/50 last:border-0">
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        check.status === 'pass' ? 'bg-green-400/10' :
        check.status === 'warning' ? 'bg-yellow-400/10' :
        check.status === 'fail' ? 'bg-red-400/10' :
        'bg-blue-400/10'
      } ${status.color}`}>
        {status.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{check.label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            check.priority === 'high' ? 'bg-red-400/10 text-red-400' :
            check.priority === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
            'bg-gray-800 text-gray-500'
          }`}>
            {check.priority}
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-0.5">{check.details}</p>
        {check.recommendation && (
          <p className={`text-sm mt-1.5 ${isLocked ? 'text-gray-600 blur-sm select-none' : 'text-jackpot-400'}`}>
            {isLocked ? 'Upgrade to see specific recommendation for this issue' : check.recommendation}
          </p>
        )}
      </div>
    </div>
  );
}
