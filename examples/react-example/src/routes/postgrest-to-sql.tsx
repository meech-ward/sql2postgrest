import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, lazy, Suspense } from 'react'
import { usePostgREST2SQL } from '../hooks/usePostgREST2SQL'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Loader2, Copy, CheckCheck, ChevronDown, AlertCircle } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu'
import { useTheme } from '../components/theme-provider'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable'
import { PageLayout } from '../components/page-layout'
import { Textarea } from '../components/ui/textarea'
const CodeMirror = lazy(() => import('@uiw/react-codemirror'))
import { sql as sqlLang } from '@codemirror/lang-sql'
import { githubLight, githubDark } from '@uiw/codemirror-theme-github'

export const Route = createFileRoute('/postgrest-to-sql')({
  component: PostgRESTToSQL,
})

const EXAMPLE_REQUESTS = [
  {
    label: 'Simple GET - All rows',
    method: 'GET',
    url: 'http://localhost:3000/users',
    body: '',
  },
  {
    label: 'GET with filter',
    method: 'GET',
    url: 'http://localhost:3000/users?age=gte.18',
    body: '',
  },
  {
    label: 'GET with multiple filters',
    method: 'GET',
    url: 'http://localhost:3000/users?age=gte.18&status=eq.active',
    body: '',
  },
  {
    label: 'GET with select columns',
    method: 'GET',
    url: 'http://localhost:3000/users?select=name,email,created_at',
    body: '',
  },
  {
    label: 'GET with order and limit',
    method: 'GET',
    url: 'http://localhost:3000/posts?order=created_at.desc&limit=10',
    body: '',
  },
  {
    label: 'GET with pagination',
    method: 'GET',
    url: 'http://localhost:3000/posts?order=created_at.desc&limit=10&offset=20',
    body: '',
  },
  {
    label: 'GET with embedded resource (JOIN)',
    method: 'GET',
    url: 'http://localhost:3000/authors?select=name,books(title,published_year)',
    body: '',
  },
  {
    label: 'GET with LIKE filter',
    method: 'GET',
    url: 'http://localhost:3000/users?name=like.John*',
    body: '',
  },
  {
    label: 'GET with IS NULL',
    method: 'GET',
    url: 'http://localhost:3000/users?deleted_at=is.null',
    body: '',
  },
  {
    label: 'GET with IN operator',
    method: 'GET',
    url: 'http://localhost:3000/users?status=in.(active,pending,verified)',
    body: '',
  },
  {
    label: 'POST - Insert single row',
    method: 'POST',
    url: 'http://localhost:3000/users',
    body: '{"name":"Alice","email":"alice@example.com","age":25}',
  },
  {
    label: 'POST - Insert with NULL',
    method: 'POST',
    url: 'http://localhost:3000/users',
    body: '{"name":"Bob","email":"bob@example.com","deleted_at":null}',
  },
  {
    label: 'PATCH - Update with filter',
    method: 'PATCH',
    url: 'http://localhost:3000/users?id=eq.123',
    body: '{"status":"active","updated_at":"2024-01-01"}',
  },
  {
    label: 'PATCH - Update multiple rows',
    method: 'PATCH',
    url: 'http://localhost:3000/users?status=eq.pending',
    body: '{"status":"verified"}',
  },
  {
    label: 'DELETE - Remove specific row',
    method: 'DELETE',
    url: 'http://localhost:3000/users?id=eq.999',
    body: '',
  },
  {
    label: 'DELETE - Remove multiple rows',
    method: 'DELETE',
    url: 'http://localhost:3000/users?status=eq.inactive&age=lt.18',
    body: '',
  },
]

function parseURL(url: string): { path: string; query: string } {
  try {
    const urlObj = new URL(url)
    return {
      path: urlObj.pathname,
      query: urlObj.search.substring(1) // Remove leading '?'
    }
  } catch {
    // If URL parsing fails, try to split manually
    const [pathPart, queryPart] = url.split('?')
    return {
      path: pathPart.replace(/^https?:\/\/[^/]+/, ''), // Remove base URL if present
      query: queryPart || ''
    }
  }
}

function PostgRESTToSQL() {
  const { convert, isLoading, isReady, error: hookError, startLoading } = usePostgREST2SQL()
  const { theme } = useTheme()
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('http://localhost:3000/users?age=gte.18')
  const [body, setBody] = useState('')
  const [result, setResult] = useState<string>('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [conversionError, setConversionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const timer = setTimeout(() => {
      startLoading()
    }, 100)
    return () => clearTimeout(timer)
  }, [startLoading])

  // Auto-convert when ready or inputs change
  useEffect(() => {
    if (isReady && url) {
      handleConvert()
    }
  }, [isReady, method, url, body])

  const handleConvert = () => {
    if (!isReady) {
      setConversionError('WASM module not loaded yet')
      return
    }

    try {
      const { path, query } = parseURL(url)
      const convertResult = convert({
        method,
        path,
        query,
        body
      })

      if (!convertResult) {
        setConversionError('Conversion failed - no result returned')
        return
      }

      setResult(convertResult.sql)
      setWarnings(convertResult.warnings || [])
      setConversionError(null)
    } catch (err) {
      setConversionError(err instanceof Error ? err.message : 'Conversion failed')
      setResult('')
      setWarnings([])
    }
  }

  const handleExampleSelect = (example: typeof EXAMPLE_REQUESTS[0]) => {
    setMethod(example.method)
    setUrl(example.url)
    setBody(example.body)

    // Auto-convert after loading example
    setTimeout(() => {
      if (isReady) {
        const { path, query } = parseURL(example.url)
        const convertResult = convert({
          method: example.method,
          path,
          query,
          body: example.body
        })
        if (convertResult) {
          setResult(convertResult.sql)
          setWarnings(convertResult.warnings || [])
          setConversionError(null)
        }
      }
    }, 100)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (hookError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load WASM</CardTitle>
            <CardDescription>{hookError}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Make sure WASM files are in public/wasm/
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <PageLayout title="PostgREST → SQL">
      <div className="hidden lg:block mb-12">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="pr-3 space-y-4">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                  <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    PostgREST Request
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Enter your PostgREST URL • HTTP method and body below
                  </p>
                </div>

                <div className="p-6 space-y-5">
                  {/* Example Dropdown */}
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                          Examples
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <DropdownMenuLabel className="text-slate-900 dark:text-slate-100">PostgREST Examples</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {EXAMPLE_REQUESTS.map((example) => (
                          <DropdownMenuItem
                            key={example.label}
                            onClick={() => handleExampleSelect(example)}
                            className="text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
                          >
                            {example.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {!isReady && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    )}
                  </div>

                  {/* HTTP Method */}
                  <div>
                    <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">HTTP Method</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  {/* URL */}
                  <div>
                    <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">PostgREST URL</label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="http://localhost:3000/users?age=gte.18"
                      className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Full URL with query parameters (e.g., http://localhost:3000/users?age=gte.18)
                    </p>
                  </div>

                  {/* Request Body */}
                  {(method === 'POST' || method === 'PATCH') && (
                    <div>
                      <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">Request Body (JSON)</label>
                      <Textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder='{"name":"Alice","email":"alice@example.com"}'
                        className="font-mono text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        rows={4}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        JSON object for INSERT/UPDATE operations
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Output Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="pl-3 space-y-4">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                        SQL Query
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Generated PostgreSQL query
                      </p>
                    </div>
                    {result && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        {copied ? (
                          <>
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Conversion Error */}
                  {conversionError && (
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">{conversionError}</span>
                      </div>
                    </div>
                  )}

                  {/* SQL Output */}
                  <div className="relative">
                    <Suspense
                      fallback={
                        <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                        </div>
                      }
                    >
                      <CodeMirror
                        value={result || '-- SQL output will appear here\n-- Select an example or enter a PostgREST URL to convert'}
                        extensions={[sqlLang()]}
                        editable={false}
                        theme={isDark ? githubDark : githubLight}
                        className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                        basicSetup={{
                          lineNumbers: true,
                          highlightActiveLineGutter: true,
                          highlightActiveLine: false,
                          foldGutter: false,
                        }}
                        minHeight="300px"
                        style={{
                          fontSize: '14px',
                        }}
                      />
                    </Suspense>
                  </div>

                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-4">
                      <div className="flex items-start gap-2 text-yellow-800 dark:text-yellow-400">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <div>
                          <p className="font-medium mb-2">Warnings:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {warnings.map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Operator Reference */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
          <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200">PostgREST Operator Reference</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Common PostgREST query operators and their SQL equivalents
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Comparison</p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-mono text-xs">
                <li>eq.value → = value</li>
                <li>neq.value → != value</li>
                <li>gt.value → &gt; value</li>
                <li>gte.value → &gt;= value</li>
                <li>lt.value → &lt; value</li>
                <li>lte.value → &lt;= value</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Pattern Matching</p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-mono text-xs">
                <li>like.pattern → LIKE</li>
                <li>ilike.pattern → ILIKE</li>
                <li>match.regex → ~</li>
                <li>imatch.regex → ~*</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2 text-slate-800 dark:text-slate-200">NULL & List</p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-mono text-xs">
                <li>is.null → IS NULL</li>
                <li>not.is.null → NOT NULL</li>
                <li>in.(a,b,c) → IN</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2 text-slate-800 dark:text-slate-200">JSON & Full-Text</p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-mono text-xs">
                <li>cs.{'{}'} → @&gt; (contains)</li>
                <li>cd.{'{}'} → &lt;@ (contained)</li>
                <li>fts.term → @@ (full-text)</li>
                <li>plfts.term → @@ to_tsquery</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
