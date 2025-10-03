# React Example Guide

Complete guide for the sql2postgrest React example application.

## What You Get

A production-ready React application that demonstrates:
- WASM integration in React
- Custom hooks for state management
- TypeScript type safety
- Modern React patterns (hooks, functional components)
- Vite for blazing-fast development

## Quick Start

```bash
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Architecture

### File Structure

```
src/
├── hooks/
│   └── useSQL2PostgREST.ts    # WASM integration hook
├── components/
│   ├── Header.tsx             # App header
│   ├── ConfigPanel.tsx        # API configuration
│   ├── SQLEditor.tsx          # SQL input with shortcuts
│   ├── ExampleButtons.tsx     # Pre-built examples
│   └── OutputPanel.tsx        # Result display
├── App.tsx                    # Main component
├── App.css                    # Styles
└── main.tsx                   # Entry point
```

### Data Flow

```
User Input (SQL)
    ↓
SQLEditor Component
    ↓
useSQL2PostgREST Hook
    ↓
WASM Converter
    ↓
PostgREST Request Object
    ↓
OutputPanel Component
```

## Key Components

### useSQL2PostgREST Hook

Custom hook that handles WASM loading and conversion:

```typescript
const { convert, isLoading, isReady, error } = useSQL2PostgREST();

// convert(sql: string, baseURL?: string) => PostgRESTRequest | null
const result = convert('SELECT * FROM users');
```

**Features:**
- Automatic WASM loading on mount
- Loading state management
- Error handling
- Memoized converter function
- Type-safe return values

### SQLEditor Component

Interactive SQL editor with:
- Monospace font for code
- Auto-resizing textarea
- Keyboard shortcut (Ctrl/Cmd+Enter)
- Clear button
- Disabled state while WASM loads

### OutputPanel Component

Displays conversion results with:
- Syntax-highlighted JSON
- Copy to clipboard
- Summary view with key information
- Color-coded HTTP methods

### ExampleButtons Component

8 pre-built examples covering:
- SELECT (various patterns)
- INSERT (single/multiple rows)
- UPDATE
- DELETE

## TypeScript Integration

### Type Definitions

```typescript
interface PostgRESTRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

interface UseSQL2PostgRESTResult {
  convert: (sql: string, baseURL?: string) => PostgRESTRequest | null;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}
```

### Type Safety Benefits

- Autocomplete for props
- Compile-time error checking
- IntelliSense support
- Refactoring safety

## WASM Integration Details

### Loading Process

1. Load `wasm_exec.js` (Go WASM runtime)
2. Load `sql2postgrest.js` (wrapper)
3. Initialize `SQL2PostgREST` class
4. Load WASM binary
5. Set ready state

### Error Handling

```typescript
if (wasmError) {
  return <ErrorDisplay error={wasmError} />;
}
```

### Cleanup

Hook uses cleanup function to prevent memory leaks:

```typescript
useEffect(() => {
  let mounted = true;
  // ... loading logic
  return () => { mounted = false; };
}, []);
```

## Styling

### CSS Architecture

- CSS variables for theming
- Mobile-first responsive design
- Component-scoped styles
- Smooth transitions and animations

### Customization

Change theme colors:

```css
:root {
  --primary: #your-color;
  --secondary: #your-color;
}
```

## Development Workflow

### Starting Development

```bash
bun run dev
```

Features:
- Hot Module Replacement (HMR)
- Instant updates on save
- Error overlay in browser
- Source maps for debugging

### Building

```bash
bun run build
```

Output:
- Optimized production bundle
- Tree-shaken code
- Minified JS/CSS
- Gzip size estimates

### Previewing

```bash
bun run preview
```

Test production build locally.

## Performance Optimizations

### Code Splitting

Vite automatically splits code for optimal loading.

### Lazy Loading

WASM loads asynchronously to avoid blocking initial render.

### Memoization

`useCallback` prevents unnecessary re-renders:

```typescript
const convert = useCallback(
  (sql, baseURL) => { /* ... */ },
  [isReady, converter]
);
```

## Best Practices

### State Management

- Minimal state in parent component
- Derived state where possible
- No global state needed (for this example)

### Error Handling

- User-friendly error messages
- Console logging for debugging
- Graceful degradation

### Accessibility

- Semantic HTML
- Keyboard navigation
- Focus management
- ARIA labels where needed

## Extending the Example

### Adding Features

**Execute API Requests:**
```typescript
const handleExecute = async () => {
  const response = await fetch(result.url, {
    method: result.method,
    headers: result.headers,
    body: result.body ? JSON.stringify(result.body) : undefined
  });
  const data = await response.json();
  setApiResponse(data);
};
```

**Query History:**
```typescript
const [history, setHistory] = useState<PostgRESTRequest[]>([]);

const handleConvert = (result) => {
  setHistory(prev => [...prev, result]);
};
```

**Export to Different Formats:**
```typescript
const exportToCurl = (result: PostgRESTRequest) => {
  return `curl -X ${result.method} "${result.url}"`;
};

const exportToFetch = (result: PostgRESTRequest) => {
  return `fetch("${result.url}", { method: "${result.method}" })`;
};
```

## Deployment

### Vercel

```bash
bun run build
vercel deploy dist
```

### Netlify

```bash
bun run build
netlify deploy --dir=dist --prod
```

### GitHub Pages

```bash
bun run build
# Copy dist/ to gh-pages branch
```

## Troubleshooting

### Build Errors

**TypeScript errors:**
```bash
# Check types
bun run build

# Fix common issues
rm -rf node_modules bun.lock
bun install
```

### Runtime Errors

**WASM not loading:**
- Check browser console
- Verify `public/wasm/` files exist
- Use `bun run dev` (not file://)

**Component not updating:**
- Check React DevTools
- Verify state updates
- Look for key warnings

## Testing

### Manual Testing Checklist

- [ ] WASM loads successfully
- [ ] All 8 examples work
- [ ] Keyboard shortcuts work
- [ ] Copy to clipboard works
- [ ] Error states display correctly
- [ ] Mobile responsive
- [ ] No console errors

### Browser Testing

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)

## License

Apache 2.0 - Same as parent project

---

**Need Help?**
- Check browser console for errors
- Read main project README
- Open a GitHub issue
