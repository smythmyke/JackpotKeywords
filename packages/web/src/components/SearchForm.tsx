import { useState, useMemo, useEffect, useRef } from 'react';
import { US_CITIES } from '../data/usCities';

interface SearchFormProps {
  onSearch: (description: string, url: string, maxCpc?: number, location?: string) => void;
  loading?: boolean;
  initialDescription?: string;
  initialUrl?: string;
}

// Context signals — bump the strength score when a description mentions
// where the product lives, who it's for, or how it's monetized. These are
// the patterns that turn a 3-word topic into a usable seed for the pipeline.
const PLATFORMS = /\b(amazon|shopify|etsy|ebay|youtube|instagram|tiktok|reddit|pinterest|chrome web store|app store|google play|woocommerce|wordpress|gumroad|substack)\b/i;
const AUDIENCE = /\b(for|who|customers?|users?|audience|target(ed|s)?|gen[-\s]?z|millennials?|seniors|parents?|kids|teens|moms|dads|students|professionals|developers|designers|streamers|youtubers|podcasters)\b/i;
const PURPOSE = /\b(sell|sells?|selling|sold|buy|buyers?|monetize|monetized?|revenue|business|brand|offer(ing|s)?|service)\b/i;

type Zone = 'empty' | 'weak' | 'moderate' | 'strong';

function scoreDescription(text: string): { total: number; zone: Zone; label: string } {
  const t = text || '';
  const trimmed = t.trim();
  const chars = trimmed.length;
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const ctx =
    (PLATFORMS.test(t) ? 1 : 0) + (AUDIENCE.test(t) ? 1 : 0) + (PURPOSE.test(t) ? 1 : 0);

  const charsPts = Math.min(chars / 100, 1) * 40;
  const wordsPts = Math.min(words / 12, 1) * 30;
  const ctxPts = Math.min(ctx, 3) * 10;
  const total = Math.round(charsPts + wordsPts + ctxPts);

  if (total === 0) return { total, zone: 'empty', label: 'Empty' };
  if (total < 35) return { total, zone: 'weak', label: 'Weak' };
  if (total < 70) return { total, zone: 'moderate', label: 'Getting there' };
  return { total, zone: 'strong', label: 'Strong' };
}

const ZONE_LABEL_COLOR: Record<Zone, string> = {
  empty: 'text-gray-500',
  weak: 'text-red-400',
  moderate: 'text-yellow-400',
  strong: 'text-green-400',
};

// One-shot nudge — only fires once per browser session so return visits
// don't keep flashing at users who already know the feature exists.
const NUDGE_KEY = 'jk_url_nudge_shown_v1';

export default function SearchForm({ onSearch, loading, initialDescription, initialUrl }: SearchFormProps) {
  const [description, setDescription] = useState(initialDescription || '');
  const [url, setUrl] = useState(initialUrl || '');
  const [maxCpc, setMaxCpc] = useState<number | undefined>();
  const [showMaxCpc, setShowMaxCpc] = useState(false);
  const [includeLocal, setIncludeLocal] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [nudgeActive, setNudgeActive] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showFloorHint, setShowFloorHint] = useState(false);
  const [shake, setShake] = useState(false);

  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
  }, []);

  const strength = useMemo(() => scoreDescription(description), [description]);

  const citySuggestions = useMemo(() => {
    if (!locationInput.trim() || locationInput.length < 2) return [];
    const q = locationInput.toLowerCase();
    return US_CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [locationInput]);

  const isValidUrl = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) return false;
    return /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(trimmed);
  };

  // Hard floor: submission allowed when description has ≥10 real chars OR URL parses.
  // Catches the "clicked Search with nothing / garbage" case without blocking legit
  // short-tail queries like "dog training Austin" (URL-optional sanity check only).
  const canSubmit = description.trim().length >= 10 || isValidUrl(url);

  useEffect(() => {
    if (canSubmit && showFloorHint) setShowFloorHint(false);
  }, [canSubmit, showFloorHint]);

  const triggerNudge = () => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(NUDGE_KEY)) return;
    } catch {
      // sessionStorage unavailable (private mode, etc.) — fine, just don't persist.
    }
    if (url.trim().length > 0) return;
    try {
      sessionStorage.setItem(NUDGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setNudgeActive(true);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => setNudgeActive(false), 4000);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTyping(false), 700);
    if (e.target.value.trim().length >= 2) triggerNudge();
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (nudgeActive) {
      setNudgeActive(false);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    }
  };

  const fireShakeAndHint = () => {
    setShake(true);
    setShowFloorHint(true);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      fireShakeAndHint();
      return;
    }
    let normalizedUrl = url.trim();
    if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    onSearch(description, normalizedUrl, maxCpc, includeLocal && locationInput.trim() ? locationInput.trim() : undefined);
  };

  // Clicking the disabled button (pointer events get through via wrapping div)
  // still triggers the shake + hint so users understand why nothing happened.
  const handleSubmitWrapperClick = () => {
    if (loading) return;
    if (!canSubmit) fireShakeAndHint();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-4">
      <div>
        <label className="block text-base font-semibold text-white mb-2">
          Describe your product, service, or idea
        </label>
        <textarea
          value={description}
          onChange={handleDescriptionChange}
          placeholder="e.g., OBServe is a free desktop companion for OBS Studio that auto-detects audio devices, configures settings, and monitors stream performance. Built with Tauri/Rust, targets streamers, YouTubers, and podcasters."
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500 focus:ring-1 focus:ring-jackpot-500 resize-none"
        />
        {description.length > 0 && (
          <>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className={`strength-fill ${typing ? 'typing' : ''}`}
                  style={{ width: `${strength.total}%` }}
                  aria-hidden="true"
                />
              </div>
              <span
                className={`text-xs font-semibold min-w-[90px] text-right ${ZONE_LABEL_COLOR[strength.zone]}`}
                aria-live="polite"
              >
                {strength.label}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-600">
                Describe what it does, who it's for, and what makes it different
              </span>
              <span className={`text-xs ${description.length > 500 ? 'text-yellow-500' : 'text-gray-600'}`}>
                {description.length} / 500
              </span>
            </div>
          </>
        )}
      </div>

      <div>
        <label className="block text-base font-semibold text-white mb-2">
          OR enter a URL
        </label>
        <div className="relative">
          <div
            className={`pointer-events-none absolute left-0 right-0 -top-11 flex justify-center transition-all duration-300 ${
              nudgeActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            }`}
            aria-hidden={!nudgeActive}
          >
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold text-jackpot-400 border border-jackpot-400/50 shadow-lg" style={{ background: 'linear-gradient(180deg, #2a1f0a 0%, #1f170b 100%)' }}>
              <span aria-hidden="true">⚡</span>
              <span className="w-1.5 h-1.5 rounded-full bg-jackpot-400 shadow-[0_0_8px_#fbbf24]" />
              Get more accurate keywords using your URL
            </div>
          </div>
          <div
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -top-3 transition-opacity duration-300 ${
              nudgeActive ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v10m0 0L2 7m5 4l5-4" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <input
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="e.g., markitup.app or https://markitup.app"
            className={`w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500 focus:ring-1 focus:ring-jackpot-500 transition-colors ${
              nudgeActive ? 'jk-url-nudge' : ''
            }`}
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-gray-300 transition">
            <input
              type="checkbox"
              checked={showMaxCpc}
              onChange={(e) => {
                setShowMaxCpc(e.target.checked);
                if (!e.target.checked) setMaxCpc(undefined);
              }}
              className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-jackpot-500 focus:ring-jackpot-500 focus:ring-offset-0 cursor-pointer"
            />
            Set max CPC
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-gray-300 transition">
            <input
              type="checkbox"
              checked={includeLocal}
              onChange={(e) => {
                setIncludeLocal(e.target.checked);
                if (!e.target.checked) {
                  setLocationInput('');
                  setShowCitySuggestions(false);
                }
              }}
              className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-jackpot-500 focus:ring-jackpot-500 focus:ring-offset-0 cursor-pointer"
            />
            Include local keywords
          </label>
        </div>
        {showMaxCpc && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-400">Hide keywords above</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                step="0.50"
                min="0"
                value={maxCpc ?? ''}
                onChange={(e) => setMaxCpc(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2.00"
                className="w-28 bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500"
              />
            </div>
            <span className="text-sm text-gray-400">per click</span>
          </div>
        )}
        {includeLocal && (
          <div className="mt-2 relative">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => {
                setLocationInput(e.target.value);
                setShowCitySuggestions(true);
              }}
              onFocus={() => setShowCitySuggestions(true)}
              onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
              placeholder="e.g., Denver, CO"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500"
            />
            {showCitySuggestions && citySuggestions.length > 0 && (
              <ul className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {citySuggestions.map((city) => (
                  <li
                    key={city}
                    onMouseDown={() => {
                      setLocationInput(city);
                      setShowCitySuggestions(false);
                    }}
                    className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    {city}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="relative" onClick={handleSubmitWrapperClick}>
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className={`w-full bg-jackpot-500 hover:bg-jackpot-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl text-lg transition ${
            shake ? 'jk-shake' : ''
          }`}
        >
          {loading ? 'Searching...' : 'Find Jackpot Keywords'}
        </button>
        <div
          className={`mt-2 flex items-center justify-center gap-1.5 text-sm text-red-400 transition-all duration-200 ${
            showFloorHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
          }`}
          role="alert"
          aria-live="polite"
        >
          <span aria-hidden="true">⚠</span>
          <span>Add more detail or paste a URL to begin.</span>
        </div>
      </div>
    </form>
  );
}
