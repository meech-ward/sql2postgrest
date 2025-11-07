import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

interface Example {
  label: string
  [key: string]: any
}

interface ExampleDropdownProps<T extends Example> {
  examples: T[]
  onSelect: (example: T) => void
  label?: string
}

export function ExampleDropdown<T extends Example>({
  examples,
  onSelect,
  label = 'Examples'
}: ExampleDropdownProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
          {label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="text-slate-900 dark:text-slate-100">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {examples.map((example, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => onSelect(example)}
            className="text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
          >
            {example.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
