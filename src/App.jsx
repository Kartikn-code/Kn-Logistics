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

const AppRoutes = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* If not authenticated, the only accessible routes are /login */}
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        
        <Route path="/" element={<Layout />}>
          {/* Index route redirects to dashboard if logged in, otherwise login */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
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
          
          <Route path="services" element={
            <ProtectedRoute>
              <PageWrapper><Services /></PageWrapper>
            </ProtectedRoute>
          } />
          
          <Route path="contact" element={
            <ProtectedRoute>
              <PageWrapper><Contact /></PageWrapper>
            </ProtectedRoute>
          } />

          {/* Signup is disabled for security - Admin can create users in DB */}
          {/* <Route path="signup" element={
            <ProtectedRoute>
              <PageWrapper><Signup /></PageWrapper>
            </ProtectedRoute>
          } /> */}
          
          <Route path="payments" element={
            <ProtectedRoute>
              <PageWrapper><Payments /></PageWrapper>
            </ProtectedRoute>
          } />
          
          <Route path="billing/entry" element={
            <ProtectedRoute>
              <BillingEntry />
            </ProtectedRoute>
          } />
          
          <Route path="billing/records" element={
            <ProtectedRoute>
              <BillingRecords />
            </ProtectedRoute>
          } />
          
          <Route path="billing/invoice" element={
            <ProtectedRoute>
              <InvoiceBuilder />
            </ProtectedRoute>
          } />
          
          <Route path="billing/payments-tracker" element={
            <ProtectedRoute>
              <PaymentTracker />
            </ProtectedRoute>
          } />

          <Route path="billing/locations" element={
            <ProtectedRoute>
              <Locations />
            </ProtectedRoute>
          } />

          <Route path="billing/parties" element={
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
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
