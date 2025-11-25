import { Play, Loader2, Database, Code2, Globe, Terminal as TerminalIcon, ChevronDown, CheckCircle2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStore } from '@tanstack/react-store'
import {
  terminalStore,
  setSqlCode,
  setJsCode,
  setPostgrestMethod,
  setPostgrestPath,
  setPostgrestBody,
  setLastEditedEditor,
  setIsExecuting,
  setOutputData,
  setExecutionStatus,
  setExecutionTime,
  setRowCount,
  setExecutionError,
  setIsInitializing,
  setHasInitialSyncCompleted,
  setSupabaseCredentials,
} from '@/stores/terminal-store'
import { useCallback, useEffect, useRef, useState } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PostgrestPane } from "./postgrest-pane"
import { OutputDisplay } from "./output-display"
import { SqlEditor } from "@/components/editors/sql-editor"
import { TypeScriptEditor } from "@/components/editors/typescript-editor"
import { useSQL2PostgREST } from "@/hooks/useSQL2PostgREST"
import { usePostgREST2SQL } from "@/hooks/usePostgREST2SQL"
import { useEditorSync } from "@/hooks/useEditorSync"
import { executePostgrestRequest } from "@/lib/execute-query"
import { sqlToPostgREST, supabaseJsToPostgREST } from "@/lib/editor-conversions"
import { TerminalLoadingOverlay } from "./terminal-loading-overlay"
import { QUERY_EXAMPLES, EXAMPLE_CATEGORIES, type QueryExample } from "@/constants/query-examples"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface EditorPanelProps {
  title: string
  icon: React.ReactNode
  accentColor: string
  children: React.ReactNode
  onRun?: () => void
  isExecuting?: boolean
  badge?: string
  examplesDropdown?: React.ReactNode
  onCopy?: () => string
  copyDropdown?: React.ReactNode
}

function EditorPanel({ title, icon, accentColor, children, onRun, isExecuting, badge, examplesDropdown, onCopy, copyDropdown }: EditorPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!onCopy) return
    const text = onCopy()
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [onCopy])

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2d2d2d] bg-[#252526] min-w-0">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className={`${accentColor} shrink-0`}>
            {icon}
          </div>
          <span className="text-xs font-medium text-gray-300 shrink-0">{title}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3d3d3d] text-gray-400 font-mono hidden sm:inline">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {examplesDropdown}
          {copyDropdown}
          {onCopy && (
            <Button
              size="sm"
              onClick={handleCopy}
              className="h-6 text-[10px] px-2 gap-1 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 hover:text-gray-300 border border-gray-500/20 hover:border-gray-500/40 transition-all"
              title="Copy"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
            </Button>
          )}
          {onRun && (
            <Button
              size="sm"
              onClick={onRun}
              disabled={isExecuting}
              className="h-6 text-[10px] px-2.5 gap-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 transition-all disabled:opacity-50"
            >
              {isExecuting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              Run
            </Button>
          )}
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

type CopyFormat = 'curl' | 'fetch' | 'json' | 'url'

interface CopyFormatDropdownProps {
  getContent: (format: CopyFormat) => string
}

function CopyFormatDropdown({ getContent }: CopyFormatDropdownProps) {
  const [copied, setCopied] = useState<CopyFormat | null>(null)

  const handleCopy = useCallback(async (format: CopyFormat) => {
    const text = getContent(format)
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(format)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [getContent])

  const formatLabels: Record<CopyFormat, string> = {
    curl: 'cURL',
    fetch: 'JS Fetch',
    json: 'JSON',
    url: 'URL Only',
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="h-6 text-[10px] px-2 gap-1 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 hover:text-gray-300 border border-gray-500/20 hover:border-gray-500/40 transition-all"
        >
          <Copy className="h-3 w-3" />
          <span className="hidden sm:inline">Copy</span>
          <ChevronDown className="h-2.5 w-2.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#252526] border-[#3d3d3d] min-w-[140px]">
        <DropdownMenuLabel className="text-[10px] text-gray-500 font-normal">Copy as...</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#3d3d3d]" />
        {(Object.keys(formatLabels) as CopyFormat[]).map((format) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleCopy(format)}
            className="text-xs text-gray-300 hover:bg-[#3d3d3d] cursor-pointer flex items-center justify-between"
          >
            <span>{formatLabels[format]}</span>
            {copied === format && (
              <Check className="h-3 w-3 text-emerald-400" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ExamplesDropdownProps {
  onSelect: (example: QueryExample) => void
  variant?: 'sql' | 'js' | 'postgrest'
}

function ExamplesDropdown({ onSelect, variant = 'sql' }: ExamplesDropdownProps) {
  const variantColors = {
    sql: 'text-blue-400 hover:text-blue-300',
    js: 'text-emerald-400 hover:text-emerald-300',
    postgrest: 'text-orange-400 hover:text-orange-300',
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-2 text-[10px] gap-1 ${variantColors[variant]} hover:bg-white/5`}
        >
          <ChevronDown className="h-3 w-3" />
          Examples
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 max-h-[400px] overflow-y-auto bg-[#252526] border-[#3d3d3d] text-gray-300"
      >
        <DropdownMenuLabel className="text-gray-400 text-xs">Query Examples</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#3d3d3d]" />
        {EXAMPLE_CATEGORIES.map((category) => {
          const categoryExamples = QUERY_EXAMPLES.filter(ex => ex.category === category)
          if (categoryExamples.length === 0) return null

          return (
            <div key={category}>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                {category}
              </div>
              {categoryExamples.map(example => (
                <DropdownMenuItem
                  key={example.label}
                  className="text-xs cursor-pointer focus:bg-white/10 focus:text-white px-2 py-1.5"
                  onClick={() => onSelect(example)}
                >
                  {example.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-[#3d3d3d]" />
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Terminal() {
  const {
    sqlCode,
    jsCode,
    postgrestMethod,
    postgrestPath,
    postgrestBody,
    postgrestHeaders,
    isExecuting,
    outputData,
    executionStatus,
    executionStatusText,
    executionTime,
    rowCount,
    executionError,
    isInitializing,
    hasInitialSyncCompleted,
    supabaseUrl,
    supabaseAnonKey,
  } = useStore(terminalStore)
  const initialSyncAttempted = useRef(false)

  // Detect mobile devices (screen width < 1024px for tablet and below)
  const isMobile = useMediaQuery('(max-width: 1023px)')

  // Check if credentials are set
  const hasCredentials = supabaseUrl.trim() !== '' && supabaseAnonKey.trim() !== ''

  const handleSetCredentials = useCallback((url: string, anonKey: string) => {
    setSupabaseCredentials(url, anonKey)
  }, [])

  const { convert: convertSQL2PostgREST, isReady: isReadySQL2PostgREST, startLoading: startLoadingSQL2PostgREST } = useSQL2PostgREST();
  const { convert: convertPostgREST2SQL, isReady: isReadyPostgREST2SQL, startLoading: startLoadingPostgREST2SQL } = usePostgREST2SQL()

  // Initialize WASM modules
  useEffect(() => {
    const timer = setTimeout(() => {
      startLoadingSQL2PostgREST();
      startLoadingPostgREST2SQL();
    }, 100);

    return () => clearTimeout(timer);
  }, [startLoadingSQL2PostgREST, startLoadingPostgREST2SQL]);

  // Set up editor syncing and get sync functions
  const { syncFromSQL } = useEditorSync({
    convertSQL2PostgREST,
    convertPostgREST2SQL,
    isReadySQL2PostgREST,
    isReadyPostgREST2SQL,
    baseUrl: window.location.origin,
  })

  // Handle initial sync from localStorage
  useEffect(() => {
    if (initialSyncAttempted.current) return
    if (!isReadySQL2PostgREST || !isReadyPostgREST2SQL) return

    initialSyncAttempted.current = true

    if (sqlCode && isInitializing && !hasInitialSyncCompleted) {
      syncFromSQL().then(() => {
        setIsInitializing(false)
        setHasInitialSyncCompleted(true)
      })
    } else {
      setIsInitializing(false)
      setHasInitialSyncCompleted(true)
    }
  }, [isReadySQL2PostgREST, isReadyPostgREST2SQL, sqlCode, isInitializing, hasInitialSyncCompleted, syncFromSQL])

  const handleSqlCodeChange = useCallback((value: string) => {
    setSqlCode(value)
    const state = terminalStore.state
    if (!state.syncInProgress) {
      setLastEditedEditor('sql')
    }
  }, [])

  const handleJsCodeChange = useCallback((value: string) => {
    setJsCode(value)
    const state = terminalStore.state
    if (!state.syncInProgress) {
      setLastEditedEditor('js')
    }
  }, [])

  // Example handlers
  const handleSelectSqlExample = useCallback((example: QueryExample) => {
    setSqlCode(example.sql)
    setLastEditedEditor('sql')
  }, [])

  const handleSelectJsExample = useCallback((example: QueryExample) => {
    setJsCode(example.supabaseJs)
    setLastEditedEditor('js')
  }, [])

  const handleSelectPostgrestExample = useCallback((example: QueryExample) => {
    setPostgrestMethod(example.postgrest.method)
    setPostgrestPath(example.postgrest.path)
    setPostgrestBody(example.postgrest.body || '')
    setLastEditedEditor('postgrest')
  }, [])

  const handleRunSql = async () => {
    if (!sqlCode.trim()) return
    if (!hasCredentials) {
      setExecutionError('Please enter your Supabase credentials first')
      return
    }

    const postgrestResult = sqlToPostgREST(sqlCode, supabaseUrl, convertSQL2PostgREST)

    if (!postgrestResult.success || !postgrestResult.data) {
      setExecutionError(postgrestResult.error || 'Failed to convert SQL to PostgREST')
      return
    }

    const request = postgrestResult.data

    setIsExecuting(true)

    const result = await executePostgrestRequest(
      request.method,
      `${request.path}${request.query ? `?${request.query}` : ''}`,
      request.body,
      request.headers,
      { url: supabaseUrl, anonKey: supabaseAnonKey }
    )

    setIsExecuting(false)
    setOutputData(result.data)
    setExecutionStatus(result.status, result.statusText)
    setExecutionTime(result.time)
    setRowCount(result.rowCount)
    setExecutionError(result.error)
  }

  const handleRunJs = async () => {
    if (!jsCode.trim()) return
    if (!hasCredentials) {
      setExecutionError('Please enter your Supabase credentials first')
      return
    }

    const postgrestResult = await supabaseJsToPostgREST(jsCode, supabaseUrl)

    if (!postgrestResult.success || !postgrestResult.data) {
      setExecutionError(postgrestResult.error || 'Failed to convert JS to PostgREST')
      return
    }

    const request = postgrestResult.data

    setIsExecuting(true)

    const result = await executePostgrestRequest(
      request.method,
      `${request.path}${request.query ? `?${request.query}` : ''}`,
      request.body,
      request.headers,
      { url: supabaseUrl, anonKey: supabaseAnonKey }
    )

    setIsExecuting(false)
    setOutputData(result.data)
    setExecutionStatus(result.status, result.statusText)
    setExecutionTime(result.time)
    setRowCount(result.rowCount)
    setExecutionError(result.error)
  }

  const handleRunPostgrest = async () => {
    if (!postgrestPath.trim()) return
    if (!hasCredentials) {
      setExecutionError('Please enter your Supabase credentials first')
      return
    }

    setIsExecuting(true)

    const result = await executePostgrestRequest(
      postgrestMethod,
      postgrestPath,
      postgrestBody,
      postgrestHeaders,
      { url: supabaseUrl, anonKey: supabaseAnonKey }
    )

    setIsExecuting(false)
    setOutputData(result.data)
    setExecutionStatus(result.status, result.statusText)
    setExecutionTime(result.time)
    setRowCount(result.rowCount)
    setExecutionError(result.error)
  }

  // Copy handlers
  const handleCopySql = useCallback(() => {
    return sqlCode
  }, [sqlCode])

  const handleCopyJs = useCallback(() => {
    return jsCode
  }, [jsCode])

  const getPostgrestCopyContent = useCallback((format: CopyFormat): string => {
    if (!postgrestPath.trim()) return ''

    // Build the full URL
    const baseUrl = supabaseUrl ? supabaseUrl.replace(/\/$/, '') : '<your-project-url>'
    const cleanPath = postgrestPath.startsWith('/rest/v1') ? postgrestPath : `/rest/v1${postgrestPath}`
    const fullUrl = `${baseUrl}${cleanPath}`

    // Standard headers
    const anonKeyDisplay = supabaseAnonKey || '<your-api-key>'
    const allHeaders: Record<string, string> = {
      'apikey': anonKeyDisplay,
      'Authorization': `Bearer ${anonKeyDisplay}`,
      'Content-Type': 'application/json',
    }

    // Add custom headers
    if (postgrestHeaders && typeof postgrestHeaders === 'object') {
      Object.entries(postgrestHeaders).forEach(([key, value]) => {
        if (!['apikey', 'authorization', 'content-type'].includes(key.toLowerCase())) {
          allHeaders[key] = value
        }
      })
    }

    const hasBody = postgrestBody && (postgrestMethod === 'POST' || postgrestMethod === 'PATCH')

    switch (format) {
      case 'curl': {
        const parts: string[] = ['curl']
        if (postgrestMethod !== 'GET') {
          parts.push(`-X ${postgrestMethod}`)
        }
        parts.push(`'${fullUrl}'`)
        Object.entries(allHeaders).forEach(([key, value]) => {
          parts.push(`-H '${key}: ${value}'`)
        })
        if (hasBody) {
          const escapedBody = postgrestBody.replace(/'/g, "'\\''")
          parts.push(`-d '${escapedBody}'`)
        }
        return parts.join(' \\\n  ')
      }

      case 'fetch': {
        const fetchOptions: string[] = []
        fetchOptions.push(`  method: '${postgrestMethod}'`)
        fetchOptions.push(`  headers: ${JSON.stringify(allHeaders, null, 4).split('\n').join('\n  ')}`)
        if (hasBody) {
          fetchOptions.push(`  body: JSON.stringify(${postgrestBody})`)
        }
        return `fetch('${fullUrl}', {\n${fetchOptions.join(',\n')}\n})`
      }

      case 'json': {
        const jsonObj: Record<string, unknown> = {
          method: postgrestMethod,
          url: fullUrl,
          headers: allHeaders,
        }
        if (hasBody) {
          try {
            jsonObj.body = JSON.parse(postgrestBody)
          } catch {
            jsonObj.body = postgrestBody
          }
        }
        return JSON.stringify(jsonObj, null, 2)
      }

      case 'url': {
        return fullUrl
      }

      default:
        return ''
    }
  }, [postgrestMethod, postgrestPath, postgrestBody, postgrestHeaders, supabaseUrl, supabaseAnonKey])

  const showLoadingOverlay = isInitializing || (!isReadySQL2PostgREST || !isReadyPostgREST2SQL)
  const loadingStatus = !isReadySQL2PostgREST || !isReadyPostgREST2SQL
    ? 'loading-wasm'
    : 'syncing-editors'

  return (
    <div className="flex h-full flex-col bg-[#0d0d0d] text-white relative">
      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <TerminalLoadingOverlay
          status={loadingStatus}
          wasmSQL2PostgRESTReady={isReadySQL2PostgREST}
          wasmPostgREST2SQLReady={isReadyPostgREST2SQL}
        />
      )}

      {/* Main Layout: Responsive based on screen size */}
      {isMobile ? (
        /* Mobile Layout: All panels stacked vertically */
        <ResizablePanelGroup direction="vertical" className="flex-1">

          {/* SQL Editor */}
          <ResizablePanel defaultSize={25} minSize={15}>
            <EditorPanel
              title="SQL"
              icon={<Database className="h-3.5 w-3.5" />}
              accentColor="text-blue-400"
              onRun={handleRunSql}
              isExecuting={isExecuting}
              badge="PostgreSQL"
              examplesDropdown={<ExamplesDropdown onSelect={handleSelectSqlExample} variant="sql" />}
              onCopy={handleCopySql}
            >
              <SqlEditor value={sqlCode} onChange={handleSqlCodeChange} onRun={handleRunSql} />
            </EditorPanel>
          </ResizablePanel>

          <ResizableHandle className="h-[4px] bg-[#2d2d2d] hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors touch-none cursor-row-resize" />

          {/* Supabase JS Editor */}
          <ResizablePanel defaultSize={25} minSize={15}>
            <EditorPanel
              title="Supabase JS"
              icon={<Code2 className="h-3.5 w-3.5" />}
              accentColor="text-emerald-400"
              onRun={handleRunJs}
              isExecuting={isExecuting}
              badge="TypeScript"
              examplesDropdown={<ExamplesDropdown onSelect={handleSelectJsExample} variant="js" />}
              onCopy={handleCopyJs}
            >
              <TypeScriptEditor value={jsCode} onChange={handleJsCodeChange} onRun={handleRunJs} />
            </EditorPanel>
          </ResizablePanel>

          <ResizableHandle className="h-[4px] bg-[#2d2d2d] hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors touch-none cursor-row-resize" />

          {/* PostgREST Editor */}
          <ResizablePanel defaultSize={25} minSize={15}>
            <EditorPanel
              title="PostgREST"
              icon={<Globe className="h-3.5 w-3.5" />}
              accentColor="text-orange-400"
              onRun={handleRunPostgrest}
              isExecuting={isExecuting}
              badge="HTTP"
              examplesDropdown={<ExamplesDropdown onSelect={handleSelectPostgrestExample} variant="postgrest" />}
              copyDropdown={<CopyFormatDropdown getContent={getPostgrestCopyContent} />}
            >
              <PostgrestPane />
            </EditorPanel>
          </ResizablePanel>

          <ResizableHandle className="h-[4px] bg-[#2d2d2d] hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors touch-none cursor-row-resize" />

          {/* Output */}
          <ResizablePanel defaultSize={25} minSize={15}>
            <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
              {/* Output Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#2d2d2d] bg-[#252526]">
                <div className="flex items-center gap-2">
                  <div className="text-purple-400">
                    <TerminalIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">Output</span>
                  {hasCredentials && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 ml-2">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Connected</span>
                    </div>
                  )}
                </div>

                {/* Status indicators */}
                <div className="flex items-center gap-2 text-[10px] sm:gap-3 sm:text-[11px]">
                  {executionStatus !== null && (
                    <div className="flex items-center gap-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        executionStatus >= 200 && executionStatus < 300
                          ? 'bg-emerald-400'
                          : executionStatus >= 400 && executionStatus < 500
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                      }`} />
                      <span className={
                        executionStatus >= 200 && executionStatus < 300
                          ? 'text-emerald-400'
                          : executionStatus >= 400 && executionStatus < 500
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }>
                        {executionStatus}
                      </span>
                    </div>
                  )}
                  {rowCount !== null && (
                    <span className="text-gray-500 hidden sm:inline">
                      {rowCount} {rowCount === 1 ? 'row' : 'rows'}
                    </span>
                  )}
                  {executionTime !== null && (
                    <span className="text-gray-500 font-mono">
                      {executionTime}ms
                    </span>
                  )}
                </div>
              </div>

              {/* Output Content */}
              <div className="flex-1 overflow-hidden bg-[#0d0d0d]">
                <OutputDisplay
                  isExecuting={isExecuting}
                  data={outputData}
                  error={executionError}
                  hasCredentials={hasCredentials}
                  onSetCredentials={handleSetCredentials}
                />
              </div>
            </div>
          </ResizablePanel>

        </ResizablePanelGroup>
      ) : (
        /* Desktop Layout: Editors on top (horizontal), Output on bottom */
        <ResizablePanelGroup direction="vertical" className="flex-1">

          {/* Top Section: Three Editors Side by Side */}
          <ResizablePanel defaultSize={65} minSize={30}>
            <ResizablePanelGroup direction="horizontal">

              {/* SQL Editor */}
              <ResizablePanel defaultSize={33} minSize={20}>
                <EditorPanel
                  title="SQL"
                  icon={<Database className="h-3.5 w-3.5" />}
                  accentColor="text-blue-400"
                  onRun={handleRunSql}
                  isExecuting={isExecuting}
                  badge="PostgreSQL"
                  examplesDropdown={<ExamplesDropdown onSelect={handleSelectSqlExample} variant="sql" />}
                  onCopy={handleCopySql}
                >
                  <SqlEditor value={sqlCode} onChange={handleSqlCodeChange} onRun={handleRunSql} />
                </EditorPanel>
              </ResizablePanel>

              <ResizableHandle className="w-[1px] bg-[#2d2d2d] hover:bg-blue-500/50 transition-colors" />

              {/* Supabase JS Editor */}
              <ResizablePanel defaultSize={34} minSize={20}>
                <EditorPanel
                  title="Supabase JS"
                  icon={<Code2 className="h-3.5 w-3.5" />}
                  accentColor="text-emerald-400"
                  onRun={handleRunJs}
                  isExecuting={isExecuting}
                  badge="TypeScript"
                  examplesDropdown={<ExamplesDropdown onSelect={handleSelectJsExample} variant="js" />}
                  onCopy={handleCopyJs}
                >
                  <TypeScriptEditor value={jsCode} onChange={handleJsCodeChange} onRun={handleRunJs} />
                </EditorPanel>
              </ResizablePanel>

              <ResizableHandle className="w-[1px] bg-[#2d2d2d] hover:bg-blue-500/50 transition-colors" />

              {/* PostgREST Editor */}
              <ResizablePanel defaultSize={33} minSize={20}>
                <EditorPanel
                  title="PostgREST"
                  icon={<Globe className="h-3.5 w-3.5" />}
                  accentColor="text-orange-400"
                  onRun={handleRunPostgrest}
                  isExecuting={isExecuting}
                  badge="HTTP"
                  examplesDropdown={<ExamplesDropdown onSelect={handleSelectPostgrestExample} variant="postgrest" />}
                  copyDropdown={<CopyFormatDropdown getContent={getPostgrestCopyContent} />}
                >
                  <PostgrestPane />
                </EditorPanel>
              </ResizablePanel>

            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="h-[1px] bg-[#2d2d2d] hover:bg-blue-500/50 transition-colors" />

          {/* Bottom Section: Output */}
          <ResizablePanel defaultSize={35} minSize={15}>
            <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
              {/* Output Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#2d2d2d] bg-[#252526]">
                <div className="flex items-center gap-2">
                  <div className="text-purple-400">
                    <TerminalIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">Output</span>
                  {hasCredentials && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 ml-2">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Connected</span>
                    </div>
                  )}
                </div>

                {/* Status indicators */}
                <div className="flex items-center gap-3 text-[11px]">
                  {executionStatus !== null && (
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        executionStatus >= 200 && executionStatus < 300
                          ? 'bg-emerald-400'
                          : executionStatus >= 400 && executionStatus < 500
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                      }`} />
                      <span className={
                        executionStatus >= 200 && executionStatus < 300
                          ? 'text-emerald-400'
                          : executionStatus >= 400 && executionStatus < 500
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }>
                        {executionStatus} {executionStatusText}
                      </span>
                    </div>
                  )}
                  {rowCount !== null && (
                    <span className="text-gray-500">
                      {rowCount} {rowCount === 1 ? 'row' : 'rows'}
                    </span>
                  )}
                  {executionTime !== null && (
                    <span className="text-gray-500 font-mono">
                      {executionTime}ms
                    </span>
                  )}
                </div>
              </div>

              {/* Output Content */}
              <div className="flex-1 overflow-hidden bg-[#0d0d0d]">
                <OutputDisplay
                  isExecuting={isExecuting}
                  data={outputData}
                  error={executionError}
                  hasCredentials={hasCredentials}
                  onSetCredentials={handleSetCredentials}
                />
              </div>
            </div>
          </ResizablePanel>

        </ResizablePanelGroup>
      )}
    </div>
  )
}
