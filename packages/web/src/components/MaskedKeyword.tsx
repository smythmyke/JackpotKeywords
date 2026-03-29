interface MaskedKeywordProps {
  keyword: string;
  paid: boolean;
  onClick?: () => void;
}

export default function MaskedKeyword({ keyword, paid, onClick }: MaskedKeywordProps) {
  if (paid) {
    return <span className="text-white font-medium">{keyword}</span>;
  }

  return (
    <span
      className="keyword-masked text-white font-medium"
      onClick={onClick}
      title="Unlock with Pro or credits"
    >
      {keyword}
    </span>
  );
}
