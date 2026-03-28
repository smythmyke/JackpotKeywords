import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from '@jackpotkeywords/shared';

export default function Pricing() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Simple pricing</h1>
        <p className="text-gray-400 text-lg">
          Pay per search or go unlimited. No hidden fees.
        </p>
      </div>

      {/* Credit packs */}
      <div className="mb-16">
        <h2 className="text-xl font-bold text-white mb-6 text-center">Pay per search</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`bg-gray-900 rounded-xl border p-6 text-center transition hover:border-jackpot-500/50 ${
                pack.popular ? 'border-jackpot-500 ring-1 ring-jackpot-500/20' : 'border-gray-800'
              }`}
            >
              {pack.popular && (
                <div className="text-xs font-medium text-jackpot-400 mb-2">MOST POPULAR</div>
              )}
              <div className="text-3xl font-bold text-white">{pack.priceDisplay}</div>
              <div className="text-gray-400 text-sm mt-1">
                {pack.credits} {pack.credits === 1 ? 'search' : 'searches'}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {pack.perSearchCost}/search
              </div>
              <button className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-lg transition">
                Buy now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription plans */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 text-center">Go unlimited</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`bg-gray-900 rounded-xl border p-6 transition hover:border-jackpot-500/50 ${
                plan.id === 'pro' ? 'border-jackpot-500 ring-1 ring-jackpot-500/20' : 'border-gray-800'
              }`}
            >
              {plan.id === 'pro' && (
                <div className="text-xs font-medium text-jackpot-400 mb-2">BEST VALUE</div>
              )}
              <div className="text-3xl font-bold text-white">{plan.priceDisplay}</div>
              <div className="text-gray-400 text-sm mt-1">{plan.name}</div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-jackpot-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="mt-6 w-full bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold py-2.5 rounded-lg transition">
                Subscribe
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Free tier note */}
      <div className="mt-12 text-center text-gray-500 text-sm">
        <p>
          Start with 3 free searches (blurred results) to see the quality before you pay.
          <br />
          Pro subscription breaks even vs credits at 6 searches/month.
        </p>
      </div>
    </div>
  );
}
