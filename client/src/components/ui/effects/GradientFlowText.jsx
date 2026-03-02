import { motion } from "framer-motion";
import "./effects.css";

/**
 * GradientFlowText — текст с анимированным градиентом
 * 
 * @param {Object} props
 * @param {string} props.text - Текст для отображения
 * @param {Object} props.config - Конфигурация эффекта
 * @param {string} props.className - Дополнительные классы
 * @param {Object} props.style - Инлайн-стили для текста
 */
export default function GradientFlowText({ 
  text, 
  config = {},
  className = "",
  style = {}
}) {
  const {
    colors = ["#ff0080", "#7928ca", "#ff0080"],
    duration = 3
  } = config;

  const gradientValue = `linear-gradient(90deg, ${colors.join(", ")})`;

  return (
    <motion.span 
      className={`gradient-flow-text ${className}`}
      style={{
        ...style,
        backgroundImage: gradientValue,
        backgroundSize: "200% 100%",
      }}
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      {text}
    </motion.span>
  );
}
