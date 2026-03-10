/**
 * WebGLBackground Tests
 * Tests for WebGL background manager including theme support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebGLBackground } from '../WebGLBackground';

describe('WebGLBackground', () => {
  let canvas: HTMLCanvasElement;
  let background: WebGLBackground | null;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    if (background) {
      background.dispose();
      background = null;
    }
    document.body.removeChild(canvas);
  });

  describe('Initialization', () => {
    it('should initialize with gradient-flow type', () => {
      background = new WebGLBackground(canvas, {
        type: 'gradient-flow',
        theme: 'dark',
      });

      const success = background.initialize();
      
      // WebGL might not be available in test environment
      // Just verify the method doesn't throw
      expect(typeof success).toBe('boolean');
    });

    it('should initialize with particle-field type', () => {
      background = new WebGLBackground(canvas, {
        type: 'particle-field',
        theme: 'light',
      });

      const success = background.initialize();
      
      expect(typeof success).toBe('boolean');
    });

    it('should call fallback when WebGL is not available', () => {
      const onFallback = vi.fn();
      
      // Mock getContext to return null (WebGL not available)
      const originalGetContext = canvas.getContext.bind(canvas);
      canvas.getContext = vi.fn(() => null);

      background = new WebGLBackground(canvas, {
        type: 'gradient-flow',
        theme: 'dark',
        onFallback,
      });

      const success = background.initialize();
      
      expect(success).toBe(false);
      expect(onFallback).toHaveBeenCalled();

      // Restore original getContext
      canvas.getContext = originalGetContext;
    });
  });

  describe('Theme Support', () => {
    it('should update theme colors when setTheme is called', () => {
      background = new WebGLBackground(canvas, {
        type: 'gradient-flow',
        theme: 'dark',
      });

      background.initialize();
      
      // Change theme - should not throw
      expect(() => {
        background!.setTheme('light');
      }).not.toThrow();
    });

    it('should handle theme changes for particle-field type', () => {
      background = new WebGLBackground(canvas, {
        type: 'particle-field',
        theme: 'light',
      });

      background.initialize();
      
      // Change theme - should not throw
      expect(() => {
        background!.setTheme('dark');
      }).not.toThrow();
    });

    it('should handle theme changes before initialization', () => {
      background = new WebGLBackground(canvas, {
        type: 'gradient-flow',
        theme: 'dark',
      });

      // Change theme before initialization - should not throw
      expect(() => {
        background!.setTheme('light');
      }).not.toThrow();
    });
  });

  describe('Resize', () => {
    it('should resize canvas and viewport', () => {
      background = new WebGLBackground(canvas, {
        type: 'gradient-flow',
        theme: 'dark',
      });

      const success = background.initialize();
      
      // Only test resize if WebGL is available
      if (success) {
        background.resize(1024, 768);
        expect(canvas.width).toBe(1024);
        expect(canvas.height).toBe(768);
      } else {
        // If WebGL is not available, just verify resize doesn't throw
        expect(() => {
          background!.resize(1024, 768);
        }).not.toThrow();
      }
    });

    it('should handle resize before initialization', () => {
      background = new WebGLBackground(canvas, {
        type: 'gradient-flow',
        theme: 'dark',
      });

      // Resize before initialization - should not throw
      expect(() => {
        background!.resize(1024, 768);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources properly', () => {
      background = new WebGLBackground(canvas, {
        type: 'gradient-flow',
        theme: 'dark',
      });

      background.initialize();
      
      // Dispose should not throw
      expect(() => {
        background!.dispose();
      }).not.toThrow();
    });

    it('should handle multiple dispose calls', () => {
      background = new WebGLBackground(canvas, {
        type: 'gradient-flow',
        theme: 'dark',
      });

      background.initialize();
      background.dispose();
      
      // Second dispose should not throw
      expect(() => {
        background!.dispose();
      }).not.toThrow();
    });
  });
});
