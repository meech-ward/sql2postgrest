import { useStore } from '@tanstack/react-store'
import { terminalStore, setPostgrestMethod, setPostgrestPath, setPostgrestBody, setCustomHeaders, setLastEditedEditor } from '@/stores/terminal-store'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Editor from '@monaco-editor/react'
import { useState } from 'react'
import { useMonacoTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react'

export function PostgrestPane() {
  const { postgrestMethod, postgrestPath, postgrestBody, postgrestHeaders, customHeaders, syncInProgress, connectionMode } = useStore(terminalStore)
  const [newHeaderKey, setNewHeaderKey] = useState('')
  const [newHeaderValue, setNewHeaderValue] = useState('')
  const [showHeaders, setShowHeaders] = useState(false)
  const monacoTheme = useMonacoTheme()

  const handleMethodChange = (val: string) => {
    setPostgrestMethod(val as 'GET' | 'POST' | 'PATCH' | 'DELETE')
    if (!syncInProgress) {
      setLastEditedEditor('postgrest')
    }
  }

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostgrestPath(e.target.value)
    if (!syncInProgress) {
      setLastEditedEditor('postgrest')
    }
  }

  const handleBodyChange = (val: string | undefined) => {
    setPostgrestBody(val || '')
    if (!syncInProgress) {
      setLastEditedEditor('postgrest')
    }
  }

  const handleAddHeader = () => {
    if (newHeaderKey.trim() && newHeaderValue.trim()) {
      setCustomHeaders({
        ...customHeaders,
        [newHeaderKey.trim()]: newHeaderValue.trim()
      })
      setNewHeaderKey('')
      setNewHeaderValue('')
    }
  }

  const handleRemoveHeader = (key: string) => {
    const newHeaders = { ...customHeaders }
    delete newHeaders[key]
    setCustomHeaders(newHeaders)
  }

  const methodColors: Record<string, string> = {
    GET: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    POST: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    PATCH: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    DELETE: 'text-red-400 bg-red-400/10 border-red-400/30',
  }

  const allHeaders = { ...postgrestHeaders, ...customHeaders }
  const headerCount = Object.keys(allHeaders).length

  return (
    <div className="flex h-full flex-col bg-surface text-foreground">
      {/* URL Bar */}
      <div className="flex items-center gap-2 p-2 border-b border-surface-muted bg-surface-raised">
        <Select value={postgrestMethod} onValueChange={handleMethodChange}>
          <SelectTrigger className={`w-[90px] h-7 text-[11px] font-semibold px-2 border ${methodColors[postgrestMethod]} bg-transparent`}>
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent className="bg-surface-raised border-surface-strong">
            <SelectItem value="GET" className="text-emerald-400 text-xs">GET</SelectItem>
            <SelectItem value="POST" className="text-blue-400 text-xs">POST</SelectItem>
            <SelectItem value="PATCH" className="text-amber-400 text-xs">PATCH</SelectItem>
            <SelectItem value="DELETE" className="text-red-400 text-xs">DELETE</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={postgrestPath}
          onChange={handlePathChange}
          className="flex-1 h-7 text-xs px-2 font-mono bg-surface border-surface-strong text-foreground placeholder:text-muted-foreground"
          placeholder={connectionMode === 'supabase' ? '/rest/v1/table_name?select=*' : '/table_name?select=*'}
        />
      </div>

      {/* Headers Toggle */}
      <div className="border-b border-surface-muted">
        <button
          onClick={() => setShowHeaders(!showHeaders)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
        >
          {showHeaders ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="uppercase tracking-wide font-medium">Headers</span>
          {headerCount > 0 && (
            <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] bg-surface-strong text-foreground">
              {headerCount}
            </span>
          )}
        </button>

        {showHeaders && (
          <div className="px-2 pb-2 space-y-1.5">
            {/* All headers (merged: auto + custom, custom wins) */}
            {Object.entries(allHeaders).map(([key, value]) => {
              const isCustom = key in customHeaders
              return (
                <div key={key} className="flex items-center gap-2 text-[10px] font-mono group">
                  <span className={`min-w-[80px] ${isCustom ? 'text-blue-400' : 'text-muted-foreground'}`}>{key}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className={`flex-1 truncate ${isCustom ? 'text-foreground' : 'text-muted-foreground'}`}>{value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-opacity"
                    onClick={() => handleRemoveHeader(key)}
                    title={isCustom ? 'Remove override' : 'Remove header'}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              )
            })}

            {/* Add New Header */}
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                value={newHeaderKey}
                onChange={(e) => setNewHeaderKey(e.target.value)}
                placeholder="Header name"
                className="h-6 text-[10px] px-2 font-mono bg-surface border-surface-strong flex-1 placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleAddHeader()}
              />
              <Input
                value={newHeaderValue}
                onChange={(e) => setNewHeaderValue(e.target.value)}
                placeholder="Value"
                className="h-6 text-[10px] px-2 font-mono bg-surface border-surface-strong flex-1 placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleAddHeader()}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                onClick={handleAddHeader}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Body Editor */}
      <div className="flex-1 relative overflow-hidden">
        <Editor
          value={postgrestBody}
          height="100%"
          defaultLanguage="json"
          theme={monacoTheme}
          onChange={handleBodyChange}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            folding: true,
            renderLineHighlight: 'line',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            padding: {
              top: 8,
              bottom: 8,
            },
          }}
        />
        {/* Body label */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 text-[9px] text-muted-foreground bg-surface/80 rounded font-mono">
          Request Body
        </div>
      </div>
    </div>
  )
}
