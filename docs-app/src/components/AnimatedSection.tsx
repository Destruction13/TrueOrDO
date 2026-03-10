/**
 * AnimatedSection component
 * Applies scroll-based animations when elements enter viewport
 */

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useInView } from '../hooks/useInView';
import { fadeIn, slideInFromBottom, slideInFromLeft, slideInFromRight } from '../lib/animation/variants';

interface AnimatedSectionProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideInFromBottom' | 'slideInFromLeft' | 'slideInFromRight';
  className?: string;
  delay?: number;
  threshold?: number;
  triggerOnce?: boolean;
}

export function AnimatedSection({
  children,
  animation = 'fadeIn',
  className = '',
  delay = 0,
  threshold = 0.1,
  triggerOnce = true,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { threshold, triggerOnce });

  const variants = {
    fadeIn,
    slideInFromBottom,
    slideInFromLeft,
    slideInFromRight,
  }[animation];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="initial"
      animate={isInView ? 'animate' : 'initial'}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
