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
      <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex h-full flex-col p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Supabase Query
              </h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Examples <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Query Examples</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {EXAMPLE_QUERIES.map((example, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => setQuery(example.query)}
                      className="cursor-pointer"
                    >
                      {example.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Base URL</label>
              <input
                type="text"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
                placeholder="http://localhost:3000"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="text-sm font-medium mb-2 block">Supabase Query</label>
              <Suspense fallback={<div className="flex-1 border rounded-md flex items-center justify-center bg-slate-50 dark:bg-slate-800"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
                <CodeMirror
                  value={query}
                  height="100%"
                  extensions={[javascript()]}
                  theme={theme === 'dark' ? githubDark : githubLight}
                  onChange={(value) => setQuery(value)}
                  className="border rounded-md overflow-hidden flex-1"
                  basicSetup={{
                    lineNumbers: true,
                    highlightActiveLineGutter: true,
                    highlightActiveLine: true,
                    foldGutter: false,
                  }}
                />
              </Suspense>
            </div>

            {wasmLoading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading converter...
              </div>
            )}

            {wasmError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-600 dark:text-red-400">
                  <p className="font-medium">Failed to load converter</p>
                  <p>{wasmError}</p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex h-full flex-col p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                PostgREST Request
              </h2>
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-auto">
              {result?.error ? (
                <Card className="bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-5 w-5" />
                      Conversion Error
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
                  </CardContent>
                </Card>
              ) : result ? (
                <>
                  {/* Method and URL Card */}
                  <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">HTTP Request</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Method</span>
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
                        <span className="text-xs font-medium text-muted-foreground">URL</span>
                        <div className="mt-1 p-2 bg-slate-50 dark:bg-slate-800/50 rounded border font-mono text-xs break-all">
                          {result.url}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Headers Card */}
                  {result.headers && Object.keys(result.headers).length > 0 && (
                    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Headers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(result.headers).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2 text-xs">
                              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 min-w-[120px]">{key}:</span>
                              <span className="font-mono text-muted-foreground flex-1">{value}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Body Card */}
                  {result.body && (
                    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Request Body</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border text-xs font-mono overflow-x-auto">
                          {JSON.stringify(JSON.parse(result.body), null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}

                  {/* Warnings Card */}
                  {result.warnings && result.warnings.length > 0 && (
                    <Card className="bg-yellow-50/80 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 backdrop-blur-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          Warnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600 dark:text-yellow-400">
                          {result.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                        {result.description && (
                          <p className="mt-2 text-sm text-muted-foreground italic">{result.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* JSON Output Card */}
                  <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-medium">JSON Output</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(buildPostgRESTOutput(), setCopiedOutput)}
                        className="h-8"
                      >
                        {copiedOutput ? (
                          <>
                            <CheckCheck className="h-4 w-4 mr-1 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <pre className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border text-xs font-mono overflow-x-auto">
                        {buildPostgRESTOutput()}
                      </pre>
                    </CardContent>
                  </Card>

                  {/* cURL Command Card */}
                  {!result.http_only && (
                    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">cURL Command</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(buildCurlCommand(), setCopiedCurl)}
                          className="h-8"
                        >
                          {copiedCurl ? (
                            <>
                              <CheckCheck className="h-4 w-4 mr-1 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <pre className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                          {buildCurlCommand()}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {wasmLoading ? 'Loading converter...' : 'Enter a Supabase query to convert'}
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </PageLayout>
  )
}
