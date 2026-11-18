import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal';

/**
 * In-app replacement for window.confirm(): same one-line use
 *   if (!(await confirm({ title, message, confirmLabel, tone }))) return;
 * but styled like the rest of the app, keyboard accessible, and it never
 * freezes the page the way the browser's native dialog does.
 */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null);
    const resolver = useRef(null);

    const confirm = useCallback((opts) => new Promise((resolve) => {
        resolver.current = resolve;
        setState(typeof opts === 'string' ? { message: opts } : opts);
    }), []);

    const close = (answer) => {
        resolver.current?.(answer);
        resolver.current = null;
        setState(null);
    };

    const danger = state?.tone === 'danger';
    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Modal
                open={Boolean(state)}
                onClose={() => close(false)}
                title={state?.title || 'Are you sure?'}
                size="sm"
                footer={(
                    <>
                        <button type="button" onClick={() => close(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-fg hover:bg-fg/5">
                            {state?.cancelLabel || 'Cancel'}
                        </button>
                        <button type="button" onClick={() => close(true)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold text-white ${danger ? 'bg-danger hover:opacity-90' : 'bg-brand hover:bg-brand-hover'}`}>
                            {state?.confirmLabel || 'Confirm'}
                        </button>
                    </>
                )}
            >
                <p className="text-sm text-fg/80 leading-relaxed">{state?.message}</p>
            </Modal>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    // Outside the provider (e.g. isolated tests) fall back to the browser dialog.
    return ctx || ((opts) => Promise.resolve(window.confirm(typeof opts === 'string' ? opts : opts.message)));
}
