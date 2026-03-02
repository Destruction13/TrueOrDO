import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import "./effects.css";

/**
 * Генерирует случайную искру
 */
const generateSparkle = (colors) => {
  return {
    id: Math.random().toString(36).substr(2, 9),
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    scale: Math.random() * 0.5 + 0.5,
    size: Math.random() * 8 + 8,
  };
};

/**
 * Компонент одной искры
 */
function Sparkle({ id, x, y, color, delay, scale, size }) {
  return (
    <motion.svg
      key={id}
      className="sparkle-svg"
      initial={{ opacity: 0, left: x, top: y }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, scale, 0],
        rotate: [75, 120, 150],
      }}
      transition={{ 
        duration: 0.8, 
        repeat: Infinity, 
        delay,
        repeatDelay: Math.random() * 1.5 + 0.5
      }}
      width={size}
      height={size}
      viewBox="0 0 21 21"
      style={{ left: x, top: y }}
    >
      <path
        d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
        fill={color}
      />
    </motion.svg>
  );
}

/**
 * SparklesText — текст с анимированными искрами вокруг
 * 
 * @param {Object} props
 * @param {string} props.text - Текст для отображения
 * @param {Object} props.config - Конфигурация эффекта
 * @param {string} props.className - Дополнительные классы
 * @param {Object} props.style - Инлайн-стили для текста
 */
export default function SparklesText({ 
  text, 
  config = {},
  className = "",
  style = {}
}) {
  const {
    sparklesCount = 10,
    colors = ["#FFD700", "#FFA500", "#FF6347", "#FFFFFF"],
  } = config;

  const [sparkles, setSparkles] = useState([]);

  // Генерируем начальные искры
  useEffect(() => {
    const initialSparkles = Array.from({ length: sparklesCount }, () => 
      generateSparkle(colors)
    );
    setSparkles(initialSparkles);
  }, [sparklesCount, colors.join(",")]);

  // Регенерируем искры периодически для разнообразия
  useEffect(() => {
    const interval = setInterval(() => {
      setSparkles(prev => {
        const newSparkles = [...prev];
        const indexToReplace = Math.floor(Math.random() * newSparkles.length);
        newSparkles[indexToReplace] = generateSparkle(colors);
        return newSparkles;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [colors]);

  return (
    <span className={`sparkles-text ${className}`} style={style}>
      <span className="sparkles-text__content">{text}</span>
      <span className="sparkles-text__sparkles">
        {sparkles.map(sparkle => (
          <Sparkle key={sparkle.id} {...sparkle} />
        ))}
      </span>
    </span>
  );
}
