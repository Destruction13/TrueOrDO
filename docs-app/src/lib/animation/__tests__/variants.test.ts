/**
 * Animation Variants Tests
 */

import { describe, it, expect } from 'vitest';
import {
  pageTransition,
  fadeIn,
  slideInFromLeft,
  slideInFromRight,
  slideInFromBottom,
  scaleIn,
  staggerChildren,
  expandCollapse,
} from '../variants';

describe('Animation Variants', () => {
  it('should have pageTransition with initial, animate, and exit states', () => {
    expect(pageTransition).toHaveProperty('initial');
    expect(pageTransition).toHaveProperty('animate');
    expect(pageTransition).toHaveProperty('exit');
    expect(pageTransition.initial).toEqual({ opacity: 0, y: 20 });
  });

  it('should have fadeIn with initial and animate states', () => {
    expect(fadeIn).toHaveProperty('initial');
    expect(fadeIn).toHaveProperty('animate');
    expect(fadeIn.initial).toEqual({ opacity: 0 });
  });

  it('should have slideInFromLeft with x translation', () => {
    expect(slideInFromLeft.initial).toHaveProperty('x');
    expect(slideInFromLeft.initial).toEqual({ x: -50, opacity: 0 });
  });

  it('should have slideInFromRight with x translation', () => {
    expect(slideInFromRight.initial).toHaveProperty('x');
    expect(slideInFromRight.initial).toEqual({ x: 50, opacity: 0 });
  });

  it('should have slideInFromBottom with y translation', () => {
    expect(slideInFromBottom.initial).toHaveProperty('y');
    expect(slideInFromBottom.initial).toEqual({ y: 50, opacity: 0 });
  });

  it('should have scaleIn with scale property', () => {
    expect(scaleIn.initial).toHaveProperty('scale');
    expect(scaleIn.initial).toEqual({ scale: 0.9, opacity: 0 });
  });

  it('should have staggerChildren with transition', () => {
    expect(staggerChildren).toHaveProperty('animate');
    expect(staggerChildren.animate).toHaveProperty('transition');
  });

  it('should have expandCollapse with collapsed and expanded states', () => {
    expect(expandCollapse).toHaveProperty('collapsed');
    expect(expandCollapse).toHaveProperty('expanded');
    expect(expandCollapse.collapsed).toEqual({
      height: 0,
      opacity: 0,
      transition: { duration: 0.3, ease: 'easeInOut' },
    });
    expect(expandCollapse.expanded).toEqual({
      height: 'auto',
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeInOut' },
    });
  });
});
