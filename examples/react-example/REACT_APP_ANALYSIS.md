# SQL to PostgREST React Application - Comprehensive Analysis

## Executive Summary

The React example application is a sophisticated web-based SQL to PostgREST converter built with modern React 19, TypeScript, Vite, and Tailwind CSS. It provides an interactive interface for converting SQL queries into PostgREST API requests and optionally into Supabase JavaScript client code. The application leverages WebAssembly (WASM) for client-side query conversion, eliminating the need for a backend server.

**Key Statistics:**
- **Total Lines of Code:** ~4,650 lines of TypeScript/TSX
- **Component Count:** 8 main components
- **Routes:** 2 primary routes (PostgREST and Supabase)
- **Example Queries:** 15 pre-configured SQL examples
- **WASM Module Size:** ~10.8 MB (sql2postgrest.wasm)

---

## 1. Application Architecture & Structure

### 1.1 Directory Organization

```
react-example/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── resizable.tsx
│   │   │   └── textarea.tsx
│   │   ├── navbar.tsx       # Top navigation bar
│   │   ├── page-layout.tsx  # Page wrapper with gradient background
│   │   ├── mode-toggle.tsx  # Dark/light/system theme toggle
│   │   └── theme-provider.tsx # Theme context provider
│   ├── routes/              # TanStack Router file-based routes
│   │   ├── __root.tsx       # Root layout with navbar
│   │   ├── index.tsx        # PostgREST converter page
│   │   ├── supabase.tsx     # Supabase converter page
│   │   └── routeTree.gen.ts # Auto-generated route tree
│   ├── hooks/
│   │   └── useSQL2PostgREST.ts # WASM integration hook
│   ├── lib/                 # Utility functions and converters
│   │   ├── formatPostgRESTUrl.ts # URL formatting for display
│   │   ├── postgrestSyntax.ts    # CodeMirror syntax highlighting
│   │   ├── postgrestToSupabase.ts # PostgREST → Supabase JS converter
│   │   ├── utils.ts         # General utilities (cn helper)
│   │   └── pastelTheme.ts   # (Referenced but not shown)
│   ├── main.tsx             # React entry point
│   ├── index.css            # Tailwind & global styles
│   └── sst-env.d.ts         # SST environment types
├── public/
│   ├── wasm/
│   │   ├── sql2postgrest.wasm  # WASM module (compiled Go)
│   │   ├── sql2postgrest.js    # WASM loader JavaScript
│   │   └── wasm_exec.js        # Go WASM execution bridge
│   ├── favicon.svg
│   └── _headers
├── dist/                    # Built/compiled output
├── vite.config.ts           # Vite build configuration
├── tsconfig.app.json        # TypeScript configuration
├── package.json             # Dependencies
├── sst.config.ts            # Infrastructure (AWS deployment)
├── README.md                # Usage guide
├── DESIGN.md                # Design system documentation
└── POSTGREST_TO_SUPABASE.md # Conversion library documentation
```

### 1.2 Technology Stack

**Frontend Framework:**
- React 19.1.1 - Latest React with new features
- TypeScript 5.9.3 - Type-safe development
- Vite 7.1.7 - Modern build tool with HMR

**UI & Styling:**
- Tailwind CSS 4.1.14 - Utility-first CSS framework
- shadcn/ui - High-quality React component library
- Lucide React - Icon library
- class-variance-authority - CSS variant management

**Editor & Code:**
- CodeMirror 6.38+ - Code editor with syntax highlighting
- @codemirror/lang-sql - SQL syntax support
- @codemirror/lang-javascript - JavaScript/TypeScript highlighting
- @codemirror/lang-markdown - Markdown support
- @uiw/react-codemirror - React wrapper for CodeMirror
- GitHub theme for light/dark mode

**Routing & State:**
- TanStack React Router 1.132+ - File-based routing with type safety
- @tanstack/router-plugin - Vite plugin for auto-generated routes
- React Context API - Theme state management
- React Hooks - Component-level state

**Code Execution:**
- WebAssembly - Client-side SQL conversion (sql2postgrest.wasm)
- Go WASM - Compiled Go code running in browser

**Development & Build:**
- Babel React Compiler - Optimized component compilation
- ESLint - Code quality checking
- Vitest - Unit testing framework

**Deployment:**
- SST 3.17.14 - Infrastructure as Code (AWS)
- AWS StaticSite - CloudFront + S3 deployment
- Vercel JSON config - Alternative Vercel deployment

---

## 2. WASM Integration & Converter Hook

### 2.1 WASM Loading Architecture (`useSQL2PostgREST.ts`)

The `useSQL2PostgREST` hook manages the entire WASM lifecycle:

```
┌─────────────────────────────────────────────────────┐
│         React Component (routes/index.tsx)          │
└──────────────────┬──────────────────────────────────┘
                   │ uses
                   ▼
┌─────────────────────────────────────────────────────┐
│         useSQL2PostgREST Hook                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ loadWASM()                                    │  │
│  │  1. Check if already loaded (window flag)    │  │
│  │  2. Load wasm_exec.js (Go runtime)           │  │
│  │  3. Load sql2postgrest.js (WASM loader)      │  │
│  │  4. Wait 100ms for initialization            │  │
│  │  5. Instantiate SQL2PostgREST class          │  │
│  │  6. Load WASM module: sql2postgrest.wasm     │  │
│  │  7. Set isReady = true                       │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ convert(sql, baseURL)                         │  │
│  │  - Calls window.SQL2PostgREST.convert()      │  │
│  │  - Returns PostgRESTRequest object            │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  State:                                            │
│  - isLoading: boolean (loading state)              │
│  - isReady: boolean (WASM loaded & ready)          │
│  - error: string | null (error message)            │
│  - startLoading: () => void (trigger load)         │
└─────────────────────────────────────────────────────┘
                   │ returns
                   ▼
        PostgRESTRequest object
   { method, url, headers, body }
```

**Key Features:**
1. **Lazy Loading:** WASM loads only when needed (first render/interaction)
2. **Caching:** Checks `window.__wasmLoaded` to prevent duplicate loads
3. **Cache Busting:** Adds version parameter `?v=${WASM_VERSION}` to WASM URLs
4. **Error Handling:** Graceful error handling with retry capability
5. **Type Safety:** Full TypeScript support for converter interface

**WASM Files:**
- `wasm_exec.js` (17 KB) - Go's WASM execution environment
- `sql2postgrest.js` (2 KB) - JavaScript wrapper for WASM module
- `sql2postgrest.wasm` (10.8 MB) - Compiled Go converter logic

### 2.2 PostgRESTRequest Interface

```typescript
type PostgRESTRequest = {
  method: string;      // "GET", "POST", "PATCH", "DELETE"
  url: string;         // Full API URL with query parameters
  headers?: Record<string, string>; // Optional HTTP headers
  body?: any;          // Request body (for POST/PATCH)
}
```

---

## 3. UI Components & Component Hierarchy

### 3.1 Component Tree

```
<App (main.tsx)>
  │
  └─ <ThemeProvider>
      │
      └─ <RouterProvider>
          │
          └─ <__root route>
              │
              ├─ <Navbar>
              │  ├─ <Link> to="/"
              │  ├─ <Link> to="/supabase"
              │  └─ <ModeToggle>
              │     └─ <DropdownMenu>
              │
              └─ <Outlet>
                 │
                 ├─ Route: "/" → <Index>
                 │           └─ <PageLayout>
                 │               ├─ <ResizablePanelGroup>
                 │               │  ├─ <ResizablePanel> (SQL Input)
                 │               │  │  ├─ <DropdownMenu> (Examples)
                 │               │  │  ├─ <CodeMirror> (SQL Editor)
                 │               │  │  ├─ <input> (Base URL)
                 │               │  │  └─ <Button> (Convert)
                 │               │  │
                 │               │  └─ <ResizablePanel> (Output)
                 │               │     ├─ Method Badge
                 │               │     ├─ URL Display
                 │               │     ├─ CodeMirror (Parsed URL)
                 │               │     ├─ <pre> (JSON Output)
                 │               │     └─ <Button> (Copy)
                 │               │
                 │               └─ Mobile Grid (stacked layout)
                 │
                 └─ Route: "/supabase" → <Supabase>
                              └─ Similar layout with
                                 Supabase JS output instead
```

### 3.2 Component Details

#### **PageLayout Component**
- Wraps main content with decorative gradient background
- Features animated blur circles in background
- Header with database icon and title
- Footer with links to GitHub repositories
- Responsive padding and max-width container

**Key Properties:**
```typescript
interface PageLayoutProps {
  children: React.ReactNode;
  title: string; // "SQL to PostgREST Converter" or "SQL to Supabase"
}
```

#### **Navbar Component**
- Fixed positioning at top
- Links to both routes with active state styling
- Theme toggle dropdown (light/dark/system)
- Backdrop blur effect
- Responsive layout

#### **ModeToggle Component**
- Dropdown for theme selection
- Animated sun/moon icons with rotation
- Three options: Light, Dark, System
- Smooth transitions using transform CSS

#### **ThemeProvider Component**
- React Context-based theme management
- Persists selection to localStorage
- Updates document class for dark/light mode
- Supports system preference detection
- Hook: `useTheme()` returns `{ theme, setTheme }`

#### **UI Components (shadcn/ui)**
- **Button:** Multiple variants (default, destructive, outline, secondary, ghost, link)
- **Card:** Container components with sections (CardHeader, CardContent, etc.)
- **DropdownMenu:** Menu for examples and theme selection
- **Resizable:** Horizontal panel resizing for split-pane layout

---

## 4. Routes & Pages

### 4.1 Route Configuration (TanStack Router)

**File-Based Routing:**
- Routes defined by file structure in `src/routes/`
- Auto-generated `routeTree.gen.ts` file
- Type-safe navigation using `<Link>` component

**Routes:**
1. `/` (index.tsx) - PostgREST Converter
2. `/supabase` (supabase.tsx) - Supabase Converter

### 4.2 Index Route - PostgREST Converter

**Purpose:** Convert SQL queries to PostgREST API requests

**Features:**
1. **SQL Editor (Left Panel)**
   - CodeMirror with SQL syntax highlighting
   - Placeholder: "SELECT * FROM users WHERE age > 18 ORDER BY created_at DESC"
   - 15 pre-configured example queries via dropdown
   - Real-time syntax highlighting

2. **PostgREST Output (Right Panel)**
   - HTTP method badge (GET, POST, PATCH, DELETE)
   - Full endpoint URL display
   - Parsed URL with syntax highlighting
   - JSON representation of request
   - Copy-to-clipboard button with feedback

3. **Configuration**
   - Base URL input field (default: http://localhost:3000)
   - Convert button with loading state
   - Error handling with graceful degradation

**Example Queries Included:**
1. Simple SELECT with WHERE
2. Complex AND/OR conditions
3. Pattern matching (ILIKE)
4. Full-text search
5. JSON operators
6. Array operators
7. Range operators
8. INSERT (single & multiple rows)
9. UPSERT (ON CONFLICT)
10. UPDATE (simple & with JSON)
11. DELETE with conditions
12. IN operator
13. NOT & IS NULL

**Responsive Design:**
- Desktop: Two-column resizable layout
- Tablet/Mobile: Stacked vertical layout
- Breakpoint: `lg` (1024px)

### 4.3 Supabase Route - PostgREST to Supabase JS Converter

**Purpose:** Convert SQL → PostgREST → Supabase JavaScript client code

**Additional Features:**
- Same SQL input as PostgREST page
- Right panel shows generated Supabase client code
- JavaScript syntax highlighting (TypeScript mode)
- Error handling for conversion failures
- Copy button copies just the code (no JSON wrapper)

**Two-Step Conversion Process:**
1. SQL → PostgREST (via WASM)
2. PostgREST → Supabase JS (via `postgrestToSupabase()`)

---

## 5. SQL Query Processing Flow

### 5.1 User Interaction Flow

```
User Input
    ↓
┌───────────────────────────────┐
│ User types SQL in editor      │
│ SQL query stored in state     │
└───────────────────────────────┘
    ↓
┌───────────────────────────────┐
│ User clicks Convert button    │
│ OR presses Cmd/Ctrl + Enter   │
└───────────────────────────────┘
    ↓
┌───────────────────────────────┐
│ handleConvert() called        │
└───────────────────────────────┘
    ↓
┌───────────────────────────────┐
│ convert(sqlQuery, baseURL)    │
│ Hook calls WASM converter     │
└───────────────────────────────┘
    ↓
┌───────────────────────────────┐
│ WASM parses SQL               │
│ Validates query structure     │
│ Converts to PostgREST format  │
│ Returns PostgRESTRequest      │
└───────────────────────────────┘
    ↓
┌───────────────────────────────┐
│ Result state updated          │
│ UI re-renders with output     │
└───────────────────────────────┘
    ↓
┌───────────────────────────────┐
│ User can:                     │
│ 1. Copy JSON result           │
│ 2. Copy Supabase code (JS)    │
│ 3. Modify input and retry     │
└───────────────────────────────┘
```

### 5.2 Conversion Process Details

**SQL Input Examples:**
```sql
-- Simple SELECT
SELECT * FROM users WHERE age > 18

-- Complex with OR/AND
SELECT id, name FROM users 
WHERE (age >= 21 AND status = 'active') 
   OR (role = 'admin' AND verified = true)

-- INSERT
INSERT INTO users (name, email, age) 
VALUES ('John', 'john@example.com', 28)

-- UPDATE
UPDATE users SET status = 'inactive' WHERE age < 18

-- UPSERT
INSERT INTO inventory (product_id, quantity) 
VALUES (42, 100) 
ON CONFLICT (product_id) 
DO UPDATE SET quantity = EXCLUDED.quantity
```

**PostgREST Output:**
```json
{
  "method": "GET",
  "url": "http://localhost:3000/users?age.gt.18",
  "headers": {},
  "body": null
}
```

**Supabase JS Output:**
```typescript
supabase
  .from('users')
  .select('*')
  .gt('age', 18)
```

---

## 6. PostgREST to Supabase Conversion Library

### 6.1 Library Purpose & Features

**File:** `src/lib/postgrestToSupabase.ts` (382 lines)

**Function Signature:**
```typescript
function postgrestToSupabase(request: PostgRESTRequest): SupabaseClientCode {
  return {
    code: string,      // Generated TypeScript code
    language: 'typescript'
  }
}
```

### 6.2 Conversion Methods by Operation Type

#### **SELECT Queries**
```typescript
buildSelectQuery(tableName, searchParams)
  ├─ Parse table name from URL
  ├─ Handle select column list
  ├─ Process filters (eq, gt, like, ilike, etc.)
  ├─ Handle OR conditions
  ├─ Process ordering (asc/desc, nullsfirst/nullslast)
  ├─ Apply pagination (limit, offset, range)
  └─ Return formatted Supabase code
```

**Supported Operators:**
- Comparison: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`
- Pattern: `like`, `ilike`
- Null: `is`
- Array/Range: `in`, `cs`, `cd`, `ov`, `sl`, `sr`, `nxl`, `nxr`, `adj`
- Text Search: `fts`, `plfts`, `phfts`, `wfts`

**Example Conversion:**
```typescript
// Input URL
http://localhost:3000/users?select=id,name&age.gt.18&order=name.asc

// Output Code
supabase
  .from('users')
  .select('id,name')
  .gt('age', 18)
  .order('name', { ascending: true })
```

#### **INSERT Queries**
```typescript
buildInsertQuery(tableName, body, headers)
  ├─ Check for UPSERT flag (Prefer: resolution=merge-duplicates)
  ├─ Format body as JSON
  ├─ Use .upsert() or .insert() accordingly
  ├─ Check return preference
  └─ Add .select() if needed
```

**Features:**
- Single row inserts
- Multiple row inserts
- UPSERT with conflict resolution
- Optional return selection

#### **UPDATE Queries**
```typescript
buildUpdateQuery(tableName, body, searchParams, headers)
  ├─ Format update payload as JSON
  ├─ Parse WHERE conditions from search params
  ├─ Build filter chain
  ├─ Check return preference
  └─ Add .select() if needed
```

#### **DELETE Queries**
```typescript
buildDeleteQuery(tableName, searchParams)
  ├─ Parse table name
  ├─ Build filter conditions
  └─ Return delete code with filters
```

#### **RPC Calls**
```typescript
buildRPCQuery(functionName, body, searchParams)
  ├─ Extract function name
  ├─ Format parameters as JSON
  ├─ Handle additional filters
  └─ Support ordering and pagination
```

### 6.3 Filter Parsing

**Filter Detection:**
```typescript
parseFilter(key, value)
  ├─ Check if operator is in key (column.operator=value)
  ├─ Check if operator is in value (column=operator.value)
  ├─ Default to equality if no operator found
  └─ Map operator to Supabase method
```

**Examples:**
```
URL param: age.gt.18
Parsed: column='age', operator='gt', value='18'
Output: .gt('age', 18)

URL param: name=John
Parsed: column='name', operator='eq', value='John'
Output: .eq('name', 'John')

URL param: tags.cs.[javascript,react]
Parsed: column='tags', operator='cs', value='[javascript,react]'
Output: .contains('tags', '[javascript,react]')
```

### 6.4 Value Formatting

**Type Detection:**
- Numbers: Parsed as numeric literals
- Booleans: Recognized `true`/`false`
- Null: Converted to `null` keyword
- JSON: Preserved as-is (objects/arrays)
- Strings: Quoted and escaped
- URI-encoded: Decoded first

**Example:**
```typescript
formatValue("42") → 42
formatValue("true") → true
formatValue("null") → null
formatValue("John") → 'John'
formatValue("hello%20world") → 'hello world'
```

---

## 7. URL Formatting & Display

### 7.1 PostgREST URL Formatter (`formatPostgRESTUrl.ts`)

**Purpose:** Pretty-print PostgREST URLs for better readability in UI

**Input:**
```
http://localhost:3000/users?select=id,name,email,created_at&age.gte.21&order=name.asc&limit=20
```

**Output:**
```
http://localhost:3000/users?
  select=id,name,email,created_at
  &age.gte.21
  &order=name.asc
  &limit=20
```

### 7.2 Nested Parameter Formatting

**Complex Structures:**

Input:
```
select=id,name,posts(id,title,comments(id,text))
```

Output (formatted):
```
select=id,
  name,
  posts(
    id,
    title,
    comments(
      id,
      text
    )
  )
```

**Algorithm:**
1. Scan character by character
2. Track nesting depth with parentheses
3. Insert newlines and indentation at logical points
4. Handle commas and closing parentheses
5. Preserve semantic meaning

---

## 8. Syntax Highlighting & Editor Integration

### 8.1 CodeMirror Configuration

**SQL Editor Setup:**
```typescript
<CodeMirror
  value={sqlQuery}
  onChange={(value) => setSQLQuery(value)}
  theme={isDark ? githubDark : githubLight}
  extensions={[sqlLang()]}
  editable={isReady}
  basicSetup={{
    lineNumbers: true,
    highlightActiveLineGutter: true,
    highlightActiveLine: false,
    foldGutter: false,
    allowMultipleSelections: true,
    autocompletion: true,
  }}
  minHeight="100px"
/>
```

**Features:**
- Line numbers
- SQL syntax highlighting
- Auto-completion
- Multi-line selection
- Light/dark themes (GitHub)

### 8.2 PostgREST URL Syntax Highlighter

**File:** `src/lib/postgrestSyntax.ts` (244 lines)

**Custom Language Definition:**
- Token types mapped to CodeMirror classes
- SQL-consistent highlighting for consistency

**Token Types:**
- `keyword` - PostgREST operators (eq, gt, order, etc.)
- `variableName` - Column names, filter parameters
- `function` - Aggregate functions (count(), sum())
- `property` - Alias names (after `:`)
- `string` - String values, wildcards, dates
- `number` - Numeric values
- `operator` - `=`, `&`, `:`
- `bracket` - Parentheses
- `punctuation` - Commas, dots
- `link` - URLs, domains
- `atom` - Booleans, null values

**Examples:**
```
URL: http://localhost:3000/users?age.gt.18&name=John

Highlighting:
- "http://localhost:3000/users" → link
- "age" → variableName
- "gt" → keyword
- "18" → number
- "name" → variableName
- "John" → string
```

---

## 9. State Management & Data Flow

### 9.1 Component State Management

**Route: `/` (PostgREST Converter)**

```typescript
// SQL Editor State
const [sqlQuery, setSQLQuery] = useState(
  'SELECT * FROM users WHERE age > 18'
);

// Configuration State
const [baseURL, setBaseURL] = useState('http://localhost:3000');

// Result State
const [result, setResult] = useState<PostgRESTRequest | null>(null);

// UI State
const [copied, setCopied] = useState(false);

// WASM State (from hook)
const { convert, isLoading, isReady, error, startLoading } = useSQL2PostgREST();
```

**State Transitions:**
```
Initial:
  sqlQuery = default example
  baseURL = 'http://localhost:3000'
  result = null
  isReady = false (loading WASM)
    ↓
After WASM Load:
  isReady = true
    ↓
User Clicks Convert:
  isLoading = true
  convert(sqlQuery, baseURL)
    ↓
WASM Returns:
  result = PostgRESTRequest
  isLoading = false
    ↓
User Clicks Copy:
  copied = true
  setTimeout(..., 2000) → copied = false
```

### 9.2 Theme Context (Context API)

**ThemeProvider State:**
```typescript
type ThemeProviderState = {
  theme: Theme; // "dark" | "light" | "system"
  setTheme: (theme: Theme) => void;
};
```

**Persistence:**
```
User selects theme
  ↓
localStorage.setItem("sql2postgrest-theme", theme)
setTheme(theme)
  ↓
useEffect updates DOM:
document.documentElement.classList.add(theme)
```

**System Detection:**
```typescript
if (theme === "system") {
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  document.documentElement.classList.add(systemTheme);
}
```

### 9.3 Data Flow Diagram

```
User Input
    ↓
Component State (React)
    │
    ├─ sqlQuery (controlled input)
    ├─ baseURL (controlled input)
    ├─ result (conversion output)
    ├─ copied (UI feedback)
    ├─ isReady (WASM status)
    └─ error (WASM error)
    ↓
Event Handlers
    │
    ├─ handleConvert() → convert(sql, url)
    ├─ handleCopy() → clipboard.writeText()
    └─ startLoading() → loadWASM()
    ↓
WASM Converter
    │
    └─ SQL → PostgRESTRequest
    ↓
UI Renders
    │
    ├─ Editor with syntax highlighting
    ├─ Output display with badges
    ├─ Copy feedback
    └─ Loading states
    ↓
Optional: Supabase Route
    │
    └─ postgrestToSupabase() converter
    ↓
Final Output
```

---

## 10. Build Process & Configuration

### 10.1 Vite Configuration

**File:** `vite.config.ts`

**Plugins:**
```typescript
tanstackRouter({
  target: 'react',
  autoCodeSplitting: true,
})
// Auto-generates routeTree.gen.ts for type-safe routing

react({
  babel: {
    plugins: [["babel-plugin-react-compiler"]],
  },
})
// React 19 compiler for performance optimization

tailwindcss()
// Direct Vite integration for Tailwind

removeConsole()
// Strips console.log in production
```

**Path Alias:**
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
// Allows import { Button } from "@/components/ui/button"
```

### 10.2 TypeScript Configuration

**Target:** ES2022 (modern JavaScript)
**Module:** ESNext
**JSX:** react-jsx (automatic runtime)
**Path Alias:** `@/*` → `./src/*`

**Strict Options:**
- `strict: true` - Full type checking
- `noUnusedLocals: true` - Error on unused variables
- `noUnusedParameters: true` - Error on unused params
- `noFallthroughCasesInSwitch: true` - Require break in switch

### 10.3 Build Commands

```bash
# Development (HMR enabled)
npm run dev

# Type check and build
npm run build

# Preview production build locally
npm run preview

# Lint code
npm run lint

# Run tests
npm run test

# UI for tests
npm run test:ui
```

**Build Output:**
- `dist/` folder with optimized HTML/CSS/JS
- WASM files included in dist/
- Code splitting for routes
- Asset hashing for cache busting

### 10.4 Deployment Configuration

**SST Config (`sst.config.ts`):**
```typescript
new sst.aws.StaticSite("SQL2PostgREST", {
  build: {
    command: "bun run build",
    output: "dist"
  },
  domain: {
    name: $app.stage === "production" 
      ? "sql2postg.rest" 
      : `${$app.stage}.sql2postg.rest`,
  },
});
```

**Features:**
- CloudFront CDN distribution
- S3 static file hosting
- Automatic HTTPS
- Domain management
- Stage-based URLs (dev, staging, production)

**Alternative:** Vercel deployment via `vercel.json`

---

## 11. Component Interaction Flows

### 11.1 Example Query Selection Flow

```
User clicks "Examples" dropdown
    ↓
DropdownMenu opens showing 15 queries
    ↓
User clicks "Complex WHERE with AND/OR"
    ↓
DropdownMenuItem onClick triggered
    ↓
setSQLQuery(example.query) called
    ↓
sqlQuery state updated
    ↓
CodeMirror editor updates with new SQL
    ↓
User can now click Convert or press Cmd+Enter
```

### 11.2 Copy to Clipboard Flow

```
User clicks "Copy JSON" button
    ↓
handleCopy() called
    ↓
navigator.clipboard.writeText(
  JSON.stringify(result, null, 2)
) invoked
    ↓
Promise resolves
    ↓
setCopied(true)
    ↓
Button text changes to "Copied ✓"
    ↓
setTimeout after 2 seconds
    ↓
setCopied(false)
    ↓
Button reverts to "Copy JSON"
```

### 11.3 Theme Toggle Flow

```
User clicks theme toggle button
    ↓
ModeToggle dropdown opens
    ↓
User selects "Dark" mode
    ↓
DropdownMenuItem onClick → setTheme("dark")
    ↓
ThemeProvider.setTheme():
  ├─ localStorage.setItem("sql2postgrest-theme", "dark")
  └─ Call setTheme("dark")
    ↓
useEffect triggered (theme dependency)
    ↓
document.documentElement.classList.remove("light", "dark")
document.documentElement.classList.add("dark")
    ↓
Tailwind CSS applies dark: prefixed styles
    ↓
CodeMirror theme changes (githubDark)
    ↓
All UI components re-render with dark colors
```

### 11.4 WASM Loading Sequence

```
Component mounts
    ↓
useSQL2PostgREST hook initializes
    ↓
useEffect in route triggers startLoading()
    ↓
loadWASM() called
    ↓
loadingStarted.current check prevents duplicate loads
    ↓
Promise.all([
  loadScript("/wasm/wasm_exec.js"),
  loadScript("/wasm/sql2postgrest.js")
])
    ↓
Wait 100ms for initialization
    ↓
new window.SQL2PostgREST()
    ↓
converterInstance.load("/wasm/sql2postgrest.wasm")
    ↓
window.__wasmLoaded = true
    ↓
setIsReady(true)
    ↓
Convert button becomes enabled
    ↓
User can interact with converter
```

---

## 12. Error Handling & Edge Cases

### 12.1 WASM Loading Errors

**Scenario:** WASM file fails to load
```typescript
if (wasmError) {
  return (
    <Card className="max-w-md">
      <CardTitle className="text-destructive">Failed to load WASM</CardTitle>
      <CardDescription>{wasmError}</CardDescription>
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </Card>
  );
}
```

**Error Message:** Displayed in red card with retry button

### 12.2 Conversion Errors

**Scenario:** Invalid SQL query
```typescript
const convert = useCallback(
  (sql: string, baseURL: string = 'http://localhost:3000'): PostgRESTRequest | null => {
    if (!isReady || !converter) {
      return null;
    }

    try {
      const result = converter.convert(sql, baseURL);
      return result;
    } catch (err) {
      console.error('Conversion error:', err);
      return null;
    }
  },
  [isReady, converter]
);
```

**Behavior:** Returns `null`, UI shows "Your converted request will appear here"

### 12.3 Supabase Conversion Errors

**Scenario:** PostgREST → Supabase conversion fails
```typescript
const [conversionError, setConversionError] = useState<string | null>(null);

try {
  return postgrestToSupabase(result).code;
} catch (err) {
  setConversionError(err instanceof Error ? err.message : 'Failed to convert');
  return JSON.stringify(result, null, 2);
}
```

**UI Display:** Red error box with error message

### 12.4 Clipboard Errors

**Scenario:** Clipboard write fails
```typescript
try {
  await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
} catch (err) {
  console.error('Failed to copy:', err);
}
```

**Fallback:** Error logged to console (no user notification in current implementation)

---

## 13. Performance Considerations

### 13.1 Code Splitting

**TanStack Router Auto Code Splitting:**
```
dist/
├── index.html
├── assets/
│   ├── index-xxxxx.js (main bundle)
│   ├── routes/index-xxxxx.js (PostgREST route)
│   ├── routes/supabase-xxxxx.js (Supabase route)
│   ├── index.css (Tailwind)
│   └── index-xxxxx.css (additional styles)
├── wasm/
│   ├── sql2postgrest.wasm
│   ├── sql2postgrest.js
│   └── wasm_exec.js
```

**Benefits:**
- Smaller initial bundle
- Lazy-loaded routes
- WASM loaded on demand

### 13.2 React Compiler Optimization

**Babel Plugin:** `babel-plugin-react-compiler`
- Automatic component memoization
- Optimized re-render logic
- Reduced unnecessary renders

### 13.3 Image & Asset Optimization

- Favicon in SVG (scalable)
- No large images in CSS (gradients only)
- Tailwind CSS purges unused styles
- Production build removes console.log

### 13.4 WASM Module Size

**sql2postgrest.wasm:** 10.8 MB (uncompressed)
- Gzip: ~1-2 MB (typical)
- Only loaded once on first use
- Cached by browser
- Not blocking initial page load

**Optimization:** Consider splitting WASM if size becomes issue

### 13.5 Editor Performance

**CodeMirror:**
- Lightweight and performant
- Syntax highlighting doesn't block UI
- Lazy loading with Suspense fallback

---

## 14. Security Considerations

### 14.1 XSS Prevention

**Trusted Content:**
- All user input from SQL editor is displayed as text
- JSON output in `<pre>` tag (safe)
- CodeMirror handles markup safely

**URL Handling:**
```typescript
// Safe URL construction
const urlObj = new URL(baseURL + '/users?...');
```

**GitHub Links:**
```tsx
<a
  href="https://github.com/meech-ward/sql2postgrest"
  target="_blank"
  rel="noopener noreferrer"
>
```
- `rel="noopener noreferrer"` prevents window access

### 14.2 Clipboard Access

**Browser Permission:**
```typescript
await navigator.clipboard.writeText(data);
```
- Requires user interaction (button click)
- Secure API with permission checks

### 14.3 WASM Execution

**Isolated Execution:**
- WASM runs in sandbox
- No access to filesystem
- No network access
- Only data parameter passed in

### 14.4 No Backend Required

**Security Advantage:**
- SQL converted entirely in browser
- No data sent to server
- No authentication needed
- Privacy-focused approach

---

## 15. Browser Compatibility

**Requirements:**
- WebAssembly support
- ES2022 JavaScript features
- CSS Custom Properties
- Flexbox & Grid

**Supported Browsers:**
- Chrome/Edge 57+ (WASM introduced)
- Firefox 52+
- Safari 11+
- No IE11 support

**Feature Detection:**
```javascript
if (!window.WebAssembly) {
  // Fallback or error message
}
```

---

## 16. Testing Infrastructure

### 16.1 Vitest Configuration

**File:** `vitest.config.ts`
**Framework:** Vitest (Vite-native testing)

**Test Command:**
```bash
npm run test          # Run tests
npm run test:ui       # Open test UI dashboard
```

### 16.2 Existing Tests

**File:** `src/lib/postgrestToSupabase.test.ts` (456 lines)

**Coverage:**
- 38 comprehensive tests
- 21 SELECT query tests (including OR conditions)
- 4 INSERT query tests
- 2 UPDATE query tests
- 2 DELETE query tests
- 5 Edge case tests
- 4 Real-world example tests

**Status:** All tests passing

---

## 17. Future Enhancement Opportunities

### 17.1 Potential Features

1. **Query Saving/History**
   - localStorage to save recent queries
   - Star favorites
   - Share query URLs

2. **Advanced Visualization**
   - Schema explorer
   - Visual query builder
   - Entity relationship diagrams

3. **More Output Formats**
   - cURL commands
   - Fetch API JavaScript
   - Python requests
   - SQL to REST API diagram

4. **Real API Testing**
   - Connect to PostgREST server
   - Execute queries directly
   - Show mock results

5. **Batch Operations**
   - Convert multiple queries
   - Export as file
   - Format as API collection (Postman/Insomnia)

6. **Keyboard Shortcuts**
   - Cmd/Ctrl + Enter to convert
   - Cmd/Ctrl + K for command palette
   - Tab management

### 17.2 Performance Improvements

1. **WASM Optimization**
   - Reduce binary size (tinygo compiler)
   - Lazy load for specific features
   - Web Worker for background conversion

2. **Caching**
   - Cache conversion results
   - Memoize URL formatting

3. **Partial Results**
   - Stream results for large outputs
   - Virtual scrolling for long results

---

## 18. Key Design Patterns Used

### 18.1 React Patterns

1. **Custom Hooks:**
   - `useSQL2PostgREST()` - WASM integration abstraction

2. **Context API:**
   - `ThemeProvider` - Global theme state
   - `useTheme()` - Theme consumption hook

3. **Suspense:**
   - Fallback UI while CodeMirror loads
   - Fallback while WASM initializes

4. **Controlled Components:**
   - CodeMirror with controlled `value` prop
   - Input elements with state binding

5. **Composition:**
   - PageLayout wraps page content
   - Component reuse (Navbar, ModeToggle)

### 18.2 UI/UX Patterns

1. **Split-Pane Layout:**
   - Resizable panels for input/output
   - Responsive stacking on mobile

2. **Progressive Disclosure:**
   - Examples in dropdown (hidden by default)
   - Theme options in menu

3. **Feedback Patterns:**
   - Loading spinners during conversion
   - Copy button state change
   - Error display cards

4. **Accessible Design:**
   - ARIA labels
   - Semantic HTML
   - Keyboard navigation support

### 18.3 Architecture Patterns

1. **Separation of Concerns:**
   - Routes for pages
   - Components for UI
   - Hooks for logic
   - Lib for utilities

2. **Error Boundaries:**
   - Try-catch in WASM loader
   - Graceful error display
   - Retry mechanisms

3. **State Management:**
   - Local state for UI
   - Context for theme
   - Hook for WASM

---

## 19. File Structure Summary

**Total Project Size:** ~4,650 lines of TypeScript/TSX

```
Key Files by Responsibility:

User Interface (60%):
├── src/routes/index.tsx (644 lines)
├── src/routes/supabase.tsx (602 lines)
├── src/components/ (UI components)
└── src/index.css (styling)

Business Logic (25%):
├── src/lib/postgrestToSupabase.ts (382 lines)
├── src/lib/formatPostgRESTUrl.ts (135 lines)
├── src/lib/postgrestSyntax.ts (244 lines)
└── src/hooks/useSQL2PostgREST.ts (123 lines)

Infrastructure (10%):
├── vite.config.ts
├── tsconfig.app.json
├── package.json
└── sst.config.ts

Testing (5%):
└── src/lib/postgrestToSupabase.test.ts (456 lines)
```

---

## 20. Deployment & Hosting

### 20.1 Development Environment

**Local Development:**
```bash
npm install    # Install dependencies
npm run dev    # Start dev server (http://localhost:5173)
```

**Features:**
- HMR (Hot Module Replacement)
- Fast rebuild times
- Full source maps for debugging

### 20.2 Production Build

**Build Process:**
```bash
npm run build  # TypeScript + Vite build
```

**Output:**
- Optimized bundles
- Minified CSS/JS
- Asset hashing
- Source maps (optional)

**Built Artifacts:**
```
dist/
├── index.html (entry point)
├── assets/
│   ├── JS bundles (code-split)
│   └── CSS bundles (Tailwind)
└── wasm/
    ├── sql2postgrest.wasm
    ├── sql2postgrest.js
    └── wasm_exec.js
```

### 20.3 Deployment Platforms

**Primary: AWS (SST)**
- StaticSite with CloudFront
- S3 backend storage
- Route 53 DNS
- Production domain: sql2postg.rest

**Alternative: Vercel**
- Configured in vercel.json
- Auto-deploy on git push
- Global edge network

**Hosting Options:**
- Netlify
- GitHub Pages (via Actions)
- Any static host (Surge, etc.)

### 20.4 Environment Management

**Stage Management:**
```typescript
$app.stage === "production" 
  ? "sql2postg.rest" 
  : `${$app.stage}.sql2postg.rest`
```

- Production: sql2postg.rest
- Staging: staging.sql2postg.rest
- Dev: dev.sql2postg.rest

---

## Summary

This React application is a sophisticated, production-ready web tool for converting SQL queries to PostgREST API requests and Supabase JavaScript code. It demonstrates:

1. **Modern Web Architecture** - React 19, TypeScript, Vite, Tailwind
2. **WASM Integration** - Client-side SQL parsing with no backend
3. **Advanced UI** - Split-pane editor, syntax highlighting, responsive design
4. **Comprehensive Conversion** - SQL to multiple output formats
5. **Professional UX** - Dark/light themes, loading states, error handling
6. **Best Practices** - Type safety, component composition, performance optimization
7. **Scalable Deployment** - Infrastructure as Code with SST

The application successfully bridges SQL and modern API architectures, providing developers with an essential tool for PostgreSQL-based API development.

