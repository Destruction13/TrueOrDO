/**
 * MarkdownRenderer component
 * Renders Markdown content using react-markdown with remark-gfm support
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { CodeBlock, InteractiveTable, MermaidDiagram } from './interactive';
import type { Column } from '../types';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  components?: Partial<Components>;
}

/**
 * Extract table data from React Markdown table children
 */
function extractTableData(children: any): { columns: Column[]; data: any[] } {
  const columns: Column[] = [];
  const data: any[] = [];

  try {
    // Children is an array with thead and tbody
    const childArray = Array.isArray(children) ? children : [children];
    
    let thead: any = null;
    let tbody: any = null;

    // Find thead and tbody
    childArray.forEach((child: any) => {
      if (child?.type === 'thead') {
        thead = child;
      } else if (child?.type === 'tbody') {
        tbody = child;
      }
    });

    // Extract column headers from thead
    if (thead?.props?.children) {
      const headerRow = Array.isArray(thead.props.children) 
        ? thead.props.children[0] 
        : thead.props.children;
      
      if (headerRow?.props?.children) {
        const headers = Array.isArray(headerRow.props.children) 
          ? headerRow.props.children 
          : [headerRow.props.children];
        
        headers.forEach((th: any, index: number) => {
          if (th?.props?.children) {
            const title = extractTextContent(th.props.children);
            const key = `col_${index}`;
            columns.push({ key, title });
          }
        });
      }
    }

    // Extract data rows from tbody
    if (tbody?.props?.children && columns.length > 0) {
      const rows = Array.isArray(tbody.props.children) 
        ? tbody.props.children 
        : [tbody.props.children];
      
      rows.forEach((tr: any) => {
        if (tr?.props?.children) {
          const cells = Array.isArray(tr.props.children) 
            ? tr.props.children 
            : [tr.props.children];
          
          const rowData: any = {};
          cells.forEach((td: any, index: number) => {
            if (index < columns.length && td?.props?.children) {
              const value = extractTextContent(td.props.children);
              rowData[columns[index].key] = value;
            }
          });
          
          if (Object.keys(rowData).length > 0) {
            data.push(rowData);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error extracting table data:', error);
  }

  return { columns, data };
}

/**
 * Extract text content from React children (recursive)
 */
function extractTextContent(children: any): string {
  if (typeof children === 'string') {
    return children;
  }
  
  if (typeof children === 'number') {
    return String(children);
  }
  
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('');
  }
  
  if (children?.props?.children) {
    return extractTextContent(children.props.children);
  }
  
  return '';
}

/**
 * Default components for Markdown rendering
 * Maps markdown elements to custom interactive components
 */
const defaultComponents: Partial<Components> = {
  // Code blocks - map to CodeBlock component or MermaidDiagram for mermaid syntax
  code: (props) => {
    const { inline, className, children, node, ...rest } = props as any;
    
    // Check if this is inline code (no className or node type check)
    const isInline = inline || !className || node?.tagName === 'code';
    
    // Render inline code as simple <code> element
    if (isInline && !className) {
      return (
        <code className="inline-code" {...rest}>
          {children}
        </code>
      );
    }

    // Extract language from className (format: language-xxx)
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    
    // Extract code content
    const code = String(children).replace(/\n$/, '');
    
    // Check if this is a Mermaid diagram
    if (language === 'mermaid') {
      return (
        <MermaidDiagram
          chart={code}
          zoomable={true}
          pannable={true}
          exportable={true}
        />
      );
    }
    
    // Parse metadata from code block (e.g., ```js {1,3-5} for line highlighting)
    const metaMatch = /\{([\d,-]+)\}/.exec(className || '');
    const highlightLines: number[] = [];
    
    if (metaMatch) {
      const ranges = metaMatch[1].split(',');
      ranges.forEach(range => {
        if (range.includes('-')) {
          const [start, end] = range.split('-').map(Number);
          for (let i = start; i <= end; i++) {
            highlightLines.push(i);
          }
        } else {
          highlightLines.push(Number(range));
        }
      });
    }
    
    // Check if it's a diff view (lines start with + or -)
    const isDiff = code.split('\n').some(line => line.startsWith('+') || line.startsWith('-'));

    return (
      <CodeBlock
        code={code}
        language={language}
        showLineNumbers={true}
        highlightLines={highlightLines}
        showCopyButton={true}
        diff={isDiff}
      />
    );
  },

  // Tables - map to InteractiveTable component
  table: ({ children }) => {
    // Extract table data from children
    const tableData = extractTableData(children);
    
    if (tableData.columns.length > 0 && tableData.data.length > 0) {
      return (
        <InteractiveTable
          data={tableData.data}
          columns={tableData.columns}
          sortable={true}
          filterable={true}
          searchable={true}
          stickyHeader={true}
          pageSize={10}
        />
      );
    }
    
    // Fallback to regular table if extraction fails
    return (
      <div className="table-wrapper">
        <table className="markdown-table">{children}</table>
      </div>
    );
  },

  // Links
  a: ({ href, children }) => (
    <a href={href} className="markdown-link" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),

  // Headings with anchor links
  h1: ({ children }) => {
    const id = String(children).toLowerCase().replace(/\s+/g, '-');
    return <h1 id={id}>{children}</h1>;
  },
  h2: ({ children }) => {
    const id = String(children).toLowerCase().replace(/\s+/g, '-');
    return <h2 id={id}>{children}</h2>;
  },
  h3: ({ children }) => {
    const id = String(children).toLowerCase().replace(/\s+/g, '-');
    return <h3 id={id}>{children}</h3>;
  },
  h4: ({ children }) => {
    const id = String(children).toLowerCase().replace(/\s+/g, '-');
    return <h4 id={id}>{children}</h4>;
  },
  h5: ({ children }) => {
    const id = String(children).toLowerCase().replace(/\s+/g, '-');
    return <h5 id={id}>{children}</h5>;
  },
  h6: ({ children }) => {
    const id = String(children).toLowerCase().replace(/\s+/g, '-');
    return <h6 id={id}>{children}</h6>;
  },
};

/**
 * MarkdownRenderer component
 * Renders Markdown content with GitHub Flavored Markdown support
 */
export function MarkdownRenderer({ content, components }: MarkdownRendererProps) {
  // Merge custom components with default components
  const mergedComponents = {
    ...defaultComponents,
    ...components,
  };

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={mergedComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
