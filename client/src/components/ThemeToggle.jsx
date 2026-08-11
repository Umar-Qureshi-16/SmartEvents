import React, { useState } from 'react';
import { Sun, Moon, Palette, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const themes = [
    { id: 'light', name: 'Light', color: '#f8fafc', icon: <Sun className="w-4 h-4" /> },
    { id: 'dark', name: 'Dark', color: '#0f172a', icon: <Moon className="w-4 h-4" /> },
    { id: 'nebula', name: 'Nebula', color: '#8b5cf6', icon: <Palette className="w-4 h-4 text-purple-400" /> },
    { id: 'solar', name: 'Solar', color: '#f59e0b', icon: <Palette className="w-4 h-4 text-amber-500" /> },
    { id: 'matrix', name: 'Matrix', color: '#22c55e', icon: <Palette className="w-4 h-4 text-green-500" /> },
];

const ThemeToggle = () => {
    const { theme, toggleTheme, setSpecificTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative flex items-center">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-2"
            >
                <AnimatePresence mode="wait">
                    {theme === 'light' ? (
                        <motion.div
                            key="sun"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                        >
                            <Sun className="w-5 h-5 text-amber-500" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="moon"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                        >
                            <Moon className="w-5 h-5 text-blue-400" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-12 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                        >
                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Select Theme
                            </div>
                            <div className="space-y-1">
                                {themes.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setSpecificTheme(t.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${theme === t.id
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700"
                                                style={{ backgroundColor: t.color }}
                                            />
                                            <span>{t.name}</span>
                                        </div>
                                        {theme === t.id && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ThemeToggle;
