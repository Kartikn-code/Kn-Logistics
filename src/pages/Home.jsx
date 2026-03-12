import { ArrowRight, MapPin, BarChart3, TrendingUp, Truck, FileSpreadsheet, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import ScrollReveal from '../components/UI/ScrollReveal';
import styles from './Home.module.css';

const Home = () => {
    const navigate = useNavigate();

    const features = [
        { icon: MapPin, title: 'Dispatch tracking', desc: 'Real-time monitoring of all active dispatch records and routes.' },
        { icon: Truck, title: 'Freight management', desc: 'Comprehensive logging and cost analysis of freight operations.' },
        { icon: FileSpreadsheet, title: 'Excel data import', desc: 'Bulk import thousands of dispatch records instantly.' },
        { icon: TrendingUp, title: 'Revenue analytics', desc: 'Deep financial analysis comparing revenue against operating costs.' },
        { icon: BarChart3, title: 'Truck performance monitoring', desc: 'Track individual vehicle efficiency and profitability margins.' }
    ];

    return (
        <div className={styles.home}>
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <ScrollReveal variant="fade-up">
                        <motion.h1
                            className={styles.heroTitle}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.8, type: 'spring' }}
                        >
                            Smart <span className={styles.highlight}>Transport & Logistics</span> <br />
                            Management <span className={styles.gradientText}>Software</span>
                        </motion.h1>
                    </ScrollReveal>

                    <ScrollReveal variant="fade-up" delay={0.2}>
                        <p className={styles.heroSubtitle}>
                            A premium platform designed to completely manage truck dispatch, freight tracking, and logistics movement across Tamil Nadu.
                        </p>
                    </ScrollReveal>

                    <ScrollReveal variant="fade-up" delay={0.4}>
                        <div className={styles.heroActions}>
                            <Button size="lg" onClick={() => navigate('/dashboard')} className={styles.glowButton}>
                                Go to Dashboard <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                            </Button>
                            <Button variant="secondary" size="lg" onClick={() => navigate('/contact')}>
                                Contact Us
                            </Button>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* Features Section */}
            <section className={styles.section} style={{ backgroundColor: 'var(--color-bg-secondary)', position: 'relative' }}>
                <div className={styles.blob} style={{ top: '10%', left: '-5%' }}></div>
                <div className={styles.container} style={{ position: 'relative', zIndex: 1 }}>
                    <ScrollReveal>
                        <div className={styles.sectionHeader}>
                            <h2>Feature Highlights</h2>
                            <p>Everything you need for unified logistics operations</p>
                        </div>
                    </ScrollReveal>

                    <div className={styles.grid3} style={{ justifyContent: 'center', marginTop: '3rem' }}>
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <ScrollReveal key={index} variant="fade-up" delay={index * 0.1}>
                                    <div className={styles.feature}>
                                        <div className={`${styles.iconBox} animate-float`} style={{ animationDelay: `${index * 0.5}s` }}>
                                            <Icon size={32} />
                                        </div>
                                        <h3>{feature.title}</h3>
                                        <p>{feature.desc}</p>
                                    </div>
                                </ScrollReveal>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.ctaSection}>
                <ScrollReveal variant="scale">
                    <div className={styles.container}>
                        <div className={styles.ctaContent}>
                            <h2>Ready to move your goods </h2>
                            <p>Contact us today for a quote or to schedule a pickup.</p>
                            <div className={styles.contactInfo}>
                                <div className={styles.contactItem}>
                                    <Phone size={20} /> <span>+91 8072034620</span>
                                </div>
                                <div className={styles.contactItem}>
                                    <Mail size={20} /> <span>ponniammantransport2023@gmail.com</span>
                                </div>
                            </div>
                            <Button variant="outline" size="lg" className={styles.ctaButton} onClick={() => navigate('/contact')}>
                                Contact Us
                            </Button>
                        </div>
                    </div>
                </ScrollReveal>
            </section>
        </div>
    );
};

export default Home;
