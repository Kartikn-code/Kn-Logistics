import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout/Layout';
import Services from './pages/Services';
import Dashboard from './pages/Dashboard';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PageWrapper from './components/UI/PageWrapper';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Payments from './pages/Payments';
import BillingEntry from './pages/Billing/BillingEntry';
import BillingRecords from './pages/Billing/BillingRecords';
import InvoiceBuilder from './pages/Billing/InvoiceBuilder';
import PaymentTracker from './pages/Billing/PaymentTracker';
import Locations from './pages/Billing/Locations';
import Parties from './pages/Billing/Parties';
import Landing from './pages/Landing';
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-primary)',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1 className="heading-xl" style={{ color: 'var(--color-danger)' }}>Something went wrong</h1>
          <p style={{ margin: '20px 0', opacity: 0.8 }}>We encountered an unexpected error while rendering this page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Reload Platform
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppRoutes = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Landing Page is the root entry point */}
        <Route path="/" element={<Landing />} />
        
        {/* Authentication */}
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        
        {/* Protected Dashboard Routes - Using Layout as a wrapper */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <PageWrapper><Dashboard /></PageWrapper>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute>
              <PageWrapper><Admin /></PageWrapper>
            </ProtectedRoute>
          } />
          
          <Route path="/services" element={
            <ProtectedRoute>
              <PageWrapper><Services /></PageWrapper>
            </ProtectedRoute>
          } />
          
          <Route path="/contact" element={
            <ProtectedRoute>
              <PageWrapper><Contact /></PageWrapper>
            </ProtectedRoute>
          } />
          
          <Route path="/payments" element={
            <ProtectedRoute>
              <PageWrapper><Payments /></PageWrapper>
            </ProtectedRoute>
          } />
          
          <Route path="/billing/entry" element={
            <ProtectedRoute>
              <BillingEntry />
            </ProtectedRoute>
          } />
          
          <Route path="/billing/records" element={
            <ProtectedRoute>
              <BillingRecords />
            </ProtectedRoute>
          } />
          
          <Route path="/billing/invoice" element={
            <ProtectedRoute>
              <InvoiceBuilder />
            </ProtectedRoute>
          } />
          
          <Route path="/billing/payments-tracker" element={
            <ProtectedRoute>
              <PaymentTracker />
            </ProtectedRoute>
          } />

          <Route path="/billing/locations" element={
            <ProtectedRoute>
              <Locations />
            </ProtectedRoute>
          } />

          <Route path="/billing/parties" element={
            <ProtectedRoute>
              <Parties />
            </ProtectedRoute>
          } />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
