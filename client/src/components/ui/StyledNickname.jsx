import { useMemo } from "react";
import { getEffectComponent } from "./effects";
import "./StyledNickname.css";

/**
 * Компонент для отображения никнейма с кастомными стилями (цвет, градиент, свечение, эффекты)
 * 
 * @param {string} name - Никнейм для отображения
 * @param {Object} customization - Объект кастомизации:
 *   - nicknameColorType: "basic" | "custom" | "gradient"
 *   - nicknameCustomColor: string (hex цвет)
 *   - nicknameGradient: { cssValue: string } | null
 *   - nicknameGlow: { cssValue: string } | null
 *   - nicknameEffect: { component: string, config: string } | null (PRO)
 * @param {string} className - Дополнительные CSS классы
 * @param {string} fallbackColor - Цвет по умолчанию для basic режима
 */
export default function StyledNickname({ 
  name, 
  customization, 
  className = "",
  fallbackColor = "inherit"
}) {
  const style = useMemo(() => {
    const result = {};
    
    if (!customization) {
      result.color = fallbackColor;
      return result;
    }

    const { nicknameColorType, nicknameCustomColor, nicknameGradient, nicknameGlow } = customization;

    // Применяем цвет/градиент
    if (nicknameColorType === "custom" && nicknameCustomColor) {
      result.color = nicknameCustomColor;
    } else if (nicknameColorType === "gradient" && nicknameGradient?.cssValue) {
      result["--gradient"] = nicknameGradient.cssValue;
    } else {
      result.color = fallbackColor;
    }

    // Применяем свечение (только для не-градиентных)
    if (nicknameGlow?.cssValue && nicknameColorType !== "gradient") {
      result.textShadow = nicknameGlow.cssValue;
    }

    return result;
  }, [customization, fallbackColor]);

  const isGradient = customization?.nicknameColorType === "gradient" && customization?.nicknameGradient?.cssValue;
  const hasGlow = customization?.nicknameGlow?.cssValue;
  
  // Проверяем наличие анимированного эффекта
  const effect = customization?.nicknameEffect;
  const EffectComponent = effect?.component ? getEffectComponent(effect.component) : null;
  
  // Парсим конфиг эффекта
  const effectConfig = useMemo(() => {
    if (!effect?.config) return {};
    try {
      return typeof effect.config === "string" ? JSON.parse(effect.config) : effect.config;
    } catch {
      return {};
    }
  }, [effect?.config]);

  // Если есть эффект — рендерим через компонент эффекта
  if (EffectComponent) {
    return (
      <EffectComponent
        text={name}
        config={effectConfig}
        className={`styled-nickname ${isGradient ? "styled-nickname--gradient" : ""} ${className}`}
        style={style}
      />
    );
  }

  // Стандартный рендер без эффекта
  return (
    <span 
      className={`styled-nickname ${isGradient ? "styled-nickname--gradient" : ""} ${hasGlow && isGradient ? "styled-nickname--gradient-glow" : ""} ${className}`}
      style={style}
      data-text={isGradient && hasGlow ? name : undefined}
    >
      {name}
    </span>
  );
}
