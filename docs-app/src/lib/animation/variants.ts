/**
 * Animation Variants
 * Framer Motion animation presets for consistent animations
 */

import { type Variants } from 'framer-motion';

/**
 * Page transition animation
 */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
};

/**
 * Fade in animation
 */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.4 }
  },
};

/**
 * Slide in from left
 */
export const slideInFromLeft: Variants = {
  initial: { x: -50, opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' }
  },
};

/**
 * Slide in from right
 */
export const slideInFromRight: Variants = {
  initial: { x: 50, opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' }
  },
};

/**
 * Slide in from bottom
 */
export const slideInFromBottom: Variants = {
  initial: { y: 50, opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' }
  },
};

/**
 * Scale in animation
 */
export const scaleIn: Variants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.3 }
  },
};

/**
 * Stagger children animation
 */
export const staggerChildren: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/**
 * Expand/collapse animation
 */
export const expandCollapse: Variants = {
  collapsed: { 
    height: 0, 
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
  expanded: { 
    height: 'auto', 
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
};
