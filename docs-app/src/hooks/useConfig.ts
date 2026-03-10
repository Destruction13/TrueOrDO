import { useState, useEffect } from 'react';
import type { AppConfig } from '../types';
import { loadConfig } from '../lib/config';

/**
 * Hook for accessing application configuration
 * Loads config on mount and provides loading/error states
 */
export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchConfig() {
      try {
        setLoading(true);
        const loadedConfig = await loadConfig();
        
        if (mounted) {
          setConfig(loadedConfig);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load config'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchConfig();

    return () => {
      mounted = false;
    };
  }, []);

  return { config, loading, error };
}
