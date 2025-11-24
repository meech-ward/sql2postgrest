# SQL-Powered Chat Application - UI/UX Plan

## Overview

A Discord-like chat application with a unique SQL-first approach to data modification. Users view messages and navigate channels like a normal chat app, but all create/update/delete operations must be performed via SQL queries in an integrated terminal.

**Core Philosophy**: Embrace the technical nature - make the database layer visible and celebrate data transparency while maintaining excellent chat UX.

---

## Layout Architecture

### Desktop Layout (> 1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│  Left Sidebar    │    Center Chat View     │   Right Terminal   │
│  240px (fixed)   │    flex-1 (min 400px)   │   480px (resizable)│
│                  │                          │                    │
│  - Server info   │    - Channel header     │   - Terminal header│
│  - Channel list  │    - Messages (scroll)  │   - SQL input      │
│  - DM list       │    - Disabled input     │   - Results output │
│  - New channel   │                          │   - Query history  │
└─────────────────────────────────────────────────────────────────┘
```

**Panel Proportions & Resizing** (Updated):
- **Left Sidebar**: 15% of screen width by default, **resizable** from 12% to 25% via drag handle
- **Center Chat**: 42.5% of screen width (flexible), minimum 30%
- **Right Terminal**: 42.5% of screen width by default (equal to chat), **resizable** from 30% to 60% via drag handle
- Layout provides **50-50 split** between chat and terminal (the two main work areas)
- Terminal can collapse to ~60px vertical tab, expandable on click

**Rationale for Layout**:
- Chat messages and SQL terminal are the primary work areas - they get equal space (42.5% each)
- Sidebar is secondary (just for navigation) - gets smaller footprint (15%)
- 50-50 split between chat and terminal feels balanced and natural for the SQL-first workflow
- Users can focus equally on viewing messages and writing queries

**Resizable Implementation** (shadcn Resizable):
- Uses shadcn's `ResizablePanelGroup`, `ResizablePanel`, and `ResizableHandle` components
- Drag handles between panels with visual feedback:
  - Default: Subtle separator (border-border)
  - Hover: bg-accent/50, cursor col-resize
  - Active (dragging): bg-accent
- Panel sizes persisted to LocalStorage (via TanStack Store)
- Smooth dragging with 60fps performance
- Double-click handle to reset to default sizes
- Responsive: Disable resizing on mobile (<768px) and tablet (768-1024px)

### Tablet Layout (768px - 1024px)

```
┌────────────────────────────────────────┐
│  Left Sidebar  │  Center Chat View     │
│  240px         │  flex-1                │
│                │                        │
│                │  [Floating SQL Button] │
└────────────────────────────────────────┘
```

- SQL terminal hidden by default
- Floating action button (bottom-right) opens terminal as overlay/drawer
- Terminal slides over center panel from right
- Backdrop blur when terminal is open

### Mobile Layout (< 768px)

```
┌──────────────────────┐
│  Top Nav Bar         │
├──────────────────────┤
│                      │
│  Active View         │
│  (Channels OR        │
│   Chat OR            │
│   Terminal)          │
│                      │
├──────────────────────┤
│  Bottom Tab Nav      │
└──────────────────────┘
```

- Tab navigation: Channels | Chat | SQL
- Only one view visible at a time
- Terminal optimized for mobile (simplified editor)

---

## Component Structure

### Left Panel: Channel Sidebar

#### Header Section (60px height)
- **App title/logo** (top-left)
- **Theme toggle** (Sun/Moon icon with dropdown)
  - Options: Light, Dark, System (default)
  - Persists selection to localStorage
  - Respects system preferences when set to "System"
- **User profile button** (avatar + username dropdown)
  - Dropdown contains: Profile, Settings, Sign Out

#### Server/Workspace Switcher (optional, 48px if present)
- Dropdown or pill selector
- Skip if single-workspace app

#### Channel List (flex-1, scrollable)
**Section: Text Channels**
- Section header: "CHANNELS" (uppercase, muted, 11px)
- Channel items:
  - `#` icon + channel name
  - Unread badge (count) on right
  - Active state: 3px left border (accent blue) + bg-secondary/80
  - Hover state: bg-secondary/50
  - ID on hover: Channel name → `#general id:ch_abc123` with copy icon

**Section: Direct Messages**
- Section header: "DIRECT MESSAGES"
- DM items:
  - User avatar (32px) + username
  - Online indicator (green dot)
  - Same active/hover states as channels

#### Bottom Actions
- No action buttons (all actions via SQL terminal)
- Channels can only be created via SQL: `INSERT INTO channels (name, description) VALUES (...)`

---

### Center Panel: Chat Messages

#### Header Bar (64px height)
- **Channel name** (20px, semibold) with hover-for-ID
- **Channel description/topic** (14px, muted, truncated)
- **Right-aligned utilities**:
  - Search icon (opens search modal)
  - Channel settings icon (tooltip: "Use SQL to modify")
  - Members icon (shows member count)
  - Realtime status indicator (pulsing dot when connected)

#### Messages Area (flex-1, scrollable)
**Message Component**:
- **Avatar** (40px, rounded-full) on left
- **Header line**: Username (14px, semibold) + timestamp (12px, muted)
- **Content**: Message text (14px, line-height: 1.5)
- **Hover state**:
  - Entire message background: bg-secondary/30
  - Message ID appears top-right: `id:msg_xyz` with copy icon
  - Reaction buttons could appear (future enhancement)

**Message Grouping**:
- Same user within 5 minutes: Hide avatar/username, show only content with 4px left margin
- Date separators: Centered, muted, with horizontal lines

**Special States**:
- Loading: Skeleton loaders (3-4 placeholder messages)
- Empty state: "No messages yet. Use SQL to create one!"
- Error state: "Failed to load messages" with retry button

#### Message Input Area (80px height)
- **Disabled/Read-only input** with placeholder:
  - "Use SQL terminal to send messages →"
- **Helper text below** (12px, muted):
  - "Try: `INSERT INTO messages (channel_id, content) VALUES ('ch_abc123', 'Hello!')`"
- **Click behavior**: Focus SQL terminal + populate template
- **Visual treatment**:
  - Dashed border (border-dashed border-muted)
  - Muted background (bg-muted/30)
  - Cursor: not-allowed initially, pointer on hover

---

### Right Panel: Terminal (SQL & JavaScript)

#### Terminal Aesthetic
- **Theme**: Dark mode always (even if app is light)
  - Background: bg-slate-950
  - Text: text-slate-50
  - Muted: text-slate-400
- **Font**: Monospace throughout (JetBrains Mono, Fira Code, SF Mono)
- **Border**: 1px solid border-slate-800 on left edge
- **Optional**: Subtle scanline effect (very subtle overlay)

#### Terminal Header (48px)
- **Title**: "Terminal" with database icon
- **Right controls**:
  - Query history dropdown (clock icon)
  - Clear output button (trash icon)
  - Docs/reference (book icon, opens modal)
  - Collapse terminal (chevron right icon)

#### Input Section (resizable, default 180px)
**Code Editor (SQL or JavaScript)**:
- Multi-line textarea (or Monaco editor)
- Line numbers (muted, 4ch width)
- Syntax highlighting for both SQL and JavaScript:
  - **SQL**: Keywords (SELECT, INSERT, etc.): text-blue-400
  - **JavaScript**: Keywords (const, from, etc.): text-purple-400
  - Strings: text-green-400
  - Numbers: text-orange-400
  - Comments: text-slate-500
- Tab key: Insert 2 spaces (not focus change)
- Auto-complete dropdown for table/column names (future)

**Language Auto-Detection**:
- Detects SQL if starts with: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, etc.
- Detects JavaScript if contains: `.from(`, `supabase.`, `await`, etc.
- Manual override dropdown available if detection is wrong
- Syntax highlighting updates based on detected language

**Control Bar (40px below editor)**:
- **Execute button** (primary, accent color)
  - Text: "Execute" or "Run"
  - Keyboard shortcut badge: "⌘↵" or "Ctrl+Enter"
  - Loading state: Spinner replaces text
- **Language badge** (auto-detected, manually overridable):
  - SQL: Blue badge "SQL"
  - JavaScript: Purple badge "JavaScript"
  - Dropdown to manually switch if needed
- **Query type badge** (auto-detected):
  - SELECT: Blue badge "Query"
  - INSERT/UPDATE/DELETE: Orange badge "Mutation"
  - DDL (CREATE/DROP): Red badge "Schema Change"
- **Execution time**: "23ms" (shown after execution)
- **Format button** (ghost, icon only): Prettify/indent code

**Resize Handle**:
- 4px draggable area between input and output
- Hover: bg-slate-700, cursor: row-resize
- Drag: Update input section height (min 100px, max 400px)

#### Output Section (flex-1, scrollable)

**Output Format: Supabase PostgREST JSON Response**

All queries (SQL or JavaScript) return Supabase-style JSON:
```json
{
  "data": [...],      // Array of results or null
  "error": null,      // Error object or null
  "count": 147,       // Row count (if requested)
  "status": 200,      // HTTP status
  "statusText": "OK"  // Status text
}
```

**Success Response Display**:
- **Metadata header**:
  - Status badge: "200 OK" (green) or "201 Created" (green)
  - Row count: "147 rows" (if count exists)
  - Execution time: "23ms"
  - Export button (CSV, JSON)

- **Data Table** (if `data` array exists and not empty):
  - Use shadcn Table component
  - Sticky header with column names (semibold)
  - Alternating row backgrounds (bg-slate-900/bg-slate-800)
  - Row hover: bg-slate-700
  - Cell rendering:
    - Text: Truncate > 100 chars with "..." (click to expand)
    - Timestamps: Relative time ("2m ago"), absolute on hover
    - Booleans: Badge (green for true, red for false)
    - NULL: Gray badge "NULL"
    - IDs: Monospace with copy button on hover
  - Virtual scrolling if > 100 rows
  - Pagination controls at bottom

- **Empty data response**:
  - Show: "Query executed successfully, no data returned"
  - Status and timing still displayed

**Error Response Display**:
- **Error badge**: "✗ Error" (red) with status code (e.g., "400", "404", "500")
- **Error details** in monospace:
  - `error.message`: Main error message
  - `error.details`: Additional details if available
  - `error.hint`: Helpful hint if provided by Supabase
  - `error.code`: Error code (e.g., "PGRST116", "42P01")
- **Formatted display**:
  ```
  Error: relation "messagesss" does not exist

  Details: The table "messagesss" was not found
  Hint: Check your table name spelling
  Code: 42P01
  ```
- **Actions**:
  - "Try again" button (keeps current query in editor)
  - Link to docs/schema reference
- **Visual feedback**: 300ms red border flash

**Loading State**:
- Skeleton loader or pulse animation
- "Executing query..." text with spinner

**Visual Feedback**:
- Success: 300ms green border flash on output container
- Error: 300ms red border flash on output container

#### Query History (collapsible, bottom 160px)
- **Header**: "Recent Queries" with collapse toggle
- **History items** (last 10-20 queries):
  - Timestamp (relative)
  - Query preview (single line, truncated)
  - Status icon (✓ success, ✗ error)
  - Execution time
  - Click: Load into editor (doesn't execute)
  - Re-run icon: Execute immediately
- **Clear history button** at bottom
- **Persisted**: LocalStorage

---

## ID Visibility System

### Core Requirement
Users constantly need entity IDs for SQL queries. Make IDs easily discoverable and copyable everywhere.

### Hover Pattern (Universal)
Applied to: Channels, Messages, Users, any DB entity

**On Hover**:
1. ID badge appears inline or as overlay
2. Badge contents: `id:msg_a1b2c3d4` with copy icon
3. Badge style:
   - Background: bg-slate-800/90
   - Border: 1px solid border-slate-600
   - Font: Monospace, 12px
   - Padding: 2px 6px
   - Border radius: 4px
   - Position: Context-dependent (see below)

**Position by Element Type**:
- **Channels**: Inline after channel name in sidebar
- **Messages**: Top-right corner of message container
- **Users**: Inline after username in header
- **Any other**: Tooltip below element

**Copy Behavior**:
- Click copy icon OR Cmd/Ctrl+Click anywhere on ID badge
- Copies only the ID value (e.g., `msg_a1b2c3d4` without `id:` prefix)
- Shows toast notification: "msg_a1b2c3d4 copied" (2s duration)
- Icon changes briefly: clipboard → checkmark (300ms)

**Keyboard Alternative**:
- Tab navigation focuses elements
- When focused, press `C` to copy ID
- Screen reader announces: "ID copied to clipboard"

---

## Styling System

### Technology Stack
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (exclusively)
- **Icons**: Lucide React
- **State Management**:
  - TanStack Query (server state)
  - Supabase Cache Helpers (realtime integration)
  - TanStack Store (UI state)
- **Fonts**:
  - UI: Inter (or system: -apple-system, BlinkMacSystemFont)
  - Code: JetBrains Mono (or SF Mono, Fira Code)

### shadcn Components Used
- `Button` - All buttons throughout the app
- `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` - Layout panels
- `Table` - Query results display
- `Badge` - Status indicators, query types, language badges
- `DropdownMenu` - User profile, query history, settings
- `Dialog` - Modals (new channel, confirmations)
- `Toast` - Notifications (ID copied, query executed)
- `Tooltip` - Icon button explanations
- `Separator` - Visual dividers
- `ScrollArea` - All scrollable sections
- `Textarea` - Terminal input (enhanced with syntax highlighting)
- `Tabs` - Mobile navigation
- `Avatar` - User avatars in messages and sidebar
- `Command` - Command palette (future)
- `Input` - Disabled message input area

---

## Theme Design

### Complete Theme Configuration

The application uses a comprehensive theme system based on shadcn's theming approach with CSS variables. The theme supports both light and dark modes for the main UI, while the terminal panel is **always dark** for optimal developer experience.

### Dark Mode Toggle (Implemented)

**Location**: Sidebar header (next to user avatar)

**Functionality**:
- Toggle button with Sun/Moon icons
- Dropdown menu with three options:
  - **Light**: Forces light mode
  - **Dark**: Forces dark mode
  - **System** (default): Respects OS/browser preference
- Selection persisted to localStorage (`sql-chat-theme` key)
- Automatically detects system preference changes in real-time

**Implementation Details**:
- Uses React Context (`ThemeProvider`) for state management
- Applies `.dark` or `.light` class to `<html>` element
- CSS variables automatically switch based on class
- Terminal remains dark regardless of app theme (always uses `--terminal-*` variables)

**User Experience**:
- Defaults to system preference on first visit
- Smooth transitions between themes (200ms)
- Icon animates on theme switch (rotate/scale)
- No flash of unstyled content (FOUC)

#### Theme File Structure
```
src/
├── styles/
│   ├── globals.css          # Global styles + theme variables
│   └── terminal-theme.css   # Terminal-specific dark theme
└── lib/
    └── theme.ts             # Theme utilities and constants
```

### CSS Variables (globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Base Colors */
    --background: 0 0% 100%;                    /* #ffffff - White */
    --foreground: 240 10% 3.9%;                 /* #09090b - Near black */

    /* Card/Panel Colors */
    --card: 0 0% 100%;                          /* #ffffff */
    --card-foreground: 240 10% 3.9%;            /* #09090b */

    /* Popover Colors */
    --popover: 0 0% 100%;                       /* #ffffff */
    --popover-foreground: 240 10% 3.9%;         /* #09090b */

    /* Primary (Blue - for CTAs, links) */
    --primary: 221.2 83.2% 53.3%;               /* #3b82f6 - Blue 500 */
    --primary-foreground: 210 40% 98%;          /* #f8fafc */

    /* Secondary (For sidebar, subtle backgrounds) */
    --secondary: 240 4.8% 95.9%;                /* #f1f5f9 - Slate 100 */
    --secondary-foreground: 240 5.9% 10%;       /* #1e293b */

    /* Muted (For disabled states, secondary text) */
    --muted: 240 4.8% 95.9%;                    /* #f1f5f9 */
    --muted-foreground: 240 3.8% 46.1%;         /* #64748b - Slate 500 */

    /* Accent (For hovers, highlights) */
    --accent: 240 4.8% 95.9%;                   /* #f1f5f9 */
    --accent-foreground: 240 5.9% 10%;          /* #1e293b */

    /* Destructive (Red - for errors, delete actions) */
    --destructive: 0 84.2% 60.2%;               /* #ef4444 - Red 500 */
    --destructive-foreground: 210 40% 98%;      /* #f8fafc */

    /* Border */
    --border: 240 5.9% 90%;                     /* #e2e8f0 - Slate 200 */
    --input: 240 5.9% 90%;                      /* #e2e8f0 */

    /* Ring (Focus states) */
    --ring: 221.2 83.2% 53.3%;                  /* #3b82f6 - Blue 500 */

    /* Chart Colors (for future data viz) */
    --chart-1: 221.2 83.2% 53.3%;               /* Blue */
    --chart-2: 142.1 76.2% 36.3%;               /* Green */
    --chart-3: 38 92% 50%;                      /* Amber */
    --chart-4: 280 89% 60%;                     /* Purple */
    --chart-5: 340 82% 52%;                     /* Pink */

    /* Custom Semantic Colors */
    --success: 142.1 76.2% 36.3%;               /* #22c55e - Green 500 */
    --success-foreground: 210 40% 98%;          /* #f8fafc */

    --warning: 38 92% 50%;                      /* #f59e0b - Amber 500 */
    --warning-foreground: 240 10% 3.9%;         /* #09090b */

    --info: 199 89% 48%;                        /* #06b6d4 - Cyan 500 */
    --info-foreground: 210 40% 98%;             /* #f8fafc */

    /* Terminal (Always Dark) */
    --terminal-background: 222.2 47.4% 11.2%;   /* #0f172a - Slate 950 */
    --terminal-foreground: 210 40% 98%;         /* #f8fafc - Slate 50 */
    --terminal-muted: 215 20.2% 65.1%;          /* #94a3b8 - Slate 400 */
    --terminal-border: 215.3 25% 26.7%;         /* #334155 - Slate 700 */
    --terminal-accent: 217.2 91.2% 59.8%;       /* #3b82f6 - Blue 500 */

    /* Syntax Highlighting (for terminal) */
    --syntax-keyword: 217.2 91.2% 59.8%;        /* Blue 500 */
    --syntax-string: 142.1 70.6% 45.3%;         /* Green 500 */
    --syntax-number: 38 92% 50%;                /* Amber 500 */
    --syntax-comment: 215.4 16.3% 46.9%;        /* Slate 500 */
    --syntax-function: 280 89% 60%;             /* Purple 500 */
    --syntax-operator: 340 82% 52%;             /* Pink 500 */

    /* Radius */
    --radius: 0.5rem;                           /* 8px - default border radius */
  }

  .dark {
    /* Base Colors */
    --background: 240 10% 3.9%;                 /* #09090b - Zinc 950 */
    --foreground: 0 0% 98%;                     /* #fafafa - Zinc 50 */

    /* Card/Panel Colors */
    --card: 240 10% 3.9%;                       /* #09090b */
    --card-foreground: 0 0% 98%;                /* #fafafa */

    /* Popover Colors */
    --popover: 240 10% 3.9%;                    /* #09090b */
    --popover-foreground: 0 0% 98%;             /* #fafafa */

    /* Primary */
    --primary: 217.2 91.2% 59.8%;               /* #3b82f6 - Blue 500 */
    --primary-foreground: 222.2 47.4% 11.2%;    /* #0f172a */

    /* Secondary */
    --secondary: 240 3.7% 15.9%;                /* #27272a - Zinc 800 */
    --secondary-foreground: 0 0% 98%;           /* #fafafa */

    /* Muted */
    --muted: 240 3.7% 15.9%;                    /* #27272a */
    --muted-foreground: 240 5% 64.9%;           /* #a1a1aa - Zinc 400 */

    /* Accent */
    --accent: 240 3.7% 15.9%;                   /* #27272a */
    --accent-foreground: 0 0% 98%;              /* #fafafa */

    /* Destructive */
    --destructive: 0 62.8% 30.6%;               /* #7f1d1d - Red 900 */
    --destructive-foreground: 0 0% 98%;         /* #fafafa */

    /* Border */
    --border: 240 3.7% 15.9%;                   /* #27272a - Zinc 800 */
    --input: 240 3.7% 15.9%;                    /* #27272a */

    /* Ring */
    --ring: 217.2 91.2% 59.8%;                  /* #3b82f6 */

    /* Chart Colors */
    --chart-1: 220 70% 50%;                     /* Blue */
    --chart-2: 160 60% 45%;                     /* Green */
    --chart-3: 30 80% 55%;                      /* Amber */
    --chart-4: 280 65% 60%;                     /* Purple */
    --chart-5: 340 75% 55%;                     /* Pink */

    /* Semantic Colors */
    --success: 142.1 70.6% 45.3%;               /* #22c55e */
    --success-foreground: 0 0% 98%;             /* #fafafa */

    --warning: 38 92% 50%;                      /* #f59e0b */
    --warning-foreground: 240 10% 3.9%;         /* #09090b */

    --info: 199 89% 48%;                        /* #06b6d4 */
    --info-foreground: 0 0% 98%;                /* #fafafa */

    /* Terminal stays the same in dark mode */
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* Custom scrollbar for terminal and messages */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    @apply bg-transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    @apply bg-muted-foreground/20 rounded-full;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    @apply bg-muted-foreground/30;
  }
}
```

### Terminal-Specific Styles (terminal-theme.css)

```css
/* Terminal component always uses dark theme */
.terminal-container {
  background-color: hsl(var(--terminal-background));
  color: hsl(var(--terminal-foreground));
  border-left: 1px solid hsl(var(--terminal-border));
}

.terminal-header {
  border-bottom: 1px solid hsl(var(--terminal-border));
  background-color: hsl(var(--terminal-background));
}

.terminal-editor {
  background-color: hsl(222.2 47.4% 11.2% / 0.5); /* Slightly lighter */
  color: hsl(var(--terminal-foreground));
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  caret-color: hsl(var(--terminal-accent));
}

.terminal-output {
  background-color: hsl(var(--terminal-background));
  color: hsl(var(--terminal-foreground));
}

/* Syntax highlighting classes */
.syntax-keyword {
  color: hsl(var(--syntax-keyword));
}

.syntax-string {
  color: hsl(var(--syntax-string));
}

.syntax-number {
  color: hsl(var(--syntax-number));
}

.syntax-comment {
  color: hsl(var(--syntax-comment));
  font-style: italic;
}

.syntax-function {
  color: hsl(var(--syntax-function));
}

.syntax-operator {
  color: hsl(var(--syntax-operator));
}

/* Terminal table styles */
.terminal-table {
  border-color: hsl(var(--terminal-border));
}

.terminal-table th {
  background-color: hsl(222.2 47.4% 15%);
  color: hsl(var(--terminal-foreground));
  border-bottom: 2px solid hsl(var(--terminal-border));
}

.terminal-table tr:nth-child(even) {
  background-color: hsl(222.2 47.4% 13%);
}

.terminal-table tr:nth-child(odd) {
  background-color: hsl(222.2 47.4% 11.2%);
}

.terminal-table tr:hover {
  background-color: hsl(215.3 25% 26.7%);
}
```

### Tailwind Config (tailwind.config.ts)

```typescript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        terminal: {
          background: "hsl(var(--terminal-background))",
          foreground: "hsl(var(--terminal-foreground))",
          muted: "hsl(var(--terminal-muted))",
          border: "hsl(var(--terminal-border))",
          accent: "hsl(var(--terminal-accent))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "border-flash-success": {
          "0%, 100%": { borderColor: "hsl(var(--border))" },
          "50%": { borderColor: "hsl(var(--success))" },
        },
        "border-flash-error": {
          "0%, 100%": { borderColor: "hsl(var(--border))" },
          "50%": { borderColor: "hsl(var(--destructive))" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "border-flash-success": "border-flash-success 300ms ease-in-out",
        "border-flash-error": "border-flash-error 300ms ease-in-out",
        "pulse-dot": "pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

### Using the Theme in Components

#### Example: Channel Sidebar Component
```tsx
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function Sidebar() {
  return (
    <div className="flex h-full flex-col bg-secondary border-r border-border">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <h2 className="text-lg font-semibold">Channels</h2>
        <Button variant="ghost" size="icon">...</Button>
      </div>

      {/* Channel List */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="p-2 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-accent"
          >
            # general
          </Button>
        </div>
      </ScrollArea>
    </div>
  )
}
```

#### Example: Terminal Component
```tsx
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function Terminal() {
  return (
    <div className="terminal-container flex h-full flex-col">
      {/* Header */}
      <div className="terminal-header h-12 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-terminal-foreground font-semibold">Terminal</span>
          <Badge variant="outline" className="bg-terminal-accent/10 text-terminal-accent">
            SQL
          </Badge>
        </div>
      </div>

      {/* Editor */}
      <div className="terminal-editor p-4 font-mono text-sm">
        <textarea className="w-full bg-transparent text-terminal-foreground" />
      </div>

      {/* Output */}
      <div className="terminal-output flex-1 p-4 overflow-auto custom-scrollbar">
        <div className="animate-border-flash-success">
          {/* Results */}
        </div>
      </div>
    </div>
  )
}
```

#### Example: Message Component with ID Copy
```tsx
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function Message({ message }) {
  const [showId, setShowId] = useState(false)

  return (
    <div
      className="group px-4 py-2 hover:bg-accent/30 transition-colors"
      onMouseEnter={() => setShowId(true)}
      onMouseLeave={() => setShowId(false)}
    >
      <div className="flex gap-3">
        <Avatar className="h-10 w-10" />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{message.username}</span>
            <span className="text-xs text-muted-foreground">{message.timestamp}</span>

            {/* ID Badge (shows on hover) */}
            {showId && (
              <div className="ml-auto flex items-center gap-1 bg-slate-800/90 border border-slate-600 rounded px-2 py-0.5">
                <span className="text-xs font-mono text-slate-300">
                  id:{message.id}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={() => navigator.clipboard.writeText(message.id)}
                >
                  📋
                </Button>
              </div>
            )}
          </div>
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    </div>
  )
}
```

### Theme Utilities (lib/theme.ts)

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Theme-specific utilities
export const theme = {
  // Status colors for badges
  status: {
    success: "bg-success/10 text-success border-success/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    info: "bg-info/10 text-info border-info/20",
  },

  // Query type badges
  queryType: {
    select: "bg-primary/10 text-primary border-primary/20",
    mutation: "bg-warning/10 text-warning border-warning/20",
    schema: "bg-destructive/10 text-destructive border-destructive/20",
  },

  // Language badges
  language: {
    sql: "bg-primary/10 text-primary border-primary/20",
    javascript: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
} as const

// Syntax highlighting class map
export const syntaxClasses = {
  keyword: "syntax-keyword",
  string: "syntax-string",
  number: "syntax-number",
  comment: "syntax-comment",
  function: "syntax-function",
  operator: "syntax-operator",
} as const
```

### Theme Features Summary

✅ **Complete shadcn Integration**
- All components use shadcn/ui exclusively
- Consistent theming through CSS variables
- Easy to customize via globals.css

✅ **Light & Dark Mode Support**
- App UI supports both light and dark modes
- Terminal always dark for optimal dev experience
- Respects system preferences

✅ **Semantic Color System**
- Primary (Blue) - CTAs, links, active states
- Success (Green) - Query success, online status
- Destructive (Red) - Errors, delete actions
- Warning (Amber) - Mutations, cautions
- Muted (Gray) - Secondary text, disabled states

✅ **Terminal-Specific Theme**
- Always dark background (Slate 950)
- Syntax highlighting for SQL & JavaScript
- Custom scrollbars
- Monospace font throughout

✅ **Custom Animations**
- Border flash on query success (green)
- Border flash on query error (red)
- Pulsing realtime indicator
- Smooth transitions (150-300ms)

✅ **Accessibility**
- Proper focus states with ring outline
- Color contrast ratios meet WCAG AA
- Custom scrollbars that don't obscure content
- Respects prefers-reduced-motion

✅ **Responsive Design**
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Mobile-first approach
- Adaptive layouts for all screen sizes

### Typography Scale

#### App UI (Inter)
- **Headings**:
  - H1: 24px, font-semibold, line-height: 1.2
  - H2: 20px, font-semibold, line-height: 1.3
  - H3: 16px, font-semibold, line-height: 1.4
- **Body**:
  - Base: 14px, font-normal, line-height: 1.5
  - Small: 12px, font-normal, line-height: 1.4
  - XSmall: 11px, font-normal, line-height: 1.3

#### Terminal/Code (Monospace)
- SQL Input: 14px, line-height: 1.6
- Results: 13px, line-height: 1.5
- IDs: 12px, line-height: 1.4

### Spacing System
Following Tailwind's default scale (4px base):
- Tight: 4px, 8px (gaps, padding)
- Normal: 12px, 16px (component padding)
- Relaxed: 20px, 24px (section spacing)
- Loose: 32px, 40px (panel spacing)

### Border Radius
- Small: 4px (badges, small buttons)
- Medium: 6px (buttons, inputs)
- Large: 8px (cards, panels)
- Full: 9999px (avatars, pills)

### Shadows
- Small: `0 1px 2px 0 rgb(0 0 0 / 0.05)` - subtle elevation
- Medium: `0 4px 6px -1px rgb(0 0 0 / 0.1)` - cards, dropdowns
- Large: `0 10px 15px -3px rgb(0 0 0 / 0.1)` - modals, overlays

### Transitions
- Fast: 150ms (hover states, simple toggles)
- Normal: 200ms (panel reveals, state changes)
- Slow: 300ms (modals, complex animations)
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out)

---

## Screen Sizes & Responsive Behavior

### Breakpoints
```css
sm: 640px   /* Small tablets, large phones */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops, small desktops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

### Responsive Rules

#### Mobile (< 768px)
- **Layout**: Single panel, tab navigation
- **Tabs**: Channels | Chat | SQL (bottom nav)
- **Terminal**:
  - Full-screen panel when active
  - Simplified editor (fewer controls)
  - Results in scrollable list (not table)
- **Sidebar**: Slide-over drawer from left
- **IDs**: Tap to show, tap copy button (no hover)

#### Tablet (768px - 1024px)
- **Layout**: 2-panel (sidebar + chat)
- **Sidebar**: 200px (slightly narrower)
- **Terminal**: Floating drawer from right
  - Opens via FAB (bottom-right)
  - Backdrop blur when open
  - Swipe right to close
- **Messages**: Slightly reduced padding

#### Desktop (1024px - 1536px)
- **Layout**: Full 3-panel
- **Sidebar**: 240px
- **Terminal**: 480px, resizable (320-640px)
- **All features**: Fully available

#### Large Desktop (> 1536px)
- **Layout**: Same 3-panel
- **Terminal**: Can expand to 720px max
- **Chat area**: More horizontal space for wider messages
- **Optional**: Split SQL input/output side-by-side

### Flexible Container
```jsx
<div className="flex h-screen">
  {/* Sidebar: hidden md:flex md:w-60 */}
  {/* Chat: flex-1 min-w-0 */}
  {/* Terminal: hidden lg:flex lg:w-[480px] */}
</div>
```

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette (future) |
| `Cmd/Ctrl + /` | Toggle SQL terminal |
| `Cmd/Ctrl + \` | Toggle sidebar |
| `Cmd/Ctrl + F` | Search messages |
| `Cmd/Ctrl + ,` | Open settings |
| `Esc` | Close modal/drawer/focus chat |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Up/Down` | Navigate channels |
| `Alt + Up/Down` | Navigate servers/workspaces |
| `Cmd/Ctrl + 1-9` | Jump to channel 1-9 |
| `Cmd/Ctrl + Shift + T` | Focus terminal |
| `Cmd/Ctrl + Shift + M` | Focus message input (shows SQL hint) |

### Terminal Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Execute query |
| `Cmd/Ctrl + L` | Clear terminal output |
| `Cmd/Ctrl + Shift + F` | Format/prettify SQL |
| `Up/Down` | Navigate query history (when editor empty) |
| `Cmd/Ctrl + Shift + H` | Toggle query history panel |
| `Tab` | Insert 2 spaces (in editor) |
| `Shift + Tab` | Outdent |
| `Cmd/Ctrl + /` | Comment/uncomment line |

### Copy Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Click` | Copy ID of hovered element |
| `C` (when focused) | Copy ID of focused element |
| `Cmd/Ctrl + Shift + C` | Copy current channel ID |
| `Cmd/Ctrl + Shift + I` | Copy current message ID (if focused) |

### Accessibility

| Shortcut | Action |
|----------|--------|
| `Tab / Shift+Tab` | Navigate interactive elements |
| `Enter / Space` | Activate focused element |
| `Escape` | Close modal/cancel action |
| `?` | Show keyboard shortcuts help modal |

---

## Interaction Flows

### Flow 1: Sending a Message (SQL)
1. User views chat in center panel
2. Hovers over current channel name in header → sees and copies channel ID (`ch_abc123`)
3. Clicks disabled message input (or presses `Cmd+Shift+M`)
4. Terminal focuses, template appears:
   ```sql
   INSERT INTO messages (channel_id, content) VALUES ('', '');
   ```
5. User pastes channel ID, types message content
6. Terminal auto-detects SQL (shows "SQL" badge)
7. Presses `Cmd+Enter` or clicks "Execute"
8. Terminal shows Supabase response:
   ```json
   {
     "data": [{"id": "msg_new123", "content": "Hello!", ...}],
     "error": null,
     "status": 201,
     "statusText": "Created"
   }
   ```
9. Message appears in chat via realtime update
10. Terminal shows success metadata with 300ms green flash

### Flow 1b: Sending a Message (JavaScript)
1. User clicks disabled message input
2. Terminal focuses, user writes JavaScript:
   ```js
   supabase
     .from('messages')
     .insert({ channel_id: 'ch_abc123', content: 'Hello!' })
   ```
3. Terminal auto-detects JavaScript (shows "JavaScript" badge)
4. Presses `Cmd+Enter`
5. Same Supabase JSON response displayed
6. Message appears via realtime

### Flow 2: Creating a Channel
1. User clicks "+ New Channel" button in sidebar
2. Modal opens:
   - Title: "Create New Channel"
   - Body: "Use SQL to create a channel"
   - Example query shown (copyable):
     ```sql
     INSERT INTO channels (name, description)
     VALUES ('new-channel', 'Channel description');
     ```
   - Button: "Copy & Close"
3. User clicks button → query copied, modal closes, terminal focuses
4. User pastes, modifies, executes
5. Terminal shows success
6. Channel appears in sidebar via realtime

### Flow 3: Exploring Data
1. User wants to see message count per channel
2. Types in terminal:
   ```sql
   SELECT channel_id, COUNT(*) as message_count
   FROM messages
   GROUP BY channel_id
   ORDER BY message_count DESC;
   ```
3. Presses `Cmd+Enter`
4. Terminal shows Supabase response with data in table format:
   ```json
   {
     "data": [
       {"channel_id": "ch_abc123", "message_count": 1247},
       {"channel_id": "ch_xyz789", "message_count": 856}
     ],
     "error": null,
     "count": 2,
     "status": 200
   }
   ```
   Displayed as table:
   ```
   200 OK | 2 rows | 23ms                    [Export ▼]

   channel_id    | message_count
   --------------|---------------
   ch_abc123     | 1,247
   ch_xyz789     | 856
   ```
5. User hovers over channel ID in results, sees copy button
6. Clicks to copy, writes follow-up query to view recent messages in that channel

### Flow 4: Copying Message ID
1. User scrolls through chat
2. Hovers over specific message
3. Message highlights (bg-secondary/30)
4. ID appears in top-right: `id:msg_xyz` with copy icon
5. User clicks copy icon
6. Toast appears: "msg_xyz copied"
7. User switches to terminal, uses ID in DELETE query

### Flow 5: Query History
1. User executes several queries
2. Clicks query history dropdown in terminal header
3. Dropdown shows last 10 queries with timestamps
4. User clicks old query → loads into editor (doesn't execute)
5. User modifies, re-executes
6. OR: User clicks re-run icon → executes immediately

---

## Component Organization

### File Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx          # Main 3-panel layout (uses shadcn Resizable)
│   │   ├── Sidebar.tsx            # Left panel
│   │   ├── ChatView.tsx           # Center panel
│   │   └── Terminal.tsx           # Right panel
│   ├── chat/
│   │   ├── ChannelHeader.tsx
│   │   ├── MessageList.tsx
│   │   ├── Message.tsx
│   │   ├── MessageInput.tsx       # Disabled input
│   │   └── DateSeparator.tsx
│   ├── terminal/
│   │   ├── SQLEditor.tsx          # Multi-line input
│   │   ├── QueryResults.tsx       # Table/success/error display
│   │   ├── QueryHistory.tsx       # Recent queries
│   │   ├── ResultsTable.tsx       # Table component
│   │   └── ControlBar.tsx         # Execute button, badges
│   ├── sidebar/
│   │   ├── ChannelList.tsx
│   │   ├── ChannelItem.tsx
│   │   ├── DMList.tsx
│   │   └── UserProfile.tsx
│   ├── shared/
│   │   ├── IDDisplay.tsx          # Hover ID with copy
│   │   ├── CopyButton.tsx
│   │   ├── RealtimeIndicator.tsx
│   │   └── EmptyState.tsx
│   └── ui/                        # shadcn components
│       ├── button.tsx
│       ├── table.tsx
│       ├── toast.tsx
│       ├── dialog.tsx
│       └── ...
├── hooks/
│   ├── useRealtimeMessages.ts     # Supabase realtime
│   ├── useRealtimeChannels.ts
│   ├── useQueryExecution.ts       # SQL execution logic
│   ├── useQueryHistory.ts         # LocalStorage persistence
│   ├── useKeyboardShortcuts.ts
│   └── useCopyToClipboard.ts
├── lib/
│   ├── supabase.ts                # Supabase client
│   ├── sqlSyntax.ts               # Syntax highlighting
│   ├── queryParser.ts             # Detect query type
│   └── utils.ts                   # cn(), formatters
├── types/
│   ├── database.ts                # Generated Supabase types
│   ├── messages.ts
│   └── channels.ts
└── App.tsx
```

### State Management Strategy

**Server State** (TanStack Query + Supabase Cache Helpers):
- Messages for active channel (with realtime subscription)
- Channel list (with realtime subscription)
- User profiles
- Query execution (via `useMutation`)
- Automatic caching, refetching, and optimistic updates
- Supabase Cache Helpers integrates realtime subscriptions with query cache

**UI State** (TanStack Store):
- Current user
- Active channel ID
- Sidebar collapsed state
- Terminal collapsed state
- Theme preference
- Terminal input content (for persistence between channel switches)

**Local Component State** (useState):
- Query results (from terminal execution)
- Query execution loading state
- Form inputs
- Modal open/closed states

**Persisted State** (LocalStorage via TanStack Store):
- Query history (last 20)
- Terminal size preference (width/height)
- Panel layout preferences (sidebar width, terminal width)
- User preferences (theme, shortcuts enabled)

**Benefits of This Approach**:
- TanStack Query handles all server data fetching, caching, and revalidation
- Supabase Cache Helpers automatically update query cache on realtime events
- TanStack Store provides lightweight, type-safe UI state management
- Clear separation between server state and UI state
- Optimistic updates for mutations (insert message shows immediately)
- Easy to debug with React Query DevTools

---

## Accessibility

### ARIA Labels
- Sidebar: `role="navigation" aria-label="Channels"`
- Chat: `role="main" aria-label="Messages"`
- Terminal: `role="complementary" aria-label="SQL Terminal"`
- Messages: `role="article" aria-label="Message from [username]"`

### Keyboard Navigation
- Full tab order through all interactive elements
- Skip links: "Skip to chat", "Skip to terminal"
- Focus visible: 2px outline in accent color
- Focus trap in modals

### Screen Reader Support
- Live region for new messages: `aria-live="polite"`
- Query result count announced
- Error messages announced with `role="alert"`
- ID copy action announced: "ID copied to clipboard"

### Motion & Preferences
- Respect `prefers-reduced-motion`
- Disable transitions/animations if set
- Respect `prefers-color-scheme` for app UI (terminal stays dark)

---

## Error Handling

### SQL Errors
- Display full error message from database
- Highlight syntax errors if possible
- Provide helpful hints:
  - "Table 'xyz' doesn't exist" → "View available tables in docs"
  - "Column 'abc' not found" → "Check table schema"
- Link to SQL docs/reference

### Network Errors
- Realtime disconnection: Yellow indicator + "Reconnecting..."
- Failed queries: Red badge + error message
- Retry button for transient failures

### Validation
- Warn before destructive operations (DELETE, DROP, TRUNCATE)
- Confirmation dialog: "Are you sure you want to delete X rows?"
- Option: "Don't ask again for this session"

---

## Performance Optimizations

### Rendering
- Virtual scrolling for:
  - Long message lists (> 50 messages)
  - Large query results (> 100 rows)
- Memoize message components (React.memo)
- Debounce SQL syntax highlighting (200ms)
- Code splitting: Load SQL editor library lazily

### Data Fetching
- Pagination for messages (load 50, fetch more on scroll)
- Query result limits: Default LIMIT 1000, warn if higher
- Realtime subscriptions: Only for active channel

### Caching
- Cache channel list (revalidate every 30s)
- Cache user profiles (revalidate on focus)
- Query results: Keep last 5 in memory

---

## Future Enhancements

### Phase 2 Features
- **Schema browser**: Inline panel showing all tables/columns
- **Query templates**: Dropdown with common queries
- **Autocomplete**: Table/column name suggestions
- **Syntax validation**: Real-time checking before execution
- **Query explanation**: Show query plan for SELECT queries

### Phase 3 Features
- **Collaborative cursors**: See others' active channels
- **Query sharing**: Share query results with others
- **Saved queries**: Bookmark frequently used queries
- **Vim/Emacs mode**: For SQL editor
- **Query formatting**: Auto-format on paste
- **Export results**: CSV, JSON, SQL INSERT statements

### Phase 4 Features
- **Visual query builder**: Drag-and-drop (but still shows SQL)
- **Message reactions**: UI button that generates SQL
- **Undo system**: Generate reverse queries for mutations
- **Diff view**: Compare query results over time

---

## Design Principles

1. **Technical Transparency**: Don't hide the database layer. Celebrate it.
2. **Developer-First**: This is a tool for technical users. Optimize for power, not simplicity.
3. **Familiar + Unique**: Reading feels like Discord, writing feels like a SQL client.
4. **Data Discoverability**: IDs everywhere, easy to copy, schema accessible.
5. **Fast Feedback**: Instant visual response to all actions.
6. **Keyboard-Optimized**: Everything accessible via keyboard.
7. **Error-Tolerant**: Clear error messages, easy recovery.
8. **Performance-Conscious**: Smooth even with thousands of messages.

---

## Visual Reference

### Color Usage
- **Primary (Blue)**: Execute button, links, active states
- **Success (Green)**: Query success, online indicators
- **Error (Red)**: Query errors, destructive actions
- **Warning (Amber)**: Mutations, cautions
- **Muted (Gray)**: Secondary text, disabled states

### Component Hierarchy
```
Prominent:    Channel names, message content, execute button
Secondary:    Timestamps, descriptions, helper text
Tertiary:     IDs, metadata, system messages
Background:   Panel backgrounds, separators
```

### Interactive States
```
Default:      Base styling
Hover:        Background lightens, cursor pointer
Active:       Slightly darker, scale(0.98)
Focus:        2px outline, no background change
Disabled:     50% opacity, cursor not-allowed
Loading:      Pulse animation or spinner
```

---

## Implementation Priority

**IMPORTANT:** All three phases will be completed before moving on to new features. This is the complete implementation plan.

### MVP (Phase 1)
1. Basic 3-panel layout with resizable panels (desktop)
2. Channel navigation + message display with realtime updates
3. Terminal with SQL/JavaScript execution
4. Supabase PostgREST JSON response display
5. ID hover + copy functionality
6. Basic error handling
7. TanStack Query + Supabase Cache Helpers setup
8. TanStack Store for UI state

### Enhanced (Phase 2)
1. Responsive design (tablet, mobile with proper breakpoints)
2. Query history (persisted to LocalStorage)
3. All keyboard shortcuts (natural dev shortcuts)
4. Syntax highlighting (SQL & JavaScript)
5. Result formatting (tables, timestamps, badges)
6. Terminal input/output resize handles
7. Language auto-detection with manual override
8. Panel size persistence

### Polished (Phase 3)
1. Query templates/examples
2. Confirmation dialogs for destructive queries
3. All keyboard shortcut polish (? for help modal)
4. Advanced result display (virtual scrolling, pagination)
5. Performance optimizations (React.memo, debouncing)
6. Accessibility audit (ARIA, screen readers, keyboard nav)
7. Export results (CSV, JSON)
8. Error hints and suggestions

---

This plan serves as the comprehensive blueprint for implementation. All design decisions are documented and ready for development. All three phases are required for a complete, production-ready application.
