/**
 * TableOfContents component tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import { TableOfContents } from '../TableOfContents';

describe('TableOfContents', () => {
  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when content has no headings', () => {
    const content = 'This is just plain text without any headings.';
    const { container } = render(<TableOfContents content={content} />);
    
    expect(container.querySelector('.table-of-contents')).not.toBeInTheDocument();
  });

  it('should extract and render headings from Markdown content', () => {
    const content = `
# Introduction
Some text here.

## Getting Started
More text.

### Installation
Even more text.

## Configuration
Final text.
    `;

    render(<TableOfContents content={content} />);

    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Installation')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });

  it('should build hierarchical structure correctly', () => {
    const content = `
# Level 1
## Level 2
### Level 3
## Another Level 2
    `;

    const { container } = render(<TableOfContents content={content} />);

    // Check that nested lists exist
    const nestedLists = container.querySelectorAll('.toc-list .toc-list');
    expect(nestedLists.length).toBeGreaterThan(0);
  });

  it('should generate anchor links for each heading', () => {
    const content = `
# Introduction
## Getting Started
    `;

    render(<TableOfContents content={content} />);

    const introLink = screen.getByText('Introduction').closest('a');
    const gettingStartedLink = screen.getByText('Getting Started').closest('a');

    expect(introLink).toHaveAttribute('href', '#introduction');
    expect(gettingStartedLink).toHaveAttribute('href', '#getting-started');
  });

  it('should handle special characters in headings', () => {
    const content = `
# Hello, World!
## API & Configuration
### User's Guide
    `;

    render(<TableOfContents content={content} />);

    const helloLink = screen.getByText('Hello, World!').closest('a');
    const apiLink = screen.getByText('API & Configuration').closest('a');
    const userLink = screen.getByText("User's Guide").closest('a');

    expect(helloLink).toHaveAttribute('href', '#hello-world');
    expect(apiLink).toHaveAttribute('href', '#api-configuration');
    expect(userLink).toHaveAttribute('href', '#users-guide');
  });

  it('should scroll to heading when link is clicked', async () => {
    const content = `
# Introduction
## Getting Started
    `;

    // Create mock heading elements
    const mockElement = document.createElement('h2');
    mockElement.id = 'getting-started';
    document.body.appendChild(mockElement);

    const user = userEvent.setup();
    render(<TableOfContents content={content} />);

    const link = screen.getByText('Getting Started');
    await user.click(link);

    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });

    // Cleanup
    document.body.removeChild(mockElement);
  });

  it('should apply correct CSS classes for different heading levels', () => {
    const content = `
# Level 1
## Level 2
### Level 3
#### Level 4
##### Level 5
###### Level 6
    `;

    const { container } = render(<TableOfContents content={content} />);

    expect(container.querySelector('.toc-level-1')).toBeInTheDocument();
    expect(container.querySelector('.toc-level-2')).toBeInTheDocument();
    expect(container.querySelector('.toc-level-3')).toBeInTheDocument();
    expect(container.querySelector('.toc-level-4')).toBeInTheDocument();
    expect(container.querySelector('.toc-level-5')).toBeInTheDocument();
    expect(container.querySelector('.toc-level-6')).toBeInTheDocument();
  });

  it('should handle multiple headings with same text', () => {
    const content = `
# Introduction
## Introduction
### Introduction
    `;

    render(<TableOfContents content={content} />);

    const links = screen.getAllByText('Introduction');
    expect(links).toHaveLength(3);
  });

  it('should render "On this page" title', () => {
    const content = '# Test Heading';
    render(<TableOfContents content={content} />);

    expect(screen.getByText('On this page')).toBeInTheDocument();
  });

  it('should handle empty lines and whitespace in content', () => {
    const content = `

# Introduction


## Getting Started

    `;

    render(<TableOfContents content={content} />);

    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
  });

  it('should ignore inline code in headings', () => {
    const content = '## Using `npm install`';
    render(<TableOfContents content={content} />);

    expect(screen.getByText('Using `npm install`')).toBeInTheDocument();
  });

  it('should handle headings with numbers', () => {
    const content = `
# 1. Introduction
## 1.1 Getting Started
## 1.2 Configuration
    `;

    render(<TableOfContents content={content} />);

    expect(screen.getByText('1. Introduction')).toBeInTheDocument();
    expect(screen.getByText('1.1 Getting Started')).toBeInTheDocument();
    expect(screen.getByText('1.2 Configuration')).toBeInTheDocument();
  });

  it('should handle deeply nested headings', () => {
    const content = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
    `;

    const { container } = render(<TableOfContents content={content} />);

    // All levels should be rendered
    expect(screen.getByText('H1')).toBeInTheDocument();
    expect(screen.getByText('H2')).toBeInTheDocument();
    expect(screen.getByText('H3')).toBeInTheDocument();
    expect(screen.getByText('H4')).toBeInTheDocument();
    expect(screen.getByText('H5')).toBeInTheDocument();
    expect(screen.getByText('H6')).toBeInTheDocument();

    // Check nesting structure
    const allItems = container.querySelectorAll('.toc-item');
    expect(allItems.length).toBe(6);
  });

  it('should prevent default link behavior on click', async () => {
    const content = '# Test Heading';
    
    const mockElement = document.createElement('h1');
    mockElement.id = 'test-heading';
    document.body.appendChild(mockElement);

    const user = userEvent.setup();
    render(<TableOfContents content={content} />);

    const link = screen.getByText('Test Heading').closest('a');
    expect(link).toHaveAttribute('href', '#test-heading');

    await user.click(link!);

    // scrollIntoView should be called
    expect(mockElement.scrollIntoView).toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(mockElement);
  });
});
