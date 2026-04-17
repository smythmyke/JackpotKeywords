import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { IdeaBoard as IdeaBoardType, IdeaBoardItem } from '@jackpotkeywords/shared';
import { useAuthContext } from '../contexts/AuthContext';
import { generateIdeaBoardApi, toggleIdeaItem } from '../services/api';

type SectionKey = 'content' | 'video' | 'reddit' | 'twitter' | 'linkedin' | 'seo';

const SECTIONS: { key: SectionKey; icon: string; label: string }[] = [
  { key: 'content', icon: '\u270D', label: 'Content' },
  { key: 'video', icon: '\u25B6', label: 'Videos' },
  { key: 'reddit', icon: '\uD83D\uDCAC', label: 'Reddit' },
  { key: 'twitter', icon: '\uD83D\uDC26', label: 'Twitter/X' },
  { key: 'linkedin', icon: '\uD83D\uDCBC', label: 'LinkedIn' },
  { key: 'seo', icon: '\uD83D\uDD27', label: 'SEO Actions' },
];

const SECTION_DESCS: Record<SectionKey, string> = {
  content: 'Blog posts, comparisons, and guides from your top keyword clusters.',
  video: 'YouTube topics from autocomplete data. Volume reflects YouTube-specific search interest.',
  reddit: 'Value-first posts for relevant subreddits. Build credibility, not spam.',
  twitter: 'Threads and standalone tweets. Hook-first format for engagement.',
  linkedin: 'Professional articles and posts. Data-driven, educational tone.',
  seo: 'Technical and on-site improvements from your keyword gaps and AEO scan.',
};

const TAG_COLORS: Record<string, string> = {
  Guide: 'bg-blue-500/20 text-blue-400',
  Comparison: 'bg-amber-500/20 text-amber-400',
  FAQ: 'bg-blue-500/20 text-blue-400',
  Tutorial: 'bg-blue-500/20 text-blue-400',
  Landing: 'bg-amber-500/20 text-amber-400',
  Easy: 'bg-green-500/20 text-green-400',
  Medium: 'bg-amber-500/20 text-amber-400',
  Hard: 'bg-red-500/20 text-red-400',
  High: 'bg-red-500/20 text-red-400',
  Low: 'bg-green-500/20 text-green-400',
};

export default function IdeaBoard() {
  const location = useLocation();
  const { searchId } = useParams<{ searchId: string }>();
  const { user, getToken } = useAuthContext();
  const [board, setBoard] = useState<IdeaBoardType | null>(
    (location.state as any)?.board || null,
  );
  const [loading, setLoading] = useState(!board);
  const [activeSection, setActiveSection] = useState<SectionKey>('content');
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());
  const [pdfExporting, setPdfExporting] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load board if not passed via state
  useEffect(() => {
    if (board || !searchId || !user) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const result = await generateIdeaBoardApi(token, { searchId });
        setBoard(result);
      } catch (err: any) {
        console.error('Failed to load idea board:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchId, user, board]);

  // Spy-scroll for quick nav
  useEffect(() => {
    const handler = () => {
      for (const sec of [...SECTIONS].reverse()) {
        const el = sectionRefs.current[sec.key];
        if (el && el.getBoundingClientRect().top <= 140) {
          setActiveSection(sec.key);
          break;
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (!searchId) return <Navigate to="/" replace />;
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Generating your Idea Board...</p>
      </div>
    );
  }
  if (!board) return <Navigate to="/" replace />;

  const itemsByType = (type: SectionKey) => board.items.filter((i) => i.type === type);
  const countForType = (type: SectionKey) => {
    const items = itemsByType(type);
    return { done: items.filter((i) => i.completed).length, total: items.length };
  };
  const totalDone = board.items.filter((i) => i.completed).length;

  async function handleToggle(item: IdeaBoardItem) {
    const newCompleted = !item.completed;
    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) => i.id === item.id ? { ...i, completed: newCompleted } : i),
      };
    });
    // Persist
    try {
      const token = await getToken();
      if (token && board) await toggleIdeaItem(token, board.id, item.id, newCompleted);
    } catch {
      // Revert on failure
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) => i.id === item.id ? { ...i, completed: !newCompleted } : i),
        };
      });
    }
  }

  function toggleDraft(id: string) {
    setExpandedDrafts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const handleExportPdf = async () => {
    setPdfExporting(true);
    try {
      const { exportIdeaBoardPdf } = await import('../services/pdfExport');
      await exportIdeaBoardPdf(board);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setPdfExporting(false);
    }
  };

  function renderTag(label: string | undefined) {
    if (!label) return null;
    const color = TAG_COLORS[label] || 'bg-gray-700/50 text-gray-400';
    return <span className={`text-[0.65rem] px-2 py-0.5 rounded font-medium ${color}`}>{label}</span>;
  }

  function renderItem(item: IdeaBoardItem) {
    return (
      <div key={item.id} className="flex gap-3 py-3 border-b border-gray-800/50 last:border-b-0">
        <button
          onClick={() => handleToggle(item)}
          className={`w-5 h-5 shrink-0 mt-0.5 border-2 rounded cursor-pointer flex items-center justify-center transition ${
            item.completed
              ? 'bg-green-500 border-green-500'
              : 'border-gray-600 hover:border-jackpot-500'
          }`}
        >
          {item.completed && <span className="text-white text-xs font-bold">{'\u2713'}</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm mb-1">{item.title}</div>
          <div className="flex gap-1.5 flex-wrap">
            {renderTag(item.contentType)}
            {renderTag(item.difficulty)}
            {renderTag(item.impact)}
            {item.trafficEstimate && <span className="text-[0.65rem] px-2 py-0.5 rounded bg-gray-700/50 text-gray-400">{item.trafficEstimate}</span>}
            {item.videoFormat && <span className="text-[0.65rem] px-2 py-0.5 rounded bg-gray-700/50 text-gray-400">{item.videoFormat}</span>}
            {item.youtubeVolume && <span className="text-[0.65rem] px-2 py-0.5 rounded bg-gray-700/50 text-gray-400">{item.youtubeVolume}</span>}
            {item.platform && <span className="text-[0.65rem] px-2 py-0.5 rounded bg-gray-700/50 text-gray-400">{item.platform}</span>}
            {item.source && <span className="text-[0.65rem] px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">{item.source}</span>}
          </div>
          {item.targetKeywords && (
            <div className="text-gray-600 text-xs mt-1">{item.targetKeywords}</div>
          )}
          {item.draftBody && (
            <>
              <button
                onClick={() => toggleDraft(item.id)}
                className="text-jackpot-400 text-xs mt-1.5 hover:underline"
              >
                {expandedDrafts.has(item.id) ? 'Hide draft \u25B4' : 'View draft \u25BE'}
              </button>
              {expandedDrafts.has(item.id) && (
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 mt-2 text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">
                  {item.draftBody}
                  {item.draftMeta && item.draftMeta.length > 0 && (
                    <div className="flex gap-3 mt-3 text-[0.65rem] text-gray-600 flex-wrap">
                      {item.draftMeta.map((m, i) => <span key={i}>{m}</span>)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Idea Board: {board.productName} — JackpotKeywords</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Quick Nav */}
      <div className="sticky top-[56px] z-40 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex gap-1.5 flex-wrap">
          {SECTIONS.map((sec) => {
            const { done, total } = countForType(sec.key);
            if (total === 0) return null;
            return (
              <a
                key={sec.key}
                href={`#sec-${sec.key}`}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                  activeSection === sec.key
                    ? 'border-jackpot-500 text-jackpot-400 bg-jackpot-500/10'
                    : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                {sec.icon} {sec.label}{' '}
                <span className={`ml-0.5 ${done > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                  {done}/{total}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link
              to={`/results/${searchId}`}
              className="text-sm text-gray-500 hover:text-gray-300 transition mb-3 inline-block"
            >
              &larr; Back to Keywords
            </Link>
            <h1 className="text-2xl font-bold">
              Idea Board: <span className="text-jackpot-400">{board.productName}</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {totalDone} of {board.items.length} items completed &middot; {board.domain}
            </p>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={pdfExporting}
            className="mt-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {pdfExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>

        {/* Sections */}
        {SECTIONS.map((sec) => {
          const items = itemsByType(sec.key);
          if (items.length === 0) return null;
          return (
            <div
              key={sec.key}
              id={`sec-${sec.key}`}
              ref={(el) => { sectionRefs.current[sec.key] = el; }}
              className="mb-10 scroll-mt-[120px]"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{sec.icon}</span>
                <h2 className="text-lg font-bold text-white">{sec.label}</h2>
              </div>
              <p className="text-gray-600 text-xs mb-4">{SECTION_DESCS[sec.key]}</p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-2">
                {items.map(renderItem)}
              </div>
            </div>
          );
        })}

        {/* Bottom CTA */}
        <div className="mt-12 p-8 bg-gray-900 border border-gray-800 rounded-xl text-center">
          <h2 className="text-xl font-bold mb-3">
            Board complete? <span className="text-jackpot-400">Run another search.</span>
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Each keyword search generates a fresh Idea Board tailored to your product.
          </p>
          <Link
            to="/"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3 rounded-xl text-lg transition"
          >
            New Keyword Search &rarr;
          </Link>
        </div>
      </div>
    </>
  );
}
