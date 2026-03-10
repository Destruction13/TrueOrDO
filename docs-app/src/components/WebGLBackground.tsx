/**
 * WebGL Background Component
 * React wrapper for WebGL shader backgrounds with fallback support
 */

import { useEffect, useRef, useState } from 'react';
import { WebGLBackground as WebGLBackgroundManager, type BackgroundType, type Theme } from '../lib/webgl/WebGLBackground';
import './WebGLBackground.css';

export interface WebGLBackgroundProps {
  type: BackgroundType;
  theme?: Theme;
  fallbackGradient?: string;
}

export function WebGLBackground({ type, theme = 'dark', fallbackGradient }: WebGLBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<WebGLBackgroundManager | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || useFallback) return;

    // Initialize WebGL background
    const manager = new WebGLBackgroundManager(canvas, {
      type,
      theme,
      onFallback: () => setUseFallback(true),
    });

    const success = manager.initialize();
    if (success) {
      managerRef.current = manager;
    }

    // Handle resize
    const handleResize = () => {
      if (manager && canvas) {
        manager.resize(canvas.clientWidth, canvas.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial resize

    return () => {
      window.removeEventListener('resize', handleResize);
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, [type, useFallback]);

  // Update theme when it changes
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setTheme(theme);
    }
  }, [theme]);

  if (useFallback) {
    return (
      <div
        className="webgl-background-fallback"
        style={{
          background: fallbackGradient || 'linear-gradient(135deg, hsl(222.2 47.4% 11.2%) 0%, hsl(217.2 32.6% 17.5%) 100%)',
        }}
      />
    );
  }

  return <canvas ref={canvasRef} className="webgl-background-canvas" />;
}
