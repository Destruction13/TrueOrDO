import React from 'react';
import { motion } from 'framer-motion';
import './BorderTrail.css';

/**
 * BorderTrail — анимированная "бегущая" граница для выделения элемента
 * Используется для PRO карточки, чтобы визуально выделить её как рекомендуемую
 */
export function BorderTrail({ 
  size = 80,
  duration = 6,
  delay = 0,
  color = 'cyan',
  className = ''
}) {
  // Цветовые пресеты
  const colors = {
    cyan: 'rgba(6, 182, 212, 0.8)',
    purple: 'rgba(139, 92, 246, 0.8)',
    pink: 'rgba(236, 72, 153, 0.8)',
    orange: 'rgba(249, 115, 22, 0.8)',
    green: 'rgba(34, 197, 94, 0.8)'
  };
  
  const glowColor = colors[color] || colors.cyan;

  return (
    <div className={`border-trail ${className}`}>
      <motion.div
        className="border-trail__dot"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          boxShadow: `0 0 ${size / 2}px ${glowColor}`
        }}
        animate={{
          left: ['0%', '100%', '100%', '0%', '0%'],
          top: ['0%', '0%', '100%', '100%', '0%']
        }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: 'linear',
          times: [0, 0.25, 0.5, 0.75, 1]
        }}
      />
    </div>
  );
}

export default BorderTrail;
