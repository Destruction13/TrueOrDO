# Language Manager and Translations

This module provides internationalization (i18n) support for the documentation system with Russian and English languages.

## Features

- **Language Management**: Switch between Russian (ru) and English (en)
- **Persistent Storage**: Language preference saved to localStorage
- **Comprehensive Translations**: 200+ translation keys organized by feature area
- **Parameter Interpolation**: Support for dynamic values in translations

## Usage

### Basic Translation

```typescript
import { translate, translations } from '@/lib/language';

// Simple translation
const homeText = translate('nav.home', translations);
// Returns: "Главная" (ru) or "Home" (en)

// Translation with parameters
const errorText = translate('error.fileNotFound', translations, { path: '/docs/api.md' });
// Returns: "Файл не найден: /docs/api.md" (ru) or "File not found: /docs/api.md" (en)
```

### In React Components

```typescript
import { translate, translations } from '@/lib/language';

function MyComponent() {
  const buttonText = translate('button.submit', translations);
  
  return (
    <button>{buttonText}</button>
  );
}
```

### Language Switching

```typescript
import { getCurrentLanguage, setLanguage } from '@/lib/language';

// Get current language
const currentLang = getCurrentLanguage(); // 'ru' or 'en'

// Set language
setLanguage('en');
```

## Translation Keys Organization

Translations are organized by feature area with dot notation:

### Navigation (`nav.*`)
- `nav.home`, `nav.api`, `nav.technical`, `nav.guides`, `nav.plan`
- `nav.back`, `nav.scrollToTop`, `nav.tableOfContents`

### Search (`search.*`)
- `search.placeholder`, `search.close`, `search.filterBySection`
- `search.hint`, `search.noResults`, `search.score`

### Bug Tracker (`bugs.*`)
- `bugs.title`, `bugs.createNew`, `bugs.editBug`, `bugs.deleteBug`
- `bugs.priority.low`, `bugs.priority.medium`, `bugs.priority.high`, `bugs.priority.critical`
- `bugs.status.open`, `bugs.status.inProgress`, `bugs.status.resolved`, `bugs.status.closed`

### Forms (`form.*`)
- `form.title`, `form.description`, `form.priority`, `form.status`
- `form.tags`, `form.assignee`, `form.required`
- `form.stepsToReproduce`, `form.expectedBehavior`, `form.actualBehavior`

### Buttons (`button.*`)
- `button.submit`, `button.cancel`, `button.save`, `button.delete`
- `button.edit`, `button.create`, `button.copy`, `button.copied`
- `button.export`, `button.download`, `button.loading`

### Interactive Components
- **Code**: `code.copy`, `code.copied`, `code.language`
- **Table**: `table.search`, `table.filter`, `table.sort`, `table.exportCSV`, `table.exportJSON`
- **Diagram**: `diagram.zoom`, `diagram.zoomIn`, `diagram.zoomOut`, `diagram.exportPNG`, `diagram.exportSVG`
- **Chart**: `chart.title`, `chart.exportPNG`, `chart.noData`

### Errors (`error.*`)
- `error.generic`, `error.notFound`, `error.fileNotFound`
- `error.loadFailed`, `error.saveFailed`, `error.deleteFailed`
- `error.copyFailed`, `error.exportFailed`, `error.searchFailed`
- `error.validation.required`, `error.validation.titleRequired`, `error.validation.descriptionRequired`

### Theme & Language
- **Theme**: `theme.light`, `theme.dark`, `theme.toggle`
- **Language**: `language.russian`, `language.english`, `language.toggle`

### API Documentation (`api.*`)
- `api.endpoint`, `api.method`, `api.parameters`
- `api.request`, `api.response`, `api.example`
- `api.required`, `api.optional`, `api.type`, `api.description`

### Sections (`section.*`)
- `section.api.title`, `section.api.description`
- `section.technical.title`, `section.technical.description`
- `section.guides.title`, `section.plan.title`
- Technical subsections: `section.technical.auth`, `section.technical.client`, etc.

### Accessibility (`a11y.*`)
- `a11y.skipToContent`, `a11y.openMenu`, `a11y.closeMenu`
- `a11y.expandSection`, `a11y.collapseSection`

### Loading States (`loading.*`)
- `loading.page`, `loading.content`, `loading.search`, `loading.saving`

### Dates & Time (`date.*`)
- `date.created`, `date.updated`, `date.today`, `date.yesterday`
- `date.daysAgo` (with parameter)

### Miscellaneous (`misc.*`)
- `misc.readingTime`, `misc.lastUpdated`, `misc.version`
- `misc.author`, `misc.contributors`, `misc.license`
- `misc.viewportTooSmall`

## Parameter Interpolation

Some translations support dynamic parameters using `{paramName}` syntax:

```typescript
// Translation with parameter
translate('search.noResults', translations, { query: 'test' });
// Returns: "Ничего не найдено по запросу "test"" (ru)

// Multiple parameters
translate('misc.readingTime', translations, { minutes: 5 });
// Returns: "Время чтения: 5 мин" (ru)

// File path parameter
translate('error.fileNotFound', translations, { path: '/docs/api.md' });
// Returns: "Файл не найден: /docs/api.md" (ru)
```

## Adding New Translations

To add new translations:

1. Open `src/lib/language/translations.ts`
2. Add your key-value pairs following the existing structure:

```typescript
export const translations: Translations = {
  // ... existing translations
  
  'myFeature.myKey': {
    ru: 'Русский текст',
    en: 'English text',
  },
};
```

3. Update tests in `__tests__/translations.test.ts` to verify new keys
4. Use the new translation key in your components

## Best Practices

1. **Use descriptive keys**: `button.submit` is better than `btn1`
2. **Organize by feature**: Group related translations with common prefixes
3. **Keep translations short**: UI text should be concise
4. **Test both languages**: Ensure translations fit in the UI for both languages
5. **Use parameters**: For dynamic content, use parameter interpolation
6. **Maintain consistency**: Use the same terminology across translations

## Requirements Validation

This module validates:
- **Requirement 13.1**: Support for Russian language
- **Requirement 13.2**: Support for English language
- **Requirement 13.4**: Language toggle functionality
- **Requirement 13.5**: Language persistence in browser storage
- **Requirement 13.6**: Saved language preference applied on load
