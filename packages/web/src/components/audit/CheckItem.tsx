import type { SeoAuditCheckItem } from '@jackpotkeywords/shared';

// Ordered longest-prefix-first to avoid false matches
const CHECK_EXPLANATIONS: [string, string][] = [
  ['internal_links', 'Internal links help search engines discover pages and spread ranking authority across your site'],
  ['meta_desc', 'This preview text appears under your link in search results — good descriptions improve click-through rates'],
  ['headings', 'Subheadings break content into sections, helping readers and search engines scan your page'],
  ['viewport', 'Without a viewport tag, your site won\'t display correctly on phones — Google prioritizes mobile-friendly pages'],
  ['canonical', 'Canonical tags prevent duplicate content issues when the same page is accessible from multiple URLs'],
  ['sitemap', 'A sitemap tells Google every page you want indexed — without one, pages can be missed'],
  ['noindex', 'A noindex tag tells Google to completely exclude this page from search results'],
  ['content', 'Pages under 300 words rarely rank well — Google considers them thin content with little value'],
  ['twitter', 'Twitter Card tags control your page\'s preview appearance when shared on Twitter/X'],
  ['robots', 'robots.txt guides search engine crawlers on which pages to access and which to skip'],
  ['jsonld', 'Structured data helps Google show rich results like star ratings, FAQs, and product info'],
  ['local', 'LocalBusiness schema helps Google show your address, hours, and phone in local search results and maps'],
  ['title', 'Titles over 60 characters get cut off in Google search results, reducing clicks'],
  ['about', 'An about page builds trust and supports Google\'s E-E-A-T quality signals'],
  ['blog', 'A blog helps you target informational keywords and builds topical authority over time'],
  ['spa', 'Search engines struggle to read JavaScript-only pages — server rendering ensures your content is visible to crawlers'],
  ['ssl', 'Google ranks secure sites higher and browsers show \'Not Secure\' warnings without HTTPS'],
  ['h2', 'Subheadings break content into sections, helping readers and search engines scan your page'],
  ['h1', 'The main headline tells Google what your page is about — exactly one per page is best practice'],
  ['og', 'Open Graph tags control how your page looks when shared on Facebook, LinkedIn, and other platforms'],
];

function getExplanation(checkId: string): string | undefined {
  const match = CHECK_EXPLANATIONS.find(([prefix]) => checkId.startsWith(prefix));
  return match?.[1];
}

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  pass: { icon: '\u2713', color: 'text-green-400' },
  warning: { icon: '!', color: 'text-yellow-400' },
  fail: { icon: '\u2717', color: 'text-red-400' },
  info: { icon: 'i', color: 'text-blue-400' },
};

interface CheckItemProps {
  check: SeoAuditCheckItem;
  paid: boolean;
}

export default function CheckItem({ check, paid }: CheckItemProps) {
  const status = STATUS_ICONS[check.status] || STATUS_ICONS.info;
  const isLocked = !paid && check.recommendation?.startsWith('\u2022\u2022\u2022');
  const explanation = getExplanation(check.id);

  return (
    <div className="flex gap-3 py-3 border-b border-gray-800/50 last:border-0">
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        check.status === 'pass' ? 'bg-green-400/10' :
        check.status === 'warning' ? 'bg-yellow-400/10' :
        check.status === 'fail' ? 'bg-red-400/10' :
        'bg-blue-400/10'
      } ${status.color}`}>
        {status.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{check.label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            check.priority === 'high' ? 'bg-red-400/10 text-red-400' :
            check.priority === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
            'bg-gray-800 text-gray-500'
          }`}>
            {check.priority}
          </span>
        </div>
        {explanation && (
          <p className="text-xs italic text-gray-500 mt-0.5">{explanation}</p>
        )}
        <p className="text-sm text-gray-400 mt-0.5">{check.details}</p>
        {check.recommendation && (
          <p className={`text-sm mt-1.5 ${isLocked ? 'text-gray-600 blur-sm select-none' : 'text-jackpot-400'}`}>
            {isLocked ? 'Upgrade to see specific recommendation for this issue' : check.recommendation}
          </p>
        )}
      </div>
    </div>
  );
}
