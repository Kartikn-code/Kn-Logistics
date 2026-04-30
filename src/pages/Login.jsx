import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Key, AlertCircle, Truck, Package, MapPin, Shield, Globe, Activity, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/UI/Button';
import styles from './Login.module.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(username, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message || 'Invalid credentials');
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.backgroundDecorations}>
                <div className={styles.shape1} />
                <div className={styles.shape2} />
            </div>

            <div className={styles.splitLayout}>
                {/* Story Section */}
                <div className={styles.storySection}>
                    <div className={styles.storyContent}>
                        <div className={styles.logoWrapper}>
                            <div className={styles.logoCircle}>
                                <Truck size={40} />
                            </div>
                            <h1 className="heading-xl">KN Logistics</h1>
                        </div>
                        
                        <div className={styles.storyText}>
                            <h2 className="heading-xl">
                                Intelligence in <br />
                                <span className={styles.highlight}>Motion.</span>
                            </h2>
                            <p className={styles.subtitle}>Premium supply chain orchestration and real-time fleet analytics for the modern era.</p>
                        </div>

                        {/* Metrics Section */}
                        <div className={styles.metricsSim}>
                            <div className={styles.metricCard}>
                                <Activity size={20} className={styles.accentIcon} />
                                <div>
                                    <span className="value-text">99.9%</span>
                                    <span className="label-text">Reliability</span>
                                </div>
                            </div>
                            <div className={styles.metricCard}>
                                <TrendingUp size={20} className={styles.accentIcon} />
                                <div>
                                    <span className="value-text">Real-time</span>
                                    <span className="label-text">Telemetry</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.features}>
                            <FeatureItem 
                                icon={<Globe size={22} />}
                                title="Global reach"
                                desc="Seamless orchestration across international borders and regional hubs."
                            />
                            <FeatureItem 
                                icon={<Shield size={22} />}
                                title="Zero-Trust security"
                                desc="Enterprise-grade encryption for all operational data and transit logs."
                            />
                        </div>

                        <div className={styles.storyFooter}>
                            <p>© 2026 KN Logistics | Premium Access Only</p>
                        </div>
                    </div>
                </div>

                {/* Form Section */}
                <div className={styles.formSection}>
                    <motion.div 
                        className={styles.loginContainer}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className={styles.loginHeader}>
                            <div className={styles.iconWrapper}>
                                <Lock size={32} />
                            </div>
                            <h2 className="heading-lg">Secure Login</h2>
                            <p className={styles.formSubtitle}>Authenticate your session to access the hub</p>
                        </div>

                        {error && (
                            <div className={styles.errorMessage}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.loginForm}>
                            <div className={styles.formGroup}>
                                <label className="label-text">Identifier</label>
                                <div className={styles.inputWrapper}>
                                    <User size={18} className={styles.inputIcon} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter Identifier"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className="label-text">Passphrase</label>
                                <div className={styles.inputWrapper}>
                                    <Key size={18} className={styles.inputIcon} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter Passphrase"
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" disabled={isLoading} className={styles.loginBtn}>
                                {isLoading ? 'Verifying...' : 'Access Portal'}
                            </Button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

const FeatureItem = ({ icon, title, desc }) => (
    <div className={styles.featureItem}>
        <div className={styles.featureIcon}>{icon}</div>
        <div>
            <h3 className="heading-md">{title}</h3>
            <p className={styles.featureDesc}>{desc}</p>
        </div>
    </div>
);

export default Login;
