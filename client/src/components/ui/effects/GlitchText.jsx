import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./effects.css";

/**
 * GlitchText — текст с эффектом глитча
 * 
 * @param {Object} props
 * @param {string} props.text - Текст для отображения
 * @param {Object} props.config - Конфигурация эффекта
 * @param {string} props.className - Дополнительные классы
 * @param {Object} props.style - Инлайн-стили для текста
 */
export default function GlitchText({ 
  text, 
  config = {},
  className = "",
  style = {}
}) {
  const {
    intensity = 0.5,
    colors = ["#ff0000", "#00ff00", "#0000ff"]
  } = config;

  const [isGlitching, setIsGlitching] = useState(false);

  // Случайные глитчи
  useEffect(() => {
    const triggerGlitch = () => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 150 + Math.random() * 100);
    };

    const interval = setInterval(() => {
      if (Math.random() < intensity) {
        triggerGlitch();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [intensity]);

  return (
    <span className={`glitch-text ${isGlitching ? "glitch-text--active" : ""} ${className}`} style={style}>
      <span className="glitch-text__content">{text}</span>
      {isGlitching && (
        <>
          <motion.span 
            className="glitch-text__layer glitch-text__layer--1"
            style={{ color: colors[0] }}
            animate={{ x: [-2, 2, -2], opacity: [0.8, 0.4, 0.8] }}
            transition={{ duration: 0.1, repeat: 2 }}
          >
            {text}
          </motion.span>
          <motion.span 
            className="glitch-text__layer glitch-text__layer--2"
            style={{ color: colors[1] }}
            animate={{ x: [2, -2, 2], opacity: [0.8, 0.4, 0.8] }}
            transition={{ duration: 0.1, repeat: 2 }}
          >
            {text}
          </motion.span>
        </>
      )}
    </span>
  );
}
