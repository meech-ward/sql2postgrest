import { ReactNode } from 'react'

interface ConversionCardProps {
  title: string
  description: string
  dotColor: 'emerald' | 'teal' | 'purple' | 'blue'
  children: ReactNode
}

const DOT_COLORS = {
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
}

export function ConversionCard({ title, description, dotColor, children }: ConversionCardProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${DOT_COLORS[dotColor]}`}></span>
          {title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {description}
        </p>
      </div>
      <div className="p-6 space-y-5">
        {children}
      </div>
    </div>
  )
}
