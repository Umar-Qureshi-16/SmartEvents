import React from 'react';

export default function EventManagerLogo({ className = '', collapsed = false }) {
    return (
        <div className={`flex items-center gap-2 select-none cursor-pointer group ${className}`}>
            {/* Classy Smartie Emblem with Electric Indigo Glow */}
            <div className="relative w-8 h-8 rounded-full bg-slate-950 border border-white/20 flex items-center justify-center group-hover:border-[#4F46E5] transition-all shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            </div>

            {!collapsed && (
                <div className="flex items-center gap-1.5">
                    <span className="font-black text-lg tracking-tight text-white font-sans uppercase">
                        Smartie
                    </span>
                    <span className="font-mono text-[9px] text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/30 px-2 py-0.5 rounded-full font-bold">
                        PRO
                    </span>
                </div>
            )}
        </div>
    );
}
