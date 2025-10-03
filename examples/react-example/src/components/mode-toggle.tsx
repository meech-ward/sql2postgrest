import { Moon, Sun, Monitor } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Sun className="h-5 w-5 scale-100 rotate-0 transition-transform duration-300 dark:scale-0 dark:-rotate-90 text-amber-500" />
          <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-transform duration-300 dark:scale-100 dark:rotate-0 text-slate-400 dark:text-slate-300" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-700 shadow-xl min-w-[140px]"
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <Sun className="h-4 w-4 mr-2 text-amber-500" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <Moon className="h-4 w-4 mr-2 text-slate-600 dark:text-slate-400" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <Monitor className="h-4 w-4 mr-2 text-slate-600 dark:text-slate-400" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
