import { Link } from 'react-router-dom';

export default function Disclaimer() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-white mb-2">Disclaimer</h1>
      <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

      <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-3">1. Data Sources & Accuracy</h2>
          <p>
            JackpotKeywords uses third-party data sources to provide keyword research data
            including search volume, cost-per-click (CPC) estimates, competition levels, and
            trend analysis. This data represents a snapshot of market conditions at the time
            your search was performed. Search volumes, CPC ranges, competition levels, and
            trends are dynamic and may change at any time based on market conditions,
            seasonality, advertiser behavior, and other factors outside our control.
          </p>
          <p className="mt-2">
            We do not guarantee the accuracy, completeness, or reliability of any data
            provided. While we strive to deliver the most accurate information available,
            third-party data providers may update, modify, or discontinue their services
            at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">2. No Guarantee of Results</h2>
          <p>
            Keyword scores, opportunity ratings, and recommendations provided by
            JackpotKeywords are informational tools designed to assist with keyword research
            and advertising decisions. They do not guarantee any specific advertising
            performance, search ranking, traffic, conversion rate, or return on investment.
          </p>
          <p className="mt-2">
            Actual advertising costs and performance depend on numerous factors including
            but not limited to: your account quality score, landing page experience,
            bidding strategy, ad copy quality, targeting settings, competitive landscape,
            and market conditions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">3. AI-Generated Analysis</h2>
          <p>
            JackpotKeywords uses artificial intelligence to generate keyword suggestions,
            categorize keywords by intent, score opportunities, and provide analytical
            insights. AI-generated content may contain inaccuracies, misclassifications,
            or irrelevant suggestions. Users should review and validate all AI-generated
            content before making business decisions based on it.
          </p>
          <p className="mt-2">
            AI models are continuously evolving and results may vary between searches
            even for identical inputs.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">4. Not Professional Advice</h2>
          <p>
            The information provided by JackpotKeywords does not constitute professional
            marketing, advertising, financial, or business advice. Users should consult
            with qualified professionals before making significant advertising spend
            decisions or business strategy changes based on keyword research data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">5. Third-Party Services</h2>
          <p>
            JackpotKeywords integrates with third-party services for data, payments, and
            authentication. We are not responsible for the availability, accuracy, or
            policies of these third-party services. Your use of features that rely on
            third-party services is subject to those providers&apos; terms of service
            and privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">6. Competitor Comparisons</h2>
          <p>
            Any comparisons to competing products or services on our website are based on
            publicly available pricing and feature information at the time of writing.
            Competitor features, pricing, and capabilities may change at any time.
            JackpotKeywords is not affiliated with, endorsed by, or sponsored by any
            competitor mentioned on this site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">7. CPC & Volume Estimates</h2>
          <p>
            Cost-per-click (CPC) ranges shown represent estimated top-of-page bid ranges
            based on historical advertiser data. Your actual costs may be significantly
            higher or lower depending on your quality score, targeting, bid strategy,
            and competitive conditions at the time of your campaign.
          </p>
          <p className="mt-2">
            Monthly search volume figures represent averaged estimates and may not reflect
            actual search volumes for any given month. Seasonal variations, trending topics,
            and other factors can cause significant deviations from displayed averages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">8. Pricing & Refunds</h2>
          <p>
            Search credits are non-refundable once used. If a search fails due to a
            system error, credits will be automatically refunded to your account.
            Subscription cancellations take effect at the end of the current billing
            period. No partial refunds are provided for unused subscription time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">9. Limitation of Liability</h2>
          <p>
            JackpotKeywords and its operators shall not be liable for any direct, indirect,
            incidental, consequential, or special damages arising from your use of this
            service, including but not limited to lost profits, lost data, business
            interruption, or advertising losses, even if advised of the possibility of
            such damages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">10. Changes to This Disclaimer</h2>
          <p>
            We reserve the right to update this disclaimer at any time. Changes will be
            posted on this page with an updated revision date. Continued use of
            JackpotKeywords after changes constitutes acceptance of the revised disclaimer.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-800 text-center">
        <p className="text-gray-500 text-sm">
          Questions? Contact us at{' '}
          <a href="mailto:support@jackpotkeywords.com" className="text-jackpot-400 hover:underline">
            support@jackpotkeywords.com
          </a>
        </p>
        <Link to="/" className="text-jackpot-400 hover:underline text-sm mt-2 inline-block">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}
