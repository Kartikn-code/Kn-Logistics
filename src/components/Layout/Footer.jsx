import styles from './Footer.module.css';
import { Truck } from 'lucide-react';

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.brand}>
                    <div className={styles.logo}>
                        <Truck size={24} />
                        <span>KN Logistics</span>
                    </div>
                    <p className={styles.tagline}>Reliable Inward & Outward Transport Across Tamil Nadu</p>
                </div>
                <div className={styles.links}>
                    <p>Phone: +91 8072034620 | Email: ponniammantransport2023@gmail.com</p>
                    <p>&copy; {new Date().getFullYear()} KN Logistics. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
