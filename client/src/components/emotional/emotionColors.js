// Генерация цвета эмоции в стиле палитры шейдера (cos-палитра).
// Пользовательские строки/эмоции — на русском, код — на английском.

function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // 32-bit FNV prime
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function rgbToHex(r, g, b) {
  const toHex = (v) => {
    const s = Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
    return s;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Повторяем логику из GLSL:
// auroraColor = 0.5 + 0.5 * cos(phase + vec3(0, 2, 4))
function shaderCosPalette(t01, phase = 0) {
  const a = (t01 * Math.PI * 2) + phase;
  const r = 0.5 + 0.5 * Math.cos(a + 0.0);
  const g = 0.5 + 0.5 * Math.cos(a + 2.0);
  const b = 0.5 + 0.5 * Math.cos(a + 4.0);
  return [r, g, b];
}

// Детерминированный цвет для эмоции.
// Возвращает CSS-строки, удобные для var() / rgba().
export function getEmotionColor(emotion) {
  const key = (emotion || '').trim().toLowerCase();
  const h = fnv1a32(key);
  const t01 = (h % 10000) / 10000; // 0..1

  // Немного сдвинем фазу, чтобы палитра была ближе к "неону" (как в шейдере)
  const [r, g, b] = shaderCosPalette(t01, 0.0);

  const hex = rgbToHex(r, g, b);
  const rgb = `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;

  return {
    hex,
    rgb,
  };
}
