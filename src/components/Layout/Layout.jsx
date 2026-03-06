import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ParticleBackground from '../UI/ParticleBackground';
import styles from './Layout.module.css';

const Layout = () => {
    return (
        <div className={styles.layout}>
            <ParticleBackground />
            <Navbar />
            <main className={styles.main}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
