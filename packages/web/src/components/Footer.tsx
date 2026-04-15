import { Link } from 'react-router-dom';

const PRODUCT_LINKS = [
  { to: '/', label: 'Keyword Research' },
  { to: '/seo-audit', label: 'SEO Audit' },
  { to: '/pricing', label: 'Pricing' },
];

const TOOL_LINKS = [
  { to: '/features/long-tail-keyword-generator', label: 'Long-Tail Generator' },
  { to: '/features/keyword-competition-checker', label: 'Competition Checker' },
  { to: '/features/competitor-keyword-research', label: 'Competitor Research' },
  { to: '/features/seo-audit', label: 'SEO Audit Tool' },
];

const RESOURCE_LINKS = [
  { to: '/blog', label: 'Blog' },
  { to: '/help', label: 'Help' },
];

const COMPANY_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/disclaimer', label: 'Disclaimer' },
];

interface ColumnProps {
  heading: string;
  links: { to: string; label: string }[];
}

function Column({ heading, links }: ColumnProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        {heading}
      </h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-sm text-gray-400 hover:text-jackpot-400 transition"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-800 bg-gray-950/60 mt-16">
      <div className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
          {/* Brand block */}
          <div className="md:col-span-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src="/logo-header.png" alt="JackpotKeywords" className="h-9" />
            </Link>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed max-w-xs">
              AI keyword research &amp; SEO audits — without the
              <span className="text-jackpot-400 font-medium"> SEMrush price tag</span>.
            </p>
          </div>

          {/* Link columns */}
          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            <Column heading="Product" links={PRODUCT_LINKS} />
            <Column heading="Tools" links={TOOL_LINKS} />
            <Column heading="Resources" links={RESOURCE_LINKS} />
            <Column heading="Company" links={COMPANY_LINKS} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 pt-6 border-t border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>&copy; {year} JackpotKeywords. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-gray-300 transition">Privacy</Link>
            <Link to="/terms" className="hover:text-gray-300 transition">Terms</Link>
            <a href="mailto:smythmyke@gmail.com" className="hover:text-gray-300 transition">
              smythmyke@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
