import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import Account from './pages/Account';
import Pricing from './pages/Pricing';
import Disclaimer from './pages/Disclaimer';
import Help from './pages/Help';
import Layout from './components/Layout';

export default function App() {
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
      </Route>
    </Routes>
  );
}
