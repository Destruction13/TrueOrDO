/**
 * useInView Hook Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInView } from '../useInView';
import { useRef } from 'react';

// Mock IntersectionObserver
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  
  observe() {}
  disconnect() {}
  unobserve() {}
}

describe('useInView', () => {
  beforeEach(() => {
    // Setup IntersectionObserver mock
    (globalThis as any).IntersectionObserver = MockIntersectionObserver;
  });

  it('should return false initially', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      return useInView(ref);
    });

    expect(result.current).toBe(false);
  });

  it('should accept options', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      return useInView(ref, {
        threshold: 0.5,
        rootMargin: '10px',
        triggerOnce: false,
      });
    });

    expect(result.current).toBe(false);
  });
});
