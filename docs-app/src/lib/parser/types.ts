/**
 * Types for Markdown parser module
 */

export interface ParsedContent {
  content: string;
  metadata: PageMetadata;
  reactElement?: React.ReactElement;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  section?: string;
  tags?: string[];
  author?: string;
  lastUpdated?: string;
  toc?: boolean;
  webgl?: boolean;
}

export interface MarkdownCache {
  [filePath: string]: ParsedContent;
}
