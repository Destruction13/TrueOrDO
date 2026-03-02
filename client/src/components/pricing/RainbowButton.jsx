import React from 'react';
import { motion } from 'framer-motion';
import './RainbowButton.css';

/**
 * RainbowButton — кнопка с радужной анимированной границей
 * Используется для выделения главного CTA (Купить PRO)
 */
export function RainbowButton({ 
  children, 
  onClick, 
  disabled = false,
  loading = false,
  className = '',
  type = 'button'
}) {
  return (
    <motion.button
      type={type}
      className={`rainbow-button ${className} ${disabled ? 'rainbow-button--disabled' : ''} ${loading ? 'rainbow-button--loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      {/* Радужный градиент (анимированный фон) */}
      <span className="rainbow-button__gradient" />
      
      {/* Внутренний фон */}
      <span className="rainbow-button__inner">
        {loading ? (
          <span className="rainbow-button__loader">
            <span className="rainbow-button__spinner" />
            Загрузка...
          </span>
        ) : (
          children
        )}
      </span>
    </motion.button>
  );
}

export default RainbowButton;
