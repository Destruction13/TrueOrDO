/**
 * Language Manager Module
 * 
 * Manages language state (ru/en) with localStorage persistence.
 * Validates: Requirements 13.1, 13.2, 13.4, 13.5
 */

import type { Language, Translations } from '../../types';

const LANGUAGE_STORAGE_KEY = 'docs-language';

/**
 * Get the current language from localStorage or default to 'ru'
 * @returns The current language
 */
export function getCurrentLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'ru' || stored === 'en') {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error);
  }
  
  // Default to Russian
  return 'ru';
}

/**
 * Set the language and persist to localStorage
 * @param lang - The language to set ('ru' or 'en')
 */
export function setLanguage(lang: Language): void {
  try {
    // Validate input
    if (lang !== 'ru' && lang !== 'en') {
      throw new Error(`Invalid language: ${lang}`);
    }
    
    // Persist to localStorage
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (error) {
    console.error('Failed to set language:', error);
    throw error;
  }
}

/**
 * Translate a key to the current language
 * @param key - The translation key
 * @param translations - The translations dictionary
 * @param params - Optional parameters for string interpolation
 * @returns The translated string
 */
export function translate(
  key: string,
  translations: Translations,
  params?: Record<string, any>
): string {
  const lang = getCurrentLanguage();
  
  // Get translation for current language
  const translation = translations[key];
  
  if (!translation) {
    console.warn(`Translation key not found: ${key}`);
    return key;
  }
  
  let text = translation[lang];
  
  if (!text) {
    console.warn(`Translation not found for key "${key}" in language "${lang}"`);
    return key;
  }
  
  // Simple parameter interpolation
  if (params) {
    Object.keys(params).forEach(paramKey => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
    });
  }
  
  return text;
}

/**
 * Initialize language on app load
 * Reads from localStorage
 */
export function initializeLanguage(): void {
  // Just read from localStorage to ensure it's valid
  getCurrentLanguage();
}
