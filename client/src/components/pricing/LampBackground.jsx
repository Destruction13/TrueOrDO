import React from 'react';
import { motion } from 'framer-motion';
import './LampBackground.css';

/**
 * LampBackground — анимированный фон с эффектом "лампы"
 * Создаёт градиентное свечение сверху вниз с анимацией расширения
 */
export function LampBackground({ children, className = '' }) {
  return (
    <div className={`lamp-background ${className}`}>
      {/* Контейнер лампы */}
      <div className="lamp-container">
        {/* Левый луч */}
        <motion.div
          className="lamp-beam lamp-beam--left"
          initial={{ opacity: 0.5, width: '15rem' }}
          whileInView={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
        />
        
        {/* Правый луч */}
        <motion.div
          className="lamp-beam lamp-beam--right"
          initial={{ opacity: 0.5, width: '15rem' }}
          whileInView={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
        />
        
        {/* Центральный источник света */}
        <motion.div
          className="lamp-source"
          initial={{ width: '8rem' }}
          whileInView={{ width: '16rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
        />
        
        {/* Размытый фоновый свет */}
        <motion.div
          className="lamp-glow"
          initial={{ opacity: 0, width: '20rem' }}
          whileInView={{ opacity: 0.5, width: '40rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
        />
      </div>
      
      {/* Контент поверх фона */}
      <motion.div
        className="lamp-content"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default LampBackground;
