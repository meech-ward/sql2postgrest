import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import type { Extension } from '@codemirror/state'
import { githubLight, githubDark } from '@uiw/codemirror-theme-github'

const CodeMirror = lazy(() => import('@uiw/react-codemirror'))

type Theme = 'dark' | 'light' | 'system'

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  extensions: Extension[]
  theme: Theme
  placeholder?: string
  editable?: boolean
  minHeight?: string
  autoFocus?: boolean
}

export function CodeEditor({
  value,
  onChange,
  extensions,
  theme,
  placeholder,
  editable = true,
  minHeight = '100px',
  autoFocus = false,
}: CodeEditorProps) {
  // Handle 'system' theme by defaulting to 'light'
  const resolvedTheme = theme === 'system' ? 'light' : theme
  const codemirrorTheme = resolvedTheme === 'dark' ? githubDark : githubLight

  return (
    <div className="relative">
      <Suspense
        fallback={
          <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
          </div>
        }
      >
        <CodeMirror
          autoFocus={autoFocus}
          value={value}
          onChange={onChange}
          theme={codemirrorTheme}
          extensions={extensions}
          placeholder={placeholder}
          className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
          editable={editable}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: false,
            foldGutter: false,
            allowMultipleSelections: true,
            autocompletion: true,
          }}
          minHeight={minHeight}
          style={{
            fontSize: '14px',
          }}
        />
      </Suspense>
      {!editable && (
        <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-lg flex items-center justify-center pointer-events-none">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
        </div>
      )}
    </div>
  )
}
