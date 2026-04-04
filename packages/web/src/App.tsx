import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Layout from './components/Layout';
import { trackPageView } from './services/analytics';

// Lazy-loaded routes
const Results = lazy(() => import('./pages/Results'));
const Account = lazy(() => import('./pages/Account'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Admin = lazy(() => import('./pages/Admin'));
const Help = lazy(() => import('./pages/Help'));
const Disclaimer = lazy(() => import('./pages/Disclaimer'));
const CompetitorKeywordResearch = lazy(() => import('./pages/features/CompetitorKeywordResearch'));
const LongTailKeywordGenerator = lazy(() => import('./pages/features/LongTailKeywordGenerator'));
const KeywordCompetitionChecker = lazy(() => import('./pages/features/KeywordCompetitionChecker'));

export default function App() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-gray-500">Loading...</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/validate" element={<Navigate to="/" replace />} />
          <Route path="/results/:searchId" element={<Results />} />
          <Route path="/account" element={<Account />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/help" element={<Help />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/features/competitor-keyword-research" element={<CompetitorKeywordResearch />} />
          <Route path="/features/long-tail-keyword-generator" element={<LongTailKeywordGenerator />} />
          <Route path="/features/keyword-competition-checker" element={<KeywordCompetitionChecker />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
