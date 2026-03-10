/**
 * CodeBlock component
 * Displays code with syntax highlighting, line numbers, copy functionality, and diff view
 * 
 * Features:
 * - Syntax highlighting using react-syntax-highlighter
 * - Line numbers display
 * - Copy-to-clipboard with ripple animation
 * - Line highlighting
 * - Diff view (+ green, - red)
 * 
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLanguage } from '../../contexts/LanguageContext';
import './CodeBlock.css';

export interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  showCopyButton?: boolean;
  fileName?: string;
  diff?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * CodeBlock component
 * Renders code with syntax highlighting and interactive features
 */
export function CodeBlock({
  code,
  language,
  showLineNumbers = true,
  highlightLines = [],
  showCopyButton = true,
  fileName,
  diff = false,
  theme = 'dark',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [ripplePosition, setRipplePosition] = useState<{ x: number; y: number } | null>(null);
  const { translate } = useLanguage();

  /**
   * Copy code to clipboard
   * Handles both modern Clipboard API and fallback for older browsers
   */
  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    
    // Calculate ripple position relative to button
    setRipplePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
        setRipplePosition(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      // Show error notification
      alert(translate('error.copyFailed'));
    }
  };

  /**
   * Process code for diff view
   * Parses lines with + and - prefixes
   */
  const processedCode = diff ? code : code;
  const lines = processedCode.split('\n');

  /**
   * Custom line props for highlighting and diff view
   */
  const lineProps = (lineNumber: number) => {
    const style: React.CSSProperties = {};
    const className: string[] = [];

    // Highlight specific lines
    if (highlightLines.includes(lineNumber)) {
      className.push('highlighted-line');
    }

    // Diff view styling
    if (diff) {
      const line = lines[lineNumber - 1];
      if (line?.startsWith('+')) {
        className.push('diff-addition');
      } else if (line?.startsWith('-')) {
        className.push('diff-deletion');
      }
    }

    return {
      style,
      className: className.join(' '),
    };
  };

  const syntaxTheme = theme === 'dark' ? oneDark : oneLight;

  return (
    <div className="code-block-wrapper">
      {/* File name header */}
      {fileName && (
        <div className="code-block-header">
          <span className="code-block-filename">{fileName}</span>
        </div>
      )}

      {/* Code container */}
      <div className="code-block-container">
        {/* Copy button */}
        {showCopyButton && (
          <button
            className={`copy-button ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            aria-label={copied ? translate('code.copied') : translate('code.copy')}
            type="button"
          >
            {copied ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.5 4L6 11.5L2.5 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="5"
                  y="5"
                  width="9"
                  height="9"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M3 11V3C3 2.44772 3.44772 2 4 2H10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <span className="copy-button-text">{copied ? translate('code.copied') : translate('button.copy')}</span>
            
            {/* Ripple animation */}
            {ripplePosition && (
              <span
                className="ripple"
                style={{
                  left: ripplePosition.x,
                  top: ripplePosition.y,
                }}
              />
            )}
          </button>
        )}

        {/* Syntax highlighter */}
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          showLineNumbers={showLineNumbers}
          wrapLines={true}
          lineProps={lineProps}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            borderRadius: fileName ? '0 0 0.5rem 0.5rem' : '0.5rem',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
