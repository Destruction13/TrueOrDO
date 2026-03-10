# ScrollToTop Component

A floating button that appears when the user scrolls down the page and smoothly scrolls back to the top when clicked.

## Features

- **Auto-show/hide**: Button appears when scrolled down more than 300px
- **Smooth scrolling**: Uses native smooth scroll behavior
- **Animated entrance**: Fade and scale animation using Framer Motion
- **Accessible**: Proper ARIA labels and keyboard support
- **Responsive**: Adapts to mobile and desktop viewports

## Usage

```tsx
import { ScrollToTop } from '@/components/layout';

function App() {
  return (
    <div>
      {/* Your page content */}
      <ScrollToTop />
    </div>
  );
}
```

## Behavior

1. **Hidden by default**: The button is not visible when the page loads at the top
2. **Appears on scroll**: When the user scrolls down more than 300px, the button fades in
3. **Smooth scroll**: Clicking the button smoothly scrolls to the top of the page
4. **Hides on top**: When the user scrolls back to the top, the button fades out

## Styling

The component uses CSS custom properties for theming:

```css
.scroll-to-top {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

You can customize the appearance by overriding these CSS variables in your theme.

## Accessibility

- **ARIA label**: `aria-label="Scroll to top"` for screen readers
- **Title attribute**: Tooltip text "Scroll to top"
- **Keyboard accessible**: Can be focused and activated with keyboard
- **Focus indicator**: Visible outline when focused

## Animation

The button uses Framer Motion for smooth entrance and exit animations:

- **Initial state**: `opacity: 0, scale: 0.8`
- **Animated state**: `opacity: 1, scale: 1`
- **Exit state**: `opacity: 0, scale: 0.8`
- **Duration**: 200ms

## Requirements

This component satisfies:
- **Requirement 3.7**: Scroll-to-top button functionality
- **Requirement 15.5**: Smooth scroll behavior
- **Requirement 19.1**: Keyboard navigation support

## Browser Support

- Modern browsers with `window.scrollTo({ behavior: 'smooth' })` support
- Fallback to instant scroll for older browsers
