import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lock, User, Key, AlertCircle, Truck, Package, MapPin, Shield, Globe, Activity, TrendingUp, Zap, Sun, Moon, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/UI/Button';
import LogisticsLoader from '../components/UI/LogisticsLoader';
import styles from './Login.module.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(username, password);

        if (result.success) {
            // Long delay to enjoy the visual treat
            setTimeout(() => {
                navigate('/dashboard');
            }, 3500);
        } else {
            setError(result.message || 'Invalid credentials');
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.loginPage}>
            <AnimatePresence>
                {isLoading && <LogisticsLoader message={isChangingPassword ? "Syncing Security Protocols..." : "Launching Fleet OS..."} />}
            </AnimatePresence>

            {/* Theme Toggle Switch */}
            <div className={styles.themeToggleWrapper}>
                <motion.button 
                    className={styles.themeToggleBtn}
                    onClick={toggleTheme}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {theme === 'light' ? <Flame size={18} /> : <Sun size={18} />}
                    <span>{theme === 'light' ? 'Warm Theme' : 'Light Theme'}</span>
                </motion.button>
            </div>

            <div className={styles.backgroundDecorations}>
                <motion.div 
                    className={styles.shape1}
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                        rotate: [0, 90, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity }}
                />
                <motion.div 
                    className={styles.shape2}
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2],
                        rotate: [0, -90, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity }}
                />
            </div>

            <div className={styles.splitLayout}>
                {/* Visual Treat Story Section */}
                <motion.div 
                    className={styles.storySection}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                >
                    <div className={styles.storyContent}>
                        <motion.div 
                            className={styles.logoWrapper}
                            initial={{ y: -50 }}
                            animate={{ y: 0 }}
                        >
                            <div className={styles.logoCircle}>
                                <Truck size={40} />
                            </div>
                            <h1>KN Logistics</h1>
                        </motion.div>
                        
                        <div className={styles.storyText}>
                            <motion.h2
                                initial={{ x: -100 }}
                                animate={{ x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                The Future of <br />
                                <span className={styles.highlight}>Supply Chain</span>
                            </motion.h2>
                            <p>An end-to-end intelligent ecosystem designed to move goods faster, safer, and smarter.</p>
                        </div>

                        {/* Detailed Metrics Simulation */}
                        <div className={styles.metricsSim}>
                            <div className={styles.metricCard}>
                                <Activity size={18} className={styles.highlight} />
                                <div>
                                    <span className={styles.mValue}>98.4%</span>
                                    <span className={styles.mLabel}>Efficiency</span>
                                </div>
                            </div>
                            <div className={styles.metricCard}>
                                <TrendingUp size={18} className={styles.highlight} />
                                <div>
                                    <span className={styles.mValue}>+24%</span>
                                    <span className={styles.mLabel}>Growth</span>
                                </div>
                            </div>
                            <div className={styles.metricCard}>
                                <Zap size={18} className={styles.highlight} />
                                <div>
                                    <span className={styles.mValue}>1.2ms</span>
                                    <span className={styles.mLabel}>Latency</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.features}>
                            <FeatureItem 
                                icon={<Globe size={22} />}
                                title="Smart Route Optimization"
                                desc="Real-time traffic and terrain analysis for the fastest delivery paths."
                            />
                            <FeatureItem 
                                icon={<Shield size={22} />}
                                title="Automated Billing"
                                desc="Instant invoice generation with zero-error financial reconciliation."
                            />
                            <FeatureItem 
                                icon={<MapPin size={22} />}
                                title="Live Fleet Hub"
                                desc="Track every truck and tonnage across our expansive global network."
                            />
                        </div>

                        <div className={styles.storyFooter}>
                            <p>© 2026 KN Logistics Portal | Version 4.2.0-Stable</p>
                        </div>
                    </div>
                </motion.div>

                {/* Glassmorphism Form Section */}
                <div className={styles.formSection}>
                    <motion.div 
                        className={styles.loginContainer}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <div className={styles.loginHeader}>
                            <div className={styles.iconWrapper}>
                                <Lock size={32} />
                            </div>
                            <h2>Control Center</h2>
                            <p>Authenticating node access...</p>
                        </div>

                        {error && (
                            <motion.div 
                                className={styles.errorMessage}
                                initial={{ x: 20 }}
                                animate={{ x: 0 }}
                            >
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.loginForm}>
                            <div className={styles.formGroup}>
                                <label>Operator Identity</label>
                                <div className={styles.inputWrapper}>
                                    <User size={18} className={styles.inputIcon} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Access Key</label>
                                <div className={styles.inputWrapper}>
                                    <Key size={18} className={styles.inputIcon} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" disabled={isLoading} className={styles.loginBtn}>
                                INITIALIZE ACCESS
                            </Button>

                            <div className={styles.formFooter}>
                                <button type="button" className={styles.ghostLink}>
                                    Request Security Token?
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

const FeatureItem = ({ icon, title, desc }) => (
    <motion.div 
        className={styles.featureItem}
        whileHover={{ x: 10 }}
    >
        <div className={styles.featureIcon}>{icon}</div>
        <div>
            <h3>{title}</h3>
            <p>{desc}</p>
        </div>
    </motion.div>
);

export default Login;
