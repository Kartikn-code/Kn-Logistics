import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // Default to 'light' (Blue theme)
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('kn-logistics-theme');
        return savedTheme || 'light';
    });

    useEffect(() => {
        // Update data-theme attribute on document root
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('kn-logistics-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
