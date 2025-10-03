# Features Overview

## What Users See

### 🎨 Visual Design

**Background**
- Soft gradient: green-50 → emerald-50 → teal-50
- Clean, modern aesthetic
- Supabase brand colors

**Header**
- Database icon (lucide-react)
- Large title with gradient text
- Descriptive subtitle

**Layout**
- Two-column grid (responsive)
- Left: SQL Editor
- Right: Output Display

### ⌨️ SQL Editor (Left Column)

**Card Title**: "PostgreSQL Query"

**Features:**
- Large textarea (300px min height)
- Monospace font for code
- Auto-resizing
- Placeholder text
- API URL input field
- Large "Convert" button
- Keyboard shortcut hint: `Cmd/Ctrl + Enter`

**Styling:**
- White card with shadow
- Green primary button
- Clean borders

### 📤 Output Panel (Right Column)

**Card Title**: "PostgREST Request"

**When Empty:**
- Database icon (grayed out)
- "Enter a SQL query and click Convert" message

**When Filled:**

1. **Summary Badges**
   - Method badge (color-coded)
   - Headers count (if present)

2. **URL Display**
   - Full URL in monospace
   - Wrapped in secondary background

3. **JSON Output**
   - Dark code block (slate-900 bg)
   - Syntax formatted
   - Scrollable

4. **Copy Button**
   - Top-right corner
   - Icon changes on click
   - Success feedback

### 🎯 Method Colors

- **GET** - Green (success vibe)
- **POST** - Blue (creation)
- **PATCH** - Orange (modification)
- **DELETE** - Red (warning)

### 💡 User Interactions

1. **Type SQL** → Textarea updates
2. **Press Cmd+Enter** → Converts query
3. **Click Convert** → Same result
4. **View Output** → JSON appears
5. **Click Copy** → Clipboard + feedback icon
6. **Responsive** → Stacks on mobile

### ⚡ Loading States

- WASM Loading: Spinner + message
- Error: Red card with message
- Ready: Full interface

### 📱 Responsive Behavior

- **Desktop** (lg+): Two columns side-by-side
- **Mobile** (<lg): Stacks vertically
- **Tablet**: Adapts smoothly

### 🎨 shadcn/ui Components Used

- `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent`
- `Button` (primary, outline variants)
- `Textarea`
- Icons from `lucide-react`

### ✨ Polish Details

- Smooth transitions
- Hover states
- Focus rings
- Proper spacing (Tailwind gap/space utilities)
- Consistent border radius
- Shadow elevations
- Typography hierarchy

## Technical Features

### Performance
- Fast WASM load (~100-200ms)
- Instant conversion (<1ms)
- Optimized builds
- Tree-shaking

### Developer Experience
- TypeScript strict mode
- Hot Module Replacement
- Clear error messages
- Type-safe props

### Accessibility
- Semantic HTML
- Keyboard navigation
- Focus management
- Color contrast (WCAG AA)

## Comparison to Previous Version

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Theme | Purple gradient | Supabase green |
| Examples | 8 buttons | Removed |
| Layout | Complex | Simple 2-column |
| CSS | Custom | Tailwind + shadcn |
| Icons | Emoji | lucide-react |
| Config | Separate panel | Inline |
| Polish | Good | Excellent |

## User Flow

```
1. Land on page
   ↓
2. See example SQL pre-filled
   ↓
3. (Optional) Modify SQL or enter new query
   ↓
4. (Optional) Change API URL
   ↓
5. Click "Convert" OR press Cmd+Enter
   ↓
6. View formatted output
   ↓
7. Click "Copy" to get JSON
   ↓
8. Use in your application!
```

## Why This Design?

✅ **Focused** - No distractions, just SQL → PostgREST  
✅ **Professional** - Supabase branding, clean UI  
✅ **Fast** - Minimal clicks to convert  
✅ **Clear** - Obvious what to do  
✅ **Modern** - Current design trends  
✅ **Accessible** - Works for everyone  

Perfect for developers who want a quick, beautiful tool to generate PostgREST requests!
