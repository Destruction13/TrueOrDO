/**
 * Test utilities for wrapping components with required providers
 */

import { type ReactElement, useEffect } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

/**
 * Component that sets language to English for tests
 */
function TestLanguageSetup({ children }: { children: React.ReactNode }) {
  const { setLanguage } = useLanguage();
  
  useEffect(() => {
    setLanguage('en');
  }, [setLanguage]);
  
  return <>{children}</>;
}

/**
 * Custom render function that wraps components with all required providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider>
        <LanguageProvider>
          <TestLanguageSetup>{children}</TestLanguageSetup>
        </LanguageProvider>
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { renderWithProviders as render };
