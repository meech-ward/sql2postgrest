# Changelog

## v2.0.0 - Modern Redesign (Current)

### ✨ New Features
- Beautiful Supabase green theme
- Clean two-column layout
- Removed example buttons (focus on SQL editor)
- Added lucide-react icons
- Keyboard shortcut hints with visual kbd elements
- Copy button with success feedback
- Method-specific color coding
- Responsive design

### 🎨 UI/UX Improvements
- Gradient background (green-50 → emerald-50 → teal-50)
- shadcn/ui components (Card, Button, Textarea)
- Tailwind CSS v4
- Better spacing and typography
- Clean, minimal design
- Loading and error states
- Professional footer

### 🐛 Bug Fixes
- Fixed duplicate SQL2PostgREST declaration error
- Added script loading check to prevent re-initialization
- Improved WASM error handling

### 🔧 Technical Changes
- Migrated to Tailwind CSS v4
- Added shadcn/ui component library
- Removed custom CSS (App.css)
- Streamlined component structure
- Updated color system to use CSS custom properties

### 📦 Dependencies Added
- lucide-react - Icon library
- tailwindcss v4 - Styling
- @tailwindcss/vite - Vite plugin

### 📦 Dependencies Removed
- Custom CSS variables
- Old component files

## v1.0.0 - Initial Release

### Features
- Basic React + TypeScript setup
- WASM integration
- Custom components
- 8 example queries
- Copy to clipboard
- Custom styling

---

**Migration from v1 to v2:**
- No breaking changes in WASM integration
- UI completely redesigned
- Example buttons removed
- Cleaner, more focused interface
