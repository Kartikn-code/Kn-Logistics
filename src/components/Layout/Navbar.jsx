import { NavLink } from 'react-router-dom';
import { Truck, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './Navbar.module.css';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { isAuthenticated, logout } = useAuth();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' },
        ...(isAuthenticated ? [
            { name: 'Dashboard', path: '/dashboard' },
            { name: 'Admin', path: '/admin' }
        ] : []),
        { name: 'Contact', path: '/contact' },
    ];

    return (
        <nav className={clsx(styles.navbar, scrolled && styles.scrolled)}>
            <div className={styles.container}>
                <div className={styles.logo}>
                    <Truck className={styles.logoIcon} size={28} />
                    <span className={styles.logoText}>KN Logistics</span>
                </div>

                {/* Desktop Menu */}
                <div className={styles.desktopMenu}>
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) => clsx(styles.navLink, isActive && styles.active)}
                        >
                            {link.name}
                        </NavLink>
                    ))}
                    {isAuthenticated ? (
                        <button onClick={logout} className={`${styles.navLink} ${styles.logoutBtn}`}>
                            Logout
                        </button>
                    ) : (
                        <NavLink to="/login" className={({ isActive }) => clsx(styles.navLink, isActive && styles.active)}>
                            Admin Login
                        </NavLink>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className={styles.menuToggle}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Toggle menu"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile Menu */}
                <div className={clsx(styles.mobileMenu, isOpen && styles.open)}>
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) => clsx(styles.mobileNavLink, isActive && styles.active)}
                            onClick={() => setIsOpen(false)}
                        >
                            {link.name}
                        </NavLink>
                    ))}
                    {isAuthenticated ? (
                        <button
                            onClick={() => { logout(); setIsOpen(false); }}
                            className={`${styles.mobileNavLink} ${styles.logoutBtnMobile}`}
                        >
                            Logout
                        </button>
                    ) : (
                        <NavLink
                            to="/login"
                            className={({ isActive }) => clsx(styles.mobileNavLink, isActive && styles.active)}
                            onClick={() => setIsOpen(false)}
                        >
                            Admin Login
                        </NavLink>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
