/**
 * useMarkdownLoader hook
 * Custom hook for loading markdown files with error handling and retry logic
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface MarkdownLoaderState {
  content: string;
  loading: boolean;
  error: string | null;
  filePath: string | null;
}

export interface MarkdownLoaderResult extends MarkdownLoaderState {
  loadMarkdown: (path: string) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

export interface UseMarkdownLoaderOptions {
  fallbackContent?: string;
  onError?: (error: Error, filePath: string) => void;
  onSuccess?: (content: string, filePath: string) => void;
}

/**
 * Custom hook for loading markdown files with error handling
 * 
 * @param options - Configuration options
 * @returns Markdown loader state and methods
 * 
 * @example
 * ```tsx
 * const { content, loading, error, loadMarkdown, retry } = useMarkdownLoader({
 *   fallbackContent: '# Default Content',
 *   onError: (error) => console.error(error)
 * });
 * 
 * useEffect(() => {
 *   loadMarkdown('/docs/api/README.md');
 * }, []);
 * ```
 */
export function useMarkdownLoader(
  options: UseMarkdownLoaderOptions = {}
): MarkdownLoaderResult {
  const { fallbackContent, onError, onSuccess } = options;

  // Use refs to store callbacks to prevent infinite re-renders
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);

  // Update refs when callbacks change
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const [state, setState] = useState<MarkdownLoaderState>({
    content: fallbackContent || '',
    loading: false,
    error: null,
    filePath: null,
  });

  const loadMarkdown = useCallback(
    async (path: string): Promise<void> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        filePath: path,
      }));

      try {
        // Attempt to fetch the markdown file
        const response = await fetch(path);

        if (!response.ok) {
          // Handle different HTTP error codes
          let errorMessage: string;
          
          switch (response.status) {
            case 404:
              errorMessage = `File not found: ${path}`;
              break;
            case 403:
              errorMessage = `Access denied to file: ${path}`;
              break;
            case 500:
              errorMessage = `Server error while loading: ${path}`;
              break;
            default:
              errorMessage = `Failed to load file (${response.status}): ${path}`;
          }

          throw new Error(errorMessage);
        }

        // Parse the response as text
        const content = await response.text();

        // Validate content
        if (!content || content.trim().length === 0) {
          throw new Error(`File is empty: ${path}`);
        }

        // Success - update state
        setState({
          content,
          loading: false,
          error: null,
          filePath: path,
        });

        // Call success callback
        if (onSuccessRef.current) {
          onSuccessRef.current(content, path);
        }

        // Log success for debugging
        console.log(`Successfully loaded markdown: ${path}`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        const errorMessage = error.message;

        // Log error for debugging
        console.error('Markdown loading error:', {
          path,
          error: errorMessage,
          stack: error.stack,
        });

        // Update state with error
        setState({
          content: fallbackContent || '',
          loading: false,
          error: errorMessage,
          filePath: path,
        });

        // Call error callback
        if (onErrorRef.current) {
          onErrorRef.current(error, path);
        }
      }
    },
    [fallbackContent]
  );

  const retry = useCallback(async (): Promise<void> => {
    if (state.filePath) {
      await loadMarkdown(state.filePath);
    }
  }, [state.filePath, loadMarkdown]);

  const reset = useCallback((): void => {
    setState({
      content: fallbackContent || '',
      loading: false,
      error: null,
      filePath: null,
    });
  }, [fallbackContent]);

  return {
    ...state,
    loadMarkdown,
    retry,
    reset,
  };
}
