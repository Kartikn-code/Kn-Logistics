import { Container, Sun, Moon, Menu, X, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';
import Sidebar from './Sidebar';
import clsx from 'clsx';

const Navbar = ({ onToggleSidebar, isCollapsed }) => {
    const [scrolled, setScrolled] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const { logout } = useAuth();
    const navigate = useNavigate();

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

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className={clsx(styles.navbar, scrolled && styles.scrolled)}>
            <div className={styles.container}>
                <div className={styles.logoArea}>
                    <button 
                        className={styles.sidebarToggle} 
                        onClick={onToggleSidebar}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>
                    <div className={styles.logo}>
                        <Container className={styles.logoIcon} size={28} strokeWidth={2.5} />
                        <span className={styles.logoText}>KN Logistics</span>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button onClick={toggleTheme} className={styles.themeToggleBtn} aria-label="Toggle theme">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    
                    <div className={styles.userProfile}>
                        <div className={styles.avatar}>A</div>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>Admin</span>
                            <button onClick={handleLogout} className={styles.logoutBtn}>
                                <LogOut size={14} />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>

                    <button 
                        className={styles.mobileMenuToggle} 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className={styles.mobileSidebarOverlay} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className={styles.mobileSidebarContent} onClick={e => e.stopPropagation()}>
                        <Sidebar onNavClick={() => setIsMobileMenuOpen(false)} />
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
