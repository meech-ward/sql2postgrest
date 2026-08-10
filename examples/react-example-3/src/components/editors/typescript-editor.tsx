import { useRef } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { setupMonacoTypes } from '@/lib/monaco-setup'
import { useMonacoTheme } from '@/components/theme-provider'

interface TypeScriptEditorProps {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
}

export function TypeScriptEditor({ value, onChange, onRun }: TypeScriptEditorProps) {
  const monacoRef = useRef<Monaco | null>(null)
  const isSetup = useRef(false)
  const monacoTheme = useMonacoTheme()

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '')
  }

  const handleEditorWillMount = (monaco: Monaco) => {
    if (isSetup.current) return

    monacoRef.current = monaco

    // Setup Supabase types FIRST
    setupMonacoTypes(monaco)

    // Configure TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: false,
      checkJs: false,
      strict: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      strictPropertyInitialization: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noImplicitAny: true,
      noImplicitThis: true,
      alwaysStrict: true,
    })

    // Enable all diagnostics
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
      diagnosticCodesToIgnore: [],
    })

    // Set eager model sync for better type checking
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)

    isSetup.current = true
  }

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editor.focus()

    // Add Cmd+Enter / Ctrl+Enter keybinding to run query
    if (onRun) {
      editor.addAction({
        id: 'run-js-query',
        label: 'Run JavaScript Query',
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
      defaultLanguage="typescript"
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
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true,
        },
        parameterHints: {
          enabled: true,
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        wordBasedSuggestions: 'off',
        suggest: {
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showUnits: true,
          showValues: true,
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showKeywords: true,
          showWords: true,
          showColors: true,
          showFiles: true,
          showReferences: true,
          showFolders: true,
          showTypeParameters: true,
          showSnippets: true,
          insertMode: 'replace',
          filterGraceful: true,
          snippetsPreventQuickSuggestions: false,
        },
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
      }}
    />
  )
}
