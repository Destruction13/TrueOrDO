/**
 * WebGL Shader Sources
 * Contains vertex and fragment shaders for background effects
 */

/**
 * Basic vertex shader for full-screen quad
 */
export const vertexShaderSource = `
  attribute vec2 a_position;
  
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

/**
 * Gradient Flow Fragment Shader
 * Creates an animated gradient with noise texture
 */
export const gradientFlowFragmentShader = `
  precision mediump float;
  
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  
  // Simple noise function
  float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    
    // Animated gradient
    float wave = sin(uv.x * 3.0 + u_time * 0.5) * 0.5 + 0.5;
    vec3 color = mix(u_color1, u_color2, wave);
    
    // Add noise for texture
    float n = noise(uv * 10.0 + u_time * 0.1);
    color += n * 0.05;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Particle Field Fragment Shader
 * Creates an animated particle grid effect
 */
export const particleFieldFragmentShader = `
  precision mediump float;
  
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_color;
  
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    
    // Create particle grid
    vec2 grid = floor(uv * 20.0);
    float particle = random(grid);
    
    // Animate particles
    float pulse = sin(u_time + particle * 6.28318) * 0.5 + 0.5;
    
    // Render particles
    vec3 color = u_color * pulse * 0.3;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;
