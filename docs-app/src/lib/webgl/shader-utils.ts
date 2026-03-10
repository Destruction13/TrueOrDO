/**
 * WebGL Shader Utilities
 * Provides shader compilation, linking, and error handling
 */

export interface ShaderConfig {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, any>;
}

export class ShaderError extends Error {
  shaderType?: string;
  
  constructor(message: string, shaderType?: string) {
    super(message);
    this.name = 'ShaderError';
    this.shaderType = shaderType;
  }
}

/**
 * Compile a shader from source code
 */
export function compileShader(
  gl: WebGLRenderingContext,
  source: string,
  type: number
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new ShaderError('Failed to create shader');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
    throw new ShaderError(`Shader compilation failed: ${info}`, shaderType);
  }

  return shader;
}

/**
 * Link vertex and fragment shaders into a program
 */
export function linkProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new ShaderError('Failed to create program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new ShaderError(`Program linking failed: ${info}`);
  }

  return program;
}

/**
 * Create a shader program from vertex and fragment source
 */
export function createShaderProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
  
  const program = linkProgram(gl, vertexShader, fragmentShader);
  
  // Clean up shaders (they're now part of the program)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  
  return program;
}

/**
 * Initialize WebGL context with error handling
 */
export function initWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  try {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      console.warn('WebGL not supported');
      return null;
    }
    
    return gl as WebGLRenderingContext;
  } catch (error) {
    console.error('WebGL initialization error:', error);
    return null;
  }
}

/**
 * Create a full-screen quad buffer
 */
export function createFullScreenQuad(gl: WebGLRenderingContext): WebGLBuffer {
  const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]);
  
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new ShaderError('Failed to create buffer');
  }
  
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
  return buffer;
}

/**
 * Set uniform values in a shader program
 */
export function setUniforms(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  uniforms: Record<string, any>
): void {
  for (const [name, value] of Object.entries(uniforms)) {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
      console.warn(`Uniform ${name} not found in shader`);
      continue;
    }
    
    if (typeof value === 'number') {
      gl.uniform1f(location, value);
    } else if (Array.isArray(value)) {
      if (value.length === 2) {
        gl.uniform2f(location, value[0], value[1]);
      } else if (value.length === 3) {
        gl.uniform3f(location, value[0], value[1], value[2]);
      } else if (value.length === 4) {
        gl.uniform4f(location, value[0], value[1], value[2], value[3]);
      }
    }
  }
}
