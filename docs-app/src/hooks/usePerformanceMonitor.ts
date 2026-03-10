/**
 * usePerformanceMonitor Hook
 * Monitors application performance and FPS
 */

import { useEffect, useState } from 'react';
import { FPSMonitor, type PerformanceMetrics } from '../lib/animation/performance-monitor';

export interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  threshold?: number;
  onBelowThreshold?: () => void;
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const { enabled = true, threshold = 50, onBelowThreshold } = options;
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    averageFps: 60,
    frameTime: 16.67,
  });
  const [isBelowThreshold, setIsBelowThreshold] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const monitor = new FPSMonitor((newMetrics) => {
      setMetrics(newMetrics);

      // Check if below threshold
      if (newMetrics.averageFps < threshold) {
        setIsBelowThreshold(true);
        if (onBelowThreshold) {
          onBelowThreshold();
        }
      } else {
        setIsBelowThreshold(false);
      }
    }, threshold);

    monitor.start();

    return () => {
      monitor.stop();
    };
  }, [enabled, threshold, onBelowThreshold]);

  return {
    metrics,
    isBelowThreshold,
  };
}
