import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

// After a new deploy, a tab that was already open may ask for page files that no
// longer exist. That is not a real fault: reloading picks up the new version.
const STALE_BUILD = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i;
const RELOAD_KEY = 'reloaded-for-new-version';

export const isStaleBuildError = (error) => STALE_BUILD.test(String(error?.message || error || ''));

export function reloadOnceForNewVersion() {
    try {
        if (sessionStorage.getItem(RELOAD_KEY)) return false;
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
        /* storage unavailable: still reload once */
    }
    window.location.reload();
    return true;
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        if (isStaleBuildError(error) && reloadOnceForNewVersion()) return;
        console.error('Unexpected error:', error, errorInfo);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        const stale = isStaleBuildError(this.state.error);
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-fg">
                <div className="max-w-xl w-full bg-surface border border-border p-10 rounded-3xl space-y-6 text-center shadow-card">
                    <div className="w-16 h-16 bg-warning/10 rounded-2xl mx-auto flex items-center justify-center">
                        <AlertTriangle size={32} className="text-warning" aria-hidden="true" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-black">
                            {stale ? 'A new version is available' : 'Something went wrong'}
                        </h1>
                        <p className="text-muted text-sm leading-relaxed">
                            {stale
                                ? 'SmartEvents was updated while this page was open. Reload to continue; nothing you saved is lost.'
                                : 'This page hit an unexpected error. Reloading usually fixes it. If it keeps happening, go back to the home page.'}
                        </p>
                    </div>

                    {!stale && (
                        <details className="bg-surface-2 p-4 rounded-2xl border border-border text-left">
                            <summary className="text-xs font-bold text-muted cursor-pointer">Technical details</summary>
                            <code className="block mt-2 text-xs text-fg font-mono break-words">
                                {this.state.error?.toString() || 'Unknown error'}
                            </code>
                        </details>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="flex-1 flex items-center justify-center gap-2 btn-adyen-primary py-3 text-sm"
                        >
                            <RefreshCcw size={16} aria-hidden="true" /> Reload page
                        </button>
                        <button
                            type="button"
                            onClick={() => { window.location.href = '/'; }}
                            className="flex-1 flex items-center justify-center gap-2 btn-adyen-outline py-3 text-sm"
                        >
                            <Home size={16} aria-hidden="true" /> Go to home page
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
