import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-jackpot-400">Jackpot</span>
            <span className="text-white">Keywords</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/pricing" className="text-gray-400 hover:text-white transition">
              Pricing
            </Link>
            <Link to="/account" className="text-gray-400 hover:text-white transition">
              Account
            </Link>
            <button className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-medium px-4 py-1.5 rounded-lg transition">
              Sign In
            </button>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
