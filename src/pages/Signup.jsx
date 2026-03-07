import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, User, Key, AlertCircle } from 'lucide-react';
import Button from '../components/UI/Button';
import styles from './Login.module.css'; // Reusing Login styles for consistency

const Signup = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccessMessage('User created successfully!');
                setUsername('');
                setPassword('');
                setTimeout(() => {
                    navigate('/admin');
                }, 2000);
            } else {
                setError(data.message || 'Failed to create user. Ensure alphanumeric 6+ chars.');
            }
        } catch (error) {
            setError('Server error during signup');
        }

        setIsLoading(false);
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginContainer}>

                <div className={styles.loginHeader}>
                    <div className={styles.iconWrapper}>
                        <UserPlus size={32} />
                    </div>
                    <h1>Create New User</h1>
                    <p>Register a new account to access the dashboard.</p>
                </div>

                {error && (
                    <div className={styles.errorMessage}>
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {successMessage && (
                    <div className={styles.successMessage} style={{ color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{successMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.loginForm}>
                    <div className={styles.formGroup}>
                        <label>New Username</label>
                        <div className={styles.inputWrapper}>
                            <User size={18} className={styles.inputIcon} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter desired username"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>New Password</label>
                        <div className={styles.inputWrapper}>
                            <Key size={18} className={styles.inputIcon} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter secure password (6+ chars)"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <Button type="submit" disabled={isLoading} className={styles.loginBtn}>
                        {isLoading ? 'Creating User...' : 'Sign Up'}
                    </Button>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <Button type="button" variant="ghost" onClick={() => navigate('/admin')} style={{ color: 'var(--color-primary)' }}>
                            Return to Admin Panel
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Signup;
