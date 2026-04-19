import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from '@jackpotkeywords/shared';
import { useAuthContext } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import { trackEvent } from '../lib/analytics';

export default function Pricing() {
  const pro = SUBSCRIPTION_PLANS[0];
  const singlePack = CREDIT_PACKS.find((p) => p.id === 'single');
  const threePack = CREDIT_PACKS.find((p) => p.id === 'three_pack');
  const { user, signInWithGoogle, getToken } = useAuthContext();
  const { buyCreditPack, subscribe } = useCredits({ getToken, refreshCredits: async () => {} });
  const [loading, setLoading] = useState<string | null>(null);

  const handleBuyCredits = async (packId: string) => {
    trackEvent('upgrade_clicked', { kind: 'credit', id: packId });
    if (!user) {
      trackEvent('signin_prompted', { trigger: 'buy_credit', packId });
      await signInWithGoogle();
      return;
    }
    setLoading(packId);
    try {
      await buyCreditPack(packId as any);
    } catch {
      setLoading(null);
    }
  };

  const handleSubscribe = async (planId: string) => {
    trackEvent('upgrade_clicked', { kind: 'subscription', id: planId });
    if (!user) {
      trackEvent('signin_prompted', { trigger: 'subscribe', planId });
      await signInWithGoogle();
      return;
    }
    setLoading(planId);
    try {
      await subscribe(planId as any);
    } catch {
      setLoading(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Pricing — JackpotKeywords</title>
        <meta name="description" content="Keyword research and SEO audits from $1.99/run or $9.99/mo unlimited. 14x cheaper than SEMrush." />
        <link rel="canonical" href="https://jackpotkeywords.web.app/pricing" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'JackpotKeywords Pricing',
            description: 'Keyword research pricing plans',
            offers: [
              {
                '@type': 'Offer',
                name: 'Single Search',
                price: '1.99',
                priceCurrency: 'USD',
                description: 'Pay-per-search credit',
              },
              {
                '@type': 'Offer',
                name: '3-Pack',
                price: '4.99',
                priceCurrency: 'USD',
                description: '3 search credits ($1.66 each)',
              },
              {
                '@type': 'Offer',
                name: 'Pro Plan',
                price: '9.99',
                priceCurrency: 'USD',
                description: 'Unlimited searches, full features',
                billingIncrement: 'P1M',
              },
            ],
          })}
        </script>
      </Helmet>
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Simple pricing</h1>
        <p className="text-gray-400 text-lg">
          Pay per run. Or go unlimited. Every plan covers keyword searches and SEO audits.
        </p>
      </div>

      {/* 3-column asymmetric layout: Pro | See Results Now (hero) | 3-Pack */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-6 items-stretch">
        {/* Pro — amber accent */}
        {pro && (
          <div className="bg-gray-900 rounded-xl border-2 border-jackpot-500 ring-1 ring-jackpot-500/20 p-6 text-center relative flex flex-col">
            <div className="text-xs font-bold text-jackpot-400 mb-2 uppercase tracking-wider">Unlimited</div>
            <div className="text-3xl font-bold text-white">{pro.priceDisplay}</div>
            <div className="text-gray-400 text-sm mt-1">{pro.name} Subscription</div>
            <ul className="mt-6 space-y-2.5 text-left flex-1">
              {pro.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-jackpot-400 mt-0.5">&#10003;</span> {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(pro.id)}
              disabled={loading === pro.id}
              className="mt-6 w-full bg-jackpot-500 hover:bg-jackpot-600 disabled:bg-gray-700 text-black font-bold py-3 rounded-lg transition"
            >
              {loading === pro.id ? 'Redirecting...' : 'Subscribe'}
            </button>
            <div className="text-xs text-gray-500 mt-2">~5 searches/mo breaks even</div>
          </div>
        )}

        {/* See Results Now — green hero, wider */}
        {singlePack && (
          <div className="bg-gradient-to-br from-score-green/15 via-gray-900 to-gray-900 rounded-xl border-2 border-score-green ring-2 ring-score-green/20 p-8 text-center relative flex flex-col shadow-2xl shadow-score-green/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-score-green text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Recommended</div>
            <div className="text-xs font-bold text-score-green mb-2 uppercase tracking-wider mt-2">One-Time Unlock</div>
            <div className="flex items-baseline justify-center gap-3">
              <div className="text-6xl font-extrabold text-white">{singlePack.priceDisplay}</div>
              <div className="text-gray-400 text-lg">one-time</div>
            </div>
            <div className="text-gray-200 text-xl mt-2 font-bold">See Results Now</div>
            <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
              Unblur every keyword in your current search — all data, all exports, saved forever. No subscription.
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-6 text-left flex-1 max-w-md mx-auto">
              <div className="flex items-start gap-2 text-sm text-gray-200"><span className="text-score-green mt-0.5">&#10003;</span> All keyword strings</div>
              <div className="flex items-start gap-2 text-sm text-gray-200"><span className="text-score-green mt-0.5">&#10003;</span> Volume &amp; CPC</div>
              <div className="flex items-start gap-2 text-sm text-gray-200"><span className="text-score-green mt-0.5">&#10003;</span> Jackpot Scores</div>
              <div className="flex items-start gap-2 text-sm text-gray-200"><span className="text-score-green mt-0.5">&#10003;</span> CSV export</div>
              <div className="flex items-start gap-2 text-sm text-gray-200"><span className="text-score-green mt-0.5">&#10003;</span> Google Ads export</div>
              <div className="flex items-start gap-2 text-sm text-gray-200"><span className="text-score-green mt-0.5">&#10003;</span> Permanent access</div>
            </div>
            <button
              onClick={() => handleBuyCredits(singlePack.id)}
              disabled={loading === singlePack.id}
              className="mt-7 w-full bg-score-green hover:bg-green-500 disabled:bg-gray-700 text-black font-extrabold py-5 rounded-lg transition text-xl shadow-lg shadow-score-green/20"
            >
              {loading === singlePack.id ? 'Redirecting...' : 'See Results Now \u2192'}
            </button>
            <div className="text-xs text-gray-400 mt-2">Takes 5 seconds &middot; No account setup beyond Google sign-in</div>
          </div>
        )}

        {/* 3-Pack — neutral gray */}
        {threePack && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center relative flex flex-col">
            <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Save 16%</div>
            <div className="text-3xl font-bold text-white">{threePack.priceDisplay}</div>
            <div className="text-gray-400 text-sm mt-1">{threePack.name}</div>
            <ul className="mt-6 space-y-2.5 text-left flex-1">
              <li className="flex items-start gap-2 text-sm text-gray-300"><span className="text-gray-400 mt-0.5">&#10003;</span> {threePack.credits} unlocks</li>
              <li className="flex items-start gap-2 text-sm text-gray-300"><span className="text-gray-400 mt-0.5">&#10003;</span> {threePack.perSearchCost} each</li>
              <li className="flex items-start gap-2 text-sm text-gray-300"><span className="text-gray-400 mt-0.5">&#10003;</span> Never expire</li>
              <li className="flex items-start gap-2 text-sm text-gray-300"><span className="text-gray-400 mt-0.5">&#10003;</span> Full keyword data &amp; exports</li>
            </ul>
            <button
              onClick={() => handleBuyCredits(threePack.id)}
              disabled={loading === threePack.id}
              className="mt-6 w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading === threePack.id ? 'Redirecting...' : 'Buy 3-Pack'}
            </button>
            <div className="text-xs text-gray-500 mt-2">For running multiple searches</div>
          </div>
        )}
      </div>

      {/* Bottom note */}
      <div className="mt-12 text-center text-gray-500 text-sm max-w-lg mx-auto">
        <p>
          All paid searches unlock full keyword data, exports, and permanent access to results.
        </p>
        <p className="mt-3 text-xs text-gray-600">
          Keyword data represents estimates at time of search. Actual CPC and volume may vary.{' '}
          <a href="/disclaimer" className="text-gray-500 hover:text-gray-400 underline">Full disclaimer</a>
        </p>
      </div>
    </div>
    </>
  );
}
