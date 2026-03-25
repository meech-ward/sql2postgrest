import { useStore } from '@tanstack/react-store'
import { terminalStore, setPostgrestMethod, setPostgrestPath, setPostgrestBody, setCustomHeaders, setLastEditedEditor } from '@/stores/terminal-store'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Editor from '@monaco-editor/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react'

export function PostgrestPane() {
  const { postgrestMethod, postgrestPath, postgrestBody, postgrestHeaders, customHeaders, syncInProgress, connectionMode } = useStore(terminalStore)
  const [newHeaderKey, setNewHeaderKey] = useState('')
  const [newHeaderValue, setNewHeaderValue] = useState('')
  const [showHeaders, setShowHeaders] = useState(false)

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
    <div className="flex h-full flex-col bg-[#1e1e1e] text-white">
      {/* URL Bar */}
      <div className="flex items-center gap-2 p-2 border-b border-[#2d2d2d] bg-[#252526]">
        <Select value={postgrestMethod} onValueChange={handleMethodChange}>
          <SelectTrigger className={`w-[90px] h-7 text-[11px] font-semibold px-2 border ${methodColors[postgrestMethod]} bg-transparent`}>
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent className="bg-[#252526] border-[#3d3d3d]">
            <SelectItem value="GET" className="text-emerald-400 text-xs">GET</SelectItem>
            <SelectItem value="POST" className="text-blue-400 text-xs">POST</SelectItem>
            <SelectItem value="PATCH" className="text-amber-400 text-xs">PATCH</SelectItem>
            <SelectItem value="DELETE" className="text-red-400 text-xs">DELETE</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={postgrestPath}
          onChange={handlePathChange}
          className="flex-1 h-7 text-xs px-2 font-mono bg-[#1e1e1e] border-[#3d3d3d] text-gray-200 placeholder:text-gray-600"
          placeholder={connectionMode === 'supabase' ? '/rest/v1/table_name?select=*' : '/table_name?select=*'}
        />
      </div>

      {/* Headers Toggle */}
      <div className="border-b border-[#2d2d2d]">
        <button
          onClick={() => setShowHeaders(!showHeaders)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-gray-400 hover:text-gray-300 hover:bg-[#2a2a2a] transition-colors"
        >
          {showHeaders ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="uppercase tracking-wide font-medium">Headers</span>
          {headerCount > 0 && (
            <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] bg-[#3d3d3d] text-gray-400">
              {headerCount}
            </span>
          )}
        </button>

        {showHeaders && (
          <div className="px-2 pb-2 space-y-1.5">
            {/* Conversion-generated headers (read-only) */}
            {Object.entries(postgrestHeaders).map(([key, value]) => (
              <div key={`conv-${key}`} className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-gray-500 min-w-[80px]">{key}</span>
                <span className="text-gray-600">:</span>
                <span className="text-gray-500 flex-1 truncate">{value}</span>
                <span className="text-[8px] text-gray-600 italic">auto</span>
              </div>
            ))}
            {/* Custom headers (user-managed) */}
            {Object.entries(customHeaders).map(([key, value]) => (
              <div key={`custom-${key}`} className="flex items-center gap-2 text-[10px] font-mono group">
                <span className="text-blue-400 min-w-[80px]">{key}</span>
                <span className="text-gray-500">:</span>
                <span className="text-gray-300 flex-1 truncate">{value}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-opacity"
                  onClick={() => handleRemoveHeader(key)}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}

            {/* Add New Header */}
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                value={newHeaderKey}
                onChange={(e) => setNewHeaderKey(e.target.value)}
                placeholder="Header name"
                className="h-6 text-[10px] px-2 font-mono bg-[#1e1e1e] border-[#3d3d3d] flex-1 placeholder:text-gray-600"
                onKeyDown={(e) => e.key === 'Enter' && handleAddHeader()}
              />
              <Input
                value={newHeaderValue}
                onChange={(e) => setNewHeaderValue(e.target.value)}
                placeholder="Value"
                className="h-6 text-[10px] px-2 font-mono bg-[#1e1e1e] border-[#3d3d3d] flex-1 placeholder:text-gray-600"
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
          theme="vs-dark"
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
        <div className="absolute bottom-2 right-2 px-2 py-0.5 text-[9px] text-gray-500 bg-[#1e1e1e]/80 rounded font-mono">
          Request Body
        </div>
      </div>
    </div>
  )
}
