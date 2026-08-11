import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ScrollReveal = ({ children, direction = 'up', delay = 0, duration = 1 }) => {
    const revealRef = useRef(null);

    useEffect(() => {
        let x = 0;
        let y = 0;

        switch (direction) {
            case 'up': y = 50; break;
            case 'down': y = -50; break;
            case 'left': x = 50; break;
            case 'right': x = -50; break;
            default: y = 50;
        }

        const ctx = gsap.context(() => {
            gsap.fromTo(revealRef.current,
                {
                    x: x,
                    y: y,
                    opacity: 0,
                    scale: 0.95
                },
                {
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: duration,
                    delay: delay,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: revealRef.current,
                        start: "top 85%",
                        toggleActions: "play none none none"
                    }
                }
            );
        });

        return () => ctx.revert();
    }, [direction, delay, duration]);

    return (
        <div ref={revealRef} className="reveal-container">
            {children}
        </div>
    );
};

export default ScrollReveal;
