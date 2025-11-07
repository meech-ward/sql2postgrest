import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, lazy, Suspense } from 'react'
import { useSupabase2PostgREST, type SupabaseConversionResult } from '../hooks/useSupabase2PostgREST'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Loader2, Copy, CheckCheck, ChevronDown, AlertCircle } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu'
import { useTheme } from '../components/theme-provider'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable'
import { PageLayout } from '../components/page-layout'
const CodeMirror = lazy(() => import('@uiw/react-codemirror'))
import { javascript } from '@codemirror/lang-javascript'
import { githubLight, githubDark } from '@uiw/codemirror-theme-github'

export const Route = createFileRoute('/supabase-to-postgrest')({
  component: SupabaseToPostgREST,
})

const EXAMPLE_QUERIES = [
  {
    label: 'Simple select - All rows',
    query: `supabase.from('users').select('*')`,
  },
  {
    label: 'Select specific columns',
    query: `supabase.from('users').select('name, email, created_at')`,
  },
  {
    label: 'Select with eq filter',
    query: `supabase.from('users').select('*').eq('status', 'active')`,
  },
  {
    label: 'Select with multiple filters',
    query: `supabase.from('users').select('*').eq('status', 'active').gte('age', 18)`,
  },
  {
    label: 'Select with order and limit',
    query: `supabase.from('posts').select('*').order('created_at', {ascending: false}).limit(10)`,
  },
  {
    label: 'Select with range (pagination)',
    query: `supabase.from('posts').select('*').range(0, 9)`,
  },
  {
    label: 'Select with count',
    query: `supabase.from('users').select('*', {count: 'exact'})`,
  },
  {
    label: 'Select single row',
    query: `supabase.from('users').select('*').eq('id', 123).single()`,
  },
  {
    label: 'Insert single row',
    query: `supabase.from('users').insert({name: 'John Doe', email: 'john@example.com', age: 30})`,
  },
  {
    label: 'Insert multiple rows',
    query: `supabase.from('users').insert([{name: 'Alice', age: 25}, {name: 'Bob', age: 28}])`,
  },
  {
    label: 'Upsert (insert or update)',
    query: `supabase.from('users').upsert({id: 1, name: 'John Updated', age: 31})`,
  },
  {
    label: 'Update rows',
    query: `supabase.from('users').update({status: 'inactive'}).eq('last_login', 'lt.2023-01-01')`,
  },
  {
    label: 'Delete rows',
    query: `supabase.from('users').delete().eq('status', 'banned')`,
  },
  {
    label: 'Text search',
    query: `supabase.from('posts').select('*').textSearch('title', 'javascript tutorial')`,
  },
  {
    label: 'NOT filter',
    query: `supabase.from('users').select('*').not('status', 'eq', 'banned')`,
  },
  {
    label: 'LIKE filter',
    query: `supabase.from('users').select('*').like('email', '%@gmail.com')`,
  },
  {
    label: 'IN filter',
    query: `supabase.from('users').select('*').in('status', ['active', 'pending', 'verified'])`,
  },
  {
    label: 'IS NULL check',
    query: `supabase.from('users').select('*').is('deleted_at', null)`,
  },
  {
    label: 'Complex query',
    query: `supabase.from('posts')
  .select('id, title, author:users(name, email)')
  .eq('status', 'published')
  .gte('views', 100)
  .order('created_at', {ascending: false})
  .limit(20)`,
  },
  {
    label: 'RPC - no params',
    query: `supabase.rpc('get_active_users_count')`,
  },
  {
    label: 'RPC - with params',
    query: `supabase.rpc('calculate_total', {start_date: '2024-01-01', end_date: '2024-12-31'})`,
  },
]

function SupabaseToPostgREST() {
  const { theme } = useTheme()
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0].query)
  const [baseURL, setBaseURL] = useState('http://localhost:3000')
  const [result, setResult] = useState<SupabaseConversionResult | null>(null)
  const [copiedOutput, setCopiedOutput] = useState(false)
  const [copiedCurl, setCopiedCurl] = useState(false)
  const { convert, isLoading: wasmLoading, isReady, error: wasmError, startLoading } = useSupabase2PostgREST()

  // Start loading WASM on mount
  useEffect(() => {
    startLoading()
  }, [startLoading])

  useEffect(() => {
    if (isReady && query) {
      handleConvert()
    }
  }, [isReady, query, baseURL])

  const handleConvert = () => {
    if (!isReady) return

    const conversionResult = convert(query, baseURL)
    setResult(conversionResult)
  }

  const copyToClipboard = async (text: string, setCopied: (val: boolean) => void) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const buildCurlCommand = (): string => {
    if (!result || result.error) return ''

    const parts: string[] = [`curl -X ${result.method}`]

    // Add headers
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        parts.push(`  -H "${key}: ${value}"`)
      })
    }

    // Add body for mutations
    if (result.body) {
      parts.push(`  -H "Content-Type: application/json"`)
      parts.push(`  -d '${result.body}'`)
    }

    // Add URL
    parts.push(`  "${result.url}"`)

    return parts.join(' \\\n')
  }

  const buildPostgRESTOutput = (): string => {
    if (!result || result.error) return ''

    const output: Record<string, unknown> = {
      method: result.method,
      path: result.path,
    }

    if (result.query) {
      output.query = result.query
    }

    if (result.body) {
      output.body = result.body
    }

    if (result.headers && Object.keys(result.headers).length > 0) {
      output.headers = result.headers
    }

    if (result.http_only) {
      output.http_only = result.http_only
      if (result.description) {
        output.description = result.description
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      output.warnings = result.warnings
    }

    output.url = result.url

    return JSON.stringify(output, null, 2)
  }

  return (
    <PageLayout title="Supabase JS → PostgREST">
      <div className="hidden lg:block mb-12">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="pr-3 space-y-4">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                  <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Supabase Query
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Write your Supabase JS query
                  </p>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                          Examples
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-80 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <DropdownMenuLabel className="text-slate-900 dark:text-slate-100">Query Examples</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {EXAMPLE_QUERIES.map((example, index) => (
                          <DropdownMenuItem
                            key={index}
                            onClick={() => setQuery(example.query)}
                            className="text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
                          >
                            {example.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      PostgREST Base URL
                    </label>
                    <input
                      type="text"
                      value={baseURL}
                      onChange={(e) => setBaseURL(e.target.value)}
                      placeholder="http://localhost:3000"
                      className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      disabled={!isReady}
                    />
                  </div>

                  <div className="relative">
                    <Suspense
                      fallback={
                        <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                        </div>
                      }
                    >
                      <CodeMirror
                        value={query}
                        onChange={(value) => setQuery(value)}
                        theme={theme === 'dark' ? githubDark : githubLight}
                        extensions={[javascript()]}
                        placeholder="supabase.from('users').select('*')"
                        className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                        editable={isReady}
                        basicSetup={{
                          lineNumbers: true,
                          highlightActiveLineGutter: true,
                          highlightActiveLine: false,
                          foldGutter: false,
                          allowMultipleSelections: true,
                          autocompletion: true,
                        }}
                        minHeight='200px'
                        style={{
                          fontSize: '14px',
                        }}
                      />
                    </Suspense>
                    {!isReady && (
                      <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>

                  {wasmError && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">Failed to load converter</p>
                      <p className="text-sm text-red-700 dark:text-red-300">{wasmError}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="pl-3 space-y-4">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                  <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    PostgREST Request
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Generated PostgREST HTTP request
                  </p>
                </div>

                  {result?.error ? (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">Conversion Error</p>
                      <p className="text-sm text-red-700 dark:text-red-300">{result.error}</p>
                    </div>
                  ) : result ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 rounded-xl border border-purple-200 dark:border-purple-700">
                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-3 uppercase tracking-wide">PostgREST Request</p>
                        <div className="space-y-3">
                          <div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Method</span>
                            <div className="mt-1">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-mono font-semibold ${
                                result.method === 'GET' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                result.method === 'POST' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                result.method === 'PATCH' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {result.method}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">URL</span>
                            <div className="mt-1 p-2 bg-white/50 dark:bg-slate-900/50 rounded border border-purple-200 dark:border-purple-700 font-mono text-xs break-all text-slate-800 dark:text-slate-200">
                              {result.url}
                            </div>
                          </div>
                          {result.headers && Object.keys(result.headers).length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Headers</span>
                              <div className="mt-1 p-2 bg-white/50 dark:bg-slate-900/50 rounded border border-purple-200 dark:border-purple-700 space-y-1">
                                {Object.entries(result.headers).map(([key, value]) => (
                                  <div key={key} className="flex items-start gap-2 text-xs">
                                    <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">{key}:</span>
                                    <span className="font-mono text-slate-600 dark:text-slate-400">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.body && (
                            <div>
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Body</span>
                              <pre className="mt-1 p-2 bg-white/50 dark:bg-slate-900/50 rounded border border-purple-200 dark:border-purple-700 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
                                {JSON.stringify(JSON.parse(result.body), null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>

                      {result.warnings && result.warnings.length > 0 && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-2">Warnings</p>
                          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                            {result.warnings.map((warning, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-yellow-500 dark:text-yellow-400">•</span>
                                <span>{warning}</span>
                              </li>
                            ))}
                          </ul>
                          {result.description && (
                            <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 italic">{result.description}</p>
                          )}
                        </div>
                      )}

                      <details className="group">
                        <summary className="cursor-pointer p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">JSON Output</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              copyToClipboard(buildPostgRESTOutput(), setCopiedOutput)
                            }}
                            className="h-7"
                          >
                            {copiedOutput ? (
                              <>
                                <CheckCheck className="h-3.5 w-3.5 mr-1 text-green-500" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </summary>
                        <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-auto">
                            {buildPostgRESTOutput()}
                          </pre>
                        </div>
                      </details>

                      {!result.http_only && (
                        <details className="group">
                          <summary className="cursor-pointer p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">cURL Command</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                copyToClipboard(buildCurlCommand(), setCopiedCurl)
                              }}
                              className="h-7"
                            >
                              {copiedCurl ? (
                                <>
                                  <CheckCheck className="h-3.5 w-3.5 mr-1 text-green-500" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 mr-1" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </summary>
                          <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-auto whitespace-pre-wrap break-all">
                              {buildCurlCommand()}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <div className="inline-flex p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                        <Loader2 className="h-12 w-12 text-slate-400 dark:text-slate-600 animate-spin" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {wasmLoading ? 'Loading converter...' : 'Your converted request will appear here'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </PageLayout>
  )
}
