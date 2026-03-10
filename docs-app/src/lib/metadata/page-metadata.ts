/**
 * Page Metadata Module
 * 
 * Provides structured metadata for pages to help AI agents
 * understand and navigate the documentation
 * 
 * Validates: Requirements 23.1, 23.4
 */

export interface PageMetadata {
  /**
   * Page title
   */
  title: string;

  /**
   * Page description
   */
  description?: string;

  /**
   * Section the page belongs to
   */
  section: string;

  /**
   * Tags for categorization
   */
  tags?: string[];

  /**
   * Author information
   */
  author?: string;

  /**
   * Last updated timestamp
   */
  lastUpdated?: string;

  /**
   * Show table of contents
   */
  toc?: boolean;

  /**
   * Enable WebGL background
   */
  webgl?: boolean;

  /**
   * Related pages
   */
  related?: string[];

  /**
   * Page type
   */
  type?: 'documentation' | 'guide' | 'api' | 'bug' | 'plan';

  /**
   * Reading time in minutes
   */
  readingTime?: number;

  /**
   * Keywords for search
   */
  keywords?: string[];
}

/**
 * Extract metadata from Markdown frontmatter
 * @param content - Markdown content with frontmatter
 * @returns Parsed metadata
 */
export function extractMetadata(content: string): PageMetadata | null {
  // Check for frontmatter (YAML between --- markers)
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null;
  }

  const frontmatter = match[1];
  const metadata: Partial<PageMetadata> = {};

  // Parse YAML-like frontmatter
  const lines = frontmatter.split('\n');
  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (!key || valueParts.length === 0) continue;

    const value = valueParts.join(':').trim();
    const cleanKey = key.trim();

    // Parse different value types
    if (value.startsWith('[') && value.endsWith(']')) {
      // Array value
      const arrayValue = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/['"]/g, ''));
      (metadata as any)[cleanKey] = arrayValue;
    } else if (value === 'true' || value === 'false') {
      // Boolean value
      (metadata as any)[cleanKey] = value === 'true';
    } else if (!isNaN(Number(value))) {
      // Number value
      (metadata as any)[cleanKey] = Number(value);
    } else {
      // String value
      (metadata as any)[cleanKey] = value.replace(/['"]/g, '');
    }
  }

  return metadata as PageMetadata;
}

/**
 * Generate metadata for a page
 * @param content - Page content
 * @param path - Page path
 * @returns Generated metadata
 */
export function generateMetadata(content: string, path: string): PageMetadata {
  // Try to extract from frontmatter first
  const extracted = extractMetadata(content);
  if (extracted) {
    return extracted;
  }

  // Generate metadata from content
  const title = extractTitle(content) || 'Untitled';
  const section = extractSection(path);
  const description = extractDescription(content);
  const readingTime = calculateReadingTime(content);
  const keywords = extractKeywords(content);

  return {
    title,
    section,
    description,
    readingTime,
    keywords,
    type: 'documentation',
    toc: true,
    webgl: false,
  };
}

/**
 * Extract title from Markdown content
 */
function extractTitle(content: string): string | null {
  // Look for first h1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Look for title in frontmatter
  const titleMatch = content.match(/^title:\s*(.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim().replace(/['"]/g, '');
  }

  return null;
}

/**
 * Extract section from path
 */
function extractSection(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts.length > 0) {
    return parts[0];
  }
  return 'general';
}

/**
 * Extract description from content
 */
function extractDescription(content: string): string | undefined {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

  // Get first paragraph after title
  const paragraphMatch = withoutFrontmatter.match(/^#.+\n\n(.+?)(\n\n|$)/m);
  if (paragraphMatch) {
    return paragraphMatch[1].trim().slice(0, 200);
  }

  return undefined;
}

/**
 * Calculate reading time in minutes
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string): string[] {
  // Simple keyword extraction - get words that appear frequently
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 4); // Only words longer than 4 characters

  const frequency: Record<string, number> = {};
  for (const word of words) {
    frequency[word] = (frequency[word] || 0) + 1;
  }

  // Get top 10 most frequent words
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Add metadata to page head
 */
export function addMetadataToHead(metadata: PageMetadata): void {
  // Update document title
  document.title = `${metadata.title} | TrueOrDO Docs`;

  // Add or update meta tags
  updateMetaTag('description', metadata.description || '');
  updateMetaTag('keywords', metadata.keywords?.join(', ') || '');
  updateMetaTag('author', metadata.author || '');

  // Add structured data for AI agents
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    author: metadata.author,
    dateModified: metadata.lastUpdated,
    articleSection: metadata.section,
  };

  updateStructuredData(structuredData);
}

/**
 * Update or create meta tag
 */
function updateMetaTag(name: string, content: string): void {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

/**
 * Update structured data script
 */
function updateStructuredData(data: any): void {
  let script = document.querySelector('script[type="application/ld+json"]');
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}
