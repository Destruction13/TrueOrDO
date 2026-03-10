/**
 * Example usage of Markdown parser and renderer
 */

import { useState, useEffect } from 'react';
import { parseWithCache } from '../lib/parser';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

const exampleMarkdown = `---
title: "Example Documentation"
description: "This is an example page"
section: "examples"
tags: ["example", "demo"]
toc: true
webgl: false
---

# Example Documentation

This is an example of the Markdown parser and renderer in action.

## Features

- **GitHub Flavored Markdown** support
- Frontmatter metadata extraction
- Caching for performance
- Custom component rendering

## Code Example

\`\`\`typescript
function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Table Example

| Feature | Status |
|---------|--------|
| Parsing | ✅ |
| Caching | ✅ |
| Rendering | ✅ |

## Task List

- [x] Implement parser
- [x] Add caching
- [x] Create renderer
- [ ] Add more features

## Inline Code

You can use \`inline code\` like this.

## Links

Check out [React Markdown](https://github.com/remarkjs/react-markdown) for more info.

> This is a blockquote with important information.

---

That's all for now!
`;

export function MarkdownExample() {
  const [parsed, setParsed] = useState<ReturnType<typeof parseWithCache> | null>(null);

  useEffect(() => {
    const result = parseWithCache('/examples/demo.md', exampleMarkdown);
    setParsed(result);
  }, []);

  if (!parsed) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
        <h3>Metadata</h3>
        <pre>{JSON.stringify(parsed.metadata, null, 2)}</pre>
      </div>
      
      <MarkdownRenderer content={parsed.content} />
    </div>
  );
}
