interface JackpotScoreProps {
  score: number;
  size?: 'sm' | 'md';
}

function PotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
      <ellipse cx="12" cy="18" rx="8" ry="4" fill="#d97706" />
      <ellipse cx="12" cy="16" rx="8" ry="4" fill="#f59e0b" />
      <ellipse cx="12" cy="14" rx="6" ry="3" fill="#fbbf24" />
      <circle cx="10" cy="12" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
      <circle cx="14" cy="11" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
      <circle cx="12" cy="9" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
    </svg>
  );
}

export default function JackpotScore({ score, size = 'md' }: JackpotScoreProps) {
  const isJackpot = score >= 75;
  const color = isJackpot ? 'text-score-green' : score >= 45 ? 'text-score-yellow' : 'text-score-red';
  const bg = isJackpot ? 'bg-score-green/10' : score >= 45 ? 'bg-score-yellow/10' : 'bg-score-red/10';
  const label = isJackpot ? 'Jackpot' : score >= 45 ? 'Solid' : 'Expensive';

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${color} ${bg} ${sizeClasses}`}>
      {isJackpot && <PotIcon />}
      <span className="font-bold">{score}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}

export { PotIcon };
