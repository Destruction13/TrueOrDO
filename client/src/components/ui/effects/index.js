// Экспорт всех эффектов никнейма
export { default as SparklesText } from "./SparklesText";
export { default as ShimmerText } from "./ShimmerText";
export { default as GradientFlowText } from "./GradientFlowText";
export { default as PulseText } from "./PulseText";
export { default as GlitchText } from "./GlitchText";
export { default as WaveText } from "./WaveText";

// Маппинг компонентов по имени (для динамического рендеринга)
import SparklesText from "./SparklesText";
import ShimmerText from "./ShimmerText";
import GradientFlowText from "./GradientFlowText";
import PulseText from "./PulseText";
import GlitchText from "./GlitchText";
import WaveText from "./WaveText";

export const effectComponents = {
  SparklesText,
  ShimmerText,
  GradientFlowText,
  PulseText,
  GlitchText,
  WaveText,
};

/**
 * Получить компонент эффекта по имени
 * @param {string} componentName - Имя компонента из БД
 * @returns {React.Component|null}
 */
export function getEffectComponent(componentName) {
  return effectComponents[componentName] || null;
}
