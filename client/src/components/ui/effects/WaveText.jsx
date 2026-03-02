import { motion } from "framer-motion";
import "./effects.css";

/**
 * WaveText — текст с волновой анимацией по буквам
 * 
 * @param {Object} props
 * @param {string} props.text - Текст для отображения
 * @param {Object} props.config - Конфигурация эффекта
 * @param {string} props.className - Дополнительные классы
 * @param {Object} props.style - Инлайн-стили для текста
 */
export default function WaveText({ 
  text, 
  config = {},
  className = "",
  style = {}
}) {
  const {
    amplitude = 5,
    duration = 2
  } = config;

  const letters = text.split("");

  return (
    <span className={`wave-text ${className}`} style={style}>
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          className="wave-text__letter"
          animate={{
            y: [0, -amplitude, 0, amplitude, 0]
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.05
          }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </span>
  );
}
