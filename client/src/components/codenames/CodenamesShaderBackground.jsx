import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Шейдер для Codenames с поддержкой смены цвета в зависимости от победителя
 * @param {string} colorMode - "neutral" | "red" | "blue"
 */
export default function CodenamesShaderBackground({ colorMode = "neutral" }) {
  const containerRef = useRef(null);
  const materialRef = useRef(null);

  // Конвертация colorMode строки в число для шейдера
  const getColorModeValue = (mode) => {
    if (mode === "red") return 1.0;
    if (mode === "blue") return 2.0;
    return 0.0; // neutral
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Инициализируем с текущим значением colorMode
    const initialColorMode = getColorModeValue(colorMode);
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        colorMode: { value: initialColorMode } // 0 = neutral, 1 = red, 2 = blue
      },
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float iTime;
        uniform vec2 iResolution;
        uniform float colorMode;

        #define NUM_OCTAVES 3

        float rand(vec2 n) {
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 ip = floor(p);
          vec2 u = fract(p);
          u = u*u*(3.0-2.0*u);

          float res = mix(
            mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
            mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
          return res * res;
        }

        float fbm(vec2 x) {
          float v = 0.0;
          float a = 0.3;
          vec2 shift = vec2(100);
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
          for (int i = 0; i < NUM_OCTAVES; ++i) {
            v += a * noise(x);
            x = rot * x * 2.0 + shift;
            a *= 0.4;
          }
          return v;
        }

        void main() {
          // Нормализованные координаты для фонового градиента
          vec2 uv = gl_FragCoord.xy / iResolution.xy;
          
          // Базовый фоновый цвет в зависимости от режима (более насыщенные цвета)
          vec3 bgColor;
          if (colorMode < 0.5) {
            // Neutral - фиолетовый фон (красный + синий)
            bgColor = mix(
              vec3(0.1, 0.0, 0.05),    // тёмно-фиолетовый с красным снизу
              vec3(0.05, 0.0, 0.12),   // тёмно-фиолетовый с синим сверху
              uv.y
            );
          } else if (colorMode < 1.5) {
            // Red team - тёмно-красный фон (насыщенный)
            bgColor = mix(
              vec3(0.1, 0.01, 0.01),   // тёмно-красный снизу
              vec3(0.15, 0.02, 0.03),  // тёмно-бордовый сверху
              uv.y
            );
          } else {
            // Blue team - чисто синий фон (без зелёного!)
            bgColor = mix(
              vec3(0.0, 0.0, 0.12),    // тёмно-синий снизу
              vec3(0.0, 0.0, 0.2),     // синий сверху
              uv.y
            );
          }
          
          // Без тряски - статичные координаты
          vec2 p = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y * mat2(6.0, -4.0, 4.0, 6.0);
          vec2 v;
          vec4 o = vec4(bgColor, 1.0);  // Начинаем с фонового цвета

          float f = 2.0 + fbm(p + vec2(iTime * 5.0, 0.0)) * 0.5;

          for (float i = 0.0; i < 35.0; i++) {
            v = p + cos(i * i + (iTime + p.x * 0.08) * 0.025 + i * vec2(13.0, 11.0)) * 3.5 + vec2(sin(iTime * 3.0 + i) * 0.003, cos(iTime * 3.5 - i) * 0.003);
            float tailNoise = fbm(v + vec2(iTime * 0.5, i)) * 0.3 * (1.0 - (i / 35.0));
            
            // Цвет в зависимости от режима
            vec4 auroraColors;
            if (colorMode < 0.5) {
              // Neutral - красно-синие тона (фиолетовый = красный + синий)
              float phase = sin(i * 0.3 + iTime * 0.2);
              auroraColors = vec4(
                0.6 + 0.4 * sin(i * 0.2 + iTime * 0.4),   // Красный — меняется
                0.0,                                       // БЕЗ ЗЕЛЁНОГО!
                0.6 + 0.4 * cos(i * 0.25 + iTime * 0.35), // Синий — меняется
                1.0
              );
            } else if (colorMode < 1.5) {
              // Red team - красно-оранжевые тона
              auroraColors = vec4(
                0.8 + 0.2 * sin(i * 0.2 + iTime * 0.4),
                0.15 + 0.15 * cos(i * 0.3 + iTime * 0.5),
                0.1 + 0.1 * sin(i * 0.4 + iTime * 0.3),
                1.0
              );
            } else {
              // Blue team - СИНИЙ с лёгким фиолетовым оттенком
              auroraColors = vec4(
                0.15 + 0.1 * sin(i * 0.2 + iTime * 0.4),  // Немного красного для глубины
                0.0,                                       // БЕЗ ЗЕЛЁНОГО!
                1.0,                                       // Максимум синего
                1.0
              );
            }
            
            vec4 currentContribution = auroraColors * exp(sin(i * i + iTime * 0.8)) / length(max(v, vec2(v.x * f * 0.015, v.y * 1.5)));
            float thinnessFactor = smoothstep(0.0, 1.0, i / 35.0) * 0.6;
            o += currentContribution * (1.0 + tailNoise * 0.8) * thinnessFactor;
          }

          o = tanh(pow(o / 100.0, vec4(1.6)));
          gl_FragColor = o * 1.5;
        }
      `
    });

    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let frameId;
    const animate = () => {
      material.uniforms.iTime.value += 0.016;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // Обновление colorMode без пересоздания шейдера
  useEffect(() => {
    if (materialRef.current) {
      const modeValue = getColorModeValue(colorMode);
      console.log("Shader colorMode changed:", colorMode, "->", modeValue);
      materialRef.current.uniforms.colorMode.value = modeValue;
    }
  }, [colorMode]);

  return (
    <div 
      ref={containerRef} 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden"
      }}
    />
  );
}
