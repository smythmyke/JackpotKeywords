import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { runSearch } from '../services/api';
import SearchForm from '../components/SearchForm';
import SearchProgress from '../components/SearchProgress';

export default function Validate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, getToken } = useAuthContext();

  const handleSearch = async (description: string, _url: string, budget?: number) => {
    setError(null);
    setLoading(true);
    try {
      const token = user ? await getToken() : null;

      const result = await runSearch(token, {
        description,
        mode: 'concept',
        budget,
      });

      if (result.id && user) {
        navigate(`/results/${result.id}`);
      } else {
        navigate('/results/anonymous', { state: { result } });
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <SearchProgress />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-4">
          Validate your
          <br />
          <span className="text-jackpot-400">business idea.</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Find out if there's demand before you build.
          Get a market viability report with demand scoring,
          competition analysis, and related niches.
        </p>
      </div>

      {error && (
        <div className="w-full max-w-2xl mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      <SearchForm mode="concept" onSearch={handleSearch} loading={loading} />

      <div className="mt-8 text-center">
        <Link
          to="/"
          className="text-gray-500 hover:text-jackpot-400 transition text-sm"
        >
          Already have a product? Find goldmine keywords &rarr;
        </Link>
      </div>
    </div>
  );
}
