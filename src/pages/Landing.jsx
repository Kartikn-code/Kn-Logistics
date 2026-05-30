import { motion } from 'framer-motion';
import { Truck, MapPin, Box, ArrowRight, Shield, Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/UI/Button';
import styles from './Landing.module.css';

const Landing = () => {
    const navigate = useNavigate();

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    const fleet = [
        { type: '6-Wheeler', capacity: '10 MT', icon: <Truck size={32} /> },
        { type: '10-Wheeler', capacity: '19 MT', icon: <Truck size={36} /> },
        { type: '12-Wheeler', capacity: '25 MT', icon: <Truck size={40} /> }
    ];

    return (
        <div className={styles.landingPage}>
            {/* Background Decorations */}
            <div className={`${styles.decoration} ${styles.decor1}`} />
            <div className={`${styles.decoration} ${styles.decor2}`} />

            <header className={styles.hero}>
                <motion.div 
                    className={styles.heroContent}
                    initial="initial"
                    animate="animate"
                    variants={{
                        animate: { transition: { staggerChildren: 0.1 } }
                    }}
                >
                    <motion.div variants={fadeIn} className={styles.badge}>
                        <MapPin size={16} />
                        <span>Exclusively Serving Tamil Nadu</span>
                    </motion.div>

                    <motion.h1 variants={fadeIn} className={styles.title}>
                        Logistics Reimagined. <br />
                        <span className="highlight">Open Body Specialists.</span>
                    </motion.h1>

                    <motion.p variants={fadeIn} className={styles.subtitle}>
                        Enterprise-grade transport solutions dedicated to regional excellence. 
                        We operate exclusively within Tamil Nadu with a premium fleet of open body trucks.
                    </motion.p>

                    <motion.div variants={fadeIn} className={styles.ctaContainer}>
                        <Button size="lg" onClick={() => navigate('/login')}>
                            Access Portal <ArrowRight size={20} style={{ marginLeft: '10px' }} />
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => {
                            document.getElementById('fleet').scrollIntoView({ behavior: 'smooth' });
                        }}>
                            Explore Fleet
                        </Button>
                    </motion.div>
                </motion.div>
            </header>

            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.grid}>
                        <motion.div 
                            className={styles.featureCard}
                            whileHover={{ y: -10 }}
                        >
                            <div className={styles.iconWrapper}><MapPin /></div>
                            <h3>Regional Focus</h3>
                            <p>Deep expertise in Tamil Nadu's industrial corridors, ensuring faster turnaround and local reliability.</p>
                        </motion.div>

                        <motion.div 
                            className={styles.featureCard}
                            whileHover={{ y: -10 }}
                        >
                            <div className={styles.iconWrapper}><Box /></div>
                            <h3>Open Body Only</h3>
                            <p>Specialized fleet optimized for specific cargo types that require open-top loading and maximum accessibility.</p>
                        </motion.div>

                        <motion.div 
                            className={styles.featureCard}
                            whileHover={{ y: -10 }}
                        >
                            <div className={styles.iconWrapper}><Shield /></div>
                            <h3>Premium Security</h3>
                            <p>Advanced tracking and secure handling for every shipment, regardless of distance or load size.</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            <section id="fleet" className={`${styles.section} ${styles.fleetSection}`}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className="heading-xl">Our Specialized Fleet</h2>
                        <p>High-performance open body trucks tailored for various capacities.</p>
                    </div>

                    <div className={styles.fleetGrid}>
                        {fleet.map((item, idx) => (
                            <motion.div 
                                key={idx}
                                className={`${styles.featureCard} ${styles.fleetCard}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                viewport={{ once: true }}
                            >
                                <div className={styles.iconWrapper} style={{ margin: '0 auto var(--spacing-lg)' }}>
                                    {item.icon}
                                </div>
                                <h3>{item.type}</h3>
                                <div className={styles.capacity}>{item.capacity}</div>
                                <p>Maximum payload capacity for heavy-duty industrial transport.</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <footer className={styles.footer}>
                <p>© 2026 KN Logistics. Premium Transport Services Inside Tamil Nadu.</p>
            </footer>
        </div>
    );
};

export default Landing;
