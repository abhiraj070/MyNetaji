"use client";

import { AnimatePresence, motion } from "framer-motion";

import { SPRING_POP } from "@/lib/motion";

/**
 * The brief dark pill that confirms something happened — a vote cast, a link
 * copied, feedback sent.
 *
 * One implementation, because there were three: identical but for how far up
 * from the bottom edge they sat, and one that had quietly lost its
 * `whitespace-nowrap`. Position is the caller's business — the game screen
 * has no action bar to clear, the others do — so it comes in as a class
 * rather than becoming a variant prop.
 *
 * `message` doubles as the trigger: passing null is how it leaves, which is
 * what lets the exit animation run instead of the pill vanishing.
 */
export function Toast({ message, className = "" }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={SPRING_POP}
          className={`fixed left-1/2 z-50 max-w-[92vw] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-center font-display text-sm font-semibold text-white shadow-lift ${className}`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
