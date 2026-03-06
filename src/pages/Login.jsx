import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Key, AlertCircle } from 'lucide-react';
import Button from '../components/UI/Button';
import styles from './Login.module.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(username, password);

        if (result.success) {
            navigate('/dashboard'); // Direct to dashboard upon login
        } else {
            setError(result.message || 'Invalid credentials');
        }

        setIsLoading(false);
    };

    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, oldPassword, newPassword }),
            });
            const data = await response.json();

            if (data.success) {
                setSuccessMessage(data.message || 'Password updated successfully. Please log in.');
                setTimeout(() => {
                    setIsChangingPassword(false);
                    setSuccessMessage('');
                    setPassword('');
                    setOldPassword('');
                    setNewPassword('');
                }, 2000);
            } else {
                setError(data.error || 'Failed to change password');
            }
        } catch (error) {
            setError('Server error during password change');
        }

        setIsLoading(false);
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginContainer}>

                <div className={styles.loginHeader}>
                    <div className={styles.iconWrapper}>
                        <Lock size={32} />
                    </div>
                    <h1>Admin Portal</h1>
                    <p>Enter your credentials to access the secure dashboard.</p>
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

                {!isChangingPassword ? (
                    <form onSubmit={handleSubmit} className={styles.loginForm}>
                        <div className={styles.formGroup}>
                            <label>Username</label>
                            <div className={styles.inputWrapper}>
                                <User size={18} className={styles.inputIcon} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter admin username"
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Password</label>
                            <div className={styles.inputWrapper}>
                                <Key size={18} className={styles.inputIcon} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={isLoading} className={styles.loginBtn}>
                            {isLoading ? 'Authenticating...' : 'Sign In'}
                        </Button>

                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <Button type="button" variant="ghost" onClick={() => { setIsChangingPassword(true); setError(''); setSuccessMessage(''); }} style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                Change Password?
                            </Button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleChangePasswordSubmit} className={styles.loginForm}>
                        <div className={styles.formGroup}>
                            <label>Username</label>
                            <div className={styles.inputWrapper}>
                                <User size={18} className={styles.inputIcon} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter admin username"
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Current Password</label>
                            <div className={styles.inputWrapper}>
                                <Key size={18} className={styles.inputIcon} />
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>New Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock size={18} className={styles.inputIcon} />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={isLoading} className={styles.loginBtn}>
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </Button>

                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <Button type="button" variant="ghost" onClick={() => { setIsChangingPassword(false); setError(''); setSuccessMessage(''); }} style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                Back to Login
                            </Button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
};

export default Login;
