interface JackpotScoreProps {
  score: number;
  size?: 'sm' | 'md';
}

export default function JackpotScore({ score, size = 'md' }: JackpotScoreProps) {
  const color = score >= 75 ? 'text-score-green' : score >= 45 ? 'text-score-yellow' : 'text-score-red';
  const bg = score >= 75 ? 'bg-score-green/10' : score >= 45 ? 'bg-score-yellow/10' : 'bg-score-red/10';
  const label = score >= 75 ? 'Jackpot' : score >= 45 ? 'Solid' : 'Expensive';

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${color} ${bg} ${sizeClasses}`}>
      <span className="font-bold">{score}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}
