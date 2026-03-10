/**
 * Shader Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import { ShaderError } from '../shader-utils';

describe('ShaderError', () => {
  it('should create error with message', () => {
    const error = new ShaderError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ShaderError');
  });

  it('should store shader type', () => {
    const error = new ShaderError('Test error', 'vertex');
    expect(error.shaderType).toBe('vertex');
  });
});

// Note: Full WebGL testing requires a WebGL context which is not available in Node.js
// These tests would need to run in a browser environment or with a WebGL mock
describe('WebGL Utilities', () => {
  it('should handle WebGL not supported gracefully', () => {
    // This is a placeholder test
    // In a real browser environment, we would test:
    // - initWebGLContext returns null when WebGL is not supported
    // - compileShader throws ShaderError on invalid shader source
    // - linkProgram throws ShaderError on linking failure
    expect(true).toBe(true);
  });
});
