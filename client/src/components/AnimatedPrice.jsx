import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AnimatedPrice
 * Renders a price value using JetBrains Mono (font-mono token).
 * When the price prop changes, the old value slides/fades out with a
 * strike-through and the new value slides/fades in.
 *
 * @param {{ price: string|number, className?: string }} props
 */
const AnimatedPrice = ({ price, className = '' }) => {
  // Track [current, previous] so we can animate the transition
  const [displayState, setDisplayState] = useState({ current: price, previous: null });

  useEffect(() => {
    if (price !== displayState.current) {
      setDisplayState({ current: price, previous: displayState.current });

      // Clear the "previous" reference after animation completes
      const timer = setTimeout(() => {
        setDisplayState((s) => ({ ...s, previous: null }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [price]); // eslint-disable-line react-hooks/exhaustive-deps

  const { current, previous } = displayState;

  return (
    <span className={`font-mono relative inline-flex flex-col items-end overflow-hidden ${className}`}>
      {/* Outgoing / old price – strikes through then fades up */}
      <AnimatePresence>
        {previous !== null && (
          <motion.span
            key={`old-${previous}`}
            initial={{ opacity: 1, y: 0, textDecoration: 'line-through' }}
            animate={{ opacity: 0.5, textDecoration: 'line-through' }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 flex items-center justify-end text-gray-400"
          >
            ${previous}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Incoming / current price – slides up from below */}
      <motion.span
        key={`new-${current}`}
        initial={previous !== null ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        ${current}
      </motion.span>
    </span>
  );
};

export default AnimatedPrice;
