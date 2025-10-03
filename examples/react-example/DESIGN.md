# Design System

## Color Palette (Supabase Green Theme)

### Light Mode
- **Primary**: `#3ECF8E` (Supabase Green)
- **Background**: Gradient from `green-50` to `emerald-50` to `teal-50`
- **Cards**: White with subtle shadows
- **Text**: Slate gray tones
- **Accents**: Green variants

### Method Colors
- **GET**: Green (`text-green-600`)
- **POST**: Blue (`text-blue-600`)
- **PATCH**: Orange (`text-orange-600`)
- **DELETE**: Red (`text-red-600`)

## Layout

### Two-Column Grid
```
┌─────────────────────────────────────┐
│         Header + Logo               │
├──────────────────┬──────────────────┤
│  SQL Editor      │  PostgREST       │
│  Card            │  Output Card     │
│                  │                  │
│  • Textarea      │  • Method badge  │
│  • API URL       │  • URL display   │
│  • Convert btn   │  • JSON output   │
│                  │  • Copy button   │
└──────────────────┴──────────────────┘
│         Footer                      │
└─────────────────────────────────────┘
```

## Typography

- **Headings**: System font stack
- **Code/SQL**: Monospace font
- **Body**: Sans-serif

## Components Used

1. **Card** - Main containers
2. **Button** - Actions
3. **Textarea** - SQL input
4. **Icons** - lucide-react (Database, Copy, CheckCheck, Loader2)

## Interactions

- Hover states on buttons
- Copy feedback with icon change
- Loading spinner
- Keyboard shortcut hints
- Responsive grid (stacks on mobile)

## Spacing

- Container: `max-w-6xl`
- Gaps: `gap-6` (24px)
- Padding: `p-6` (24px)
- Card content: `space-y-4` (16px)
