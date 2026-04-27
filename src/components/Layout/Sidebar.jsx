import { NavLink } from 'react-router-dom';
import { 
    LayoutDashboard, 
    ShieldCheck, 
    Truck, 
    CreditCard, 
    FilePlus, 
    Database, 
    FileText, 
    DollarSign, 
    MapPin,
    Users,
    Mail,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import styles from './Sidebar.module.css';
import clsx from 'clsx';

const Sidebar = ({ isCollapsed, setIsCollapsed, onNavClick }) => {
    const menuItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Admin', path: '/admin', icon: ShieldCheck },
        { name: 'Services', path: '/services', icon: Truck },
        { name: 'Payments', path: '/payments', icon: CreditCard },
        { divider: true },
        { name: 'Billing Entry', path: '/billing/entry', icon: FilePlus },
        { name: 'Billing Records', path: '/billing/records', icon: Database },
        { name: 'Invoice Builder', path: '/billing/invoice', icon: FileText },
        { name: 'Payment Tracker', path: '/billing/payments-tracker', icon: DollarSign },
        { name: 'Manage Locations', path: '/billing/locations', icon: MapPin },
        { name: 'Manage Parties', path: '/billing/parties', icon: Users },
        { divider: true },
        { name: 'Contact', path: '/contact', icon: Mail },
    ];

    return (
        <aside className={clsx(styles.sidebar, isCollapsed && styles.collapsed)}>
            <button 
                className={styles.collapseBtn}
                onClick={() => setIsCollapsed && setIsCollapsed(!isCollapsed)}
                aria-label="Toggle Sidebar"
            >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            <div className={styles.nav}>
                {menuItems.map((item, index) => {
                    if (item.divider) {
                        return <div key={`divider-${index}`} className={styles.divider} />;
                    }
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => clsx(styles.navLink, isActive && styles.active)}
                            onClick={onNavClick}
                            title={isCollapsed ? item.name : ''}
                        >
                            <Icon size={20} className={styles.icon} />
                            {!isCollapsed && <span className={styles.linkText}>{item.name}</span>}
                        </NavLink>
                    );
                })}
            </div>
        </aside>
    );
};

export default Sidebar;
