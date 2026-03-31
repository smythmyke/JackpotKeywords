import { useState } from 'react';

interface SearchFormProps {
  onSearch: (description: string, url: string, budget?: number) => void;
  loading?: boolean;
  initialDescription?: string;
}

const BUDGET_PRESETS = [
  { label: 'No budget', value: undefined },
  { label: '$100-300/mo', value: 200 },
  { label: '$300-500/mo', value: 400 },
  { label: '$500-1000/mo', value: 750 },
  { label: '$1000+/mo', value: 1500 },
];

export default function SearchForm({ onSearch, loading, initialDescription }: SearchFormProps) {
  const [description, setDescription] = useState(initialDescription || '');
  const [url, setUrl] = useState('');
  const [budget, setBudget] = useState<number | undefined>();
  const [showBudget, setShowBudget] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !isValidUrl(url)) return;
    let normalizedUrl = url.trim();
    if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    onSearch(description, normalizedUrl, budget);
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
        <button
          type="button"
          onClick={() => setShowBudget(!showBudget)}
          className="text-sm text-gray-500 hover:text-gray-300 transition"
        >
          {showBudget ? 'Hide budget options' : 'Set ad budget (optional)'}
        </button>
        {showBudget && (
          <div className="mt-2 flex flex-wrap gap-2">
            {BUDGET_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setBudget(preset.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  budget === preset.value
                    ? 'bg-jackpot-500 text-black font-medium'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <input
              type="number"
              value={budget && !BUDGET_PRESETS.find(p => p.value === budget) ? budget : ''}
              onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Custom $/mo"
              className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500"
            />
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
