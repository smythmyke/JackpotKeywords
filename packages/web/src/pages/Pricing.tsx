import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from '@jackpotkeywords/shared';
import { useAuthContext } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import { trackEvent } from '../lib/analytics';

export default function Pricing() {
  const pro = SUBSCRIPTION_PLANS[0];
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
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Simple pricing</h1>
        <p className="text-gray-400 text-lg">
          Pay per run. Or go unlimited. Every plan covers keyword searches and SEO audits.
        </p>
      </div>

      {/* 2-column layout: Pro (hero) | Credits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-start">
        {/* Pro — hero */}
        {pro && (
          <div className="bg-gray-900 rounded-xl border-2 border-jackpot-500 ring-1 ring-jackpot-500/20 p-6 text-center relative md:-mt-4 md:mb-[-1rem]">
            <div className="text-xs font-bold text-jackpot-400 mb-2 uppercase tracking-wider">Best Value</div>
            <div className="text-4xl font-bold text-white">{pro.priceDisplay}</div>
            <div className="text-gray-400 text-sm mt-1">{pro.name} — Unlimited</div>
            <ul className="mt-6 space-y-3 text-left">
              {pro.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                  <svg className="w-4 h-4 text-jackpot-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(pro.id)}
              disabled={loading === pro.id}
              className="mt-6 w-full bg-jackpot-500 hover:bg-jackpot-600 disabled:bg-gray-700 text-black font-bold py-3 rounded-lg transition text-lg"
            >
              {loading === pro.id ? 'Redirecting...' : 'Subscribe'}
            </button>
            <div className="text-xs text-gray-500 mt-2">
              Breaks even at ~5 searches/month
            </div>
          </div>
        )}

        {/* Credits */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center">
          <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Pay Per Search</div>
          <div className="text-3xl font-bold text-white">Credits</div>
          <div className="text-gray-400 text-sm mt-1">No commitment</div>
          <div className="mt-6 space-y-3">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`border rounded-lg p-4 transition ${
                  pack.popular
                    ? 'border-jackpot-500/40 bg-jackpot-500/5'
                    : 'border-gray-800'
                }`}
              >
                {pack.popular && (
                  <div className="text-[10px] font-bold text-jackpot-400 uppercase tracking-wider mb-1">Best Deal</div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-white font-bold">{pack.priceDisplay}</div>
                    <div className="text-gray-500 text-xs">
                      {pack.credits} {pack.credits === 1 ? 'search' : 'searches'} &middot; {pack.perSearchCost}/ea
                    </div>
                  </div>
                  <button
                    onClick={() => handleBuyCredits(pack.id)}
                    disabled={loading === pack.id}
                    className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 text-white font-medium px-4 py-1.5 rounded-lg text-sm transition"
                  >
                    {loading === pack.id ? '...' : 'Buy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
