import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

/**
 * Light/dark toggle.
 *
 * Previously offered five options (Nebula, Solar, Matrix) that had no token
 * definitions behind them — every one of them simply applied the `.dark`
 * class, so they looked identical to Dark. Reduced to the two themes the
 * design system actually implements.
 */
const ThemeToggle = ({ className = '' }) => {
    const { theme, toggleTheme, isDark } = useTheme();

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            className={`p-2 rounded-xl bg-surface-2 border border-border hover:border-brand/40 transition-colors ${className}`}
        >
            <AnimatePresence mode="wait" initial={false}>
                {theme === 'light' ? (
                    <motion.span
                        key="sun"
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="block"
                    >
                        <Sun className="w-5 h-5 text-amber-500" aria-hidden="true" />
                    </motion.span>
                ) : (
                    <motion.span
                        key="moon"
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="block"
                    >
                        <Moon className="w-5 h-5 text-indigo-300" aria-hidden="true" />
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
};

export default ThemeToggle;
