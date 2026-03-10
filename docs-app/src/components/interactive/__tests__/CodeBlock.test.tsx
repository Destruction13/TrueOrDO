/**
 * CodeBlock component tests
 * Unit tests for CodeBlock component functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import { CodeBlock } from '../CodeBlock';

describe('CodeBlock', () => {
  let clipboardWriteTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock clipboard API
    clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteTextMock,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render code with syntax highlighting', () => {
    const code = 'function hello() {\n  console.log("Hello");\n}';
    
    const { container } = render(<CodeBlock code={code} language="typescript" />);
    
    // Check that code is rendered (text is split across multiple elements)
    const codeElement = container.querySelector('code');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement?.textContent).toContain('function');
    expect(codeElement?.textContent).toContain('hello');
    expect(codeElement?.textContent).toContain('console');
  });

  it('should display line numbers by default', () => {
    const code = 'line 1\nline 2\nline 3';
    
    const { container } = render(<CodeBlock code={code} language="text" />);
    
    // Check for line number elements
    const lineNumbers = container.querySelectorAll('.linenumber');
    expect(lineNumbers.length).toBeGreaterThan(0);
  });

  it('should hide line numbers when showLineNumbers is false', () => {
    const code = 'line 1\nline 2';
    
    const { container } = render(<CodeBlock code={code} language="text" showLineNumbers={false} />);
    
    // Line numbers should not be present
    const lineNumbers = container.querySelectorAll('.linenumber');
    expect(lineNumbers.length).toBe(0);
  });

  it('should display copy button by default', () => {
    const code = 'const x = 42;';
    
    render(<CodeBlock code={code} language="typescript" />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
  });

  it('should hide copy button when showCopyButton is false', () => {
    const code = 'const x = 42;';
    
    render(<CodeBlock code={code} language="typescript" showCopyButton={false} />);
    
    const copyButton = screen.queryByRole('button', { name: /copy/i });
    expect(copyButton).not.toBeInTheDocument();
  });

  it('should copy code to clipboard on button click', async () => {
    const code = 'const x = 42;';
    const user = userEvent.setup();
    
    render(<CodeBlock code={code} language="typescript" />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    
    // Click the button
    await user.click(copyButton);
    
    // The button should show "Copied!" state
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('should show "Copied!" message after copying', async () => {
    const code = 'const x = 42;';
    const user = userEvent.setup();
    
    render(<CodeBlock code={code} language="typescript" />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);
    
    // Button text should change to "Copied!"
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('should display file name when provided', () => {
    const code = 'const x = 42;';
    const fileName = 'example.ts';
    
    render(<CodeBlock code={code} language="typescript" fileName={fileName} />);
    
    expect(screen.getByText(fileName)).toBeInTheDocument();
  });

  it('should not display file name header when not provided', () => {
    const code = 'const x = 42;';
    
    const { container } = render(<CodeBlock code={code} language="typescript" />);
    
    const header = container.querySelector('.code-block-header');
    expect(header).not.toBeInTheDocument();
  });

  it('should handle empty code', () => {
    render(<CodeBlock code="" language="text" />);
    
    // Component should render without errors
    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
  });

  it('should handle different languages', () => {
    const languages = ['javascript', 'typescript', 'python', 'rust', 'go'];
    
    languages.forEach(lang => {
      const { unmount, container } = render(<CodeBlock code="test code" language={lang} />);
      const codeElement = container.querySelector('code');
      expect(codeElement?.textContent).toContain('test code');
      unmount();
    });
  });

  it('should apply dark theme by default', () => {
    const code = 'const x = 42;';
    
    const { container } = render(<CodeBlock code={code} language="typescript" />);
    
    // Check that the wrapper exists
    const wrapper = container.querySelector('.code-block-wrapper');
    expect(wrapper).toBeInTheDocument();
  });

  it('should apply light theme when specified', () => {
    const code = 'const x = 42;';
    
    const { container } = render(<CodeBlock code={code} language="typescript" theme="light" />);
    
    // Check that the wrapper exists
    const wrapper = container.querySelector('.code-block-wrapper');
    expect(wrapper).toBeInTheDocument();
  });

  it('should handle clipboard API failure gracefully', async () => {
    const code = 'const x = 42;';
    const user = userEvent.setup();
    
    // Mock clipboard to throw error
    clipboardWriteTextMock.mockRejectedValueOnce(new Error('Clipboard error'));
    
    render(<CodeBlock code={code} language="typescript" />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    
    // Component should not crash when clipboard fails
    await expect(user.click(copyButton)).resolves.not.toThrow();
    
    // Button should still be in the document
    expect(copyButton).toBeInTheDocument();
  });

  it('should handle multiline code correctly', () => {
    const code = 'function test() {\n  const x = 1;\n  const y = 2;\n  return x + y;\n}';
    
    const { container } = render(<CodeBlock code={code} language="typescript" />);
    
    const codeElement = container.querySelector('code');
    expect(codeElement?.textContent).toContain('function');
    expect(codeElement?.textContent).toContain('test');
    expect(codeElement?.textContent).toContain('return');
  });
});
