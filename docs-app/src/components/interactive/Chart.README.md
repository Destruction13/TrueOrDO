# Chart Component

Interactive chart component built with recharts library for visualizing data in various formats.

## Features

- **Multiple Chart Types**: Line, bar, area, and pie charts
- **Interactive Tooltips**: Hover over data points to see detailed information
- **Zoom Functionality**: Zoom in/out on line, bar, and area charts
- **Export to PNG**: Download charts as PNG images
- **Responsive Design**: Adapts to container size
- **Empty State Handling**: Graceful display when no data is available
- **Customizable**: Title, colors, and behavior options

## Requirements

Validates the following requirements:
- **9.1**: Render data using recharts library
- **9.2**: Support interactive tooltips on hover
- **9.3**: Support zoom functionality
- **9.5**: Display detailed information on hover

## Usage

### Basic Line Chart

```tsx
import { Chart } from './components/interactive/Chart';

const data = [
  { month: 'Jan', users: 100 },
  { month: 'Feb', users: 150 },
  { month: 'Mar', users: 200 },
];

<Chart
  data={data}
  type="line"
  xKey="month"
  yKey="users"
  title="User Growth"
/>
```

### Bar Chart

```tsx
<Chart
  data={salesData}
  type="bar"
  xKey="product"
  yKey="sales"
  title="Product Sales"
  zoomable={true}
  exportable={true}
/>
```

### Area Chart

```tsx
<Chart
  data={revenueData}
  type="area"
  xKey="month"
  yKey="revenue"
  title="Revenue Trend"
/>
```

### Pie Chart

```tsx
<Chart
  data={marketShareData}
  type="pie"
  xKey="company"
  yKey="share"
  title="Market Share"
  exportable={true}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `ChartData[]` | **required** | Array of data objects to visualize |
| `type` | `'line' \| 'bar' \| 'area' \| 'pie'` | **required** | Type of chart to render |
| `xKey` | `string` | **required** | Key for x-axis data (or category for pie) |
| `yKey` | `string` | **required** | Key for y-axis data (or value for pie) |
| `title` | `string` | `undefined` | Optional chart title |
| `zoomable` | `boolean` | `true` | Enable zoom functionality (not for pie) |
| `exportable` | `boolean` | `true` | Show export to PNG button |

## Chart Types

### Line Chart
Best for showing trends over time or continuous data.

**Use cases:**
- Time series data
- Trend analysis
- Performance metrics over time

### Bar Chart
Best for comparing discrete categories or values.

**Use cases:**
- Category comparisons
- Sales by product
- Survey results

### Area Chart
Best for showing cumulative values or filled trends.

**Use cases:**
- Revenue trends
- Cumulative metrics
- Stacked data visualization

### Pie Chart
Best for showing proportions and percentages.

**Use cases:**
- Market share distribution
- Budget allocation
- Category percentages

## Interactive Features

### Tooltips
Hover over any data point to see detailed information:
- X-axis value
- Y-axis value
- Additional metadata (if provided)

### Zoom (Line, Bar, Area only)
- Zoom controls appear when zoom domain is set
- Reset button restores original view
- Not available for pie charts

### Export
Click the "PNG" button to download the chart as a PNG image:
- High-quality 2x resolution
- White background for clarity
- Automatic filename with timestamp

## Data Format

The `data` prop expects an array of objects where each object represents a data point:

```typescript
interface ChartData {
  [key: string]: any;
}

// Example
const data: ChartData[] = [
  { month: 'Jan', users: 100, revenue: 5000 },
  { month: 'Feb', users: 150, revenue: 7500 },
  { month: 'Mar', users: 200, revenue: 10000 },
];
```

## Styling

The component uses CSS variables for theming:

```css
--card-bg: Background color
--border-color: Border color
--text-primary: Primary text color
--text-secondary: Secondary text color
--button-bg: Button background
--grid-color: Chart grid color
```

## Empty State

When no data is provided, the component displays a friendly empty state:

```tsx
<Chart
  data={[]}
  type="line"
  xKey="month"
  yKey="users"
  title="No Data Available"
/>
```

## Accessibility

- All buttons have proper ARIA labels
- Keyboard navigation supported
- Screen reader friendly
- Semantic HTML structure

## Performance

- Responsive container adapts to parent size
- Efficient rendering with recharts
- Optimized for large datasets (100+ points)
- Smooth animations and transitions

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires SVG support
- Canvas API for PNG export

## Examples

See `Chart.example.tsx` for comprehensive examples including:
- All chart types
- Multiple charts in a grid
- Large datasets
- Empty states
- Custom configurations

## Testing

Unit tests cover:
- Rendering all chart types
- Interactive features
- Export functionality
- Empty state handling
- Accessibility
- Data handling

Run tests:
```bash
npm run test -- Chart.test.tsx
```

## Dependencies

- `recharts`: Chart rendering library
- `react`: UI framework
- `typescript`: Type safety

## Related Components

- `InteractiveTable`: For tabular data visualization
- `MermaidDiagram`: For diagram visualization
- `CodeBlock`: For code display

## Notes

- Pie charts do not support zoom functionality
- Export requires browser support for Canvas API
- Tooltips are automatically formatted based on data types
- Chart colors are predefined but can be customized via CSS
