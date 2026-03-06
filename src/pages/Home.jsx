import { ArrowRight, MapPin, Shield, Clock, Truck, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import ScrollReveal from '../components/UI/ScrollReveal';
import styles from './Home.module.css';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.home}>
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <ScrollReveal variant="fade-up">
                        <h1 className={styles.heroTitle}>
                            Reliable <span className={styles.highlight}>Inward & Outward</span> <br />
                            Transport <span className={styles.gradientText}>Across Tamil Nadu</span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal variant="fade-up" delay={0.2}>
                        <p className={styles.heroSubtitle}>
                            Professional logistics solutions tailored for your business needs.
                            We ensure safe and timely delivery with our modern fleet.
                        </p>
                    </ScrollReveal>

                    <ScrollReveal variant="fade-up" delay={0.4}>
                        <div className={styles.heroActions}>
                            <Button size="lg" onClick={() => navigate('/tracking')} className={styles.glowButton}>
                                Track Your Order <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                            </Button>
                            <Button variant="secondary" size="lg" onClick={() => navigate('/services')}>
                                View Services
                            </Button>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            {/* Features / About Preview */}
            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.grid3}>
                        <ScrollReveal variant="fade-up" delay={0.1}>
                            <div className={styles.feature}>
                                <div className={`${styles.iconBox} animate-float`}><MapPin size={32} /></div>
                                <h3>State-wide Coverage</h3>
                                <p>Extensive network covering every district in Tamil Nadu.</p>
                            </div>
                        </ScrollReveal>
                        <ScrollReveal variant="fade-up" delay={0.2}>
                            <div className={styles.feature}>
                                <div className={`${styles.iconBox} animate-float`} style={{ animationDelay: '1s' }}><Shield size={32} /></div>
                                <h3>Safe & Secure</h3>
                                <p>Guaranteed safety of your goods with real-time monitoring.</p>
                            </div>
                        </ScrollReveal>
                        <ScrollReveal variant="fade-up" delay={0.3}>
                            <div className={styles.feature}>
                                <div className={`${styles.iconBox} animate-float`} style={{ animationDelay: '2s' }}><Clock size={32} /></div>
                                <h3>On-Time Delivery</h3>
                                <p>Punctual operations optimized for efficiency.</p>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className={styles.section} style={{ backgroundColor: 'var(--color-bg-secondary)', position: 'relative' }}>
                <div className={styles.blob} style={{ top: '10%', left: '-5%' }}></div>
                <div className={styles.container} style={{ position: 'relative', zIndex: 1 }}>
                    <ScrollReveal>
                        <div className={styles.sectionHeader}>
                            <h2>Our Services</h2>
                            <p>Comprehensive logistics solutions for all your needs</p>
                        </div>
                    </ScrollReveal>

                    <div className={styles.grid2}>
                        <ScrollReveal variant="slide-right">
                            <Card className={styles.serviceCard}>
                                <div className={styles.serviceIcon}><Truck size={40} /></div>
                                <h3>Inward Logistics</h3>
                                <p>Efficient management of goods coming into your business. We handle raw material transport from suppliers to your manufacturing units.</p>
                            </Card>
                        </ScrollReveal>
                        <ScrollReveal variant="slide-left">
                            <Card className={styles.serviceCard}>
                                <div className={styles.serviceIcon}><Truck size={40} style={{ transform: 'scaleX(-1)' }} /></div>
                                <h3>Outward Logistics</h3>
                                <p>Seamless distribution of finished goods to distributors, retailers, and end customers across the state.</p>
                            </Card>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* Fleet Section */}
            <section className={styles.section}>
                <div className={styles.container}>
                    <ScrollReveal>
                        <div className={styles.sectionHeader}>
                            <h2>Our Fleet</h2>
                            <p>Modern vehicles for every load requirement</p>
                        </div>
                    </ScrollReveal>

                    <div className={styles.fleetGrid}>
                        <ScrollReveal variant="fade-up" delay={0.1}>
                            <Card className={styles.fleetCard}>
                                <div className={styles.fleetTag}>Light Load</div>
                                <h3>6-Wheeler</h3>
                                <p>Ideal for city logistics and medium loads.</p>
                                <ul className={styles.specs}>
                                    <li>Capacity: 9 Tons</li>
                                    <li>Length: 19 ft</li>
                                </ul>
                            </Card>
                        </ScrollReveal>
                        <ScrollReveal variant="fade-up" delay={0.2}>
                            <Card className={styles.fleetCard}>
                                <div className={styles.fleetTag}>Medium Load</div>
                                <h3>10-Wheeler</h3>
                                <p>Perfect for inter-city heavy transport.</p>
                                <ul className={styles.specs}>
                                    <li>Capacity: 16 Tons</li>
                                    <li>Length: 22 ft</li>
                                </ul>
                            </Card>
                        </ScrollReveal>
                        <ScrollReveal variant="fade-up" delay={0.3}>
                            <Card className={styles.fleetCard}>
                                <div className={styles.fleetTag}>Heavy Load</div>
                                <h3>12-Wheeler</h3>
                                <p>Engineered for maximum load capacity.</p>
                                <ul className={styles.specs}>
                                    <li>Capacity: 21 Tons</li>
                                    <li>Length: 24 ft</li>
                                </ul>
                            </Card>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.ctaSection}>
                <ScrollReveal variant="scale">
                    <div className={styles.container}>
                        <div className={styles.ctaContent}>
                            <h2>Ready to move your goods?</h2>
                            <p>Contact us today for a quote or to schedule a pickup.</p>
                            <div className={styles.contactInfo}>
                                <div className={styles.contactItem}>
                                    <Phone size={20} /> <span>+91 98765 43210</span>
                                </div>
                                <div className={styles.contactItem}>
                                    <Mail size={20} /> <span>info@knlogistics.com</span>
                                </div>
                            </div>
                            <Button variant="outline" size="lg" className={styles.ctaButton} onClick={() => navigate('/contact')}>
                                Get in Touch
                            </Button>
                        </div>
                    </div>
                </ScrollReveal>
            </section>
        </div>
    );
};

export default Home;
