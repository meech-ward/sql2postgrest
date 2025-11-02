# React App Quick Reference

## Key Files & Locations

### Entry Points
- `/src/main.tsx` - React app entry point
- `/index.html` - HTML template
- `/src/routes/__root.tsx` - Root layout with navbar

### Core Routes
- `/src/routes/index.tsx` - PostgREST Converter (644 lines)
- `/src/routes/supabase.tsx` - Supabase Converter (602 lines)

### WASM Integration
- `/src/hooks/useSQL2PostgREST.ts` - WASM loader & converter hook (123 lines)
- `/public/wasm/sql2postgrest.wasm` - Go-compiled converter (10.8 MB)
- `/public/wasm/sql2postgrest.js` - WASM loader
- `/public/wasm/wasm_exec.js` - Go runtime

### Conversion Libraries
- `/src/lib/postgrestToSupabase.ts` - PostgREST → Supabase JS converter (382 lines)
- `/src/lib/formatPostgRESTUrl.ts` - URL pretty-printer (135 lines)
- `/src/lib/postgrestSyntax.ts` - CodeMirror syntax highlighter (244 lines)

### UI Components
- `/src/components/navbar.tsx` - Top navigation
- `/src/components/page-layout.tsx` - Page wrapper with gradient
- `/src/components/theme-provider.tsx` - Theme context
- `/src/components/mode-toggle.tsx` - Light/dark theme toggle
- `/src/components/ui/` - shadcn/ui base components

### Configuration
- `/vite.config.ts` - Vite build config
- `/tsconfig.app.json` - TypeScript config
- `/package.json` - Dependencies
- `/sst.config.ts` - AWS deployment config

### Documentation
- `/README.md` - Usage guide
- `/DESIGN.md` - Design system
- `/POSTGREST_TO_SUPABASE.md` - Conversion library docs

---

## Architecture Overview

```
User Input (SQL Query)
        ↓
   React Component
   (routes/index.tsx)
        ↓
useSQL2PostgREST Hook
        ↓
   WASM Converter
   (sql2postgrest.wasm)
        ↓
PostgRESTRequest Object
{method, url, headers, body}
        ↓
    UI Display
    (Method badge, URL, JSON)
        ↓
Optional: Supabase Route
postgrestToSupabase()
        ↓
   Supabase JS Code
```

---

## Component Hierarchy

```
<App>
  <ThemeProvider>
    <RouterProvider>
      <Root>
        <Navbar>
          <Link> "/" | "/supabase"
          <ModeToggle>
        <Outlet>
          <Index> (/) or <Supabase> (/supabase)
            <PageLayout>
              <ResizablePanelGroup>
                <ResizablePanel>
                  <CodeMirror> (SQL Editor)
                  <DropdownMenu> (Examples)
                  <input> (Base URL)
                  <Button> (Convert)
                <ResizablePanel>
                  Method Badge
                  URL Display
                  <CodeMirror> (Parsed URL)
                  JSON Output
                  <Button> (Copy)
```

---

## State Management

### Component State
- `sqlQuery` - SQL input text
- `baseURL` - PostgREST API URL
- `result` - Converted PostgRESTRequest
- `copied` - Copy button feedback
- `conversionError` - Supabase conversion errors

### WASM State (useSQL2PostgREST hook)
- `isLoading` - WASM loading status
- `isReady` - WASM initialized
- `error` - WASM error message
- `startLoading()` - Trigger WASM load

### Theme State (Context API)
- `theme` - "dark" | "light" | "system"
- `setTheme()` - Update theme
- Persisted to localStorage

---

## Data Flow

1. **Input**: User types SQL in CodeMirror
2. **State Update**: sqlQuery state changes
3. **User Action**: Clicks Convert button
4. **WASM Call**: convert(sqlQuery, baseURL)
5. **Processing**: Go WASM parses SQL → PostgREST
6. **Result**: PostgRESTRequest object returned
7. **State Update**: result state set
8. **Re-render**: UI displays output
9. **User Action**: Click Copy
10. **Clipboard**: navigator.clipboard.writeText()

---

## Key Technologies

### Frontend
- React 19.1.1 - Latest React
- TypeScript 5.9.3 - Type safety
- Vite 7.1.7 - Build tool
- Tailwind CSS 4.1 - Styling

### Editor
- CodeMirror 6.38 - Code editor
- @codemirror/lang-sql - SQL syntax
- GitHub theme - Light/dark

### Routing
- TanStack React Router 1.132 - File-based routing
- @tanstack/router-plugin - Auto-generated routes

### Components
- shadcn/ui - Component library
- Lucide React - Icons
- react-resizable-panels - Split pane

### Code Execution
- WebAssembly - sql2postgrest.wasm
- Go compiled to WASM

### Deployment
- Vite for build
- SST for AWS deployment
- CloudFront + S3

---

## SQL to PostgREST Conversion

### Supported SQL Operations

**SELECT**
- WHERE with AND/OR/NOT
- Column selection
- Ordering (ASC/DESC)
- LIMIT/OFFSET

**INSERT**
- Single/multiple rows
- UPSERT (ON CONFLICT)

**UPDATE**
- With WHERE conditions
- JSON operators

**DELETE**
- With WHERE conditions

### Supported Operators

Comparison: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`
Pattern: `like`, `ilike`
Null: `is`
Array: `in`, `cs`, `cd`, `ov`
Range: `sl`, `sr`, `nxl`, `nxr`, `adj`
Text Search: `fts`, `plfts`, `phfts`, `wfts`

### Example

**SQL Input:**
```sql
SELECT id, name FROM users 
WHERE age > 18 
ORDER BY created_at DESC 
LIMIT 10
```

**PostgREST Output:**
```json
{
  "method": "GET",
  "url": "http://localhost:3000/users?select=id,name&age.gt.18&order=created_at.desc&limit=10"
}
```

**Supabase JS Output:**
```javascript
supabase
  .from('users')
  .select('id,name')
  .gt('age', 18)
  .order('created_at', { ascending: false })
  .limit(10)
```

---

## Build & Deployment

### Development
```bash
npm install
npm run dev        # http://localhost:5173
```

### Production Build
```bash
npm run build      # Creates dist/ folder
npm run preview    # Preview build locally
```

### Deployment

**AWS (SST):**
```bash
npx sst deploy     # Deploys to AWS CloudFront + S3
```

**Vercel:**
```bash
vercel deploy      # Uses vercel.json config
```

---

## Performance Notes

- **Initial Bundle:** Smaller with code splitting
- **WASM Loading:** Lazy-loaded on first use
- **WASM Size:** 10.8 MB (1-2 MB gzipped)
- **Caching:** Browser caches WASM module
- **Route Splitting:** Separate JS for each route
- **React Compiler:** Optimizes re-renders

---

## Security Notes

- **No Backend Required:** All processing in browser
- **No Data Sent:** SQL never leaves client
- **XSS Protected:** Safe content handling
- **Clipboard API:** User-initiated only
- **WASM Sandboxed:** No filesystem/network access
- **GitHub Links:** rel="noopener noreferrer"

---

## Example Queries Included

1. Simple SELECT
2. Complex AND/OR conditions
3. Pattern matching (ILIKE)
4. Full-text search
5. JSON operators
6. Array operators
7. Range operators
8. INSERT single row
9. INSERT multiple rows
10. UPSERT (ON CONFLICT)
11. UPDATE simple
12. UPDATE with JSON
13. DELETE with conditions
14. IN operator
15. NOT & IS NULL

Access via Examples dropdown in UI.

---

## Common Tasks

### Add New Example Query
Edit `/src/routes/index.tsx` and `/src/routes/supabase.tsx`
Find `SQL_EXAMPLES` array and add new object:
```typescript
{
  label: 'Your Query Name',
  query: `SELECT * FROM table WHERE condition`
}
```

### Change Default Base URL
Edit `/src/routes/index.tsx` line 116:
```typescript
const [baseURL, setBaseURL] = useState('YOUR_URL_HERE');
```

### Modify Theme Colors
Edit `/src/index.css` for Tailwind color overrides

### Add New Route
Create `/src/routes/yourroute.tsx` and define Route component
Auto-generated in `routeTree.gen.ts`

### Test Conversions
```bash
npm run test       # Run Vitest tests
npm run test:ui    # Open test UI dashboard
```

---

## Troubleshooting

**WASM fails to load:**
- Check `/public/wasm/` directory exists
- Verify files: sql2postgrest.wasm, sql2postgrest.js, wasm_exec.js
- Check browser console for errors
- Try page reload

**Conversion returns null:**
- Check WASM is loaded (isReady = true)
- Verify SQL syntax is valid
- Check browser console for error
- Try simpler query first

**Copy to clipboard fails:**
- Check browser supports Clipboard API
- Verify click event triggers action
- Check browser permissions

**Dark mode not working:**
- Check localStorage isn't blocking storage
- Verify ThemeProvider wraps RouterProvider
- Check Tailwind dark: classes in HTML

---

## File Statistics

- **Total Lines of Code:** ~4,650 (TypeScript/TSX)
- **Components:** 8 main components
- **Routes:** 2 routes
- **Tests:** 38 tests (postgrestToSupabase.test.ts)
- **Documentation:** 3 markdown files

---

## Dependencies Overview

### Core (20 packages)
- react, react-dom
- typescript
- vite
- tailwindcss
- @tanstack/react-router

### UI (10 packages)
- @radix-ui components
- lucide-react
- class-variance-authority
- clsx, tailwind-merge

### Editor (7 packages)
- @uiw/react-codemirror
- @codemirror/lang-sql
- @codemirror/lang-javascript
- @uiw/codemirror-theme-github

### Dev (12 packages)
- babel-plugin-react-compiler
- eslint, typescript-eslint
- vitest

### Deployment (2 packages)
- sst
- vite-plugin-remove-console

**Total:** ~51 direct dependencies

---

## Performance Metrics

- **Page Load:** ~2-3 seconds (first time, WASM loading)
- **WASM Load:** ~1-2 seconds (10.8 MB uncompressed)
- **Conversion Time:** ~50-100ms per query
- **Build Size:** ~2-3 MB after gzip
- **Code Split:** 3 main bundles (main, index route, supabase route)

---

## Browser Support

Requires:
- WebAssembly support
- ES2022 JavaScript
- CSS Grid/Flexbox
- CSS Custom Properties

Supported:
- Chrome 57+ (WASM introduced)
- Firefox 52+
- Safari 11+
- Edge 15+

Not supported:
- Internet Explorer
- Old Safari versions
- Browsers without WASM

---

## Links

- **GitHub:** https://github.com/meech-ward/sql2postgrest
- **Live Demo:** https://sql2postg.rest
- **Multigres:** https://github.com/multigres/multigres (referenced in footer)

