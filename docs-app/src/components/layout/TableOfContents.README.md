# TableOfContents Component

A component that automatically generates a table of contents from Markdown content, creates anchor links, and highlights the current section as the user scrolls.

## Features

- **Automatic Extraction**: Extracts all headings (h1-h6) from Markdown content
- **Hierarchical Structure**: Builds a nested TOC structure based on heading levels
- **Anchor Links**: Generates clean, URL-friendly anchor IDs for each heading
- **Scroll Highlighting**: Highlights the current section as the user scrolls
- **Smooth Scrolling**: Smooth scroll to sections when clicking TOC links
- **Responsive**: Hidden on screens smaller than 1440px (as per design requirements)

## Usage

```tsx
import { TableOfContents } from '@/components/layout';

function DocumentationPage() {
  const markdownContent = `
# Introduction
Some content here.

## Getting Started
More content.

### Installation
Even more content.
  `;

  return (
    <div className="page-layout">
      <main className="content">
        <MarkdownRenderer content={markdownContent} />
      </main>
      
      <aside className="sidebar">
        <TableOfContents content={markdownContent} />
      </aside>
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `content` | `string` | Yes | Markdown content to extract headings from |

## Types

```typescript
interface TOCItem {
  id: string;        // Anchor ID (slug from title)
  title: string;     // Heading text
  level: number;     // Heading level (1-6)
  children?: TOCItem[]; // Nested headings
}
```

## How It Works

### 1. Heading Extraction

The component uses a regex pattern to extract all headings from the Markdown content:

```typescript
const headingRegex = /^(#{1,6})\s+(.+)$/gm;
```

This matches:
- `#` to `######` (heading levels 1-6)
- Followed by whitespace
- Followed by the heading text

### 2. Slug Generation

Each heading is converted to a URL-friendly slug:

```typescript
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')       // Replace spaces with hyphens
    .replace(/-+/g, '-')        // Replace multiple hyphens
    .trim();
}
```

Examples:
- `"Getting Started"` → `"getting-started"`
- `"API & Configuration"` → `"api-configuration"`
- `"User's Guide"` → `"users-guide"`

### 3. Hierarchy Building

The component builds a hierarchical structure by tracking parent-child relationships:

```typescript
function buildHierarchy(headings: TOCItem[]): TOCItem[] {
  const root: TOCItem[] = [];
  const stack: TOCItem[] = [];

  headings.forEach((heading) => {
    // Find appropriate parent based on level
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(heading);  // Top-level heading
    } else {
      const parent = stack[stack.length - 1];
      parent.children.push(heading);  // Child heading
    }

    stack.push(heading);
  });

  return root;
}
```

### 4. Scroll Tracking

The component tracks the scroll position and highlights the current section:

```typescript
useEffect(() => {
  const handleScroll = () => {
    const headingElements = document.querySelectorAll('h1[id], h2[id], ...');
    const scrollPosition = window.scrollY + 100; // Offset for better UX

    headingElements.forEach((element) => {
      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      if (elementTop <= scrollPosition) {
        currentId = element.id;
      }
    });

    setActiveId(currentId);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

## Styling

The component uses CSS classes for styling:

- `.table-of-contents` - Main container (sticky positioned)
- `.toc-title` - "On this page" title
- `.toc-list` - List container
- `.toc-item` - Individual TOC item
- `.toc-link` - Link element
- `.toc-link.active` - Active (current) section
- `.toc-level-{1-6}` - Level-specific styling

### CSS Variables Used

- `--card` - Background color
- `--border` - Border color
- `--foreground` - Text color
- `--muted-foreground` - Muted text color
- `--primary` - Primary accent color
- `--accent` - Accent background color

## Accessibility

- Uses semantic `<nav>` element with `aria-label="Table of contents"`
- Keyboard accessible (all links are focusable)
- Smooth scroll behavior for better UX
- Clear visual indicators for active section

## Requirements Validation

This component validates the following requirements:

- **Requirement 3.6**: Display table of contents for the current page
- **Requirement 22.3**: Display TOC on screens wider than 1440px

## Property Test

The component should satisfy **Property 6: Table of Contents Generation**:

> For any page with heading elements (h1-h6), the Navigation System should generate a hierarchical table of contents that includes all headings with correct nesting levels and anchor links.

## Integration

The TableOfContents component integrates with:

1. **MarkdownRenderer**: Headings in MarkdownRenderer automatically get IDs that match the TOC anchor links
2. **Layout**: Should be placed in a sidebar or aside element
3. **Responsive Design**: Hidden on screens < 1440px via CSS media query

## Example Output

Given this Markdown:

```markdown
# Introduction
## Getting Started
### Installation
### Configuration
## Advanced Topics
```

The component generates:

```
On this page
├─ Introduction
│  ├─ Getting Started
│  │  ├─ Installation
│  │  └─ Configuration
│  └─ Advanced Topics
```

With anchor links:
- `#introduction`
- `#getting-started`
- `#installation`
- `#configuration`
- `#advanced-topics`

## Performance

- **Memoization**: Uses `useMemo` to avoid re-parsing content on every render
- **Passive Scroll Listener**: Uses `{ passive: true }` for better scroll performance
- **Efficient DOM Queries**: Queries heading elements only once per scroll event
- **Sticky Positioning**: Uses CSS `position: sticky` instead of JavaScript

## Browser Support

- Modern browsers with ES6+ support
- CSS `position: sticky` support
- Smooth scroll behavior (with fallback)

## Testing

The component includes comprehensive unit tests covering:

- Heading extraction from Markdown
- Hierarchical structure building
- Anchor link generation
- Special character handling
- Scroll behavior
- Click interactions
- Edge cases (empty content, multiple same headings, etc.)

Run tests:

```bash
npm test -- TableOfContents.test.tsx
```
