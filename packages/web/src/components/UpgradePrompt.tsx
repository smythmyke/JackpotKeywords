import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import { trackEvent } from '../lib/analytics';

interface UpgradePromptProps {
  /** Layout mode */
  mode: 'inline' | 'overlay' | 'modal' | 'bar';
  /** "Unlock all 847 keywords" */
  keywordCount?: number;
  /** "+15 more checks found" */
  checkCount?: number;
  /** "AEO Scan", "Export CSV" */
  featureName?: string;
  /** Fired before Stripe redirect */
  onPurchaseStart?: () => void;
  /** Extra dismiss handler (for modals) */
  onDismiss?: () => void;
  /** Override the path Stripe returns to. Defaults to current location. */
  returnPath?: string;
  className?: string;
}

type PurchaseType = 'single' | 'three_pack' | 'pro';

export default function UpgradePrompt({
  mode,
  keywordCount,
  checkCount,
  featureName,
  onPurchaseStart,
  onDismiss,
  returnPath: returnPathProp,
  className = '',
}: UpgradePromptProps) {
  const { user, signInWithGoogle, getToken, refreshCredits } = useAuthContext();
  const { buyCreditPack, subscribe } = useCredits({ getToken, refreshCredits });
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<PurchaseType | null>(null);

  const returnPath = returnPathProp || location.pathname;

  // After sign-in completes, auto-trigger the pending purchase
  useEffect(() => {
    if (user && pendingPurchase) {
      executePurchase(pendingPurchase);
      setPendingPurchase(null);
    }
  }, [user, pendingPurchase]);

  async function executePurchase(type: PurchaseType) {
    setLoading(true);
    onPurchaseStart?.();
    trackEvent('upgrade_clicked', { source: `upgrade_prompt_${mode}`, type });
    try {
      if (type === 'pro') {
        await subscribe('pro' as any, returnPath);
      } else {
        await buyCreditPack(type as any, returnPath);
      }
      // window.location.href redirect happens inside subscribe/buyCreditPack
    } catch (err) {
      setLoading(false);
    }
  }

  function handlePurchase(type: PurchaseType) {
    trackEvent('paywall_viewed', { source: `upgrade_prompt_${mode}`, type });
    if (!user) {
      setPendingPurchase(type);
      trackEvent('signin_prompted', { trigger: `upgrade_prompt_${mode}` });
      signInWithGoogle();
      return;
    }
    executePurchase(type);
  }

  // Headline text
  const headline = keywordCount
    ? `Unlock all ${keywordCount.toLocaleString()} keywords`
    : checkCount
    ? `+${checkCount} more checks found`
    : featureName
    ? `${featureName} requires Pro`
    : 'Unlock full results';

  const subtitle = keywordCount
    ? 'Real Google Ads data — volume, CPC, competition, and Jackpot Scores for every keyword.'
    : checkCount
    ? 'See full results, recommendations, keyword gaps, and AI visibility analysis.'
    : featureName
    ? `Upgrade to access ${featureName} and all premium features.`
    : 'See the complete report with all data and recommendations.';

  // ── Bar mode ──────────────────────────────────────────────
  if (mode === 'bar') {
    return (
      <div className={`sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-jackpot-500/30 px-4 py-2.5 flex items-center justify-between gap-4 ${className}`}>
        <p className="text-gray-300 text-sm">
          {headline} — <span className="text-gray-500">including top jackpot-tier picks</span>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => handlePurchase('single')}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg border-2 border-jackpot-500 text-jackpot-400 hover:bg-jackpot-500/10 transition"
          >
            $1.99 this search
          </button>
          <button
            onClick={() => handlePurchase('pro')}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-bold rounded-lg bg-jackpot-500 text-black hover:bg-jackpot-600 transition"
          >
            $9.99/mo unlimited
          </button>
        </div>
      </div>
    );
  }

  // ── Overlay mode ──────────────────────────────────────────
  if (mode === 'overlay') {
    return (
      <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 rounded-b-xl ${className}`}
        style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0) 0%, rgba(10,10,15,0.85) 30%, rgba(10,10,15,0.98) 70%)' }}
      >
        <h3 className="text-xl font-bold text-white mb-2">{headline}</h3>
        <p className="text-gray-400 text-sm mb-5 text-center max-w-md">{subtitle}</p>
        <div className="flex gap-3 mb-2">
          <button
            onClick={() => handlePurchase('single')}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg border-2 border-jackpot-500 text-jackpot-400 hover:bg-jackpot-500/10 transition"
          >
            $1.99 — {keywordCount ? 'This Search' : 'Full Report'}
          </button>
          <button
            onClick={() => handlePurchase('pro')}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-bold rounded-lg bg-jackpot-500 text-black hover:bg-jackpot-600 transition"
          >
            $9.99/mo — Unlimited
          </button>
        </div>
        <div className="text-xs text-score-green">+ 1 credit for a future search with $1.99</div>
      </div>
    );
  }

  // ── Modal mode ────────────────────────────────────────────
  if (mode === 'modal') {
    return (
      <div className={className}>
        <div className="flex gap-3 justify-center mb-3">
          <button
            onClick={() => handlePurchase('single')}
            disabled={loading}
            className="flex-1 max-w-[140px] bg-gray-800 border-2 border-gray-700 rounded-xl p-3 text-center hover:border-jackpot-500 hover:bg-jackpot-500/5 transition cursor-pointer"
          >
            <div className="text-xl font-extrabold text-white">$1.99</div>
            <div className="text-xs text-gray-500">per search</div>
            <div className="text-[10px] text-score-green mt-0.5">+1 credit</div>
          </button>
          <button
            onClick={() => handlePurchase('three_pack')}
            disabled={loading}
            className="flex-1 max-w-[140px] bg-gray-800 border-2 border-gray-700 rounded-xl p-3 text-center hover:border-jackpot-500 hover:bg-jackpot-500/5 transition cursor-pointer"
          >
            <div className="text-xl font-extrabold text-white">$4.99</div>
            <div className="text-xs text-gray-500">3-pack</div>
            <div className="text-[10px] text-gray-600 mt-0.5">$1.66 each</div>
          </button>
          <button
            onClick={() => handlePurchase('pro')}
            disabled={loading}
            className="flex-1 max-w-[140px] bg-gray-800 border-2 border-jackpot-500 rounded-xl p-3 text-center hover:bg-jackpot-500/5 transition cursor-pointer relative"
          >
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-jackpot-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Best Value</span>
            <div className="text-xl font-extrabold text-white">$9.99</div>
            <div className="text-xs text-gray-500">/month</div>
            <div className="text-[10px] text-green-400 mt-0.5">Unlimited</div>
          </button>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-600 text-xs mt-3 hover:text-gray-400 transition w-full text-center"
          >
            Maybe later
          </button>
        )}
      </div>
    );
  }

  // ── Inline mode (default) ─────────────────────────────────
  return (
    <div className={`text-center ${className}`}>
      <h3 className="text-xl font-bold text-white mb-2">{headline}</h3>
      <p className="text-gray-400 text-sm mb-5 max-w-lg mx-auto">{subtitle}</p>
      <div className="flex gap-3 justify-center mb-2">
        <button
          onClick={() => handlePurchase('single')}
          disabled={loading}
          className="px-6 py-3 text-sm font-semibold rounded-xl border-2 border-jackpot-500 text-jackpot-400 hover:bg-jackpot-500/10 transition"
        >
          $1.99 — {keywordCount ? 'Unlock This Search' : featureName ? `Unlock ${featureName}` : 'Full Report'}
        </button>
        <button
          onClick={() => handlePurchase('pro')}
          disabled={loading}
          className="px-6 py-3 text-sm font-bold rounded-xl bg-jackpot-500 text-black hover:bg-jackpot-600 transition"
        >
          $9.99/mo — Unlimited
        </button>
      </div>
      <div className="text-xs text-score-green">+ 1 credit for a future search with $1.99</div>
    </div>
  );
}
