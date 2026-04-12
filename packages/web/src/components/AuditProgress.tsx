import { useState, useEffect, useMemo } from 'react';

const STEPS = [
  { label: 'Connecting to your website', duration: 5000 },
  { label: 'Analyzing page structure and meta tags', duration: 8000 },
  { label: 'Checking SEO fundamentals across 6 categories', duration: 12000 },
  { label: 'Scanning additional pages from sitemap', duration: 15000 },
  { label: 'Evaluating structured data and crawlability', duration: 10000 },
  { label: 'Generating keyword gaps and recommendations', duration: 15000 },
  { label: 'Finalizing your SEO report', duration: 30000 },
];

const ALL_TIPS: { text: string; label: string; author?: string }[] = [
  // SEO facts
  { text: '53% of all website traffic comes from organic search', label: 'Did you know' },
  { text: 'The first Google result gets 27.6% of all clicks', label: 'Did you know' },
  { text: 'Pages with meta descriptions get 5.8% more clicks than those without', label: 'Did you know' },
  { text: '88% of online consumers are less likely to return after a bad experience', label: 'Did you know' },
  { text: 'Google uses over 200 ranking factors in its algorithm', label: 'Did you know' },
  { text: 'HTTPS is a confirmed Google ranking signal since 2014', label: 'Did you know' },
  { text: 'The average page 1 result has 1,447 words', label: 'Did you know' },
  // SEO tips
  { text: 'Title tags under 60 characters display fully in Google search results', label: 'SEO Tip' },
  { text: 'Meta descriptions between 120-160 characters get the highest click-through rates', label: 'SEO Tip' },
  { text: 'One H1 per page — it tells Google your main topic', label: 'SEO Tip' },
  { text: 'FAQ schema can make your page take up 2-3x more space in search results', label: 'SEO Tip' },
  { text: 'Internal links spread authority across your site — use them generously', label: 'SEO Tip' },
  { text: 'A sitemap.xml helps Google discover pages it might otherwise miss', label: 'SEO Tip' },
  { text: 'Canonical tags prevent duplicate content issues across similar pages', label: 'SEO Tip' },
  { text: 'Structured data (JSON-LD) can unlock rich snippets, stars, and FAQ dropdowns in Google', label: 'SEO Tip' },
  // Common mistakes
  { text: 'Missing meta descriptions is the #1 most common on-page SEO issue', label: 'Common Mistake' },
  { text: 'JavaScript-rendered pages often look empty to search engines', label: 'Common Mistake' },
  { text: 'Blocking CSS/JS in robots.txt prevents Google from rendering your pages', label: 'Common Mistake' },
  { text: 'Multiple H1 tags confuse search engines about your page\'s main topic', label: 'Common Mistake' },
  { text: 'Thin content (under 300 words) rarely ranks for competitive keywords', label: 'Common Mistake' },
  // Insights
  { text: 'Ahrefs Site Audit costs $99/mo — we do it for $1.99', label: 'Price Comparison' },
  { text: 'SEMrush charges $140/mo for their site audit feature', label: 'Price Comparison' },
  { text: 'Screaming Frog is $259/year and requires desktop installation', label: 'Price Comparison' },
  { text: 'Open Graph tags control how your page looks when shared on Facebook and LinkedIn', label: 'Quick Win' },
  { text: 'Adding breadcrumb schema takes 5 minutes and improves click-through rates', label: 'Quick Win' },
  { text: 'A blog section builds topical authority — Google rewards sites that cover topics deeply', label: 'Quick Win' },
  // Testimonials
  { text: 'The SEO audit found 4 issues I had no idea about. Fixed them in an hour and saw results in 2 weeks.', label: 'Testimonial', author: 'Marcus T., eCommerce Owner' },
  { text: 'I was paying an agency $500/mo for SEO audits. This gives me the same checklist for $1.99.', label: 'Testimonial', author: 'Priya S., Digital Marketer' },
  { text: 'The keyword gap analysis was the real gem — it showed me topics my competitors cover that I don\'t.', label: 'Testimonial', author: 'David L., Agency Founder' },
  { text: 'I ran the audit on my client\'s site and turned the report into a proposal. Closed the deal.', label: 'Testimonial', author: 'Jenna M., SEO Consultant' },
  { text: 'Found out my entire blog was set to noindex. Would have never known without this audit.', label: 'Testimonial', author: 'Carlos R., Small Business Owner' },
  { text: 'The structured data check caught missing FAQ schema on 3 pages. Added it and got rich snippets within a week.', label: 'Testimonial', author: 'Amy W., Content Creator' },
];

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const CORNERS = [
  { position: 'top-16 left-10', align: 'text-left' },
  { position: 'top-16 right-10', align: 'text-right' },
  { position: 'bottom-20 left-10', align: 'text-left' },
  { position: 'bottom-20 right-10', align: 'text-right' },
];

export default function AuditProgress() {
  const [currentStep, setCurrentStep] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [cornerIndex, setCornerIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(false);
  const TIPS = useMemo(() => shuffleArray(ALL_TIPS), []);

  // Step progression
  useEffect(() => {
    if (currentStep >= STEPS.length) return;
    const timer = setTimeout(() => {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length));
    }, STEPS[currentStep].duration);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Single tip rotation: fade in → hold → fade out → pause → next
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function cycle() {
      setTipVisible(true);

      timeout = setTimeout(() => {
        setTipVisible(false);

        timeout = setTimeout(() => {
          setTipIndex((prev) => (prev + 1) % TIPS.length);
          setCornerIndex((prev) => {
            const next = (prev + 1 + Math.floor(Math.random() * 3)) % 4;
            return next;
          });

          timeout = setTimeout(cycle, 1000);
        }, 700);
      }, 5500);
    }

    timeout = setTimeout(cycle, 1500);

    return () => clearTimeout(timeout);
  }, []);

  const corner = CORNERS[cornerIndex];
  const tip = TIPS[tipIndex];

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center relative overflow-hidden px-4">
      {/* Hero background */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat bg-contain opacity-[0.12] pointer-events-none"
        style={{ backgroundImage: "url('/logo-hero.png')" }}
        role="presentation"
        aria-hidden="true"
      />

      {/* Single floating tip */}
      <div
        className={`absolute ${corner.position} ${corner.align} max-w-[300px] pointer-events-none transition-opacity duration-700 ${
          tipVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {tip.author ? (
          <>
            <p className="text-lg md:text-xl text-jackpot-400/80 leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic' }}>
              &ldquo;{tip.text}&rdquo;
            </p>
            <p className="text-sm text-gray-500 mt-2" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              &mdash; {tip.author}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg md:text-xl font-medium text-gray-400 leading-relaxed italic">
              &ldquo;{tip.text}&rdquo;
            </p>
            <p className="text-xs text-gray-600 mt-2 uppercase tracking-widest">
              {tip.label}
            </p>
          </>
        )}
      </div>

      {/* Center content */}
      <div className="relative z-10 w-full max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-white text-center mb-2">
          Auditing your website...
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          This usually takes 30-90 seconds
        </p>

        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-1.5 mb-8">
          <div
            className="bg-jackpot-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${Math.min((currentStep / STEPS.length) * 100, 95)}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;

            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isDone
                    ? 'bg-jackpot-500 text-black'
                    : isActive
                      ? 'bg-jackpot-500/20 border-2 border-jackpot-500'
                      : 'bg-gray-800 border border-gray-700'
                }`}>
                  {isDone && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isActive && (
                    <div className="w-2 h-2 bg-jackpot-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span className={`text-sm transition-colors ${
                  isDone
                    ? 'text-gray-400'
                    : isActive
                      ? 'text-white font-medium'
                      : 'text-gray-600'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
