# MCP Server Integration

This directory contains integration modules for MCP (Model Context Protocol) servers used by the Premium Documentation System.

## Available MCP Servers

### 1. deepcontext MCP Server
**Purpose**: Content indexing and semantic search

**Usage**:
```typescript
import { indexWithDeepContext, searchWithDeepContext } from './deepcontext-integration';

// Index all documentation
await indexWithDeepContext('/docs');

// Search indexed content
const results = await searchWithDeepContext('authentication');
```

**Requirements**: 10.9, 17.1, 23.5

### 2. mem0 MCP Server
**Purpose**: Context persistence and user preferences

**Usage**:
```typescript
import { saveContext, loadContext } from './mem0-integration';

// Save navigation history
await saveContext('navigation', { lastVisited: '/api/auth' });

// Load saved context
const context = await loadContext('navigation');
```

**Requirements**: 17.2

### 3. puppeteer MCP Server
**Purpose**: End-to-end testing and browser automation

**Usage**:
```typescript
import { runE2ETest } from './puppeteer-integration';

// Run E2E test
await runE2ETest('search-flow', {
  steps: [
    { action: 'navigate', url: '/' },
    { action: 'click', selector: '[data-testid="search-button"]' },
    { action: 'type', selector: 'input', text: 'API' },
    { action: 'assert', selector: '.search-results', exists: true }
  ]
});
```

**Requirements**: 17.4

## Integration Architecture

```
┌─────────────────────────────────────────┐
│     Premium Documentation System        │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │   Search     │  │  Navigation  │   │
│  │   Engine     │  │   System     │   │
│  └──────┬───────┘  └──────┬───────┘   │
│         │                  │           │
│         ▼                  ▼           │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ deepcontext  │  │    mem0      │   │
│  │     MCP      │  │     MCP      │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │      puppeteer MCP (Testing)     │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Configuration

MCP servers are configured in `docs-app/mcp.config.json`:

```json
{
  "servers": {
    "deepcontext": {
      "enabled": true,
      "endpoint": "http://localhost:3001"
    },
    "mem0": {
      "enabled": true,
      "endpoint": "http://localhost:3002"
    },
    "puppeteer": {
      "enabled": true,
      "endpoint": "http://localhost:3003"
    }
  }
}
```

## Error Handling

All MCP integrations include graceful degradation:

- **deepcontext**: Falls back to local search if unavailable
- **mem0**: Falls back to localStorage if unavailable
- **puppeteer**: Tests can run with local Playwright if unavailable

## Performance Considerations

- **Caching**: All MCP responses are cached for 5 minutes
- **Timeouts**: Requests timeout after 5 seconds
- **Retries**: Failed requests are retried up to 3 times with exponential backoff

## Testing

Run MCP integration tests:

```bash
npm run test:mcp
```

## Monitoring

Monitor MCP server health:

```typescript
import { checkMCPHealth } from './mcp-health';

const health = await checkMCPHealth();
console.log(health);
// {
//   deepcontext: { status: 'healthy', latency: 45 },
//   mem0: { status: 'healthy', latency: 23 },
//   puppeteer: { status: 'healthy', latency: 120 }
// }
```
