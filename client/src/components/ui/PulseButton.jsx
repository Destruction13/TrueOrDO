import { forwardRef, useId, useRef, useState, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import "./PulseButton.css";

/**
 * PulseButton — премиальная кнопка с эффектом бегущих лучей по контуру
 * Использовать для главного CTA (например, "Создать комнату")
 * 
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Размер кнопки
 * @param {boolean} [props.loading=false] - Состояние загрузки
 * @param {boolean} [props.disabled=false] - Отключена ли кнопка
 * @param {boolean} [props.fullWidth=false] - Растянуть на всю ширину
 */
const PulseButton = forwardRef(function PulseButton(
  {
    size = "md",
    loading = false,
    disabled = false,
    fullWidth = false,
    className = "",
    children,
    type = "button",
    ...rest
  },
  ref
) {
  const uniqueId = useId();
  const buttonRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Измеряем реальный размер кнопки
  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [fullWidth]);
  
  const classNames = [
    "pulse-btn",
    `pulse-btn--${size}`,
    fullWidth && "pulse-btn--full",
    loading && "pulse-btn--loading",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Используем реальные размеры или fallback
  const heights = { sm: 36, md: 44, lg: 52 };
  const width = dimensions.width || 180;
  const height = dimensions.height || heights[size];
  const rx = height / 2; // Полностью скруглённые края
  
  // Путь по контуру кнопки (rounded rectangle) — адаптивный
  const buttonPath = `M ${rx},0 
    L ${width - rx},0 
    Q ${width},0 ${width},${rx} 
    L ${width},${height - rx} 
    Q ${width},${height} ${width - rx},${height} 
    L ${rx},${height} 
    Q 0,${height} 0,${height - rx} 
    L 0,${rx} 
    Q 0,0 ${rx},0`;

  // Конфигурация градиентов для двух бегущих лучей
  const beamConfigs = [
    {
      id: `beam1-${uniqueId}`,
      initial: { x1: "0%", y1: "0%", x2: "0%", y2: "0%" },
      animate: { 
        x1: ["0%", "100%", "100%", "0%", "0%"],
        y1: ["0%", "0%", "100%", "100%", "0%"],
        x2: ["10%", "110%", "110%", "10%", "10%"],
        y2: ["0%", "0%", "100%", "100%", "0%"],
      },
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "linear",
      },
    },
    {
      id: `beam2-${uniqueId}`,
      initial: { x1: "100%", y1: "100%", x2: "100%", y2: "100%" },
      animate: { 
        x1: ["100%", "0%", "0%", "100%", "100%"],
        y1: ["100%", "100%", "0%", "0%", "100%"],
        x2: ["90%", "-10%", "-10%", "90%", "90%"],
        y2: ["100%", "100%", "0%", "0%", "100%"],
      },
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "linear",
      },
    },
  ];

  // Объединяем refs
  const setRefs = (el) => {
    buttonRef.current = el;
    if (typeof ref === 'function') {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
  };

  return (
    <button
      ref={setRefs}
      type={type}
      className={classNames}
      disabled={disabled || loading}
      {...rest}
    >
      {/* SVG с эффектом бегущих лучей — растягивается на всю кнопку */}
      {dimensions.width > 0 && (
        <svg
          className="pulse-btn__svg"
          viewBox={`0 0 ${width} ${height}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {/* Базовый контур */}
          <path
            d={buttonPath}
            stroke="rgba(138, 43, 226, 0.4)"
            strokeWidth="1"
            fill="none"
          />
          
          {/* Бегущие лучи */}
          {beamConfigs.map((beam) => (
            <path
              key={beam.id}
              d={buttonPath}
              stroke={`url(#${beam.id})`}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          ))}


          {/* Градиенты */}
          <defs>
            {beamConfigs.map((beam) => (
              <motion.linearGradient
                key={beam.id}
                id={beam.id}
                gradientUnits="userSpaceOnUse"
                initial={beam.initial}
                animate={beam.animate}
                transition={beam.transition}
              >
                <stop offset="0%" stopColor="#ff3366" stopOpacity="0" />
                <stop offset="25%" stopColor="#ff3366" stopOpacity="1" />
                <stop offset="50%" stopColor="#aa44ff" stopOpacity="1" />
                <stop offset="75%" stopColor="#4466ff" stopOpacity="1" />
                <stop offset="100%" stopColor="#4466ff" stopOpacity="0" />
              </motion.linearGradient>
            ))}
          </defs>
        </svg>
      )}

      {/* Фон кнопки */}
      <span className="pulse-btn__bg" aria-hidden="true" />
      
      {/* Glow эффект при hover */}
      <span className="pulse-btn__glow" aria-hidden="true" />
      
      {/* Контент кнопки */}
      <span className="pulse-btn__content">
        <span className="pulse-btn__text">{children}</span>
      </span>
      
      {/* Spinner для loading */}
      {loading && (
        <span className="pulse-btn__spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle 
              cx="12" cy="12" r="10" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeDasharray="31.4 31.4" 
            />
          </svg>
        </span>
      )}
    </button>
  );
});

export default PulseButton;
