import { useState, useRef, useEffect } from 'react';

interface FilterOption {
  label: string;
  value: string | number | null;
}

interface ColumnFilterProps {
  options: FilterOption[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  type?: 'select' | 'min' | 'max';
  customPlaceholder?: string;
}

export default function ColumnFilter({ options, value, onChange, type = 'min', customPlaceholder }: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = value !== null;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded text-[10px] transition ${
          isActive
            ? 'bg-jackpot-500 text-black'
            : 'text-gray-600 hover:text-gray-400'
        }`}
        title="Filter"
      >
        {isActive ? '\u2713' : '\u25BE'}
      </button>
      {open && (
        <div
          className="absolute top-6 left-0 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onChange(null); setOpen(false); setCustom(''); }}
            className={`w-full text-left px-3 py-1.5 text-sm transition ${
              value === null ? 'text-jackpot-400' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            Any
          </button>
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition ${
                value === opt.value ? 'text-jackpot-400' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {type !== 'select' && (
            <div className="px-3 py-1.5 border-t border-gray-700 mt-1">
              <div className="flex gap-1">
                <input
                  type="number"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder={customPlaceholder || 'Custom'}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500 outline-none focus:border-jackpot-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && custom) {
                      onChange(Number(custom));
                      setOpen(false);
                    }
                  }}
                />
                <button
                  onClick={() => { if (custom) { onChange(Number(custom)); setOpen(false); } }}
                  className="bg-jackpot-500 text-black text-xs font-bold px-2 rounded"
                >
                  Go
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
