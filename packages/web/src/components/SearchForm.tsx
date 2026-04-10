import { useState, useMemo } from 'react';
import { US_CITIES } from '../data/usCities';

interface SearchFormProps {
  onSearch: (description: string, url: string, maxCpc?: number, location?: string) => void;
  loading?: boolean;
  initialDescription?: string;
}

export default function SearchForm({ onSearch, loading, initialDescription }: SearchFormProps) {
  const [description, setDescription] = useState(initialDescription || '');
  const [url, setUrl] = useState('');
  const [maxCpc, setMaxCpc] = useState<number | undefined>();
  const [showMaxCpc, setShowMaxCpc] = useState(false);
  const [includeLocal, setIncludeLocal] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const citySuggestions = useMemo(() => {
    if (!locationInput.trim() || locationInput.length < 2) return [];
    const q = locationInput.toLowerCase();
    return US_CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [locationInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !isValidUrl(url)) return;
    let normalizedUrl = url.trim();
    if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    onSearch(description, normalizedUrl, maxCpc, includeLocal && locationInput.trim() ? locationInput.trim() : undefined);
  };

  const isValidUrl = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) return false;
    return /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-4">
      <div>
        <label className="block text-base font-semibold text-white mb-2">
          Describe your product, service, or idea
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., OBServe is a free desktop companion for OBS Studio that auto-detects audio devices, configures settings, and monitors stream performance. Built with Tauri/Rust, targets streamers, YouTubers, and podcasters."
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500 focus:ring-1 focus:ring-jackpot-500 resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-600">
            Describe what it does, who it's for, and what makes it different
          </span>
          <span className={`text-xs ${description.length > 500 ? 'text-yellow-500' : 'text-gray-600'}`}>
            {description.length} / 500
          </span>
        </div>
      </div>

      <div>
        <label className="block text-base font-semibold text-white mb-2">
          OR enter a URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="e.g., markitup.app or https://markitup.app"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500 focus:ring-1 focus:ring-jackpot-500"
        />
      </div>

      <div>
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
      </div>

      <div>
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

      <button
        type="submit"
        disabled={loading || (!description.trim() && !isValidUrl(url))}
        className="w-full bg-jackpot-500 hover:bg-jackpot-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3.5 rounded-xl text-lg transition"
      >
        {loading ? 'Searching...' : 'Find Goldmine Keywords'}
      </button>
    </form>
  );
}
