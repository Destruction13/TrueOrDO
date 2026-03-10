/**
 * WebGL Background Manager
 * Handles WebGL canvas initialization, animation, and cleanup
 */

import {
  initWebGLContext,
  createShaderProgram,
  createFullScreenQuad,
  setUniforms,
} from './shader-utils';
import {
  vertexShaderSource,
  gradientFlowFragmentShader,
  particleFieldFragmentShader,
} from './shaders';

export type BackgroundType = 'gradient-flow' | 'particle-field';
export type Theme = 'light' | 'dark';

export interface WebGLBackgroundOptions {
  type: BackgroundType;
  theme: Theme;
  onFallback?: () => void;
}

export class WebGLBackground {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private animationId: number | null = null;
  private startTime: number = 0;
  private type: BackgroundType;
  private theme: Theme;
  private onFallback?: () => void;

  constructor(canvas: HTMLCanvasElement, options: WebGLBackgroundOptions) {
    this.canvas = canvas;
    this.type = options.type;
    this.theme = options.theme;
    this.onFallback = options.onFallback;
  }

  /**
   * Initialize WebGL and start animation
   */
  initialize(): boolean {
    try {
      // Initialize WebGL context
      this.gl = initWebGLContext(this.canvas);
      if (!this.gl) {
        this.fallback();
        return false;
      }

      // Select fragment shader based on type
      const fragmentShader =
        this.type === 'gradient-flow'
          ? gradientFlowFragmentShader
          : particleFieldFragmentShader;

      // Create shader program
      this.program = createShaderProgram(
        this.gl,
        vertexShaderSource,
        fragmentShader
      );

      // Create full-screen quad
      this.buffer = createFullScreenQuad(this.gl);

      // Set up viewport
      this.resize(this.canvas.clientWidth, this.canvas.clientHeight);

      // Start animation
      this.startTime = performance.now();
      this.animate();

      return true;
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      this.fallback();
      return false;
    }
  }

  /**
   * Resize canvas and viewport
   */
  resize(width: number, height: number): void {
    if (!this.gl) return;

    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Update theme colors
   * Updates shader uniforms immediately for smooth color transitions
   */
  setTheme(theme: Theme): void {
    this.theme = theme;
    
    // Update shader uniforms immediately if WebGL is initialized
    if (this.gl && this.program) {
      this.gl.useProgram(this.program);
      const uniforms = this.getThemeUniforms();
      setUniforms(this.gl, this.program, uniforms);
    }
  }

  /**
   * Get theme-specific uniform values
   */
  private getThemeUniforms(): Record<string, any> {
    const uniforms: Record<string, any> = {};

    // Theme colors (HSL converted to RGB 0-1 range)
    if (this.type === 'gradient-flow') {
      if (this.theme === 'dark') {
        uniforms.u_color1 = [0.1, 0.15, 0.25]; // Dark blue
        uniforms.u_color2 = [0.15, 0.1, 0.3]; // Dark purple
      } else {
        uniforms.u_color1 = [0.9, 0.92, 0.95]; // Light blue
        uniforms.u_color2 = [0.85, 0.88, 0.95]; // Light purple
      }
    } else {
      // Particle field
      if (this.theme === 'dark') {
        uniforms.u_color = [0.3, 0.4, 0.6]; // Blue particles
      } else {
        uniforms.u_color = [0.4, 0.5, 0.7]; // Lighter blue particles
      }
    }

    return uniforms;
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.gl || !this.program) return;

    const currentTime = performance.now();
    const elapsed = (currentTime - this.startTime) / 1000; // Convert to seconds

    // Clear canvas
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Use shader program
    this.gl.useProgram(this.program);

    // Set up vertex attributes
    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set uniforms
    const uniforms = this.getUniforms(elapsed);
    setUniforms(this.gl, this.program, uniforms);

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Continue animation
    this.animationId = requestAnimationFrame(this.animate);
  };

  /**
   * Get uniform values based on shader type and theme
   */
  private getUniforms(time: number): Record<string, any> {
    const uniforms: Record<string, any> = {
      u_time: time,
      u_resolution: [this.canvas.width, this.canvas.height],
    };

    // Add theme-specific color uniforms
    const themeUniforms = this.getThemeUniforms();
    Object.assign(uniforms, themeUniforms);

    return uniforms;
  }

  /**
   * Fallback to CSS gradient
   */
  private fallback(): void {
    console.warn('Falling back to CSS gradient');
    if (this.onFallback) {
      this.onFallback();
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.gl) {
      if (this.program) {
        this.gl.deleteProgram(this.program);
        this.program = null;
      }
      if (this.buffer) {
        this.gl.deleteBuffer(this.buffer);
        this.buffer = null;
      }
    }

    this.gl = null;
  }
}
