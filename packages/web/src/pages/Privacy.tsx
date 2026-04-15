import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — JackpotKeywords</title>
        <link rel="canonical" href="https://jackpotkeywords.web.app/privacy" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
          <section>
            <p>
              JackpotKeywords (&ldquo;we,&rdquo; &ldquo;our,&rdquo; &ldquo;us&rdquo;) takes your
              privacy seriously. This policy explains what we collect, why we collect it, who we
              share it with, and what control you have over your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Information we collect</h2>
            <p><span className="text-white font-medium">Account data:</span> when you sign in with Google, we receive your email address, display name, and profile photo. We store these to identify your account.</p>
            <p className="mt-2"><span className="text-white font-medium">Payment data:</span> when you purchase credits or a Pro subscription, payment is processed by Stripe. We never see or store your full card number — Stripe handles all card data and we only receive billing metadata (subscription status, last four digits, customer ID).</p>
            <p className="mt-2"><span className="text-white font-medium">Search and audit history:</span> the queries you run, URLs you submit, and results we return are stored against your account so you can revisit them.</p>
            <p className="mt-2"><span className="text-white font-medium">Anonymous identifier:</span> we generate a UUID stored in your browser&apos;s localStorage as &ldquo;jk_anon_id.&rdquo; This lets us count free searches per visitor before sign-in and stitch your pre-signin activity to your account once you sign up.</p>
            <p className="mt-2"><span className="text-white font-medium">IP address:</span> collected on every API call for rate limiting and abuse protection. Stored in short-lived rate-limit records.</p>
            <p className="mt-2"><span className="text-white font-medium">Attribution:</span> if you arrive via a tracked link (UTM parameters, Google Ads gclid, or known referrer), we store those values once on first sign-in to understand which marketing channels work.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Why we collect it</h2>
            <ul className="space-y-1.5 list-disc list-inside ml-2">
              <li>To authenticate your account and deliver the service</li>
              <li>To process payments and manage subscriptions</li>
              <li>To enforce free-tier limits and prevent abuse</li>
              <li>To improve the product (which features get used, where errors happen)</li>
              <li>To understand which marketing channels bring valuable users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Third-party services we use</h2>
            <p>To deliver the service, your data passes through these providers:</p>
            <ul className="mt-2 space-y-1.5 list-disc list-inside ml-2">
              <li><span className="text-white">Firebase / Google Cloud</span> — authentication, database, hosting</li>
              <li><span className="text-white">Stripe</span> — payment processing and subscription management</li>
              <li><span className="text-white">Google Ads Keyword Planner API</span> — keyword search volume and CPC data</li>
              <li><span className="text-white">Google Gemini API</span> — AI processing of your search descriptions and audit content</li>
              <li><span className="text-white">Google Analytics 4 + Google Ads conversion tracking</span> — page views and conversion events</li>
              <li><span className="text-white">Google Trends</span> — historical interest data overlaid on results</li>
            </ul>
            <p className="mt-2">
              Each provider operates under its own privacy policy. We send only what is needed to
              deliver the relevant function — for example, the Keyword Planner sees your search
              seeds but not your email or payment info.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Cookies and storage</h2>
            <ul className="space-y-1.5 list-disc list-inside ml-2">
              <li><span className="text-white">jk_anon_id (localStorage):</span> anonymous visitor UUID for free-tier counting and analytics correlation</li>
              <li><span className="text-white">GA4 cookies:</span> Google Analytics page-view and event tracking</li>
              <li><span className="text-white">Attribution storage (localStorage):</span> first-touch UTM and referrer values, cleared once sent to your account</li>
              <li><span className="text-white">Firebase auth cookies:</span> session tokens for staying signed in</li>
              <li><span className="text-white">Stripe cookies:</span> set during checkout for fraud prevention</li>
            </ul>
            <p className="mt-2">
              You can clear localStorage and cookies in your browser at any time. Doing so will
              sign you out and reset your anonymous-visitor session.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Data retention</h2>
            <p>
              Account data, search history, and audit history are retained while your account is
              active. Anonymous activity logs (rate limiting, error tracking) are retained for
              approximately 30 days. Stripe retains billing records per its own policy and per
              applicable financial regulations.
            </p>
            <p className="mt-2">
              When you request account deletion, we remove your account record and personal data
              within 30 days. Anonymized aggregate analytics may persist (e.g., &ldquo;X searches
              were run last week&rdquo;) but contain no personally identifying information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Your rights</h2>
            <ul className="space-y-1.5 list-disc list-inside ml-2">
              <li><span className="text-white">Access:</span> request a copy of your account data</li>
              <li><span className="text-white">Correction:</span> update or correct your account information</li>
              <li><span className="text-white">Deletion:</span> request deletion of your account and associated data</li>
              <li><span className="text-white">Opt-out of marketing:</span> we don&apos;t currently send marketing emails, but if we ever do, you can opt out in every message</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email{' '}
              <a href="mailto:smythmyke@gmail.com" className="text-jackpot-400 hover:underline">smythmyke@gmail.com</a>{' '}
              with your account email address.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. We do not sell your data</h2>
            <p>
              We do not sell, rent, or trade your personal information to anyone. We use third-party
              processors only as listed in section 3, and only for the purposes described.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Children&apos;s privacy</h2>
            <p>
              JackpotKeywords is not directed at children under 13. We do not knowingly collect
              data from children. If you believe a child has provided us with personal information,
              email us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. International users</h2>
            <p>
              JackpotKeywords is operated from the United States. By using the service, you
              consent to your data being processed in the U.S. Our infrastructure runs on Google
              Cloud, which may store data in any of its global regions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              indicated by an updated &ldquo;Last updated&rdquo; date at the top. Continued use
              of the service after a policy change constitutes acceptance of the revised terms.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            Privacy questions? Email{' '}
            <a href="mailto:smythmyke@gmail.com" className="text-jackpot-400 hover:underline">
              smythmyke@gmail.com
            </a>
          </p>
          <Link to="/" className="text-jackpot-400 hover:underline text-sm mt-3 inline-block">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
