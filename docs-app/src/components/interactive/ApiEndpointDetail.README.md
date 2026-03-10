# ApiEndpointDetail Component

A comprehensive component for displaying API endpoint documentation with HTTP method, URL, parameters, and code examples.

## Features

- **HTTP Method Badge**: Color-coded badges for GET, POST, PUT, DELETE, PATCH
- **URL Display**: Formatted URL path with monospace font
- **Description**: Clear endpoint description
- **Authentication**: Display authentication requirements
- **Parameters Table**: Structured table showing parameter details (name, type, required, description)
- **Request Example**: Syntax-highlighted JSON request example
- **Response Format**: Syntax-highlighted JSON response schema
- **Response Example**: Syntax-highlighted JSON response example
- **Theme Support**: Light and dark theme support

## Usage

```tsx
import { ApiEndpointDetail } from './components/interactive';
import type { ApiEndpoint } from './types';

const endpoint: ApiEndpoint = {
  method: 'POST',
  url: '/api/v1/users',
  description: 'Create a new user account',
  authentication: 'Bearer token required',
  parameters: [
    {
      name: 'username',
      type: 'string',
      required: true,
      description: 'Unique username for the account',
    },
    {
      name: 'email',
      type: 'string',
      required: true,
      description: 'User email address',
    },
  ],
  requestExample: `{
  "username": "john_doe",
  "email": "john@example.com"
}`,
  responseFormat: `{
  "id": "string",
  "username": "string",
  "email": "string",
  "createdAt": "string"
}`,
  responseExample: `{
  "id": "user_123",
  "username": "john_doe",
  "email": "john@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}`,
};

function ApiDocPage() {
  return <ApiEndpointDetail endpoint={endpoint} theme="dark" />;
}
```

## Props

### ApiEndpointDetailProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `endpoint` | `ApiEndpoint` | Yes | - | The API endpoint data to display |
| `theme` | `'light' \| 'dark'` | No | `'dark'` | Theme for code blocks |

### ApiEndpoint Type

```typescript
interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  description: string;
  parameters?: ApiParameter[];
  requestExample?: string;
  responseFormat?: string;
  responseExample?: string;
  authentication?: string;
}

interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}
```

## Examples

### Minimal Endpoint

```tsx
const minimalEndpoint: ApiEndpoint = {
  method: 'GET',
  url: '/api/v1/status',
  description: 'Check API status',
};

<ApiEndpointDetail endpoint={minimalEndpoint} />
```

### Complete Endpoint with All Fields

```tsx
const completeEndpoint: ApiEndpoint = {
  method: 'POST',
  url: '/api/v1/users',
  description: 'Create a new user account',
  authentication: 'Bearer token required',
  parameters: [
    {
      name: 'username',
      type: 'string',
      required: true,
      description: 'Unique username',
    },
  ],
  requestExample: '{"username": "john"}',
  responseFormat: '{"id": "string", "username": "string"}',
  responseExample: '{"id": "123", "username": "john"}',
};

<ApiEndpointDetail endpoint={completeEndpoint} theme="light" />
```

### GET Endpoint

```tsx
const getEndpoint: ApiEndpoint = {
  method: 'GET',
  url: '/api/v1/users/:id',
  description: 'Retrieve user by ID',
  parameters: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'User ID',
    },
  ],
  responseExample: '{"id": "123", "username": "john"}',
};

<ApiEndpointDetail endpoint={getEndpoint} />
```

## HTTP Method Colors

The component uses color-coded badges for different HTTP methods:

- **GET**: Green (`hsl(142, 76%, 36%)`)
- **POST**: Blue (`hsl(217, 91%, 60%)`)
- **PUT**: Yellow (`hsl(45, 100%, 51%)`)
- **DELETE**: Red (`hsl(0, 84%, 60%)`)
- **PATCH**: Purple (`hsl(280, 67%, 60%)`)

## Styling

The component uses CSS custom properties for theming:

```css
--card: Card background color
--border: Border color
--foreground: Text color
--muted: Muted background color
--muted-foreground: Muted text color
--primary: Primary accent color
```

## Accessibility

- Semantic HTML structure with proper heading hierarchy
- Table structure for parameters with proper headers
- Code blocks with copy functionality
- Keyboard accessible interactive elements

## Requirements Validation

This component validates the following requirements:

- **Requirement 4.3**: Display HTTP method, URL, and description
- **Requirement 4.4**: Show parameters table with name, type, required, description
- **Requirement 4.5**: Display request and response examples with syntax highlighting

## Related Components

- **CodeBlock**: Used for displaying code examples with syntax highlighting
- **TreeView**: Used for navigating API endpoints in a tree structure
