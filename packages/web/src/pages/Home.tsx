import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchForm from '../components/SearchForm';
import SearchProgress from '../components/SearchProgress';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (description: string, url: string, budget?: number) => {
    setLoading(true);
    try {
      // TODO: Call backend API
      // const result = await api.search({ description, url, mode: 'keyword', budget });
      // navigate(`/results/${result.id}`);
      await new Promise((r) => setTimeout(r, 5000));
      navigate('/results/demo');
    } catch {
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
          Describe your product.
          <br />
          <span className="text-jackpot-400">Find your goldmine.</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          AI-powered keyword research with real Google data.
          10 intent categories. 4 data sources. 1,000+ opportunities per search.
          <br />
          <span className="text-white font-medium">From $0.99/search.</span>
        </p>
      </div>

      <SearchForm mode="keyword" onSearch={handleSearch} loading={loading} />

      <div className="mt-8 text-center">
        <Link
          to="/validate"
          className="text-gray-500 hover:text-jackpot-400 transition text-sm"
        >
          Just exploring an idea? Validate demand before you build &rarr;
        </Link>
      </div>

      {/* Social proof / stats */}
      <div className="mt-16 flex items-center gap-8 text-center text-sm text-gray-500">
        <div>
          <div className="text-2xl font-bold text-white">301K</div>
          <div>Monthly searches for<br />"keyword research"</div>
        </div>
        <div className="w-px h-10 bg-gray-800" />
        <div>
          <div className="text-2xl font-bold text-white">23x</div>
          <div>Cheaper than<br />SEMrush</div>
        </div>
        <div className="w-px h-10 bg-gray-800" />
        <div>
          <div className="text-2xl font-bold text-white">4</div>
          <div>Data sources<br />combined</div>
        </div>
      </div>
    </div>
  );
}
