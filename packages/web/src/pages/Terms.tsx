import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — JackpotKeywords</title>
        <link rel="canonical" href="https://jackpotkeywords.web.app/terms" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
          <section>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of
              JackpotKeywords (the &ldquo;Service&rdquo;). By creating an account or using the
              Service, you agree to these Terms. If you don&apos;t agree, please don&apos;t use
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. The Service</h2>
            <p>
              JackpotKeywords provides AI-powered keyword research and SEO audit tools. We pull
              data from third-party sources (Google Ads Keyword Planner, Google Autocomplete,
              Google Trends, Gemini AI) and present it in a unified interface. The Service is
              provided &ldquo;as is&rdquo; and we make no guarantees about uptime, data
              accuracy, or fitness for any particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Account requirements</h2>
            <p>
              To use most features, you must sign in with a Google account. By signing in, you
              represent that you are at least 18 years old (or the age of majority in your
              jurisdiction). You are responsible for keeping your account credentials secure
              and for any activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 space-y-1.5 list-disc list-inside ml-2">
              <li>Scrape, crawl, or otherwise extract data from the Service in bulk</li>
              <li>Reverse engineer, decompile, or attempt to extract source code</li>
              <li>Use the Service to violate any law or third-party right</li>
              <li>Resell, rent, or sublicense the Service without our written permission</li>
              <li>Probe, scan, or test the vulnerability of the Service or its infrastructure</li>
              <li>Bypass rate limits, abuse the free tier through multiple accounts, or attempt to access paid features without payment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Pricing and payment</h2>
            <p><span className="text-white font-medium">Free tier:</span> 3 lifetime runs per visitor (search or audit). Once consumed, you must purchase credits or subscribe to Pro to continue.</p>
            <p className="mt-2"><span className="text-white font-medium">Credits:</span> non-refundable once used. If a search fails due to a system error on our end, the credit is automatically refunded. Credits do not expire.</p>
            <p className="mt-2"><span className="text-white font-medium">Pro subscription:</span> $9.99 per month, billed monthly via Stripe. Provides unlimited searches and audits during the active billing period. Cancellation takes effect at the end of the current period; no partial-month refunds.</p>
            <p className="mt-2"><span className="text-white font-medium">Price changes:</span> we reserve the right to change pricing for new purchases or future billing periods. Existing subscribers will be notified before any price change affects them.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Refund policy</h2>
            <p>
              Credits are non-refundable once used. Unused credits are non-refundable except
              where required by law. Subscription cancellations stop future billing but do not
              refund partial periods. If you believe you were charged in error, email{' '}
              <a href="mailto:smythmyke@gmail.com" className="text-jackpot-400 hover:underline">smythmyke@gmail.com</a>{' '}
              within 30 days of the charge.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Intellectual property</h2>
            <p>
              The Service, including its software, design, and branding, is owned by us and
              protected by copyright and trademark law. You receive a limited, revocable license
              to use the Service for its intended purpose.
            </p>
            <p className="mt-2">
              <span className="text-white font-medium">Your data:</span> you retain ownership of
              the descriptions, URLs, and other inputs you provide. By using the Service, you
              grant us a license to process them as needed to deliver results. The keyword and
              audit data we generate from your inputs is yours to use however you like (export
              to CSV, XLSX, PDF, or use in your own marketing).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. No warranty</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, express or implied. We do not warrant that the Service
              will be uninterrupted, error-free, or that data will be accurate, complete, or
              timely. See our{' '}
              <Link to="/disclaimer" className="text-jackpot-400 hover:underline">Disclaimer</Link>{' '}
              for additional details on data accuracy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, JackpotKeywords and its operators shall
              not be liable for any indirect, incidental, special, consequential, or punitive
              damages, including lost profits, lost data, or business interruption, arising
              from your use of the Service. Our total cumulative liability for any claims
              arising from these Terms or the Service shall not exceed the amount you paid us
              in the 12 months prior to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless JackpotKeywords from any claim arising
              from your misuse of the Service, your violation of these Terms, or your violation
              of any third-party right.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violation of these Terms,
              suspected fraud, abuse of free-tier limits, or for any other reason at our
              discretion. You may cancel your account at any time by contacting us. Upon
              termination, your right to use the Service ends immediately. Sections that by
              their nature should survive termination (intellectual property, liability,
              indemnification) will survive.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be indicated
              by an updated &ldquo;Last updated&rdquo; date. Continued use of the Service after
              a Terms change constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">12. Governing law</h2>
            <p>
              These Terms are governed by the laws of the United States and the State of
              California, without regard to conflict-of-law rules. Any dispute will be resolved
              in the state or federal courts located in California.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">13. Contact</h2>
            <p>
              Questions about these Terms? Email{' '}
              <a href="mailto:smythmyke@gmail.com" className="text-jackpot-400 hover:underline">smythmyke@gmail.com</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            See also our{' '}
            <Link to="/privacy" className="text-jackpot-400 hover:underline">Privacy Policy</Link>
            {' '}and{' '}
            <Link to="/disclaimer" className="text-jackpot-400 hover:underline">Disclaimer</Link>.
          </p>
          <Link to="/" className="text-jackpot-400 hover:underline text-sm mt-3 inline-block">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
