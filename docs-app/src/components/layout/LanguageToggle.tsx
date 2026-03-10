/**
 * LanguageToggle Component
 * 
 * Displays a toggle button for switching between Russian and English languages.
 * Shows RU/EN text based on current language.
 * Validates: Requirements 13.3
 */

import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * LanguageToggle component
 * 
 * Renders a button next to the theme toggle that switches
 * between Russian and English languages with smooth animations.
 */
export function LanguageToggle() {
  const { language, toggleLanguage, translate } = useLanguage();

  return (
    <motion.button
      onClick={toggleLanguage}
      className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-secondary hover:bg-accent transition-colors"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={translate('language.toggle')}
      title={translate('language.toggle')}
    >
      <motion.div
        initial={false}
        animate={{
          scale: 1,
        }}
        transition={{
          duration: 0.3,
          ease: 'easeInOut',
        }}
        className="text-sm font-semibold text-foreground"
      >
        {language === 'ru' ? 'RU' : 'EN'}
      </motion.div>
    </motion.button>
  );
}
