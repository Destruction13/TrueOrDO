/**
 * PageWrapper component
 * Wraps page content with Framer Motion animations for page transitions
 */

import { motion } from 'framer-motion';
import { pageTransition } from '../../lib/animation/variants';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <motion.div
      className={className}
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
