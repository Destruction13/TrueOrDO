/**
 * Theme Manager Module
 * 
 * Manages theme state (light/dark) with localStorage persistence.
 * Validates: Requirements 12.1, 12.2, 12.4, 12.5
 */

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'docs-theme';

/**
 * Get the current theme from localStorage or default to 'dark'
 * @returns The current theme
 */
export function getCurrentTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
  }
  
  // Default to dark theme as per config
  return 'dark';
}

/**
 * Set the theme and persist to localStorage
 * @param theme - The theme to set ('light' or 'dark')
 */
export function setTheme(theme: Theme): void {
  try {
    // Persist to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    
    // Apply theme to document
    applyThemeToDocument(theme);
  } catch (error) {
    console.error('Failed to set theme:', error);
    throw error;
  }
}

/**
 * Toggle between light and dark themes
 * @returns The new theme after toggling
 */
export function toggleTheme(): Theme {
  const current = getCurrentTheme();
  const newTheme: Theme = current === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

/**
 * Apply theme to document by adding/removing 'dark' class
 * @param theme - The theme to apply
 */
function applyThemeToDocument(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Initialize theme on app load
 * Reads from localStorage and applies to document
 */
export function initializeTheme(): void {
  const theme = getCurrentTheme();
  applyThemeToDocument(theme);
}
