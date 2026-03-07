import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout/Layout';
import Services from './pages/Services';
import Dashboard from './pages/Dashboard';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Home from './pages/Home';
import PageWrapper from './components/UI/PageWrapper';

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={<PageWrapper><Home /></PageWrapper>} />
          <Route path="services" element={<PageWrapper><Services /></PageWrapper>} />
          <Route path="contact" element={<PageWrapper><Contact /></PageWrapper>} />
          <Route path="dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
          <Route path="admin" element={<PageWrapper><Admin /></PageWrapper>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default App;
