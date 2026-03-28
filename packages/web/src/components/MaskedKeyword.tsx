interface MaskedKeywordProps {
  keyword: string;
  paid: boolean;
  onClick?: () => void;
}

function maskKeyword(keyword: string): string {
  return keyword
    .split(' ')
    .map((word) => word[0] + '*'.repeat(word.length - 1))
    .join(' ');
}

export default function MaskedKeyword({ keyword, paid, onClick }: MaskedKeywordProps) {
  if (paid) {
    return <span className="text-white font-medium">{keyword}</span>;
  }

  return (
    <span
      className="text-gray-400 font-mono cursor-pointer hover:text-gray-300 transition"
      onClick={onClick}
      title="Unlock with Pro or credits"
    >
      {maskKeyword(keyword)}
    </span>
  );
}
