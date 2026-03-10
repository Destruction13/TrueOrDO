/**
 * Performance Monitor
 * Monitors FPS and provides performance optimization utilities
 */

export interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  frameTime: number;
}

export type PerformanceCallback = (metrics: PerformanceMetrics) => void;

/**
 * FPS Monitor
 * Tracks frames per second and calls callback when FPS drops below threshold
 */
export class FPSMonitor {
  private lastTime: number = performance.now();
  private frames: number = 0;
  private fpsHistory: number[] = [];
  private maxHistoryLength: number = 60; // Track last 60 frames
  private animationFrameId: number | null = null;
  private callback: PerformanceCallback | null = null;
  private threshold: number = 50;

  constructor(callback?: PerformanceCallback, threshold: number = 50) {
    this.callback = callback || null;
    this.threshold = threshold;
  }

  /**
   * Start monitoring FPS
   */
  start(): void {
    if (this.animationFrameId !== null) {
      return; // Already running
    }

    this.lastTime = performance.now();
    this.frames = 0;
    this.fpsHistory = [];
    this.tick();
  }

  /**
   * Stop monitoring FPS
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Internal tick function
   */
  private tick = (): void => {
    this.frames++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    // Calculate FPS every second
    if (elapsed >= 1000) {
      const fps = Math.round((this.frames * 1000) / elapsed);
      const frameTime = elapsed / this.frames;

      // Add to history
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > this.maxHistoryLength) {
        this.fpsHistory.shift();
      }

      // Calculate average FPS
      const averageFps = Math.round(
        this.fpsHistory.reduce((sum, f) => sum + f, 0) / this.fpsHistory.length
      );

      // Call callback with metrics
      if (this.callback) {
        this.callback({
          fps,
          averageFps,
          frameTime,
        });
      }

      // Reset counters
      this.frames = 0;
      this.lastTime = currentTime;
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Get current average FPS
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    return Math.round(
      this.fpsHistory.reduce((sum, f) => sum + f, 0) / this.fpsHistory.length
    );
  }

  /**
   * Check if performance is below threshold
   */
  isBelowThreshold(): boolean {
    return this.getAverageFPS() < this.threshold;
  }
}

/**
 * Optimize animations for performance
 * Uses CSS transforms and will-change for hardware acceleration
 */
export function optimizeForPerformance(element: HTMLElement): void {
  // Use will-change to hint browser about upcoming animations
  element.style.willChange = 'transform, opacity';

  // Force hardware acceleration
  element.style.transform = 'translateZ(0)';
}

/**
 * Remove performance optimizations
 */
export function removePerformanceOptimizations(element: HTMLElement): void {
  element.style.willChange = 'auto';
  element.style.transform = '';
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    return setTimeout(callback, 1) as unknown as number;
  }
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallback(id: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Batch DOM reads and writes to avoid layout thrashing
 */
export class DOMBatcher {
  private readQueue: Array<() => void> = [];
  private writeQueue: Array<() => void> = [];
  private scheduled: boolean = false;

  /**
   * Schedule a DOM read operation
   */
  read(callback: () => void): void {
    this.readQueue.push(callback);
    this.schedule();
  }

  /**
   * Schedule a DOM write operation
   */
  write(callback: () => void): void {
    this.writeQueue.push(callback);
    this.schedule();
  }

  /**
   * Schedule batch execution
   */
  private schedule(): void {
    if (this.scheduled) return;

    this.scheduled = true;
    requestAnimationFrame(() => {
      this.flush();
    });
  }

  /**
   * Flush all queued operations
   */
  private flush(): void {
    // Execute all reads first
    while (this.readQueue.length > 0) {
      const read = this.readQueue.shift();
      if (read) read();
    }

    // Then execute all writes
    while (this.writeQueue.length > 0) {
      const write = this.writeQueue.shift();
      if (write) write();
    }

    this.scheduled = false;
  }
}

// Export singleton instance
export const domBatcher = new DOMBatcher();
