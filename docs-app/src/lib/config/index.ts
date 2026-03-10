import type { AppConfig } from '../../types';

let cachedConfig: AppConfig | null = null;

/**
 * Load application configuration from /docs/config.json
 */
export async function loadConfig(): Promise<AppConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const response = await fetch('/docs/config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }
    
    const config = await response.json();
    cachedConfig = config;
    return config;
  } catch (error) {
    console.error('Error loading configuration:', error);
    // Return default config as fallback
    return getDefaultConfig();
  }
}

/**
 * Get default configuration (fallback)
 */
function getDefaultConfig(): AppConfig {
  return {
    version: '1.0.0',
    sections: [],
    theme: {
      defaultTheme: 'dark',
      colors: {
        light: {
          background: '0 0% 100%',
          foreground: '222.2 84% 4.9%',
          primary: '222.2 47.4% 11.2%',
          secondary: '210 40% 96.1%',
          accent: '210 40% 96.1%',
          muted: '210 40% 96.1%',
          border: '214.3 31.8% 91.4%',
          card: '0 0% 100%',
          cardForeground: '222.2 84% 4.9%',
        },
        dark: {
          background: '222.2 84% 4.9%',
          foreground: '210 40% 98%',
          primary: '210 40% 98%',
          secondary: '217.2 32.6% 17.5%',
          accent: '217.2 32.6% 17.5%',
          muted: '217.2 32.6% 17.5%',
          border: '217.2 32.6% 17.5%',
          card: '222.2 84% 4.9%',
          cardForeground: '210 40% 98%',
        },
      },
    },
    search: {
      debounceMs: 200,
      maxResults: 20,
      minQueryLength: 2,
      indexingEnabled: true,
    },
    animations: {
      enabled: true,
      duration: {
        fast: 150,
        normal: 300,
        slow: 500,
      },
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  };
}

/**
 * Clear cached configuration (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
