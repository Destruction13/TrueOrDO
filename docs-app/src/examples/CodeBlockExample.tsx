/**
 * CodeBlock component examples
 * Demonstrates various features of the CodeBlock component
 */

import { CodeBlock } from '../components/interactive';

export function CodeBlockExample() {
  const simpleCode = `function greet(name: string): string {
  return \`Hello, \${name}!\`;
}`;

  const diffCode = `- const oldValue = 42;
+ const newValue = 100;
  
  function calculate() {
-   return oldValue * 2;
+   return newValue * 2;
  }`;

  const highlightedCode = `function processData(data: any[]) {
  const filtered = data.filter(item => item.active);
  const mapped = filtered.map(item => item.value);
  return mapped.reduce((sum, val) => sum + val, 0);
}`;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>CodeBlock Component Examples</h1>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Basic Code Block</h2>
        <p>Simple TypeScript code with line numbers and copy button</p>
        <CodeBlock
          code={simpleCode}
          language="typescript"
          showLineNumbers={true}
          showCopyButton={true}
        />
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Code Block with File Name</h2>
        <p>Displays a file name header above the code</p>
        <CodeBlock
          code={simpleCode}
          language="typescript"
          fileName="greet.ts"
          showLineNumbers={true}
          showCopyButton={true}
        />
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Diff View</h2>
        <p>Shows additions (green) and deletions (red)</p>
        <CodeBlock
          code={diffCode}
          language="typescript"
          diff={true}
          showLineNumbers={true}
          showCopyButton={true}
        />
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Line Highlighting</h2>
        <p>Highlights specific lines (line 2 in this example)</p>
        <CodeBlock
          code={highlightedCode}
          language="typescript"
          highlightLines={[2]}
          showLineNumbers={true}
          showCopyButton={true}
        />
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Light Theme</h2>
        <p>Code block with light theme</p>
        <CodeBlock
          code={simpleCode}
          language="typescript"
          theme="light"
          showLineNumbers={true}
          showCopyButton={true}
        />
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Without Line Numbers</h2>
        <p>Code block without line numbers</p>
        <CodeBlock
          code={simpleCode}
          language="typescript"
          showLineNumbers={false}
          showCopyButton={true}
        />
      </section>
    </div>
  );
}
