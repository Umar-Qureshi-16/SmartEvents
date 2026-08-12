import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const CustomLoader = () => {
    const loaderRef = useRef(null);
    const circleRef = useRef(null);
    const logoRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Initial flash
            gsap.fromTo(loaderRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.5, ease: "power2.inOut" }
            );

            // Orbiting circles
            gsap.to(".loader-ring", {
                rotate: 360,
                duration: 2,
                repeat: -1,
                ease: "none"
            });

            // Pulse logo
            gsap.to(logoRef.current, {
                scale: 1.1,
                opacity: 0.8,
                duration: 0.8,
                repeat: -1,
                yoyo: true,
                ease: "power1.inOut"
            });

            // Random particles in background
            const particles = document.querySelectorAll(".loader-particle");
            particles.forEach((p, i) => {
                gsap.to(p, {
                    x: "random(-50, 50)",
                    y: "random(-50, 50)",
                    duration: "random(1, 3)",
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut",
                    delay: i * 0.1
                });
            });
        });

        return () => ctx.revert();
    }, []);

    return (
        <div
            ref={loaderRef}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 text-fg overflow-hidden"
        >
            {/* Ambient Background Particles */}
            {[...Array(20)].map((_, i) => (
                <div
                    key={i}
                    className="loader-particle absolute w-1 h-1 bg-indigo-500/30 rounded-full"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                    }}
                />
            ))}

            <div className="relative">
                {/* Rotating Rings */}
                <div className="loader-ring w-24 h-24 border-2 border-transparent border-t-indigo-500 border-r-purple-500 rounded-full" />
                <div className="loader-ring absolute inset-0 w-24 h-24 border-2 border-transparent border-b-cyan-500 border-l-blue-500 rounded-full opacity-50" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />

                {/* Logo / Icon */}
                <div
                    ref={logoRef}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.5)] transform rotate-45 flex items-center justify-center">
                        <span className="text-fg font-bold text-xl -rotate-45">S</span>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <h2 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    SmartEvents
                </h2>
                <p className="text-muted font-medium text-sm mt-1 tracking-widest uppercase">
                    Initializing Ecosystem
                </p>

                {/* Percentage Loading Bar */}
                <div className="w-48 h-1 bg-surface rounded-full mt-6 overflow-hidden">
                    <MotionBar className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                </div>
            </div>

            {/* Antigravity Stylized Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] pointer-events-none" />
        </div>
    );
};

// Subtle helper for progress bar
const MotionBar = ({ className }) => {
    const barRef = useRef(null);
    useEffect(() => {
        gsap.to(barRef.current, {
            width: "100%",
            duration: 3,
            ease: "power2.inOut"
        });
    }, []);
    return <div ref={barRef} className={className} style={{ width: "0%" }} />;
};

export default CustomLoader;
