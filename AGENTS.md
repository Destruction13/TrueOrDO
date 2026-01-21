# Agent Guidelines for This Project

## Autonomy & Decision Making

- **Work autonomously** — don't ask for permission to use console commands, make changes, or test code
- **Be confident** — choose the optimal approach and implement it without asking "is this okay?"
- **Make decisions** — if multiple approaches exist, pick the best one based on the codebase patterns
- **Only ask questions** when there's genuine architectural ambiguity with significant trade-offs

## Code Quality Standards

### Style & Formatting
- Use **clean, readable code** with consistent formatting
- Follow existing project conventions (check nearby files for patterns)
- Use **Russian language** for user-facing strings (UI text, error messages, comments)
- Use **English** for code (variable names, function names, etc.)

### Architecture
- **Reuse existing functions** — before creating new utilities, check if similar ones exist in:
  - `server/src/game/` — game logic modules
  - `client/src/components/ui/` — reusable UI components
  - `client/src/hooks/` — custom React hooks
  - `client/src/api/` — API utilities
- **Follow established patterns** — this project has multiple games (Truth or Dare, Alias, etc.)
  - Look at existing game implementations for patterns
  - Socket.IO events follow naming convention: `gamename:action:subaction`
  - State management follows similar patterns across games
- **Keep components modular** — extract reusable parts into separate components

### Performance
- Use efficient algorithms and data structures
- Avoid unnecessary re-renders in React (useMemo, useCallback where appropriate)
- Clean up timers, intervals, and event listeners on unmount

## Testing & Verification

- Test changes when possible using console commands
- Verify both server and client changes work together
- Clean up any temporary test files (prefix with `tmp_rovodev_`)

## Socket.IO Conventions

- Event naming: `{game}:{entity}:{action}` (e.g., `alias:room:join`, `alias:turn:start`)
- Always handle acknowledgments with `ack` callback
- Emit `{game}:state:sync` after state changes to keep clients in sync
- Use Maps for in-memory state (timers, connections, etc.)

## Database (Prisma)

- Follow existing schema patterns in `server/prisma/schema.prisma`
- Use transactions for related operations
- Handle errors gracefully with try/catch

## UI/UX Guidelines

- Maintain consistent visual style with existing components
- Use Framer Motion for animations (already in project)
- Mobile-responsive design
- Provide visual feedback for user actions (loading states, errors, success)

## Project Structure

```
client/src/
  components/     # React components (organized by game/feature)
  pages/          # Page-level components
  hooks/          # Custom React hooks
  api/            # API utilities
  context/        # React context providers
  styles/         # Global styles

server/src/
  game/           # Game logic modules (alias.js, wheels.js, etc.)
  auth/           # Authentication logic
  index.js        # Main server file with Socket.IO handlers

server/data/      # Static game data (questions, words, etc.)
server/prisma/    # Database schema and migrations
```

## Common Patterns

### Adding a New Game Feature
1. Add server-side logic in `server/src/game/{game}.js`
2. Add Socket.IO handlers in `server/src/index.js`
3. Update Prisma schema if needed
4. Create/update client components
5. Wire up events in page component

### Adding New Socket Events
1. Server: Add handler with `socket.on("game:action", async (payload, ack) => {...})`
2. Server: Emit state sync after changes
3. Client: Add event listener in useEffect
4. Client: Add action in actions useMemo
5. Don't forget cleanup in useEffect return
