# Coding Style & Stack

## Tech Stack

- **React 19** with React Compiler
- **Vite** + **Bun** package manager
- **TypeScript** with strict mode, `erasableSyntaxOnly` enabled
- **Tailwind CSS v4** + **shadcn/ui**
- **TanStack Router** (file-based routing)
- **TanStack Query** (server state)
- **TanStack Store** (client state)

## Project Structure

```
src/
├── lib/           # Shared utilities
│   ├── queryClient.ts
│   ├── api.ts
│   ├── queryKeys.ts
│   └── store/     # Global stores
├── routes/        # File-based routes
└── components/
    └── ui/        # shadcn components
```

## Conventions

### TypeScript
- No parameter properties (use explicit field declarations)
- Prefer `type` over `interface`
- Use `const` assertions for readonly arrays/objects

### Imports
- Use `@/` alias for `src/`
- Group: external, internal, types, styles

### State Management
- **Server state**: TanStack Query + `queryKeys` factory
- **Client state**: TanStack Store for global state
- **Local state**: React hooks

### API Layer
- Use `fetchApi()` from `lib/api.ts`
- Define query keys in `lib/queryKeys.ts`
- Access `queryClient` via import or route context

### Routing
- File-based routes in `src/routes/`
- Use `createFileRoute()` for route definitions
- Access context via `useRouteContext()`

### Store Usage
```tsx
import { useStore } from '@tanstack/react-store'
import { uiStore, toggleSidebar } from '@/lib/store/uiStore'

function Component() {
  const sidebarOpen = useStore(uiStore, (state) => state.sidebarOpen)
  return <button onClick={toggleSidebar}>Toggle</button>
}
```

## Code Style

- Clean, modern, minimal
- No over-engineering
- No unnecessary abstractions
- Type-safe where possible
- Prefer composition over props drilling
