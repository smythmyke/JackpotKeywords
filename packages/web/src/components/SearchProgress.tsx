import { useState, useEffect, useMemo } from 'react';

const STEPS = [
  { label: 'Analyzing your product description', duration: 3000 },
  { label: 'Generating keyword seeds across 12 categories', duration: 5000 },
  { label: 'Expanding long-tail keyword variations', duration: 8000 },
  { label: 'Enriching keywords with real search data', duration: 20000 },
  { label: 'Calculating trends and seasonality', duration: 3000 },
  { label: 'Scoring and classifying opportunities', duration: 10000 },
  { label: 'Finalizing your results', duration: 30000 },
];

const ALL_TIPS: { text: string; label: string; author?: string }[] = [
  // Tips & insights
  { text: 'SEMrush charges $140/mo for similar keyword data', label: 'Did you know' },
  { text: 'Ahrefs starts at $99/mo — we start at $0.99', label: 'Did you know' },
  { text: 'The average keyword research tool costs $89/mo', label: 'Did you know' },
  { text: 'The average cost-per-click across all industries is $2.69', label: 'Did you know' },
  { text: 'The top 3 Google ad positions capture 41% of all clicks', label: 'Did you know' },
  { text: 'Long-tail keywords make up 70% of all search traffic', label: 'Marketing Tip' },
  { text: '92% of keywords get fewer than 10 searches per month', label: 'Marketing Tip' },
  { text: 'Keywords with high volume + low CPC = goldmine opportunities', label: 'Marketing Tip' },
  { text: 'Rising trends + low competition = act now before others catch on', label: 'Marketing Tip' },
  { text: 'Content marketing costs 62% less than traditional marketing', label: 'Marketing Tip' },
  { text: 'SEO leads have a 14.6% close rate vs 1.7% for outbound', label: 'Marketing Tip' },
  { text: 'Reddit Ads average CPC: $0.50 — often cheaper than Google', label: 'Marketing Insight' },
  { text: 'Reddit has 1.7B monthly visits — great for niche audiences', label: 'Marketing Insight' },
  { text: 'Paid search drives 65% of clicks on commercial-intent keywords', label: 'Marketing Insight' },
  { text: 'YouTube is the 2nd largest search engine — video SEO matters', label: 'Marketing Insight' },
  { text: 'Pinterest Ads CPC averages $0.10-$1.50 — great for visual products', label: 'Marketing Insight' },
  { text: 'TikTok Ads reach 1B+ users with CPMs as low as $1', label: 'Marketing Insight' },
  { text: 'Click any keyword in results to see its 12-month volume chart', label: 'Pro Tip' },
  { text: 'Use column filters to find keywords matching your budget', label: 'Pro Tip' },
  { text: 'Sort by Jackpot Score to surface the best opportunities', label: 'Pro Tip' },
  { text: 'Toggle between Ad Score and SEO Score for different strategies', label: 'Pro Tip' },
  { text: 'We analyze 10 intent categories to find keywords competitors miss', label: 'Pro Tip' },
  // Testimonials
  { text: 'I was paying $140/mo for SEMrush. JackpotKeywords gives me what I need for $9.99. No brainer.', label: 'Testimonial', author: 'Marcus T., eCommerce Owner' },
  { text: 'Found 23 goldmine keywords in my first search. Two of them cut my ad spend by 40%.', label: 'Testimonial', author: 'Priya S., Digital Marketer' },
  { text: 'I don\'t know SEO. I just described my product and got keywords I could actually use. Game changer.', label: 'Testimonial', author: 'Rachel K., Etsy Seller' },
  { text: 'Switched from Ahrefs. The Jackpot Score alone is worth it — tells me exactly where to focus.', label: 'Testimonial', author: 'David L., Agency Founder' },
  { text: 'The intent labels saved me hours. I can instantly see which keywords are buyers vs browsers.', label: 'Testimonial', author: 'Jenna M., PPC Specialist' },
  { text: 'I ran one search and exported straight to Google Ads. Had a campaign live in 10 minutes.', label: 'Testimonial', author: 'Carlos R., Small Business Owner' },
  { text: 'Ubersuggest gave me volume. JackpotKeywords gives me volume, CPC, trends, AND tells me which keywords are gold.', label: 'Testimonial', author: 'Amy W., Content Creator' },
  { text: 'The clustering feature groups keywords automatically. What used to take me a full day now takes seconds.', label: 'Testimonial', author: 'Tom H., SEO Consultant' },
  { text: 'My competitor was bidding on keywords I didn\'t even know existed. JackpotKeywords found them all.', label: 'Testimonial', author: 'Nina P., SaaS Founder' },
  { text: 'Three free searches got me hooked. The data quality is on par with tools 10x the price.', label: 'Testimonial', author: 'Alex G., Freelance Marketer' },
  { text: 'I validated my product idea before writing a single line of code. The demand score said go — so I built it.', label: 'Testimonial', author: 'Jordan F., Indie Maker' },
  { text: 'The relevance scoring is genius. No more scrolling through 500 irrelevant keywords to find the 20 that matter.', label: 'Testimonial', author: 'Lisa C., Marketing Manager' },
  { text: 'Ran it for my Etsy shop. Found keywords my competitors rank for that I\'d never thought of.', label: 'Testimonial', author: 'Sarah B., Handmade Seller' },
  { text: 'Best $9.99 I spend each month. Replaced three different tools with one search.', label: 'Testimonial', author: 'Mike D., Dropshipper' },
  { text: 'The Market Intelligence dashboard told me my niche was growing 34%. Gave me confidence to invest in ads.', label: 'Testimonial', author: 'Kara N., Course Creator' },
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

export default function SearchProgress() {
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
      // Fade in
      setTipVisible(true);

      // Hold for 3.5s then fade out
      timeout = setTimeout(() => {
        setTipVisible(false);

        // After fade out (700ms), pick next tip and corner, then wait 1s before next
        timeout = setTimeout(() => {
          setTipIndex((prev) => (prev + 1) % TIPS.length);
          setCornerIndex((prev) => {
            // Pick a different corner
            const next = (prev + 1 + Math.floor(Math.random() * 3)) % 4;
            return next;
          });

          // Pause before next tip
          timeout = setTimeout(cycle, 1000);
        }, 700);
      }, 5500);
    }

    // Start first tip after 1.5s delay
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
          Finding your goldmine keywords...
        </h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          This usually takes 30-60 seconds
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
