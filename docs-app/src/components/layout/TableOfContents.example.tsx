/**
 * TableOfContents component example
 */

import { TableOfContents } from './TableOfContents';

const exampleMarkdown = `
# Introduction

Welcome to the documentation system. This guide will help you get started.

## Getting Started

Follow these steps to begin using the system.

### Installation

Install the required dependencies:

\`\`\`bash
npm install
\`\`\`

### Configuration

Configure your environment variables.

## Features

The system includes many powerful features.

### Interactive Components

- Code blocks with syntax highlighting
- Interactive tables
- Mermaid diagrams
- Charts and graphs

### Search Functionality

Full-text search across all documentation.

## Advanced Topics

### Performance Optimization

Tips for optimizing your documentation site.

### Customization

How to customize the look and feel.

#### Theme Configuration

Configure light and dark themes.

#### Language Support

Add support for multiple languages.

## Conclusion

Thank you for using our documentation system!
`;

export function TableOfContentsExample() {
  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
      <div style={{ flex: 1 }}>
        <h1>Example Page Content</h1>
        <p>
          This is an example page showing how the TableOfContents component works.
          The TOC on the right extracts all headings from the Markdown content and
          builds a hierarchical structure.
        </p>
        <p>
          Try scrolling through the page to see how the current section is highlighted
          in the table of contents.
        </p>
      </div>
      
      <div style={{ width: '300px' }}>
        <TableOfContents content={exampleMarkdown} />
      </div>
    </div>
  );
}
