"use client";

/**
 * Re-export framer-motion for easy migration to lazy loading in the future
 * Currently exports directly, but structure allows for dynamic import later
 *
 * TODO: Implement code-splitting strategy:
 * - Option 1: Dynamic import with loading fallback
 * - Option 2: Replace simple animations with CSS
 * - Option 3: Separate bundle for critical vs non-critical animations
 */

export { motion, AnimatePresence } from "framer-motion";
