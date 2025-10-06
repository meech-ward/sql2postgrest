import { Database } from 'lucide-react'

interface PageLayoutProps {
  children: React.ReactNode
  title: string
}

export function PageLayout({ children, title }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden flex flex-col pt-16">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-emerald-200/30 dark:bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/4 -right-1/4 w-[32rem] h-[32rem] bg-teal-200/30 dark:bg-teal-500/20 rounded-full blur-3xl animate-pulse [animation-delay:1s]"></div>
        <div className="absolute -bottom-1/4 left-1/3 w-80 h-80 bg-green-200/30 dark:bg-green-500/20 rounded-full blur-3xl animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 relative z-10 flex-1">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900 shadow-sm">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg">
              <Database className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
              {title}
            </h1>
          </div>
        </header>

        {children}
      </div>

      <footer className="text-center py-6 relative z-10">
        <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>Powered by</span>
          <a
            href="https://github.com/meech-ward/sql2postgrest"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-emerald-200 dark:decoration-emerald-800 hover:decoration-emerald-400 dark:hover:decoration-emerald-600 transition-colors"
          >
            sql2postgrest
          </a>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <a
            href="https://github.com/multigres/multigres"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-emerald-200 dark:decoration-emerald-800 hover:decoration-emerald-400 dark:hover:decoration-emerald-600 transition-colors"
          >
            multigres
          </a>
        </div>
      </footer>
    </div>
  )
}
