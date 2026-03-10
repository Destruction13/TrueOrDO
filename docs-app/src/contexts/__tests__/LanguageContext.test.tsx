/**
 * LanguageContext Tests
 * 
 * Tests for LanguageProvider and useLanguage hook.
 * Validates: Requirements 13.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../LanguageContext';
import type { ReactNode } from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('LanguageProvider', () => {
    it('should provide language context to children', () => {
      const TestComponent = () => {
        const { language } = useLanguage();
        return <div>Language: {language}</div>;
      };

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByText(/Language:/)).toBeInTheDocument();
    });

    it('should initialize with default language (ru)', () => {
      const TestComponent = () => {
        const { language } = useLanguage();
        return <div>Language: {language}</div>;
      };

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByText('Language: ru')).toBeInTheDocument();
    });

    it('should load saved language from localStorage', () => {
      localStorageMock.setItem('docs-language', 'en');

      const TestComponent = () => {
        const { language } = useLanguage();
        return <div>Language: {language}</div>;
      };

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByText('Language: en')).toBeInTheDocument();
    });

    it('should provide setLanguage function', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.setLanguage).toBeDefined();
      expect(typeof result.current.setLanguage).toBe('function');
    });

    it('should provide translate function', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.translate).toBeDefined();
      expect(typeof result.current.translate).toBe('function');
    });
  });

  describe('useLanguage hook', () => {
    it('should throw error when used outside LanguageProvider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useLanguage());
      }).toThrow('useLanguage must be used within a LanguageProvider');

      consoleError.mockRestore();
    });

    it('should return language context value', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current).toHaveProperty('language');
      expect(result.current).toHaveProperty('setLanguage');
      expect(result.current).toHaveProperty('translate');
    });

    it('should update language when setLanguage is called', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.language).toBe('ru');

      act(() => {
        result.current.setLanguage('en');
      });

      expect(result.current.language).toBe('en');
    });

    it('should persist language to localStorage when setLanguage is called', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      act(() => {
        result.current.setLanguage('en');
      });

      expect(localStorageMock.getItem('docs-language')).toBe('en');
    });

    it('should translate keys correctly', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      // Test Russian translation
      expect(result.current.translate('nav.home')).toBe('Главная');

      // Switch to English
      act(() => {
        result.current.setLanguage('en');
      });

      // Test English translation
      expect(result.current.translate('nav.home')).toBe('Home');
    });

    it('should handle parameter interpolation in translations', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      const translated = result.current.translate('error.fileNotFound', { path: '/test/file.md' });
      expect(translated).toContain('/test/file.md');
    });

    it('should return key when translation is not found', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      const translated = result.current.translate('nonexistent.key');
      expect(translated).toBe('nonexistent.key');
    });
  });

  describe('Language switching', () => {
    it('should switch from Russian to English', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.language).toBe('ru');
      expect(result.current.translate('nav.api')).toBe('API');

      act(() => {
        result.current.setLanguage('en');
      });

      expect(result.current.language).toBe('en');
      expect(result.current.translate('nav.api')).toBe('API');
    });

    it('should switch from English to Russian', () => {
      localStorageMock.setItem('docs-language', 'en');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.language).toBe('en');

      act(() => {
        result.current.setLanguage('ru');
      });

      expect(result.current.language).toBe('ru');
      expect(result.current.translate('nav.home')).toBe('Главная');
    });
  });

  describe('Integration with translations', () => {
    it('should translate navigation keys', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.translate('nav.home')).toBe('Главная');
      expect(result.current.translate('nav.api')).toBe('API');
      expect(result.current.translate('nav.technical')).toBe('Технические разделы');
      expect(result.current.translate('nav.guides')).toBe('Руководства');
      expect(result.current.translate('nav.plan')).toBe('План');
    });

    it('should translate search keys', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      const placeholder = result.current.translate('search.placeholder');
      expect(placeholder).toContain('Поиск');
    });

    it('should translate button keys', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.translate('button.submit')).toBe('Отправить');
      expect(result.current.translate('button.cancel')).toBe('Отмена');
      expect(result.current.translate('button.save')).toBe('Сохранить');
    });

    it('should translate error keys', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <LanguageProvider>{children}</LanguageProvider>
      );

      const { result } = renderHook(() => useLanguage(), { wrapper });

      expect(result.current.translate('error.generic')).toBe('Произошла ошибка');
      expect(result.current.translate('error.notFound')).toBe('Страница не найдена');
    });
  });
});
