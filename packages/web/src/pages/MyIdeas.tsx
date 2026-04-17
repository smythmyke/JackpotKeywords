import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { IdeaBoard } from '@jackpotkeywords/shared';
import { useAuthContext } from '../contexts/AuthContext';
import { listIdeaBoards } from '../services/api';

const TYPE_LABELS: Record<string, string> = {
  content: 'Content',
  video: 'Videos',
  reddit: 'Social',
  twitter: 'Social',
  linkedin: 'Social',
  seo: 'SEO',
};

export default function MyIdeas() {
  const { user, getToken } = useAuthContext();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<IdeaBoard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const result = await listIdeaBoards(token);
        setBoards(result.boards || []);
      } catch (err) {
        console.error('Failed to load idea boards:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  function getSectionCounts(board: IdeaBoard) {
    const counts: Record<string, { done: number; total: number }> = {};
    for (const item of board.items) {
      // Merge reddit/twitter/linkedin into "social"
      const group = ['reddit', 'twitter', 'linkedin'].includes(item.type) ? 'social' : item.type;
      if (!counts[group]) counts[group] = { done: 0, total: 0 };
      counts[group].total++;
      if (item.completed) counts[group].done++;
    }
    return counts;
  }

  function getTotalProgress(board: IdeaBoard) {
    const total = board.items.length;
    const done = board.items.filter((i) => i.completed).length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Helmet><title>My Ideas — JackpotKeywords</title></Helmet>
        <h1 className="text-2xl font-bold text-white mb-4">My Ideas</h1>
        <p className="text-gray-400 mb-6">Sign in to view your saved idea boards.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>My Ideas — JackpotKeywords</title></Helmet>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-white mb-1">My Ideas</h1>
        <p className="text-gray-500 text-sm mb-8">Content plans and social drafts generated from your keyword searches.</p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-jackpot-400/30 border-t-jackpot-400 rounded-full animate-spin" />
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl opacity-30 mb-4">💡</div>
            <h2 className="text-lg font-bold text-white mb-2">No idea boards yet</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Run a keyword search and click the Idea Board button to generate content plans, video ideas, and social media drafts.
            </p>
            <Link
              to="/"
              className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-6 py-3 rounded-xl transition"
            >
              Run a Keyword Search &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {boards.map((board) => {
              const progress = getTotalProgress(board);
              const sections = getSectionCounts(board);
              const isComplete = progress.pct === 100;

              return (
                <div
                  key={board.id}
                  onClick={() => navigate(`/results/${board.searchId}/ideas`, { state: { board } })}
                  className={`bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between cursor-pointer transition hover:border-jackpot-500 ${
                    isComplete ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">
                      {board.productName}
                      {board.domain && (
                        <span className="text-gray-600 font-normal ml-2">{board.domain}</span>
                      )}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {new Date(board.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {Object.entries(sections).map(([group, { done, total }]) => (
                        <span key={group} className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                          <span className="text-jackpot-400 font-bold">{done}</span>/{total}{' '}
                          {group === 'social' ? 'Social' : group.charAt(0).toUpperCase() + group.slice(1)}
                        </span>
                      ))}
                    </div>
                    <div className="w-36 h-1 bg-gray-800 rounded-full mt-2">
                      <div
                        className="h-1 rounded-full transition-all"
                        style={{
                          width: `${progress.pct}%`,
                          backgroundColor: isComplete ? '#22c55e' : '#eab308',
                        }}
                      />
                    </div>
                  </div>
                  <span className={`text-lg ml-4 ${isComplete ? 'text-green-400' : 'text-gray-600'}`}>
                    {isComplete ? '\u2713' : '\u2192'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
