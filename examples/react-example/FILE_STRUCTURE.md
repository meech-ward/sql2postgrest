# Complete React App File Structure

## Directory Tree

```
examples/react-example/
│
├── src/                              # Source code (4,650 lines total)
│   │
│   ├── routes/                       # TanStack Router file-based routes
│   │   ├── __root.tsx               # Root layout (12 lines)
│   │   │   ├─ Fixed navbar at top
│   │   │   └─ Outlet for page content
│   │   │
│   │   ├── index.tsx                # PostgREST converter (644 lines)
│   │   │   ├─ SQL editor (left panel, CodeMirror)
│   │   │   ├─ PostgREST output (right panel)
│   │   │   ├─ Method badge, URL, JSON display
│   │   │   ├─ 15 example queries dropdown
│   │   │   ├─ Copy button with feedback
│   │   │   ├─ Base URL configuration
│   │   │   ├─ Responsive layout (resizable on desktop, stacked mobile)
│   │   │   └─ WASM integration via useSQL2PostgREST hook
│   │   │
│   │   ├── supabase.tsx             # Supabase converter (602 lines)
│   │   │   ├─ SQL input (same as index)
│   │   │   ├─ Supabase JS output (right panel)
│   │   │   ├─ Error handling for conversion
│   │   │   ├─ Two-step: SQL → PostgREST → Supabase
│   │   │   └─ JavaScript syntax highlighting
│   │   │
│   │   └── routeTree.gen.ts         # Auto-generated route tree
│   │       └─ Type-safe route definitions
│   │
│   ├── hooks/                        # Custom React hooks
│   │   └── useSQL2PostgREST.ts      # WASM integration (123 lines)
│   │       ├─ WASM loading state management
│   │       ├─ loadWASM() function
│   │       ├─ convert() function
│   │       ├─ Error handling with retry
│   │       ├─ Cache busting with version params
│   │       └─ Returns: { convert, isLoading, isReady, error, startLoading }
│   │
│   ├── components/                  # React components
│   │   ├── navbar.tsx               # Navigation bar (37 lines)
│   │   │   ├─ Fixed positioning
│   │   │   ├─ Links to / and /supabase
│   │   │   ├─ Active state styling
│   │   │   └─ Theme toggle button
│   │   │
│   │   ├── page-layout.tsx          # Page wrapper (56 lines)
│   │   │   ├─ Gradient background
│   │   │   ├─ Animated blur circles
│   │   │   ├─ Header with database icon
│   │   │   ├─ Title passed as prop
│   │   │   ├─ Footer with GitHub links
│   │   │   └─ Responsive container
│   │   │
│   │   ├── theme-provider.tsx       # Theme context (73 lines)
│   │   │   ├─ ThemeProvider component
│   │   │   ├─ useTheme() hook
│   │   │   ├─ localStorage persistence
│   │   │   ├─ System preference detection
│   │   │   └─ DOM class manipulation
│   │   │
│   │   ├── mode-toggle.tsx          # Theme toggle (56 lines)
│   │   │   ├─ Dropdown menu
│   │   │   ├─ Light/Dark/System options
│   │   │   ├─ Animated sun/moon icons
│   │   │   └─ Smooth transitions
│   │   │
│   │   └── ui/                      # shadcn/ui components
│   │       ├── button.tsx           # Button component (61 lines)
│   │       │   ├─ Multiple variants
│   │       │   ├─ Size options
│   │       │   └─ Radix UI Slot integration
│   │       │
│   │       ├── card.tsx             # Card component
│   │       │   ├─ CardHeader
│   │       │   ├─ CardTitle
│   │       │   ├─ CardDescription
│   │       │   └─ CardContent
│   │       │
│   │       ├── dropdown-menu.tsx    # Dropdown menu
│   │       │   ├─ DropdownMenuTrigger
│   │       │   ├─ DropdownMenuContent
│   │       │   ├─ DropdownMenuItem
│   │       │   └─ DropdownMenuSeparator
│   │       │
│   │       ├── resizable.tsx        # Resizable panels
│   │       │   ├─ ResizablePanelGroup
│   │       │   ├─ ResizablePanel
│   │       │   └─ ResizableHandle
│   │       │
│   │       └── textarea.tsx         # Textarea component
│   │
│   ├── lib/                         # Utility functions & converters
│   │   ├── postgrestToSupabase.ts   # PostgREST → Supabase (382 lines)
│   │   │   ├─ postgrestToSupabase() main function
│   │   │   ├─ buildSelectQuery() - SELECT conversions
│   │   │   ├─ buildInsertQuery() - INSERT/UPSERT conversions
│   │   │   ├─ buildUpdateQuery() - UPDATE conversions
│   │   │   ├─ buildDeleteQuery() - DELETE conversions
│   │   │   ├─ buildRPCQuery() - RPC conversions
│   │   │   ├─ parseFilter() - Filter operator parsing
│   │   │   ├─ formatValue() - Type detection & formatting
│   │   │   └─ formatBodyValue() - JSON body formatting
│   │   │
│   │   ├── formatPostgRESTUrl.ts    # URL pretty-printer (135 lines)
│   │   │   ├─ formatPostgRESTUrl() - Main function
│   │   │   └─ formatNestedParameter() - Nested structure formatting
│   │   │
│   │   ├── postgrestSyntax.ts       # CodeMirror syntax (244 lines)
│   │   │   ├─ postgrestUrlParser - Custom stream parser
│   │   │   ├─ Token type definitions
│   │   │   ├─ Operator recognition
│   │   │   ├─ Value formatting rules
│   │   │   └─ postgrestUrl language definition
│   │   │
│   │   ├── utils.ts                 # Utility functions (6 lines)
│   │   │   └─ cn() - Tailwind class merger
│   │   │
│   │   └── pastelTheme.ts           # Theme definition
│   │
│   ├── main.tsx                     # React app entry point (23 lines)
│   │   ├─ StrictMode wrapper
│   │   ├─ ThemeProvider setup
│   │   ├─ RouterProvider setup
│   │   └─ Root DOM mount
│   │
│   ├── index.css                    # Global styles
│   │   ├─ Tailwind imports
│   │   └─ Custom CSS rules
│   │
│   └── sst-env.d.ts                 # SST environment types
│
├── public/                           # Static assets
│   ├── wasm/
│   │   ├── sql2postgrest.wasm       # WASM module (10.8 MB)
│   │   │   └─ Compiled Go code for SQL conversion
│   │   │
│   │   ├── sql2postgrest.js         # WASM loader (2 KB)
│   │   │   └─ JavaScript wrapper for WASM instantiation
│   │   │
│   │   └── wasm_exec.js             # Go WASM runtime (17 KB)
│   │       └─ Enables Go code to run in browser
│   │
│   ├── favicon.svg                  # Website icon
│   ├── vite.svg                     # Vite logo
│   └── _headers                     # HTTP headers for deployment
│
├── dist/                            # Built output (generated by npm run build)
│   ├── index.html                   # Compiled HTML
│   ├── assets/                      # Minified JS/CSS bundles
│   │   ├── index-xxxxx.js           # Main bundle
│   │   ├── routes/index-xxxxx.js    # PostgREST route
│   │   ├── routes/supabase-xxxxx.js # Supabase route
│   │   ├── index-xxxxx.css          # Main styles
│   │   └── index-xxxxx.css          # Additional styles
│   │
│   └── wasm/                        # WASM files included
│       ├── sql2postgrest.wasm
│       ├── sql2postgrest.js
│       └── wasm_exec.js
│
├── .sst/                            # SST generated files
│   └── platform/config.d.ts         # Type definitions
│
├── .tanstack/                       # TanStack Router config
│   └── router.json                  # Router configuration
│
├── .gitignore                       # Git ignore rules
├── eslint.config.js                 # ESLint configuration
├── components.json                  # shadcn/ui config
│
├── vite.config.ts                   # Vite build config (28 lines)
│   ├─ TanStack Router plugin
│   ├─ React plugin with compiler
│   ├─ Tailwind CSS plugin
│   ├─ Remove console plugin
│   └─ Path alias (@/)
│
├── tsconfig.json                    # TypeScript base config
│
├── tsconfig.app.json                # TypeScript app config (39 lines)
│   ├─ Target: ES2022
│   ├─ Module: ESNext
│   ├─ JSX: react-jsx
│   ├─ Strict mode: true
│   └─ Path alias: @/* → ./src/*
│
├── tsconfig.node.json               # TypeScript Node config
│
├── package.json                     # Dependencies & scripts (57 lines)
│   ├─ Scripts:
│   │   ├─ dev - Start dev server
│   │   ├─ build - Compile & build
│   │   ├─ preview - Preview build
│   │   ├─ test - Run tests
│   │   ├─ test:ui - Test UI dashboard
│   │   └─ lint - ESLint check
│   │
│   ├─ Dependencies (20 packages)
│   │   ├─ react, react-dom
│   │   ├─ @tanstack/react-router
│   │   ├─ tailwindcss
│   │   ├─ @codemirror/* (editors)
│   │   ├─ @radix-ui/* (UI primitives)
│   │   └─ lucide-react (icons)
│   │
│   └─ DevDependencies (12 packages)
│       ├─ typescript
│       ├─ vite
│       ├─ vitest
│       ├─ eslint
│       └─ babel-plugin-react-compiler
│
├── package-lock.json                # Dependency lock file
│
├── sst.config.ts                    # Infrastructure as Code (30 lines)
│   ├─ AWS app configuration
│   ├─ StaticSite resource
│   ├─ CloudFront distribution
│   ├─ S3 backend
│   └─ Route 53 domain management
│
├── sst-env.d.ts                     # SST environment types
│
├── vercel.json                      # Vercel deployment config
│   └─ Alternative to SST for Vercel
│
├── vitest.config.ts                 # Vitest testing config (3 lines)
│
├── README.md                        # Project documentation
│   ├─ Features overview
│   ├─ Quick start guide
│   ├─ Usage instructions
│   ├─ Tech stack
│   ├─ Project structure
│   ├─ Customization guide
│   ├─ Deployment instructions
│   └─ Browser support
│
├── DESIGN.md                        # Design system documentation
│   ├─ Color palette
│   ├─ Layout grid
│   ├─ Typography
│   ├─ Components used
│   ├─ Interactions
│   └─ Spacing system
│
├── POSTGREST_TO_SUPABASE.md         # Conversion library docs
│   ├─ Library overview (38 tests)
│   ├─ Feature list
│   ├─ Test results
│   ├─ Implementation details
│   ├─ Usage examples
│   └─ Conversion examples
│
├── REACT_APP_ANALYSIS.md            # Comprehensive analysis (1,498 lines)
│   ├─ Architecture overview
│   ├─ WASM integration
│   ├─ Component hierarchy
│   ├─ Data flow
│   ├─ State management
│   ├─ Build process
│   └─ Security & performance
│
└── QUICK_REFERENCE.md               # Quick lookup guide (442 lines)
    ├─ Key files
    ├─ Architecture
    ├─ Component hierarchy
    ├─ State management
    ├─ SQL conversion examples
    ├─ Common tasks
    ├─ Troubleshooting
    └─ Performance metrics
```

## Line Counts by Category

### Source Code
- routes/index.tsx: 644 lines
- routes/supabase.tsx: 602 lines
- lib/postgrestToSupabase.ts: 382 lines
- lib/postgrestSyntax.ts: 244 lines
- lib/formatPostgRESTUrl.ts: 135 lines
- hooks/useSQL2PostgREST.ts: 123 lines
- components/*: ~200 lines
- Other: ~120 lines
- **Total Source: ~2,450 lines**

### Tests
- lib/postgrestToSupabase.test.ts: 456 lines
- **Total Tests: 456 lines**

### Configuration
- vite.config.ts: 28 lines
- tsconfig.app.json: 39 lines
- sst.config.ts: 30 lines
- package.json: 57 lines
- Other configs: ~50 lines
- **Total Config: ~200 lines**

### Documentation
- REACT_APP_ANALYSIS.md: 1,498 lines
- QUICK_REFERENCE.md: 442 lines
- POSTGREST_TO_SUPABASE.md: 186 lines
- DESIGN.md: 64 lines
- README.md: 133 lines
- FILE_STRUCTURE.md: (this file)
- **Total Documentation: ~2,323 lines**

### Assets
- sql2postgrest.wasm: 10.8 MB
- wasm_exec.js: 17 KB
- sql2postgrest.js: 2 KB

---

## File Dependencies

```
main.tsx
  ├─ ThemeProvider
  │  ├─ localStorage API
  │  └─ useContext
  ├─ RouterProvider
  │  └─ routeTree.gen.ts
  └─ routes/__root.tsx
     ├─ Navbar
     │  ├─ @tanstack/react-router (Link, useRouterState)
     │  └─ ModeToggle
     │     ├─ useTheme()
     │     └─ UI components
     └─ Outlet
        ├─ routes/index.tsx
        │  ├─ useSQL2PostgREST()
        │  ├─ CodeMirror
        │  ├─ formatPostgRESTUrl()
        │  ├─ postgrestSyntax
        │  ├─ PageLayout
        │  └─ UI components
        └─ routes/supabase.tsx
           ├─ useSQL2PostgREST()
           ├─ postgrestToSupabase()
           ├─ CodeMirror
           ├─ PageLayout
           └─ UI components

useSQL2PostgREST()
  ├─ window.SQL2PostgREST (global)
  ├─ window.Go (global)
  └─ WASM files:
     ├─ /wasm/wasm_exec.js
     ├─ /wasm/sql2postgrest.js
     └─ /wasm/sql2postgrest.wasm

postgrestToSupabase()
  ├─ URL API
  └─ formatBodyValue()
     └─ JSON.stringify()

formatPostgRESTUrl()
  └─ formatNestedParameter()

postgrestSyntax
  ├─ @codemirror/language (StreamLanguage)
  └─ Custom parser state
```

---

## Build Output Structure

```
dist/
├── index.html (3-5 KB)
│   └─ References CSS/JS bundles
│
├── assets/
│   ├── index-D0tHRVxb.css (~50 KB)
│   │   └─ Tailwind CSS output
│   │
│   ├── index-xxxxx.js (~100 KB)
│   │   └─ Main React bundle
│   │
│   ├── routes/index-xxxxx.js (~20 KB)
│   │   └─ PostgREST route
│   │
│   └── routes/supabase-xxxxx.js (~15 KB)
│       └─ Supabase route
│
└── wasm/
    ├── sql2postgrest.wasm (10.8 MB)
    ├── sql2postgrest.js (2 KB)
    └── wasm_exec.js (17 KB)
```

**Total build size:** ~2-3 MB (gzipped: ~500-800 KB, excluding WASM)

---

## Module Import Patterns

### Absolute Imports (@ alias)
```typescript
import { Button } from "@/components/ui/button"
import { useSQL2PostgREST } from "@/hooks/useSQL2PostgREST"
import { postgrestToSupabase } from "@/lib/postgrestToSupabase"
import { cn } from "@/lib/utils"
```

### Relative Imports
```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useSQL2PostgREST, type PostgRESTRequest } from '../hooks/useSQL2PostgREST'
```

### Dynamic Imports (Code splitting)
```typescript
const CodeMirror = lazy(() => import('@uiw/react-codemirror'))
```

---

## Environment Variables

**Vite Defines:**
```
__WASM_VERSION__ - Cache-busting version string
```

**SST Provides:**
```
AWS_REGION
AWS_PROFILE
$app.stage (dev, staging, production)
```

**Browser Globals:**
```
window.SQL2PostgREST - WASM converter instance
window.Go - Go WASM runtime
window.__wasmLoaded - Cache flag
```

---

## Key Files to Modify

**To add example:**
- `routes/index.tsx` line 21-110 (SQL_EXAMPLES)
- `routes/supabase.tsx` line 21-110 (SQL_EXAMPLES)

**To change styling:**
- `index.css` (Tailwind overrides)
- Component files (className modifications)

**To change URLs:**
- `routes/index.tsx` line 116 (baseURL default)
- `sst.config.ts` line 25-26 (domain)

**To add feature:**
- Create component in `components/`
- Create route in `routes/`
- Update navbar in `navbar.tsx`

**To change behavior:**
- `hooks/useSQL2PostgREST.ts` (WASM integration)
- `lib/postgrestToSupabase.ts` (conversion logic)

