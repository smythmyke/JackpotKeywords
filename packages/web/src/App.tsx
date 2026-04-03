import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import Account from './pages/Account';
import Pricing from './pages/Pricing';
import Disclaimer from './pages/Disclaimer';
import Help from './pages/Help';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Admin from './pages/Admin';
import Layout from './components/Layout';
import { trackPageView } from './services/analytics';

export default function App() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
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
      </Route>
    </Routes>
  );
}
