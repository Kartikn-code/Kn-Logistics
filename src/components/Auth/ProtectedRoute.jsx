import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh', 
                background: 'var(--color-bg-primary)',
                gap: '24px'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid var(--color-primary-glow)',
                    borderTop: '4px solid var(--color-primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <p style={{ 
                    color: 'var(--color-text-secondary)', 
                    fontFamily: 'var(--font-header)',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    letterSpacing: '0.5px'
                }}>Securely Authenticating...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
