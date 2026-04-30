import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';
import clsx from 'clsx';

const Layout = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className={styles.layout}>
            <Navbar onToggleSidebar={() => setIsCollapsed(!isCollapsed)} isCollapsed={isCollapsed} />
            <div className={clsx(styles.wrapper, isCollapsed && styles.collapsed)}>
                <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                <main className={styles.main}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
