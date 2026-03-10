# Markdown Parser Module

This module provides Markdown parsing functionality with frontmatter metadata extraction and caching.

## Features

- **Markdown Parsing**: Uses `react-markdown` with `remark-gfm` for GitHub Flavored Markdown support
- **Frontmatter Extraction**: Extracts metadata from YAML frontmatter using `gray-matter`
- **Caching**: In-memory cache for parsed content to improve performance
- **Type Safety**: Full TypeScript support with type definitions

## Usage

### Basic Parsing

```typescript
import { parseMarkdown } from './lib/parser';

const content = `---
title: "My Page"
description: "A test page"
---

# Hello World

This is my content.`;

const result = parseMarkdown(content);
console.log(result.metadata.title); // "My Page"
console.log(result.content); // "# Hello World\n\nThis is my content."
```

### Parsing with Cache

```typescript
import { parseWithCache } from './lib/parser';

// First call - parses and caches
const result1 = parseWithCache('/docs/page.md', markdownContent);

// Second call - returns cached result
const result2 = parseWithCache('/docs/page.md', markdownContent);

// result1 === result2 (same object reference)
```

### Clearing Cache

```typescript
import { clearCache, getCacheStats } from './lib/parser';

// Get cache statistics
const stats = getCacheStats();
console.log(`Cache size: ${stats.size}`);
console.log(`Cached files: ${stats.keys.join(', ')}`);

// Clear all cached content
clearCache();
```

## Frontmatter Metadata

The parser supports the following metadata fields:

- `title` (string): Page title
- `description` (string): Page description
- `section` (string): Section identifier
- `tags` (string[]): Array of tags
- `author` (string): Author name
- `lastUpdated` (string): Last update date
- `toc` (boolean): Show table of contents (default: true)
- `webgl` (boolean): Enable WebGL background (default: false)

Example frontmatter:

```yaml
---
title: "API Documentation"
description: "Complete API reference"
section: "api"
tags: ["api", "reference"]
author: "Tech Team"
lastUpdated: "2024-01-15"
toc: true
webgl: false
---
```

## Rendering

Use the `MarkdownRenderer` component to render parsed content:

```typescript
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { parseWithCache } from './lib/parser';

function MyPage() {
  const parsed = parseWithCache('/docs/page.md', markdownContent);
  
  return (
    <div>
      <h1>{parsed.metadata.title}</h1>
      <MarkdownRenderer content={parsed.content} />
    </div>
  );
}
```

## Custom Components

You can provide custom components for rendering specific Markdown elements:

```typescript
import { MarkdownRenderer } from './components/MarkdownRenderer';

const customComponents = {
  h1: ({ children }) => <h1 className="custom-heading">{children}</h1>,
  code: ({ children }) => <code className="custom-code">{children}</code>,
};

<MarkdownRenderer content={content} components={customComponents} />
```

## Performance

The caching mechanism ensures that:
- Markdown files are only parsed once
- Subsequent requests return the cached result immediately
- Memory usage is optimized by storing only parsed content

Cache statistics can be monitored using `getCacheStats()`.

## Testing

The module includes comprehensive unit tests:

```bash
npm run test
```

Tests cover:
- Markdown parsing with and without frontmatter
- Metadata extraction
- Caching behavior
- Cache clearing
- Component rendering
