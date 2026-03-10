# ProgressBar Component

A reading progress indicator that displays at the top of the page, showing how much of the page content the user has scrolled through.

## Features

- **Fixed Position**: Displays at the top of the viewport
- **Real-time Updates**: Updates smoothly as the user scrolls
- **Accessible**: Includes proper ARIA attributes for screen readers
- **Responsive**: Adapts to different page heights
- **Smooth Animation**: Uses CSS transitions for fluid progress updates
- **Respects Motion Preferences**: Disables animations for users who prefer reduced motion

## Usage

```tsx
import { ProgressBar } from '@/components/layout';

function App() {
  return (
    <div>
      <ProgressBar />
      {/* Your page content */}
    </div>
  );
}
```

## How It Works

The component calculates reading progress using the following formula:

```typescript
const scrollTop = window.scrollY;
const docHeight = document.documentElement.scrollHeight;
const windowHeight = window.innerHeight;
const scrollableHeight = docHeight - windowHeight;

const progress = (scrollTop / scrollableHeight) * 100;
```

- **0%**: User is at the top of the page
- **50%**: User has scrolled halfway through the content
- **100%**: User has reached the bottom of the page

## Edge Cases

- **No Scrollable Content**: If the page height is less than or equal to the viewport height, progress is set to 100%
- **Over-scroll**: Progress is capped at 100% even if the browser allows over-scrolling

## Styling

The component uses CSS custom properties for theming:

- `--muted`: Background color of the progress bar track
- `--primary`: Start color of the progress gradient
- `--accent`: End color of the progress gradient

## Accessibility

- Uses `role="progressbar"` for screen reader compatibility
- Includes `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` attributes
- Progress value is rounded to the nearest integer for clarity

## Performance

- Uses a single scroll event listener
- Properly cleans up the listener on component unmount
- Smooth CSS transitions for visual updates
- Minimal re-renders using React state

## Requirements

Validates:
- **Requirement 3.8**: Display a reading progress bar
- **Requirement 3.9**: Update progress bar based on scroll position
