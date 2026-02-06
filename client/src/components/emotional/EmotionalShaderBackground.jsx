import { useRef, useEffect } from 'react';

const EmotionalShaderBackground = () => {
  const shaderProps = {
    flowSpeed: 0.012,
    colorIntensity: 1.1,
    noiseLayers: 4.0,
    mouseInfluence: 0.0,
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        /* 100dvh учитывает динамическую высоту viewport на мобильных (адресная строка) */
        /* Fallback на 100vh для старых браузеров */
        height: '100dvh',
        minHeight: '100vh',
        zIndex: -1,
        background: 'black'
      }}
      aria-hidden="true"
    >
      <InteractiveShader {...shaderProps} />
    </div>
  );
};

const InteractiveShader = ({
  flowSpeed = 0.4,
  colorIntensity = 1.2,
  noiseLayers = 4.0,
  mouseInfluence = 0.3,
}) => {
  const canvasRef = useRef(null);
  const mousePos = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      console.error("WebGL is not supported in this browser.");
      return;
    }

    // Для fwidth()/dFdx()/dFdy() в WebGL1
    gl.getExtension('OES_standard_derivatives');

    const vertexShaderSource = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      #extension GL_OES_standard_derivatives : enable
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec2 iMouse;
      uniform float uFlowSpeed;
      uniform float uColorIntensity;
      uniform float uNoiseLayers;
      uniform float uMouseInfluence;
      uniform vec2 uTableCenter;
      uniform vec2 uTableSize;

      #define MARCH_STEPS 32

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float fbm(vec3 p) {
        float f = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 8; i++) {
          if (float(i) >= uNoiseLayers) break;
          f += amp * hash(p.xy);
          p *= 2.0;
          amp *= 0.5;
        }
        return f;
      }

      // Стабильная signed distance до эллипса в screen-space.
      // d < 0.0 внутри эллипса, d > 0.0 снаружи.
      float ellipseSdfScreen(vec2 fragCoord, vec2 centerPx, vec2 radiusPx) {
        vec2 p = (fragCoord - centerPx) / max(radiusPx, vec2(1.0));
        return length(p) - 1.0;
      }

      // Anti-aliased smoothstep (с учётом fwidth), чтобы не было лесенки на границах масок.
      float smoothstepAA(float e0, float e1, float x) {
        float w = fwidth(x);
        return smoothstep(e0 - w, e1 + w, x);
      }

      float map(vec3 p, vec2 mouseNdc) {
        vec3 q = p;
        q.z += iTime * uFlowSpeed;

        // лёгкая реакция на мышь в NDC
        q.xy += mouseNdc * uMouseInfluence;

        float f = fbm(q * 2.0);
        f *= sin(p.y * 2.0 + iTime) * 0.5 + 0.5;
        return clamp(f, 0.0, 1.0);
      }

      // Убираем «болотный» (оливково-зелёный, приглушённый) оттенок, оставляя остальную палитру.
      // Идея: когда зелёный доминирует, а синий/красный заметно ниже, цвет уходит в грязно-оливковый.
      // В этом узком диапазоне мягко смещаем его в более чистый холодный спектр (циан/синий).
      vec3 removeSwamp(vec3 c) {
        float g = c.g;
        float b = c.b;
        float r = c.r;

        // «болотность»: высокий G, при этом B относительно низкий; R не обязателен, но часто средний.
        float swamp = smoothstep(0.45, 0.75, g) * (1.0 - smoothstep(0.30, 0.62, b));
        // Чуть сужаем зону, чтобы не трогать яркий «неоновый зелёный», когда есть хороший синий.
        swamp *= 1.0 - smoothstep(0.70, 0.92, b);

        vec3 target = vec3(0.12, 0.55, 0.95);
        return mix(c, mix(c, target, 0.85), clamp(swamp, 0.0, 1.0));
      }

      void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        vec2 screenUV = fragCoord / iResolution.xy;
        vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

        // Обход овального стола: не затемняем внутреннюю область (чтобы не появлялся "второй овал"),
        // а слегка искажаем лучи/поле около границы эллипса.
        float d = ellipseSdfScreen(fragCoord, uTableCenter, uTableSize);
        // Увеличиваем "перо" овала, чтобы переход по краю эллипса был супер-мягким.
        float featherPx = 60.0;
        float feather = featherPx / max(iResolution.x, iResolution.y);

        // Нормаль эллипса в screen-space (в координатах эллипса)
        vec2 ep = (fragCoord - uTableCenter) / max(uTableSize, vec2(1.0));
        vec2 en = normalize(ep + vec2(1e-5));

        // Влияние максимальное на границе и затухает в обе стороны.
        // Добавляем fwidth-антиалиасинг, чтобы не было лесенки на разных мониторах.
        float aa = fwidth(d);
        float edge = 1.0 - smoothstep(0.0, feather + aa, abs(d));

        // Маска боков экрана: в центре хотим оставить только "эмбиент",
        // а активный поток показывать в основном слева/справа.
        float x01 = fragCoord.x / max(iResolution.x, 1.0);

        // Очень мягкая боковая маска: расширяем область свечения, чтобы она доходила почти до стола.
        // Делается так, чтобы по краям было ярко, а к центру (к столу) плавно ослабевало.
        // Усиливаем сглаживание, чтобы не было артефактов/полос на границе (особенно слева).
        float sx = fwidth(x01) * 20.0;
        float left = 1.0 - smoothstep(0.0 - sx, 0.38 + sx, x01);
        float right = smoothstep(0.62 - sx, 1.0 + sx, x01);
        float sideMask = clamp(left + right, 0.0, 1.0);

        // Ещё более мягкое распределение (снимает "полку" и делает градиент длиннее).
        // Уменьшаем степень pow, чтобы переход был супер-плавным.
        sideMask = pow(sideMask, 0.75);

        // Чуть сильнее "выталкиваем" изнутри, чтобы обход был заметнее
        float insideBoost = (d < 0.0) ? 1.25 : 1.0;

        // Пушим координаты наружу около границы, но в центре почти не искажаем
        float warpPower = mix(0.03, 0.24, sideMask) * mix(0.35, 1.0, edge);
        uv += en * warpPower * insideBoost;

        vec2 mouseNdc = (iMouse.xy / iResolution.xy - 0.5) * 2.0;

        vec3 ro = vec3(0.0, -1.0, 0.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        vec3 col = vec3(0.0);
        float t = 0.0;

        // Поток показываем в основном по бокам и вдоль овала.
        // Снизу разрешаем ему слегка заходить в центр, но привязываем это к положению стола,
        // чтобы при скролле эффект не "заезжал" на стол.
        float tableBottom = uTableCenter.y - uTableSize.y;
        float distBelow = tableBottom - fragCoord.y; // >0 только ниже стола
        float dbAA = fwidth(distBelow);
        float bottomOpen = smoothstep(0.0 - dbAA, 420.0 + dbAA, distBelow);

        // Ограничиваем максимальное "открытие" центра, чтобы снизу не заполняло слишком агрессивно.
        float centerCap = 0.58;
        float sideToCenter = mix(sideMask, max(sideMask, centerCap), bottomOpen);

        // Затухание к овальному столу: чем ближе к границе стола (d -> 0 снаружи),
        // тем сильнее гасим поток. Далеко от стола (d большой) поток остаётся ярким.
        // Важно: не используем max(d,0) для производных — это даёт "лесенку".
        // Берём fwidth от исходного SDF, чтобы сглаживание работало корректно на границе.
        float dAA = fwidth(d);

        // Ширина зоны затухания в "единицах" SDF эллипса (0 на границе, далее наружу).
        // Больше значение => более длинный градиент до яркого свечения.
        float fadeOuter = 1.75;

        // tableFade: 0 у границы стола -> 1 далеко от стола, с мягким AA.
        // d < 0 внутри стола, d = 0 на границе, d > 0 снаружи.
        float tableFadeRaw = smoothstep(0.0 - dAA, fadeOuter + dAA, d);
        // Доп. easing, чтобы переход к столу был максимально мягким и "длинным".
        float tableFade = pow(clamp(tableFadeRaw, 0.0, 1.0), 0.85);

        float flowMask = sideToCenter * (0.35 + 0.65 * edge);
        // Градиентное затухание по мере приближения к столу.
        // minNearTable поднимаем, чтобы не было внезапной "чёрной" зоны у стола.
        float minNearTable = 0.22;
        flowMask *= mix(minNearTable, 1.0, tableFade);

        // Мягкое "свечение" вдоль границы овала (размягчает края визуально).
        // glowWidthPx регулирует ширину ореола в пикселях.
        // Двухслойное свечение:
        // - узкое: ближе к границе (чтобы свечение было "по краям")
        // - широкое: сильнее размытие, но почти незаметное (для мягкости)
        float glowNarrowPx = 12.0;
        float glowWidePx = 320.0;

        float gnW = glowNarrowPx / max(iResolution.x, iResolution.y);
        float gwW = glowWidePx / max(iResolution.x, iResolution.y);

        float dn = abs(d) / max(gnW, 1e-4);
        float dw = abs(d) / max(gwW, 1e-4);

        float glowNarrow = exp(-dn * dn);
        float glowWide = exp(-dw * dw);

        // Мягкая привязка к бокам (сильно приглушаем яркость, добавляем больше wide-слоя для размытия)
        float glowSide = (0.015 + 0.06 * sideMask);

        float glow = glowSide * (0.12 * glowNarrow + 0.88 * glowWide);

        for (int i = 0; i < MARCH_STEPS; i++) {
          vec3 p = ro + rd * t;
          float density = map(p, mouseNdc) * flowMask;
          if (density > 0.0) {
            vec3 auroraColor = 0.5 + 0.5 * cos(iTime * 0.32 + p.y * 2.0 + vec3(0.0, 2.0, 4.0));
            auroraColor = removeSwamp(auroraColor);
            col += auroraColor * density * 0.11 * uColorIntensity;
          }
          t += 0.1;
        }

        vec3 bgGradient = 0.5 + 0.5 * cos(iTime * 0.2 + screenUV.y * 3.0 + vec3(0.0, 2.0, 4.0));
        bgGradient = removeSwamp(bgGradient);
        bgGradient *= 0.08;

        col = max(col, bgGradient);

        // Дополнительная подсветка больше не нужна: затухание делаем к столу через tableFade (см. выше).

        // Добавляем мягкий ореол по краю овала. Цвет из той же "неоновой" палитры,
        // чтобы выглядело как свечение, а не как тёмная маска.
        vec3 glowColor = vec3(0.12, 0.40, 0.80);
        col += glowColor * glow * 0.03 * uColorIntensity;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compileShader = (source, type) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
      return;
    }
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    const iMouseLocation = gl.getUniformLocation(program, "iMouse");
    const uFlowSpeedLocation = gl.getUniformLocation(program, "uFlowSpeed");
    const uColorIntensityLocation = gl.getUniformLocation(program, "uColorIntensity");
    const uNoiseLayersLocation = gl.getUniformLocation(program, "uNoiseLayers");
    const uMouseInfluenceLocation = gl.getUniformLocation(program, "uMouseInfluence");
    const uTableCenterLocation = gl.getUniformLocation(program, "uTableCenter");
    const uTableSizeLocation = gl.getUniformLocation(program, "uTableSize");

    const startTime = performance.now();
    let animationFrameId;
    let currentDpr = 1;
    let cachedTableEl = null;

    const handleMouseMove = (e) => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        mousePos.current = {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };
    };
    window.addEventListener('mousemove', handleMouseMove);

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      currentDpr = dpr;
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);

      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      gl.viewport(0, 0, width, height);
      gl.uniform2f(iResolutionLocation, width, height);
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const renderLoop = () => {
      if (!gl || gl.isContextLost()) return;
      
      const currentTime = performance.now();
      // Сильно замедляем анимацию: масштабируем время, чтобы движения были более спокойными.
      gl.uniform1f(iTimeLocation, ((currentTime - startTime) / 1000.0) * 0.18);
      
      gl.uniform2f(
        iMouseLocation,
        mousePos.current.x * canvas.clientWidth * currentDpr,
        (1.0 - mousePos.current.y) * canvas.clientHeight * currentDpr
      );
      gl.uniform1f(uFlowSpeedLocation, flowSpeed);
      gl.uniform1f(uColorIntensityLocation, colorIntensity);
      gl.uniform1f(uNoiseLayersLocation, noiseLayers);
      gl.uniform1f(uMouseInfluenceLocation, mouseInfluence);
      
      // Позиция и размер овального стола: привязываемся к реальному DOM.
      // Важно брать именно `.oval-table__surface`, т.к. она задаёт настоящую геометрию овала
      // (border-radius: 50% / 40%). Если её нет — фолбэк на `.oval-table`.
      if (!cachedTableEl) cachedTableEl = document.querySelector('.oval-table__surface') || document.querySelector('.oval-table');

      let tableCenterX;
      let tableCenterY;
      let tableRadiusX;
      let tableRadiusY;

      if (cachedTableEl) {
        const rect = cachedTableEl.getBoundingClientRect();
        const cxCss = rect.left + rect.width / 2;
        const cyCssFromTop = rect.top + rect.height / 2;

        // Перевод в координаты canvas (origin снизу)
        tableCenterX = cxCss * currentDpr;
        tableCenterY = (canvas.clientHeight - cyCssFromTop) * currentDpr;

        // Полуоси эллипса:
        // В CSS овал задан как border-radius: 50% / 40%,
        // поэтому вертикальная полуось ~ 0.40 * высоты (а не height/2).
        // Чуть уменьшаем, чтобы был отступ до UI.
        const pad = 0.92;
        tableRadiusX = Math.max(1, (rect.width / 2) * currentDpr * pad);
        tableRadiusY = Math.max(1, (rect.height * 0.40) * currentDpr * pad);
      } else {
        // Фолбэк (если не нашли стол)
        tableCenterX = canvas.clientWidth * currentDpr * 0.5;
        tableCenterY = canvas.clientHeight * currentDpr * 0.4;
        tableRadiusX = canvas.clientWidth * currentDpr * 0.25;
        tableRadiusY = canvas.clientHeight * currentDpr * 0.15;
      }

      gl.uniform2f(uTableCenterLocation, tableCenterX, tableCenterY);
      gl.uniform2f(uTableSizeLocation, tableRadiusX, tableRadiusY);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (gl && !gl.isContextLost()) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(vertexBuffer);
      }
    };
  }, [flowSpeed, colorIntensity, noiseLayers, mouseInfluence]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  );
};

export default EmotionalShaderBackground;
