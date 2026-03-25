import { Loader2, Key, Link, CheckCircle2, Globe } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface OutputDisplayProps {
  isExecuting: boolean
  data: any
  error: string | null
  hasCredentials: boolean
  connectionMode: 'supabase' | 'postgrest'
  onSetConnectionMode: (mode: 'supabase' | 'postgrest') => void
  onSetSupabaseCredentials: (url: string, anonKey: string) => void
  onSetPostgrestEndpoint: (url: string) => void
}

interface CredentialsFormProps {
  connectionMode: 'supabase' | 'postgrest'
  onSetConnectionMode: (mode: 'supabase' | 'postgrest') => void
  onSetSupabaseCredentials: (url: string, anonKey: string) => void
  onSetPostgrestEndpoint: (url: string) => void
}

function CredentialsForm({ connectionMode, onSetConnectionMode, onSetSupabaseCredentials, onSetPostgrestEndpoint }: CredentialsFormProps) {
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [postgrestUrl, setPostgrestUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (connectionMode === 'supabase') {
      if (supabaseUrl.trim() && anonKey.trim()) {
        onSetSupabaseCredentials(supabaseUrl.trim(), anonKey.trim())
      }
    } else {
      if (postgrestUrl.trim()) {
        onSetPostgrestEndpoint(postgrestUrl.trim())
      }
    }
  }

  const isValid = connectionMode === 'supabase'
    ? supabaseUrl.trim() !== '' && anonKey.trim() !== ''
    : postgrestUrl.trim() !== ''

  return (
    <div className="h-full overflow-auto p-6">
      <div className="w-full max-w-md mx-auto">
        {/* Mode toggle */}
        <div className="flex rounded-lg bg-[#1e1e1e] border border-[#3d3d3d] p-0.5 mb-6">
          <button
            type="button"
            onClick={() => onSetConnectionMode('supabase')}
            className={`flex-1 text-xs py-1.5 px-3 rounded-md transition-colors ${
              connectionMode === 'supabase'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            Supabase
          </button>
          <button
            type="button"
            onClick={() => onSetConnectionMode('postgrest')}
            className={`flex-1 text-xs py-1.5 px-3 rounded-md transition-colors ${
              connectionMode === 'postgrest'
                ? 'bg-orange-500/20 text-orange-400'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            PostgREST
          </button>
        </div>

        <div className="text-center mb-6">
          {connectionMode === 'supabase' ? (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-4">
                <Key className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Connect to Supabase</h3>
              <p className="text-sm text-gray-400">
                Enter your Supabase project credentials to execute queries
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 mb-4">
                <Globe className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Connect to PostgREST</h3>
              <p className="text-sm text-gray-400">
                Enter your PostgREST endpoint URL to execute queries
              </p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {connectionMode === 'supabase' ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
                  <Link className="h-3 w-3" />
                  Project URL
                </label>
                <Input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="h-10 bg-[#1e1e1e] border-[#3d3d3d] text-gray-200 placeholder:text-gray-600 font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
                  <Key className="h-3 w-3" />
                  Anon / Public Key
                </label>
                <Input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="h-10 bg-[#1e1e1e] border-[#3d3d3d] text-gray-200 placeholder:text-gray-600 font-mono text-sm"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
                <Globe className="h-3 w-3" />
                Base URL
              </label>
              <Input
                type="url"
                value={postgrestUrl}
                onChange={(e) => setPostgrestUrl(e.target.value)}
                placeholder="http://localhost:3000"
                className="h-10 bg-[#1e1e1e] border-[#3d3d3d] text-gray-200 placeholder:text-gray-600 font-mono text-sm"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={!isValid}
            className={`w-full h-10 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
              connectionMode === 'supabase'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-orange-600 hover:bg-orange-500'
            }`}
          >
            Connect
          </Button>
        </form>

        <p className="text-[10px] text-gray-500 text-center mt-4">
          {connectionMode === 'supabase'
            ? 'Credentials are stored in memory only and never persisted'
            : 'Add authentication headers via the PostgREST pane\u2019s Headers section'}
        </p>
      </div>
    </div>
  )
}

function ConnectedBadge() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
      <CheckCircle2 className="h-3 w-3" />
      <span>Connected</span>
    </div>
  )
}

export function OutputDisplay({ isExecuting, data, error, hasCredentials, connectionMode, onSetConnectionMode, onSetSupabaseCredentials, onSetPostgrestEndpoint }: OutputDisplayProps) {
  // Show credentials form if not connected
  if (!hasCredentials) {
    return (
      <CredentialsForm
        connectionMode={connectionMode}
        onSetConnectionMode={onSetConnectionMode}
        onSetSupabaseCredentials={onSetSupabaseCredentials}
        onSetPostgrestEndpoint={onSetPostgrestEndpoint}
      />
    )
  }

  // Loading state
  if (isExecuting) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <span className="text-sm text-muted-foreground">Executing query...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4">
              <div className="flex items-start gap-2">
                <div className="rounded-full bg-red-500/20 p-1">
                  <svg
                    className="h-4 w-4 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-400 mb-1">Error</h4>
                  <pre className="text-xs text-red-300/90 font-mono whitespace-pre-wrap">{error}</pre>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  }

  // No data state
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-2">No query executed</div>
          <div className="text-xs text-muted-foreground/60">
            Click a Run button to execute a query
          </div>
        </div>
      </div>
    )
  }

  // Success states with data
  const isArray = Array.isArray(data)
  const isEmpty = isArray && data.length === 0

  // Empty result set
  if (isEmpty) {
    return (
      <div className="h-full flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 p-4">
              <div className="flex items-start gap-2">
                <div className="rounded-full bg-yellow-500/20 p-1">
                  <svg
                    className="h-4 w-4 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-yellow-400 mb-1">No rows returned</h4>
                  <p className="text-xs text-yellow-300/80">The query executed successfully but returned no data.</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  }

  // Array/Table view (SELECT queries)
  if (isArray && data.length > 0) {
    const columns = Object.keys(data[0])

    return (
      <div className="h-full flex flex-col">
        <ScrollAreaPrimitive.Root className="flex-1 relative overflow-hidden">
          <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
            <table className="w-full text-xs text-left border-collapse">
              {/* Sticky header */}
              <thead className="bg-[#252526] sticky top-0 z-10">
                <tr>
                  <th className="p-2 font-semibold text-gray-400 border-b border-white/20 text-right w-12 bg-[#252526]">
                    #
                  </th>
                  {columns.map((col) => (
                    <th key={col} className="p-2 font-semibold text-gray-300 border-b border-white/20 whitespace-nowrap bg-[#252526]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    {/* Row number */}
                    <td className="p-2 text-gray-500 text-right font-mono text-[10px] border-r border-white/5">
                      {idx + 1}
                    </td>
                    {columns.map((col) => {
                      const value = row[col]
                      const isNull = value === null
                      const isBoolean = typeof value === 'boolean'
                      const isNumber = typeof value === 'number'
                      const isString = typeof value === 'string'

                      return (
                        <td key={col} className="p-2 max-w-md">
                          {isNull ? (
                            <span className="text-gray-500 italic">null</span>
                          ) : isBoolean ? (
                            <span className="text-purple-400 font-mono">{String(value)}</span>
                          ) : isNumber ? (
                            <span className="text-blue-400 font-mono">{value}</span>
                          ) : isString ? (
                            <span className="text-gray-200 break-words">{value}</span>
                          ) : (
                            <span className="text-orange-400 font-mono text-[10px] break-all">
                              {JSON.stringify(value)}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollAreaPrimitive.Viewport>
          <ScrollBar />
          <ScrollBar orientation="horizontal" />
          <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
      </div>
    )
  }

  // Single object or non-array data (INSERT/UPDATE with RETURNING, or other responses)
  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <pre className="text-xs text-gray-200 font-mono">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export { ConnectedBadge }
