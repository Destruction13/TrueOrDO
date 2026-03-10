# MermaidDiagram Component

Interactive Mermaid diagram component with zoom, pan, and export functionality.

## Features

- ✅ Mermaid diagram rendering
- ✅ Zoom in/out functionality
- ✅ Pan (drag to move) functionality
- ✅ Click handlers for diagram elements
- ✅ Export to PNG/SVG
- ✅ Light/Dark theme support
- ✅ Responsive controls
- ✅ Error handling with fallback UI

## Requirements Validation

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- **8.1**: Renders Mermaid diagrams using the mermaid library
- **8.2**: Supports zoom functionality (zoom in/out, reset, mouse wheel)
- **8.3**: Supports panning (drag to move)
- **8.4**: Click handlers for diagram elements with element details

## Usage

### Basic Usage

```tsx
import { MermaidDiagram } from '@/components/interactive';

function MyComponent() {
  const chart = `
    graph TD
      A[Start] --> B[Process]
      B --> C[End]
  `;

  return <MermaidDiagram chart={chart} />;
}
```

### With All Features

```tsx
import { MermaidDiagram } from '@/components/interactive';

function MyComponent() {
  const chart = `
    graph LR
      A[Node A] --> B[Node B]
      B --> C[Node C]
  `;

  const handleElementClick = (elementId: string, elementType: string) => {
    console.log(`Clicked ${elementType}: ${elementId}`);
  };

  return (
    <MermaidDiagram
      chart={chart}
      zoomable={true}
      pannable={true}
      exportable={true}
      theme="dark"
      onElementClick={handleElementClick}
    />
  );
}
```

### Light Theme

```tsx
<MermaidDiagram chart={chart} theme="light" />
```

### Static Diagram (No Zoom/Pan)

```tsx
<MermaidDiagram 
  chart={chart} 
  zoomable={false}
  pannable={false}
/>
```

### Without Export

```tsx
<MermaidDiagram 
  chart={chart} 
  exportable={false}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chart` | `string` | **required** | Mermaid diagram syntax |
| `zoomable` | `boolean` | `true` | Enable zoom functionality |
| `pannable` | `boolean` | `true` | Enable pan functionality |
| `exportable` | `boolean` | `true` | Enable export to PNG/SVG |
| `theme` | `'light' \| 'dark'` | `'dark'` | Diagram theme |
| `onElementClick` | `(elementId: string, elementType: string) => void` | `undefined` | Click handler for diagram elements |

## Supported Diagram Types

The component supports all Mermaid diagram types:

- **Flowchart** (`graph TD`, `graph LR`)
- **Sequence Diagram** (`sequenceDiagram`)
- **Class Diagram** (`classDiagram`)
- **State Diagram** (`stateDiagram-v2`)
- **Entity Relationship Diagram** (`erDiagram`)
- **Gantt Chart** (`gantt`)
- **Pie Chart** (`pie`)
- **Git Graph** (`gitGraph`)
- **User Journey** (`journey`)
- **Requirement Diagram** (`requirementDiagram`)

## Zoom Controls

- **Zoom In**: Click the `+` button or use `Ctrl + Mouse Wheel Up`
- **Zoom Out**: Click the `-` button or use `Ctrl + Mouse Wheel Down`
- **Reset**: Click the reset button to return to 100% zoom and center position
- **Zoom Range**: 50% to 300%

## Pan Controls

- **Pan**: Click and drag on the diagram to move it around
- **Reset**: Click the reset button to return to center position

## Export

- **Export to SVG**: Click the SVG button to download the diagram as a vector image
- **Export to PNG**: Click the PNG button to download the diagram as a raster image (2x resolution for quality)

## Element Click Handling

When `onElementClick` is provided, clicking on diagram elements (nodes, edges, clusters) will trigger the callback with:

- `elementId`: The ID of the clicked element
- `elementType`: The type of element (`'node'`, `'edge'`, `'cluster'`, or `'unknown'`)

Example:

```tsx
const handleElementClick = (elementId: string, elementType: string) => {
  if (elementType === 'node') {
    // Show node details
    showNodeDetails(elementId);
  }
};

<MermaidDiagram chart={chart} onElementClick={handleElementClick} />
```

## Error Handling

If the diagram fails to render (e.g., invalid syntax), the component displays a user-friendly error message:

```
⚠️ Failed to render diagram. Please check the syntax.
```

The error is also logged to the console for debugging.

## Styling

The component uses CSS variables for theming and can be customized by overriding the following variables:

```css
--background
--foreground
--card
--border
--muted
--accent
--destructive
```

## Accessibility

- All buttons have proper `aria-label` attributes
- Keyboard navigation is supported for all controls
- Focus indicators are visible for keyboard users
- Error messages are announced to screen readers

## Performance

- Diagrams are rendered on-demand using the Mermaid library
- Zoom and pan transformations use CSS transforms for smooth performance
- Export operations are handled asynchronously to avoid blocking the UI

## Browser Support

- Modern browsers with ES6+ support
- WebGL not required (uses SVG rendering)
- Clipboard API for copy functionality (with fallback for older browsers)

## Examples

See `MermaidDiagram.example.tsx` for complete examples including:

- Simple flowchart
- Sequence diagram
- Class diagram
- Interactive diagram with click handlers
- Light theme
- Static diagram (no zoom/pan)
- Gantt chart
- State diagram

## Testing

The component includes comprehensive unit tests covering:

- Rendering with different props
- Zoom functionality (in, out, reset, limits)
- Pan functionality
- Element click handlers
- Export functionality
- Error handling
- Theme support

Run tests:

```bash
npm run test -- MermaidDiagram.test.tsx
```
