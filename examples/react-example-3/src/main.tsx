import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/components/theme-provider'
import { Terminal } from '@/components/layout/terminal'
import { Toaster } from 'sonner'
import '@/styles/globals.css'
import '@/styles/terminal-theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="sql-chat-theme">
      <QueryClientProvider client={queryClient}>
        <div className="h-screen w-screen overflow-hidden bg-[#1e1e1e]">
          <Terminal />
        </div>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
