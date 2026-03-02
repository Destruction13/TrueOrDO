import { motion } from "framer-motion";
import "./effects.css";

/**
 * ShimmerText — текст с бегущим бликом/мерцанием
 * 
 * @param {Object} props
 * @param {string} props.text - Текст для отображения
 * @param {Object} props.config - Конфигурация эффекта
 * @param {string} props.className - Дополнительные классы
 * @param {Object} props.style - Инлайн-стили для текста
 */
export default function ShimmerText({ 
  text, 
  config = {},
  className = "",
  style = {}
}) {
  const {
    duration = 2,
    shimmerColor = "rgba(255, 255, 255, 0.8)"
  } = config;

  return (
    <span className={`shimmer-text ${className}`} style={style}>
      <span className="shimmer-text__content">{text}</span>
      <motion.span 
        className="shimmer-text__shimmer"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%)`
        }}
        animate={{
          x: ["-100%", "200%"]
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 0.5
        }}
      />
    </span>
  );
}
