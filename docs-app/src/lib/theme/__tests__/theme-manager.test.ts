/**
 * Unit tests for ThemeManager module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCurrentTheme, setTheme, toggleTheme, initializeTheme } from '../theme-manager';

describe('ThemeManager', () => {
  // Mock localStorage
  let localStorageMock: { [key: string]: string } = {};

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock = {};

    // Mock localStorage methods
    globalThis.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    } as Storage;

    // Mock document.documentElement
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentTheme', () => {
    it('should return dark as default theme when localStorage is empty', () => {
      const theme = getCurrentTheme();
      expect(theme).toBe('dark');
    });

    it('should return light theme from localStorage', () => {
      localStorageMock['docs-theme'] = 'light';
      const theme = getCurrentTheme();
      expect(theme).toBe('light');
    });

    it('should return dark theme from localStorage', () => {
      localStorageMock['docs-theme'] = 'dark';
      const theme = getCurrentTheme();
      expect(theme).toBe('dark');
    });

    it('should return default theme for invalid stored value', () => {
      localStorageMock['docs-theme'] = 'invalid';
      const theme = getCurrentTheme();
      expect(theme).toBe('dark');
    });

    it('should handle localStorage read errors gracefully', () => {
      vi.spyOn(globalThis.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const theme = getCurrentTheme();
      expect(theme).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('should set light theme and persist to localStorage', () => {
      setTheme('light');
      
      expect(localStorage.setItem).toHaveBeenCalledWith('docs-theme', 'light');
      expect(localStorageMock['docs-theme']).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should set dark theme and persist to localStorage', () => {
      setTheme('dark');
      
      expect(localStorage.setItem).toHaveBeenCalledWith('docs-theme', 'dark');
      expect(localStorageMock['docs-theme']).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should add dark class to document when setting dark theme', () => {
      setTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from document when setting light theme', () => {
      document.documentElement.classList.add('dark');
      setTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should throw error when localStorage fails', () => {
      vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => setTheme('light')).toThrow();
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      localStorageMock['docs-theme'] = 'light';
      
      const newTheme = toggleTheme();
      
      expect(newTheme).toBe('dark');
      expect(localStorageMock['docs-theme']).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should toggle from dark to light', () => {
      localStorageMock['docs-theme'] = 'dark';
      
      const newTheme = toggleTheme();
      
      expect(newTheme).toBe('light');
      expect(localStorageMock['docs-theme']).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should toggle from default (dark) to light', () => {
      const newTheme = toggleTheme();
      
      expect(newTheme).toBe('light');
      expect(localStorageMock['docs-theme']).toBe('light');
    });

    it('should return the new theme after toggling', () => {
      localStorageMock['docs-theme'] = 'light';
      const result = toggleTheme();
      expect(result).toBe('dark');
    });
  });

  describe('initializeTheme', () => {
    it('should apply dark theme from localStorage on initialization', () => {
      localStorageMock['docs-theme'] = 'dark';
      
      initializeTheme();
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should apply light theme from localStorage on initialization', () => {
      localStorageMock['docs-theme'] = 'light';
      
      initializeTheme();
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply default dark theme when localStorage is empty', () => {
      initializeTheme();
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Theme persistence', () => {
    it('should persist theme across multiple operations', () => {
      setTheme('light');
      expect(getCurrentTheme()).toBe('light');
      
      setTheme('dark');
      expect(getCurrentTheme()).toBe('dark');
      
      toggleTheme();
      expect(getCurrentTheme()).toBe('light');
    });

    it('should maintain theme state after page reload simulation', () => {
      setTheme('light');
      
      // Simulate page reload by calling initializeTheme
      initializeTheme();
      
      expect(getCurrentTheme()).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
