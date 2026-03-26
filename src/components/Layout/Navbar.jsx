import { NavLink } from 'react-router-dom';
import { Truck, Menu, X, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './Navbar.module.css';
import clsx from 'clsx';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Theme State
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Admin', path: '/admin' },
        { name: 'Services', path: '/services' },
        { name: 'Payments', path: '/payments' },
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
                    <button onClick={toggleTheme} className={styles.themeToggleBtn} aria-label="Toggle theme">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Mobile Theme Toggle */}
                    <button onClick={toggleTheme} className={`${styles.themeToggleBtn} ${styles.mobileOnlyThemeToggle}`} aria-label="Toggle theme">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {/* Mobile Menu Toggle */}
                    <button
                        className={styles.menuToggle}
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Toggle menu"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

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
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
