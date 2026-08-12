import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Drawer({ isOpen, onClose, title, children }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute inset-y-0 right-0 max-w-md w-full bg-surface border-l border-border shadow-2xl p-6 overflow-y-auto space-y-6 text-fg"
                    >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-lg font-bold text-fg">{title}</h3>
                            <button onClick={onClose} className="p-1 rounded-full text-muted hover:text-black"
                                aria-label="Close panel">
                                <X size={20} />
                            </button>
                        </div>
                        <div>{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
