/**
 * Markdown Cache Module
 * 
 * Provides in-memory caching for parsed Markdown content
 * Improves performance by avoiding re-parsing of the same content
 * 
 * Validates: Requirements 18.3
 */

interface CacheEntry {
  content: string;
  parsed: string;
  timestamp: number;
  hits: number;
}

interface CacheStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  entries: number;
}

/**
 * MarkdownCache class
 * Manages caching of parsed Markdown content
 */
export class MarkdownCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private maxAge: number;
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  /**
   * Create a new MarkdownCache
   * @param maxSize - Maximum number of entries (default: 100)
   * @param maxAge - Maximum age in milliseconds (default: 5 minutes)
   */
  constructor(maxSize = 100, maxAge = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  /**
   * Get cached content
   * @param key - Cache key (usually file path)
   * @returns Cached parsed content or null if not found
   */
  get(key: string): string | null {
    this.stats.totalRequests++;

    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.cacheMisses++;
      return null;
    }

    // Check if entry is expired
    const age = Date.now() - entry.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      this.stats.cacheMisses++;
      return null;
    }

    // Cache hit
    entry.hits++;
    this.stats.cacheHits++;
    return entry.parsed;
  }

  /**
   * Set cached content
   * @param key - Cache key (usually file path)
   * @param content - Original Markdown content
   * @param parsed - Parsed content
   */
  set(key: string, content: string, parsed: string): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      content,
      parsed,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Check if content has changed
   * @param key - Cache key
   * @param content - Current content to compare
   * @returns true if content has changed or not in cache
   */
  hasChanged(key: string, content: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return entry.content !== content;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Remove a specific entry
   * @param key - Cache key to remove
   */
  remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Get cache statistics
   * @returns Cache statistics including hit rate
   */
  getStats(): CacheStats {
    const hitRate =
      this.stats.totalRequests > 0
        ? (this.stats.cacheHits / this.stats.totalRequests) * 100
        : 0;

    return {
      totalRequests: this.stats.totalRequests,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      entries: this.cache.size,
    };
  }

  /**
   * Evict the oldest entry from cache
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Evict expired entries
   */
  evictExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.maxAge) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cache size
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists in cache
   * @param key - Cache key to check
   * @returns true if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Global cache instance
export const markdownCache = new MarkdownCache();

// Periodically evict expired entries (every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    markdownCache.evictExpired();
  }, 5 * 60 * 1000);
}
