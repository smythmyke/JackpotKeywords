import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Validate from './pages/Validate';
import Results from './pages/Results';
import Account from './pages/Account';
import Pricing from './pages/Pricing';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/validate" element={<Validate />} />
        <Route path="/results/:searchId" element={<Results />} />
        <Route path="/account" element={<Account />} />
        <Route path="/pricing" element={<Pricing />} />
      </Route>
    </Routes>
  );
}
