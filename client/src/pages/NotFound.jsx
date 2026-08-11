import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30">
            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>
            <div className="max-w-md w-full glass p-10 rounded-[3rem] border-white/5 text-center space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl -mr-16 -mt-16" />
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-xl">
                    <ShieldAlert size={40} className="text-rose-500" />
                </div>
                <div>
                    <h1 className="text-8xl font-black text-white tracking-tighter italic">404</h1>
                    <h2 className="text-2xl font-bold mt-2 uppercase tracking-tight text-white mb-2">Page Not Found</h2>
                    <p className="text-slate-400 font-medium">This page doesn't exist.</p>
                </div>
                <div className="pt-4">
                    <Link to="/" className="w-full h-14 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 justify-center transition-all group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
