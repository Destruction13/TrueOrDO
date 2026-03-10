# Contexts

This directory contains React Context providers for global state management.

## ThemeContext

The `ThemeContext` provides theme state (light/dark) and theme management functions throughout the application.

### Features

- **Theme State**: Provides current theme ('light' or 'dark')
- **Theme Toggle**: Function to toggle between light and dark themes
- **Theme Setter**: Function to set a specific theme
- **Persistence**: Automatically saves theme preference to localStorage
- **Document Integration**: Applies 'dark' class to `document.documentElement` for CSS styling
- **Initialization**: Loads saved theme on app startup

### Usage

#### Wrapping the App

The `ThemeProvider` should wrap your entire application (typically in `main.tsx`):

```tsx
import { ThemeProvider } from './contexts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

#### Using the Theme Hook

Access theme state and functions in any component:

```tsx
import { useTheme } from './contexts';

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
    </div>
  );
}
```

### Implementation Details

- **Storage Key**: Theme is stored in localStorage under the key `'docs-theme'`
- **Default Theme**: Defaults to 'dark' if no saved preference exists
- **CSS Integration**: Adds/removes 'dark' class on `document.documentElement`
- **Error Handling**: Gracefully handles localStorage errors and falls back to default theme

### Requirements Validated

- **12.6**: Theme state provided via React Context
- **12.5**: Theme preference persisted in browser storage
- **12.4**: Theme toggle functionality
- **12.1, 12.2**: Support for light and dark themes

### Testing

Comprehensive tests are available in `__tests__/ThemeContext.test.tsx` covering:

- Default theme initialization
- Theme toggling
- Theme setting
- localStorage persistence
- Document class application
- Error handling
- Context usage outside provider
