/**
 * FPS Monitor
 * Tracks frames per second and triggers callbacks when FPS drops
 */

export interface FPSMonitorOptions {
  threshold?: number; // FPS threshold (default: 50)
  onLowFPS?: () => void; // Callback when FPS drops below threshold
  sampleSize?: number; // Number of frames to average (default: 60)
}

export class FPSMonitor {
  private threshold: number;
  private onLowFPS?: () => void;
  private sampleSize: number;
  private frames: number[] = [];
  private lastTime: number = 0;
  private animationId: number | null = null;
  private lowFPSTriggered: boolean = false;

  constructor(options: FPSMonitorOptions = {}) {
    this.threshold = options.threshold ?? 50;
    this.onLowFPS = options.onLowFPS;
    this.sampleSize = options.sampleSize ?? 60;
  }

  /**
   * Start monitoring FPS
   */
  start(): void {
    this.lastTime = performance.now();
    this.lowFPSTriggered = false;
    this.measure();
  }

  /**
   * Stop monitoring FPS
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Get current average FPS
   */
  getCurrentFPS(): number {
    if (this.frames.length === 0) return 60;
    
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.frames.length);
  }

  /**
   * Measure FPS
   */
  private measure = (): void => {
    const currentTime = performance.now();
    const delta = currentTime - this.lastTime;
    
    if (delta > 0) {
      const fps = 1000 / delta;
      this.frames.push(fps);
      
      // Keep only last N frames
      if (this.frames.length > this.sampleSize) {
        this.frames.shift();
      }
      
      // Check if FPS is below threshold
      const avgFPS = this.getCurrentFPS();
      if (avgFPS < this.threshold && !this.lowFPSTriggered) {
        this.lowFPSTriggered = true;
        if (this.onLowFPS) {
          this.onLowFPS();
        }
      }
    }
    
    this.lastTime = currentTime;
    this.animationId = requestAnimationFrame(this.measure);
  };
}
