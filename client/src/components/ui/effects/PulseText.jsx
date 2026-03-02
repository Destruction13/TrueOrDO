import { motion } from "framer-motion";
import "./effects.css";

/**
 * PulseText — текст с пульсирующей анимацией
 * 
 * @param {Object} props
 * @param {string} props.text - Текст для отображения
 * @param {Object} props.config - Конфигурация эффекта
 * @param {string} props.className - Дополнительные классы
 * @param {Object} props.style - Инлайн-стили для текста
 */
export default function PulseText({ 
  text, 
  config = {},
  className = "",
  style = {}
}) {
  const {
    minOpacity = 0.6,
    maxOpacity = 1,
    duration = 1.5
  } = config;

  return (
    <motion.span 
      className={`pulse-text ${className}`}
      style={style}
      animate={{
        opacity: [maxOpacity, minOpacity, maxOpacity],
        scale: [1, 1.02, 1]
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {text}
    </motion.span>
  );
}
