import { Link, useRouterState } from '@tanstack/react-router'
import { ModeToggle } from './mode-toggle'

export function Navbar() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
      <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors ${
              currentPath === '/' 
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            PostgREST
          </Link>
          <Link 
            to="/supabase" 
            className={`text-sm font-medium transition-colors ${
              currentPath === '/supabase' 
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            Supabase
          </Link>
        </div>
        <ModeToggle />
      </div>
    </nav>
  )
}
