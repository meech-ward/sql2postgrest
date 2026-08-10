import { useRef } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { setupSqlAutocomplete } from '@/lib/sql-autocomplete'
import { useMonacoTheme } from '@/components/theme-provider'

interface SqlEditorProps {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
}

export function SqlEditor({ value, onChange, onRun }: SqlEditorProps) {
  const isSetup = useRef(false)
  const monacoTheme = useMonacoTheme()

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '')
  }

  const handleEditorWillMount = (monaco: Monaco) => {
    if (isSetup.current) return

    // Setup SQL autocomplete
    setupSqlAutocomplete(monaco)

    isSetup.current = true
  }

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editor.focus()

    // Add Cmd+Enter / Ctrl+Enter keybinding to run query
    if (onRun) {
      editor.addAction({
        id: 'run-sql-query',
        label: 'Run SQL Query',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        ],
        run: () => {
          onRun()
        },
      })
    }
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="sql"
      value={value}
      onChange={handleEditorChange}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
      theme={monacoTheme}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        wrappingIndent: 'same',
        folding: true,
        foldingStrategy: 'indentation',
        renderLineHighlight: 'all',
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        padding: {
          top: 8,
          bottom: 8,
        },
        fixedOverflowWidgets: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        suggest: {
          showKeywords: true,
          showSnippets: true,
          showClasses: true,
          showFunctions: true,
          showFields: true,
          filterGraceful: true,
          insertMode: 'replace',
        },
      }}
    />
  )
}
