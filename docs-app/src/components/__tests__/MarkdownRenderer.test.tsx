/**
 * Unit tests for MarkdownRenderer component
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { MarkdownRenderer } from '../MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('should render simple Markdown content', () => {
    const content = '# Hello World\n\nThis is a test.';
    render(<MarkdownRenderer content={content} />);

    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('This is a test.')).toBeInTheDocument();
  });

  it('should render headings with IDs', () => {
    const content = '# Main Title\n\n## Sub Title';
    const { container } = render(<MarkdownRenderer content={content} />);

    const h1 = container.querySelector('h1');
    const h2 = container.querySelector('h2');

    expect(h1).toHaveAttribute('id', 'main-title');
    expect(h2).toHaveAttribute('id', 'sub-title');
  });

  it('should render code blocks', () => {
    const content = '```javascript\nconst x = 42;\n```';
    const { container } = render(<MarkdownRenderer content={content} />);

    // CodeBlock component uses .code-block-wrapper class
    const codeBlock = container.querySelector('.code-block-wrapper');
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock?.textContent).toContain('const x = 42;');
  });

  it('should render inline code', () => {
    const content = 'This is `inline code` example.';
    const { container } = render(<MarkdownRenderer content={content} />);

    // react-markdown renders inline code as <code> element
    const code = container.querySelector('code');
    expect(code).toBeInTheDocument();
    expect(code?.textContent).toBe('inline code');
  });

  it('should render tables with GitHub Flavored Markdown', () => {
    const content = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;

    const { container } = render(<MarkdownRenderer content={content} />);

    // Tables are now rendered as InteractiveTable component
    const interactiveTable = container.querySelector('.interactive-table');
    expect(interactiveTable).toBeInTheDocument();
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
  });

  it('should render links with target blank', () => {
    const content = '[Example](https://example.com)';
    const { container } = render(<MarkdownRenderer content={content} />);

    const link = container.querySelector('a.markdown-link');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render lists', () => {
    const content = `- Item 1
- Item 2
- Item 3`;

    render(<MarkdownRenderer content={content} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should render blockquotes', () => {
    const content = '> This is a quote';
    const { container } = render(<MarkdownRenderer content={content} />);

    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote?.textContent).toContain('This is a quote');
  });

  it('should support custom components', () => {
    const content = '# Custom';
    const customComponents = {
      h1: (props: any) => (
        <h1 className="custom-heading">{props.children}</h1>
      ),
    };

    const { container } = render(
      <MarkdownRenderer content={content} components={customComponents} />
    );

    const heading = container.querySelector('h1.custom-heading');
    expect(heading).toBeInTheDocument();
  });

  it('should render strikethrough with GFM', () => {
    const content = '~~strikethrough~~';
    const { container } = render(<MarkdownRenderer content={content} />);

    const del = container.querySelector('del');
    expect(del).toBeInTheDocument();
    expect(del?.textContent).toBe('strikethrough');
  });

  it('should render task lists with GFM', () => {
    const content = `- [x] Completed task
- [ ] Incomplete task`;

    const { container } = render(<MarkdownRenderer content={content} />);

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });
});
