import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'dark';
    });

    useEffect(() => {
        // Add logic to handle Tailwind's dark class + data-theme
        const root = window.document.documentElement;

        // Remove all previous theme attributes/classes
        root.classList.remove('dark', 'light');
        root.setAttribute('data-theme', theme);

        if (theme === 'dark' || theme === 'nebula' || theme === 'solar' || theme === 'matrix') {
            root.classList.add('dark');
        } else {
            root.classList.add('light');
        }

        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    const setSpecificTheme = (newTheme) => {
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setSpecificTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
