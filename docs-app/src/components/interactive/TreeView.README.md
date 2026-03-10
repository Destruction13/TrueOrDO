# TreeView Component

A hierarchical tree navigation component with expand/collapse functionality, HTTP method badges, and full keyboard navigation support.

## Features

- **Hierarchical Structure**: Display nested tree data with unlimited depth
- **Expand/Collapse**: Click nodes to expand/collapse children with smooth animations
- **HTTP Method Badges**: Color-coded badges for GET (blue), POST (green), PUT (yellow), DELETE (red)
- **Keyboard Navigation**: Full keyboard support with arrow keys and Enter/Space
- **Accessibility**: ARIA attributes for screen readers and keyboard users
- **Focus Management**: Visual focus indicators and proper tab order

## Usage

```tsx
import { TreeView, TreeNodeData } from '@/components/interactive';

const apiData: TreeNodeData[] = [
  {
    id: 'users',
    label: 'Users',
    children: [
      {
        id: 'get-users',
        label: '/api/users',
        path: '/api/users',
        method: 'GET',
      },
      {
        id: 'create-user',
        label: '/api/users',
        path: '/api/users',
        method: 'POST',
      },
    ],
  },
];

function ApiNavigation() {
  const handleNodeClick = (node: TreeNodeData) => {
    console.log('Clicked:', node);
    // Navigate to endpoint details
    if (node.path) {
      router.push(`/api-docs${node.path}`);
    }
  };

  return <TreeView data={apiData} onNodeClick={handleNodeClick} />;
}
```

## Props

### TreeView

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `TreeNodeData[]` | Yes | Array of tree nodes to display |
| `onNodeClick` | `(node: TreeNodeData) => void` | No | Callback when a node is clicked |

### TreeNodeData

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the node |
| `label` | `string` | Yes | Display text for the node |
| `path` | `string` | No | URL path for navigation |
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'DELETE'` | No | HTTP method (shows colored badge) |
| `children` | `TreeNodeData[]` | No | Child nodes |

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `↓` | Move focus to next node |
| `↑` | Move focus to previous node |
| `→` | Expand node or move to first child |
| `←` | Collapse node or move to parent |
| `Enter` | Activate focused node |
| `Space` | Activate focused node |

## Styling

The component uses CSS modules with the following classes:

- `.tree-view` - Container element
- `.tree-node` - Individual node element
- `.tree-node.focused` - Focused node
- `.tree-node.endpoint` - Node with HTTP method
- `.tree-node-toggle` - Expand/collapse button
- `.tree-node-method-badge` - HTTP method badge
- `.tree-node-label` - Node label text

You can customize colors by overriding CSS variables:

```css
.tree-view {
  --tree-node-hover: hsl(var(--muted));
  --tree-node-focus: hsl(var(--accent));
  --tree-node-outline: hsl(var(--primary));
}
```

## HTTP Method Colors

- **GET**: `#3b82f6` (blue) - Read operations
- **POST**: `#10b981` (green) - Create operations
- **PUT**: `#f59e0b` (yellow/amber) - Update operations
- **DELETE**: `#ef4444` (red) - Delete operations

## Accessibility

The component follows WCAG 2.1 guidelines:

- Proper ARIA roles (`tree`, `treeitem`, `group`)
- ARIA attributes (`aria-expanded`, `aria-level`, `aria-label`)
- Keyboard navigation support
- Focus indicators
- Screen reader announcements

## Requirements Validated

This component validates the following requirements from the spec:

- **4.1**: Display API documentation in a tree structure
- **4.2**: Expand/collapse tree nodes to show child endpoints
- **19.1**: Support keyboard navigation for all interactive elements

## Testing

The component includes comprehensive unit tests:

```bash
npm test -- TreeView.test.tsx TreeNode.test.tsx
```

Tests cover:
- Tree rendering and structure
- Expand/collapse functionality
- Keyboard navigation
- HTTP method badges
- Click handlers
- ARIA attributes
- Focus management
- Nested structures

## Example

See `TreeView.example.tsx` for a complete working example with sample API data.
