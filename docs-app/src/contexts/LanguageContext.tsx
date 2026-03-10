/**
 * Language Context
 * 
 * Provides language state and translate function throughout the app.
 * Validates: Requirements 13.6
 */

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Language } from '../types';
import { 
  getCurrentLanguage, 
  setLanguage, 
  translate as translateText,
  initializeLanguage 
} from '../lib/language/language-manager';
import { translations } from '../lib/language/translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  translate: (key: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

/**
 * LanguageProvider component
 * 
 * Wraps the app to provide language state and translate function.
 * Loads saved language on initialization from localStorage.
 */
export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Initialize language on mount
    initializeLanguage();
    return getCurrentLanguage();
  });

  const handleSetLanguage = (newLang: Language) => {
    setLanguage(newLang);
    setLanguageState(newLang);
  };

  const handleToggleLanguage = () => {
    const newLang: Language = language === 'ru' ? 'en' : 'ru';
    handleSetLanguage(newLang);
  };

  const handleTranslate = (key: string, params?: Record<string, any>): string => {
    return translateText(key, translations, params);
  };

  const value: LanguageContextValue = {
    language,
    setLanguage: handleSetLanguage,
    toggleLanguage: handleToggleLanguage,
    translate: handleTranslate,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 * 
 * @throws Error if used outside LanguageProvider
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
}
