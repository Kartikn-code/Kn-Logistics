import { Truck, ArrowRight, Package, Globe } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import styles from './Services.module.css';
import { useNavigate } from 'react-router-dom';

const Services = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.servicesPage}>
            <header className={styles.header}>
                <div className={styles.container}>
                    <h1>Our Services</h1>
                    <p>Comprehensive logistics solutions tailored for your business needs across Tamil Nadu.</p>
                </div>
            </header>

            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.grid2}>
                        <div className={styles.serviceDetail}>
                            <div className={styles.iconWrapper}><Package size={40} /></div>
                            <h2>Inward Logistics</h2>
                            <p>
                                We specialize in managing the flow of goods and materials arriving at your business.
                                Our inward logistics services ensure that your raw materials and components are
                                delivered on time, every time, minimizing production delays.
                            </p>
                            <ul className={styles.list}>
                                <li>Raw material transport</li>
                                <li>Supplier coordination</li>
                                <li>Just-in-Time delivery</li>
                                <li>Inventory management support</li>
                            </ul>
                        </div>
                        <div className={styles.imagePlaceholder}>
                            {/* Abstract visual representation */}
                            <div className={styles.abstractGraphic}>
                                <div className={styles.circle}></div>
                                <div className={styles.line}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={`${styles.section} ${styles.bgAlt}`}>
                <div className={styles.container}>
                    <div className={`${styles.grid2} ${styles.reverse}`}>
                        <div className={styles.serviceDetail}>
                            <div className={styles.iconWrapper}><Globe size={40} /></div>
                            <h2>Outward Logistics</h2>
                            <p>
                                Our outward logistics services focus on the distribution of your finished products
                                to customers. We ensure your goods reach distributors, retailers, and end-consumers
                                efficiently and safely.
                            </p>
                            <ul className={styles.list}>
                                <li>Finished goods distribution</li>
                                <li>Multi-point delivery</li>
                                <li>Reverse logistics</li>
                                <li>Real-time tracking for customers</li>
                            </ul>
                        </div>
                        <div className={styles.imagePlaceholder}>
                            <div className={styles.abstractGraphic}>
                                <div className={styles.square}></div>
                                <div className={styles.line}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.fleetHeader}>
                        <h2>Our Fleet</h2>
                        <p>A versatile fleet aimed at handling any type of load.</p>
                    </div>
                    <div className={styles.fleetGrid}>
                        {['6-Wheeler', '10-Wheeler', '12-Wheeler'].map((type, idx) => (
                            <Card key={idx} className={styles.fleetCard}>
                                <div className={styles.truckIcon}><Truck size={48} /></div>
                                <h3>{type}</h3>
                                <p>Reliable and well-maintained {type} trucks for various load capacities.</p>
                                <Button variant="outline" size="sm" onClick={() => navigate('/contact')}>Check Availability</Button>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Services;
