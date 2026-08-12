import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("System Runtime Fault:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-ink flex items-center justify-center p-6 text-fg font-mono">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-2xl w-full glass p-10 rounded-[40px] border-coral/20 bg-coral/5 space-y-8 text-center"
                    >
                        <div className="w-24 h-24 bg-coral/10 rounded-3xl mx-auto flex items-center justify-center border border-coral/20">
                            <AlertTriangle size={48} className="text-coral animate-pulse" />
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-3xl font-black uppercase tracking-tighter">System Integrity Breach</h1>
                            <p className="text-muted text-sm leading-relaxed">
                                A critical runtime fault has been detected in the application kernel.
                                Active session state may be compromised.
                            </p>
                        </div>

                        <div className="bg-fg/40 p-4 rounded-2xl border border-border text-left overflow-auto max-h-40">
                            <p className="text-[10px] text-coral/70 uppercase font-black mb-2 tracking-widest">Fault Details</p>
                            <code className="text-xs text-coral/80 font-mono">
                                {this.state.error?.toString() || "Unknown Kernel Fault"}
                            </code>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 flex items-center justify-center gap-2 bg-fg/5 hover:bg-surface/10 py-4 rounded-2xl transition-all font-bold uppercase text-[10px] tracking-widest"
                            >
                                <RefreshCcw size={16} /> Reinitialize Kernel
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex-1 flex items-center justify-center gap-2 grad-indigo py-4 rounded-2xl transition-all font-bold uppercase text-[10px] tracking-widest text-fg"
                            >
                                <Home size={16} /> Exit to Safe Mode
                            </button>
                        </div>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
