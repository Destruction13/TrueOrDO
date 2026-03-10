# InteractiveTable Component

A feature-rich table component for displaying and interacting with tabular data.

## Features

- **Column Sorting**: Click column headers to sort data in ascending or descending order
- **Column Filtering**: Filter individual columns with text inputs
- **Global Search**: Search across all columns simultaneously
- **Sticky Headers**: Column headers remain visible when scrolling
- **Pagination**: Navigate through large datasets with configurable page size
- **Custom Rendering**: Define custom render functions for specific columns
- **Responsive**: Adapts to different screen sizes

## Requirements

Validates Requirements: 6.1, 6.2, 6.3, 6.6, 6.7

## Usage

```tsx
import { InteractiveTable } from './components/interactive';
import type { Column } from './types';

const data = [
  { id: 1, name: 'Alice', age: 30, city: 'New York' },
  { id: 2, name: 'Bob', age: 25, city: 'Los Angeles' },
  { id: 3, name: 'Charlie', age: 35, city: 'Chicago' },
];

const columns: Column[] = [
  { key: 'id', title: 'ID' },
  { key: 'name', title: 'Name' },
  { key: 'age', title: 'Age' },
  { key: 'city', title: 'City' },
];

<InteractiveTable
  data={data}
  columns={columns}
  sortable={true}
  filterable={true}
  searchable={true}
  stickyHeader={true}
  pageSize={10}
/>
```

## Props

### `data` (required)
- Type: `any[]`
- Description: Array of data objects to display in the table

### `columns` (required)
- Type: `Column[]`
- Description: Array of column definitions

### `sortable`
- Type: `boolean`
- Default: `true`
- Description: Enable/disable column sorting

### `filterable`
- Type: `boolean`
- Default: `true`
- Description: Enable/disable column filtering

### `searchable`
- Type: `boolean`
- Default: `true`
- Description: Enable/disable global search

### `exportable`
- Type: `boolean`
- Default: `false`
- Description: Enable/disable data export (to be implemented in task 2.4)

### `stickyHeader`
- Type: `boolean`
- Default: `true`
- Description: Keep column headers visible when scrolling

### `pageSize`
- Type: `number`
- Default: `10`
- Description: Number of rows to display per page

## Column Definition

```typescript
interface Column {
  key: string;                                    // Data key to display
  title: string;                                  // Column header text
  sortable?: boolean;                             // Override global sortable
  filterable?: boolean;                           // Override global filterable
  render?: (value: any, row: any) => ReactNode;  // Custom render function
}
```

## Examples

### Basic Table

```tsx
<InteractiveTable
  data={data}
  columns={columns}
/>
```

### Table with Custom Rendering

```tsx
const columns: Column[] = [
  { key: 'id', title: 'ID' },
  { 
    key: 'salary', 
    title: 'Salary',
    render: (value) => `$${value.toLocaleString()}`
  },
  { 
    key: 'status', 
    title: 'Status',
    render: (value) => (
      <span className={`badge badge-${value.toLowerCase()}`}>
        {value}
      </span>
    )
  },
];
```

### Read-Only Table

```tsx
<InteractiveTable
  data={data}
  columns={columns}
  sortable={false}
  filterable={false}
  searchable={false}
/>
```

### Table with Large Dataset

```tsx
<InteractiveTable
  data={largeDataset}
  columns={columns}
  pageSize={25}
  stickyHeader={true}
/>
```

## Styling

The component uses CSS custom properties for theming:

- `--background`: Background color
- `--foreground`: Text color
- `--border`: Border color
- `--primary`: Primary accent color
- `--muted`: Muted background color
- `--card`: Card background color

## Accessibility

- All interactive elements are keyboard accessible
- Sort buttons have proper ARIA labels
- Table structure uses semantic HTML
- Focus indicators are visible

## Performance

- Uses React.useMemo for efficient filtering and sorting
- Only renders visible rows (pagination)
- Optimized re-renders with proper state management

## Future Enhancements

- Export to CSV/JSON (task 2.4)
- Column resizing
- Row selection
- Bulk actions
- Virtual scrolling for very large datasets
