import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import UpgradePrompt from './UpgradePrompt';
import './ConversionModal.css';

export type ConversionModalVariant = 'anonymous' | 'free' | 'lastFreeSearch';

export interface ConversionModalMetricsData {
  jackpots: number;
  goldmines: number;
  totalVolume: number;
  avgCpcCents: number;
  totalKeywords: number;
}

export interface ConversionModalTopRow {
  score: number;
  cpc: number;
  volume: number;
}

interface ConversionModalProps {
  open: boolean;
  onClose: () => void;
  onCta: () => void;
  variant: ConversionModalVariant;
  metrics: ConversionModalMetricsData;
  topThree: ConversionModalTopRow[];
}

type NumberFormat = 'int' | 'compact' | 'currency';

interface MetricConfig {
  label: string;
  target: number;
  format: NumberFormat;
  color: string;
  sub: string;
  confetti: string[];
}

function formatNumber(value: number, format: NumberFormat): string {
  if (format === 'currency') return '$' + (value / 100).toFixed(2);
  if (format === 'compact') {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (value >= 1_000) return Math.round(value / 1000) + 'K';
    return String(Math.round(value));
  }
  return String(Math.round(value));
}

function zeroFor(format: NumberFormat): string {
  return format === 'currency' ? '$0.00' : '0';
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function ConversionModal({
  open,
  onClose,
  onCta,
  variant,
  metrics,
  topThree,
}: ConversionModalProps) {
  const [mounted, setMounted] = useState(false);

  // DOM refs
  const modalRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const spotlightValueRef = useRef<HTMLDivElement>(null);
  const spotlightLabelRef = useRef<HTMLDivElement>(null);
  const spotlightSubRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const tile0Ref = useRef<HTMLDivElement>(null);
  const tile1Ref = useRef<HTMLDivElement>(null);
  const tile2Ref = useRef<HTMLDivElement>(null);
  const tile3Ref = useRef<HTMLDivElement>(null);
  const num0Ref = useRef<HTMLDivElement>(null);
  const num1Ref = useRef<HTMLDivElement>(null);
  const num2Ref = useRef<HTMLDivElement>(null);
  const num3Ref = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const topFindsRef = useRef<HTMLDivElement>(null);
  const ctaBlockRef = useRef<HTMLDivElement>(null);
  const skipHintRef = useRef<HTMLDivElement>(null);

  // Sequence state refs
  const skippedRef = useRef(false);
  const sequenceDoneRef = useRef(false);
  const snapRef = useRef<(() => void) | null>(null);
  const pendingWaitsRef = useRef<
    Array<{ id: ReturnType<typeof setTimeout>; resolve: () => void; done: boolean }>
  >([]);

  // Trigger entrance transition after initial render
  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Run the reveal sequence when modal is open and mounted
  useEffect(() => {
    if (!open || !mounted) return;

    skippedRef.current = false;
    sequenceDoneRef.current = false;
    pendingWaitsRef.current = [];

    const metricConfigs: MetricConfig[] = [
      {
        label: 'Jackpots',
        target: metrics.jackpots,
        format: 'int',
        color: '#fbbf24',
        sub: 'Score 75+ — high volume, low cost, low competition',
        confetti: ['#fbbf24', '#fcd34d', '#f59e0b', '#ffffff'],
      },
      {
        label: 'Goldmines',
        target: metrics.goldmines,
        format: 'int',
        color: '#22c55e',
        sub: 'Under $1 CPC with 100+ searches per month',
        confetti: ['#22c55e', '#86efac', '#16a34a', '#ffffff'],
      },
      {
        label: 'Total Volume',
        target: metrics.totalVolume,
        format: 'compact',
        color: '#ffffff',
        sub: 'Combined monthly searches across all keywords',
        confetti: ['#ffffff', '#e5e7eb', '#d1d5db', '#fbbf24'],
      },
      {
        label: 'Avg CPC',
        target: metrics.avgCpcCents,
        format: 'currency',
        color: '#60a5fa',
        sub: 'Average cost per click if you ran paid ads',
        confetti: ['#60a5fa', '#93c5fd', '#3b82f6', '#ffffff'],
      },
    ];
    const tileRefs = [tile0Ref, tile1Ref, tile2Ref, tile3Ref];
    const numRefs = [num0Ref, num1Ref, num2Ref, num3Ref];

    // Reset all visual state for a fresh run
    tileRefs.forEach((t) => t.current?.classList.remove('cm-filled'));
    metricConfigs.forEach((m, i) => {
      const el = numRefs[i].current;
      if (el) el.textContent = zeroFor(m.format);
    });
    gridRef.current?.classList.remove('cm-show');
    if (spotlightRef.current) {
      spotlightRef.current.style.transition = 'none';
      spotlightRef.current.style.transform = 'none';
      spotlightRef.current.style.opacity = '0';
    }
    headlineRef.current?.classList.remove('cm-show');
    topFindsRef.current?.classList.remove('cm-show');
    ctaBlockRef.current?.classList.remove('cm-show');

    function wait(ms: number): Promise<void> {
      return new Promise((resolve) => {
        if (skippedRef.current) return resolve();
        const entry = { id: 0 as unknown as ReturnType<typeof setTimeout>, resolve, done: false };
        entry.id = setTimeout(() => {
          entry.done = true;
          resolve();
        }, ms);
        pendingWaitsRef.current.push(entry);
      });
    }

    function cancelAllWaits() {
      while (pendingWaitsRef.current.length) {
        const e = pendingWaitsRef.current.shift();
        if (e && !e.done) {
          clearTimeout(e.id);
          e.resolve();
        }
      }
    }

    function animateCount(
      el: HTMLElement,
      target: number,
      format: NumberFormat,
      duration = 1000,
    ): Promise<void> {
      return new Promise((resolve) => {
        const start = performance.now();
        function frame(now: number) {
          if (skippedRef.current) {
            el.textContent = formatNumber(target, format);
            return resolve();
          }
          const elapsed = now - start;
          const progress = Math.min(1, elapsed / duration);
          const eased = easeOutCubic(progress);
          el.textContent = formatNumber(target * eased, format);
          if (progress < 1) requestAnimationFrame(frame);
          else {
            el.textContent = formatNumber(target, format);
            resolve();
          }
        }
        requestAnimationFrame(frame);
      });
    }

    function fireConfettiAt(el: HTMLElement, colors: string[]) {
      const rect = el.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 35,
        spread: 60,
        startVelocity: 22,
        gravity: 0.9,
        ticks: 120,
        origin: { x, y },
        colors,
        zIndex: 100,
        disableForReducedMotion: true,
      });
    }

    async function playMetric(idx: number) {
      if (skippedRef.current) return;
      const m = metricConfigs[idx];
      const tile = tileRefs[idx].current;
      const numEl = numRefs[idx].current;
      const spotlight = spotlightRef.current;
      const spotlightValue = spotlightValueRef.current;
      const spotlightLabel = spotlightLabelRef.current;
      const spotlightSub = spotlightSubRef.current;
      if (!tile || !numEl || !spotlight || !spotlightValue || !spotlightLabel || !spotlightSub) return;

      spotlightValue.style.color = m.color;
      spotlightValue.textContent = zeroFor(m.format);
      spotlightLabel.textContent = m.label;
      spotlightSub.textContent = m.sub;

      spotlight.style.transition = 'none';
      spotlight.style.transform = 'none';
      spotlight.style.opacity = '0';
      // Force reflow so the next transition starts cleanly
      void spotlight.offsetWidth;

      spotlight.style.transition = 'opacity 260ms ease';
      spotlight.style.opacity = '1';
      await wait(260);
      if (skippedRef.current) return;

      await animateCount(spotlightValue, m.target, m.format, 1000);
      if (skippedRef.current) return;

      await wait(160);
      if (skippedRef.current) return;

      if (idx === 0) gridRef.current?.classList.add('cm-show');

      const sRect = spotlight.getBoundingClientRect();
      const tRect = tile.getBoundingClientRect();
      const dx = tRect.left + tRect.width / 2 - (sRect.left + sRect.width / 2);
      const dy = tRect.top + tRect.height / 2 - (sRect.top + sRect.height / 2);
      const scale =
        Math.min(tRect.height / sRect.height, tRect.width / sRect.width) * 0.72;

      spotlight.style.transition =
        'transform 520ms cubic-bezier(.25,.75,.3,1), opacity 260ms ease 260ms';
      spotlight.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      spotlight.style.opacity = '0';

      await wait(300);
      if (skippedRef.current) return;

      numEl.textContent = formatNumber(m.target, m.format);
      tile.classList.add('cm-filled');
      fireConfettiAt(tile, m.confetti);

      await wait(240);
    }

    async function revealEnd() {
      if (skippedRef.current) return;
      headlineRef.current?.classList.add('cm-show');
      await wait(260);
      if (skippedRef.current) return;
      topFindsRef.current?.classList.add('cm-show');
      await wait(200);
      if (skippedRef.current) return;
      ctaBlockRef.current?.classList.add('cm-show');
    }

    function snapToEnd() {
      if (sequenceDoneRef.current) return;
      skippedRef.current = true;
      cancelAllWaits();
      if (spotlightRef.current) {
        spotlightRef.current.style.transition = 'none';
        spotlightRef.current.style.transform = 'none';
        spotlightRef.current.style.opacity = '0';
      }
      gridRef.current?.classList.add('cm-show');
      metricConfigs.forEach((m, i) => {
        const el = numRefs[i].current;
        if (el) el.textContent = formatNumber(m.target, m.format);
        tileRefs[i].current?.classList.add('cm-filled');
      });
      headlineRef.current?.classList.add('cm-show');
      topFindsRef.current?.classList.add('cm-show');
      ctaBlockRef.current?.classList.add('cm-show');
      skipHintRef.current?.classList.remove('cm-visible');
      sequenceDoneRef.current = true;
    }

    snapRef.current = snapToEnd;

    const startDelay = setTimeout(async () => {
      skipHintRef.current?.classList.add('cm-visible');
      for (let i = 0; i < metricConfigs.length; i++) {
        if (skippedRef.current) break;
        await playMetric(i);
      }
      if (!skippedRef.current) await revealEnd();
      sequenceDoneRef.current = true;
      skipHintRef.current?.classList.remove('cm-visible');
    }, 360);

    return () => {
      clearTimeout(startDelay);
      skippedRef.current = true;
      cancelAllWaits();
      snapRef.current = null;
    };
  }, [
    open,
    mounted,
    metrics.jackpots,
    metrics.goldmines,
    metrics.totalVolume,
    metrics.avgCpcCents,
  ]);

  // Keyboard handling: Escape closes, any other key skips the animation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (!sequenceDoneRef.current) {
        snapRef.current?.();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (sequenceDoneRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a')) return;
    snapRef.current?.();
  };

  const handleCtaClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onCta();
  };

  // Variant-driven copy
  const totalKwLabel = metrics.totalKeywords.toLocaleString();
  const ctaLabel = `Unlock all ${totalKwLabel} keywords — $1.99`;
  const eyebrow = 'Search Complete';

  return (
    <div
      className={`cm-backdrop${open && mounted ? ' cm-show' : ''}`}
      onClick={handleBackdropClick}
      aria-hidden={!open}
    >
      <div
        className="cm-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={handleModalClick}
      >
        <button className="cm-close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        <div className="cm-eyebrow">
          <span>{eyebrow}</span>
        </div>

        <div className="cm-stage">
          <div className="cm-grid" ref={gridRef}>
            <div className="cm-tile" ref={tile0Ref}>
              <div className="cm-value-row">
                <svg className="cm-jackpot-icon" viewBox="0 0 24 24" fill="none">
                  <ellipse cx="12" cy="18" rx="8" ry="4" fill="#d97706" />
                  <ellipse cx="12" cy="16" rx="8" ry="4" fill="#f59e0b" />
                  <ellipse cx="12" cy="14" rx="6" ry="3" fill="#fbbf24" />
                  <circle cx="10" cy="12" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
                  <circle cx="14" cy="11" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
                  <circle cx="12" cy="9" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
                </svg>
                <div className="cm-n cm-jackpot" ref={num0Ref}>
                  0
                </div>
              </div>
              <div className="cm-lbl">Jackpots</div>
              <div className="cm-sub">Score 75+ · low cost, low competition</div>
            </div>
            <div className="cm-tile" ref={tile1Ref}>
              <div className="cm-n cm-green" ref={num1Ref}>
                0
              </div>
              <div className="cm-lbl">Goldmines</div>
              <div className="cm-sub">Under $1 CPC · 100+ searches/mo</div>
            </div>
            <div className="cm-tile" ref={tile2Ref}>
              <div className="cm-n cm-white" ref={num2Ref}>
                0
              </div>
              <div className="cm-lbl">Total Volume</div>
              <div className="cm-sub">Monthly searches combined</div>
            </div>
            <div className="cm-tile" ref={tile3Ref}>
              <div className="cm-n cm-blue" ref={num3Ref}>
                $0.00
              </div>
              <div className="cm-lbl">Avg CPC</div>
              <div className="cm-sub">Cost per click if running ads</div>
            </div>
          </div>

          <div className="cm-spotlight-wrap">
            <div className="cm-spotlight" ref={spotlightRef}>
              <div className="cm-value" ref={spotlightValueRef}>
                0
              </div>
              <div className="cm-label" ref={spotlightLabelRef}>
                Jackpots
              </div>
              <div className="cm-sub" ref={spotlightSubRef}>
                Score 75+ — high volume, low cost, low competition
              </div>
            </div>
          </div>
        </div>

        <h2 className="cm-headline cm-late" ref={headlineRef}>
          This search found <span className="cm-hl-count">{totalKwLabel}</span> keywords
        </h2>

        {topThree.length > 0 && (
          <div className="cm-top-finds cm-late" ref={topFindsRef}>
            <div className="cm-top-finds-title">Top 3 Jackpot Keywords</div>
            <div className="cm-top-head">
              <span></span>
              <span>Score</span>
              <span>CPC</span>
              <span>Volume</span>
            </div>
            {topThree.map((row, i) => (
              <div className="cm-top-row" key={i}>
                <span className="cm-rank">#{i + 1}</span>
                <span className="cm-val">{row.score}</span>
                <span className="cm-val">${row.cpc.toFixed(2)}</span>
                <span className="cm-val">{row.volume.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <div className="cm-cta-block cm-late" ref={ctaBlockRef}>
          <UpgradePrompt
            mode="modal"
            keywordCount={metrics.totalKeywords}
            onPurchaseStart={onClose}
            onDismiss={onClose}
          />
        </div>

        <div className="cm-skip-hint" ref={skipHintRef}>
          Click anywhere to skip
        </div>
      </div>
    </div>
  );
}
