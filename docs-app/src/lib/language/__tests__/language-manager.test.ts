/**
 * Unit tests for Language Manager Module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCurrentLanguage,
  setLanguage,
  translate,
  initializeLanguage,
} from '../language-manager';
import type { Language, Translations } from '../../../types';

describe('LanguageManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
    // Restore all mocks to ensure clean state
    vi.restoreAllMocks();
  });

  describe('getCurrentLanguage', () => {
    it('should return default language "ru" when localStorage is empty', () => {
      const lang = getCurrentLanguage();
      expect(lang).toBe('ru');
    });

    it('should return stored language from localStorage', () => {
      localStorage.setItem('docs-language', 'en');
      const lang = getCurrentLanguage();
      expect(lang).toBe('en');
    });

    it('should return default "ru" for invalid stored value', () => {
      localStorage.setItem('docs-language', 'invalid');
      const lang = getCurrentLanguage();
      expect(lang).toBe('ru');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock localStorage to throw error
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const lang = getCurrentLanguage();
      expect(lang).toBe('ru');
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('setLanguage', () => {
    it('should set language to "ru"', () => {
      setLanguage('ru');
      expect(localStorage.getItem('docs-language')).toBe('ru');
    });

    it('should set language to "en"', () => {
      setLanguage('en');
      expect(localStorage.getItem('docs-language')).toBe('en');
    });

    it('should throw error for invalid language', () => {
      expect(() => {
        setLanguage('fr' as Language);
      }).toThrow('Invalid language: fr');
    });

    it('should handle localStorage errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock localStorage to throw error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => {
        setLanguage('en');
      }).toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('translate', () => {
    const mockTranslations: Translations = {
      'nav.home': {
        ru: 'Главная',
        en: 'Home',
      },
      'nav.api': {
        ru: 'API',
        en: 'API',
      },
      'search.placeholder': {
        ru: 'Поиск в документации...',
        en: 'Search documentation...',
      },
      'greeting': {
        ru: 'Привет, {name}!',
        en: 'Hello, {name}!',
      },
    };

    it('should translate key to Russian by default', () => {
      const text = translate('nav.home', mockTranslations);
      expect(text).toBe('Главная');
    });

    it('should translate key to English when language is set', () => {
      setLanguage('en');
      const text = translate('nav.home', mockTranslations);
      expect(text).toBe('Home');
    });

    it('should return key when translation not found', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const text = translate('nonexistent.key', mockTranslations);
      expect(text).toBe('nonexistent.key');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Translation key not found: nonexistent.key');
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle missing translation for language', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const incompleteTranslations: Translations = {
        'test.key': {
          ru: 'Тест',
          en: '',
        },
      };

      setLanguage('en');
      const text = translate('test.key', incompleteTranslations);
      expect(text).toBe('test.key');
      
      consoleWarnSpy.mockRestore();
    });

    it('should interpolate parameters in translation', () => {
      const text = translate('greeting', mockTranslations, { name: 'Иван' });
      expect(text).toBe('Привет, Иван!');
    });

    it('should interpolate multiple parameters', () => {
      const translations: Translations = {
        'message': {
          ru: '{user} отправил {count} сообщений',
          en: '{user} sent {count} messages',
        },
      };

      setLanguage('en');
      const text = translate('message', translations, { user: 'John', count: 5 });
      expect(text).toBe('John sent 5 messages');
    });

    it('should handle missing parameters gracefully', () => {
      const text = translate('greeting', mockTranslations);
      expect(text).toBe('Привет, {name}!');
    });
  });

  describe('initializeLanguage', () => {
    it('should initialize without errors', () => {
      expect(() => {
        initializeLanguage();
      }).not.toThrow();
    });

    it('should read from localStorage', () => {
      localStorage.setItem('docs-language', 'en');
      initializeLanguage();
      
      const lang = getCurrentLanguage();
      expect(lang).toBe('en');
    });
  });

  describe('Language persistence', () => {
    it('should persist language across multiple calls', () => {
      setLanguage('en');
      expect(getCurrentLanguage()).toBe('en');
      
      setLanguage('ru');
      expect(getCurrentLanguage()).toBe('ru');
    });

    it('should maintain language after page reload simulation', () => {
      setLanguage('en');
      
      // Simulate page reload by creating new instance
      const storedLang = localStorage.getItem('docs-language');
      expect(storedLang).toBe('en');
      
      // Verify it can be read back
      expect(getCurrentLanguage()).toBe('en');
    });
  });
});
