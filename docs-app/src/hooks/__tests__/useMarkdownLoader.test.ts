/**
 * Unit tests for useMarkdownLoader hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMarkdownLoader } from '../useMarkdownLoader';

// Mock fetch
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

describe('useMarkdownLoader', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMarkdownLoader());

    expect(result.current.content).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.filePath).toBe(null);
  });

  it('should initialize with fallback content', () => {
    const fallbackContent = '# Fallback Content';
    const { result } = renderHook(() =>
      useMarkdownLoader({ fallbackContent })
    );

    expect(result.current.content).toBe(fallbackContent);
  });

  it('should load markdown successfully', async () => {
    const markdownContent = '# Test Content\n\nThis is a test.';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdownContent,
    });

    const { result } = renderHook(() => useMarkdownLoader());

    // Start loading
    await result.current.loadMarkdown('/test.md');

    // Should complete successfully
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.content).toBe(markdownContent);
      expect(result.current.error).toBe(null);
      expect(result.current.filePath).toBe('/test.md');
    });

    expect(mockFetch).toHaveBeenCalledWith('/test.md');
  });

  it('should handle 404 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useMarkdownLoader());

    result.current.loadMarkdown('/missing.md');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toContain('File not found');
      expect(result.current.error).toContain('/missing.md');
    });
  });

  it('should handle 403 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const { result } = renderHook(() => useMarkdownLoader());

    result.current.loadMarkdown('/forbidden.md');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toContain('Access denied');
    });
  });

  it('should handle 500 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useMarkdownLoader());

    result.current.loadMarkdown('/error.md');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toContain('Server error');
    });
  });

  it('should handle empty file content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '   ',
    });

    const { result } = renderHook(() => useMarkdownLoader());

    result.current.loadMarkdown('/empty.md');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toContain('File is empty');
    });
  });

  it('should use fallback content on error', async () => {
    const fallbackContent = '# Fallback';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() =>
      useMarkdownLoader({ fallbackContent })
    );

    result.current.loadMarkdown('/missing.md');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.content).toBe(fallbackContent);
      expect(result.current.error).not.toBe(null);
    });
  });

  it('should call onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const markdownContent = '# Success';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdownContent,
    });

    const { result } = renderHook(() =>
      useMarkdownLoader({ onSuccess })
    );

    result.current.loadMarkdown('/success.md');

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(markdownContent, '/success.md');
    });
  });

  it('should call onError callback', async () => {
    const onError = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() =>
      useMarkdownLoader({ onError })
    );

    result.current.loadMarkdown('/error.md');

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
      const [error, filePath] = onError.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(filePath).toBe('/error.md');
    });
  });

  it('should retry loading with the same path', async () => {
    const markdownContent = '# Retry Test';
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => markdownContent,
      });

    const { result } = renderHook(() => useMarkdownLoader());

    // First attempt fails
    result.current.loadMarkdown('/retry.md');

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    // Retry should succeed
    result.current.retry();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.content).toBe(markdownContent);
      expect(result.current.error).toBe(null);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should reset state', () => {
    const fallbackContent = '# Fallback';
    const { result } = renderHook(() =>
      useMarkdownLoader({ fallbackContent })
    );

    // Load some content first
    result.current.loadMarkdown('/test.md');

    // Reset
    result.current.reset();

    expect(result.current.content).toBe(fallbackContent);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.filePath).toBe(null);
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useMarkdownLoader());

    result.current.loadMarkdown('/network-error.md');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toContain('Network error');
    });
  });
});
