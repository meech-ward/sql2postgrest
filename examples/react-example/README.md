# SQL to PostgREST - React Example

A modern, beautiful React application that converts PostgreSQL queries to PostgREST API requests using WebAssembly.

## Features

- ✨ Real-time SQL to PostgREST conversion
- 🎨 Beautiful Supabase green-themed UI
- ⚛️ Built with React 19 + TypeScript + Vite
- 🎯 Tailwind CSS + shadcn/ui components
- ⌨️ Keyboard shortcuts (Cmd/Ctrl + Enter)
- 📋 One-click copy to clipboard
- 🚀 Lightning-fast with Vite HMR
- 📱 Fully responsive design

## Quick Start

```bash
# Install dependencies
bun install

# Start dev server
bun run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Usage

1. **Write SQL**: Enter your PostgreSQL query in the left editor
2. **Configure**: Set your PostgREST API URL (default: `http://localhost:3000`)
3. **Convert**: Click "Convert" or press `Cmd/Ctrl + Enter`
4. **Copy**: Use the copy button to copy the JSON result

## UI Components

Built with shadcn/ui:
- Card - Clean container components
- Button - Primary actions
- Textarea - SQL editor
- Icons from lucide-react

## Theme

Custom Supabase green theme:
- Primary: `#3ECF8E` (Supabase green)
- Background: Soft gradient from green-50 to emerald-50
- Clean, modern design with proper spacing

## Development

```bash
# Development with HMR
bun run dev

# Type check and build
bun run build

# Preview production build
bun run preview

# Lint
bun run lint
```

## Tech Stack

- **React 19** - Latest React
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Re-usable components
- **Bun** - Fast package manager
- **WebAssembly** - SQL conversion

## Project Structure

```
src/
├── components/
│   └── ui/              # shadcn components
│       ├── button.tsx
│       ├── card.tsx
│       └── textarea.tsx
├── hooks/
│   └── useSQL2PostgREST.ts  # WASM integration
├── App.tsx              # Main component
└── index.css            # Tailwind + theme
```

## Customization

### Theme Colors

Edit `src/index.css`:

```css
:root {
  --primary: 62 207 142;  /* Supabase green */
  --secondary: 240 253 244;
  /* ... */
}
```

### Adding Components

```bash
bunx shadcn@latest add [component-name]
```

## Deployment

```bash
bun run build
# Deploy dist/ folder to:
# - Vercel
# - Netlify
# - GitHub Pages
# - Any static host
```

## Browser Support

- Chrome/Edge 57+
- Firefox 52+
- Safari 11+

Requires WebAssembly support.

## License

Apache 2.0
