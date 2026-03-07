import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout/Layout';
import Services from './pages/Services';
import Dashboard from './pages/Dashboard';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PageWrapper from './components/UI/PageWrapper';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  const location = useLocation();

  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Layout />}>
            <Route index element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="services" element={<PageWrapper><Services /></PageWrapper>} />
            <Route path="contact" element={<PageWrapper><Contact /></PageWrapper>} />
            <Route path="login" element={<PageWrapper><Login /></PageWrapper>} />

            {/* Protected Routes */}
            <Route path="dashboard" element={
              <ProtectedRoute>
                <PageWrapper><Dashboard /></PageWrapper>
              </ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute>
                <PageWrapper><Admin /></PageWrapper>
              </ProtectedRoute>
            } />
            <Route path="signup" element={
              <ProtectedRoute>
                <PageWrapper><Signup /></PageWrapper>
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </AnimatePresence>
    </AuthProvider>
  );
}

export default App;
