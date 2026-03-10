/**
 * Markdown parser module with caching
 * Parses Markdown files using react-markdown and remark-gfm
 * Extracts frontmatter metadata using gray-matter
 */

import matter from 'gray-matter';
import type { ParsedContent, PageMetadata, MarkdownCache } from './types';

// In-memory cache for parsed content
const markdownCache: MarkdownCache = {};

/**
 * Parse Markdown content and extract frontmatter metadata
 * @param content - Raw Markdown content string
 * @returns Parsed content with metadata
 */
export function parseMarkdown(content: string): ParsedContent {
  // Parse frontmatter and content
  const { data, content: markdownContent } = matter(content);
  
  // Extract metadata from frontmatter
  const metadata: PageMetadata = {
    title: data.title,
    description: data.description,
    section: data.section,
    tags: data.tags,
    author: data.author,
    lastUpdated: data.lastUpdated,
    toc: data.toc !== undefined ? data.toc : true,
    webgl: data.webgl !== undefined ? data.webgl : false,
  };

  return {
    content: markdownContent,
    metadata,
  };
}

/**
 * Parse Markdown file with caching
 * @param filePath - Path to the Markdown file
 * @param content - Raw Markdown content
 * @returns Parsed content with metadata
 */
export function parseWithCache(filePath: string, content: string): ParsedContent {
  // Check if content is already cached
  if (markdownCache[filePath]) {
    return markdownCache[filePath];
  }

  // Parse the content
  const parsed = parseMarkdown(content);

  // Store in cache
  markdownCache[filePath] = parsed;

  return parsed;
}

/**
 * Clear the Markdown cache
 * Useful for testing or when content needs to be reloaded
 */
export function clearCache(): void {
  Object.keys(markdownCache).forEach(key => {
    delete markdownCache[key];
  });
}

/**
 * Get cache statistics
 * @returns Object with cache size and keys
 */
export function getCacheStats() {
  return {
    size: Object.keys(markdownCache).length,
    keys: Object.keys(markdownCache),
  };
}
