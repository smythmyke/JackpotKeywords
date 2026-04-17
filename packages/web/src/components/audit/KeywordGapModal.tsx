import { useEffect } from 'react';
import type { SeoAuditKeywordGap } from '@jackpotkeywords/shared';
import UpgradePrompt from '../UpgradePrompt';

interface KeywordGapModalProps {
  open: boolean;
  onClose: () => void;
  gap: SeoAuditKeywordGap | null;
  domain: string;
  isSignedIn: boolean;
  onSignIn: () => void;
  onKeywordSearch: () => void;
}

export default function KeywordGapModal({
  open,
  onClose,
  gap,
  domain,
  isSignedIn,
  onSignIn,
  onKeywordSearch,
}: KeywordGapModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const isLocked = !gap;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 relative"
        role="dialog"
        aria-modal="true"
      >
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl leading-none"
          aria-label="Close"
          onClick={onClose}
        >
          &times;
        </button>

        {isLocked ? (
          <UpgradePrompt mode="inline" featureName="Keyword Gaps" onDismiss={onClose} />
        ) : isSignedIn ? (
          <>
            <h3 className="text-lg font-bold text-white mb-3">{gap.keyword}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Could these keywords work for your site? Find out with real data:
            </p>
            <ul className="text-sm text-gray-300 space-y-1.5 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-jackpot-400">&#183;</span> Monthly search volume
              </li>
              <li className="flex items-center gap-2">
                <span className="text-jackpot-400">&#183;</span> Cost per click (CPC)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-jackpot-400">&#183;</span> Competition level
              </li>
              <li className="flex items-center gap-2">
                <span className="text-jackpot-400">&#183;</span> Search intent
              </li>
            </ul>
            <button
              onClick={onKeywordSearch}
              className="w-full bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold py-3 rounded-lg transition"
            >
              Run Keyword Search for {domain} &rarr;
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-3">{gap.keyword}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Get real volume, CPC, and competition data for these keywords.
            </p>
            <UpgradePrompt mode="inline" featureName="Keyword Research" onDismiss={onClose} />
          </>
        )}

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-300 mt-3 py-1 transition"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
