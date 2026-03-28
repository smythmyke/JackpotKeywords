import type { BudgetFit as BudgetFitType } from '@jackpotkeywords/shared';

const FIT_CONFIG: Record<BudgetFitType, { emoji: string; color: string; label: string }> = {
  great: { emoji: '\uD83D\uDFE2', color: 'text-score-green', label: 'Great' },
  tight: { emoji: '\uD83D\uDFE1', color: 'text-score-yellow', label: 'Tight' },
  over: { emoji: '\uD83D\uDD34', color: 'text-score-red', label: 'Over budget' },
};

interface BudgetFitProps {
  fit: BudgetFitType;
  clicksPerDay: number;
}

export default function BudgetFit({ fit, clicksPerDay }: BudgetFitProps) {
  const config = FIT_CONFIG[fit];

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${config.color}`}>
      <span>{config.emoji}</span>
      <span>~{clicksPerDay}/day</span>
    </span>
  );
}
