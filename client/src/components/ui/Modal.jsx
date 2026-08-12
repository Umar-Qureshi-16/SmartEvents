import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Accessible modal dialog.
 *
 * Traps focus, closes on Escape, restores focus to the trigger on close, and
 * locks background scroll — none of which the app's ad-hoc modals did.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
    const panelRef = useRef(null);
    const previouslyFocused = useRef(null);

    useEffect(() => {
        if (!open) return;

        previouslyFocused.current = document.activeElement;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
                return;
            }
            if (e.key !== 'Tab') return;

            const focusables = panelRef.current?.querySelectorAll(
                'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusables?.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        // Focus the first control once the panel has mounted.
        const t = setTimeout(() => {
            panelRef.current?.querySelector('input, textarea, button')?.focus();
        }, 50);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = overflow;
            clearTimeout(t);
            previouslyFocused.current?.focus?.();
        };
    }, [open, onClose]);

    const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

    return createPortal(
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className={`relative w-full ${widths[size]} bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden`}
                    >
                        <div className="flex items-start justify-between gap-4 p-6 border-b border-border">
                            <div>
                                <h2 className="text-lg font-bold text-fg">{title}</h2>
                                {description && <p className="text-sm text-muted mt-1">{description}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close dialog"
                                className="p-2 -m-2 rounded-lg text-muted hover:text-fg hover:bg-fg/5 transition-colors shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6">{children}</div>

                        {footer && (
                            <div className="px-6 py-4 border-t border-border bg-fg/[0.02] flex justify-end gap-3">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
