import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, lazy, Suspense } from 'react';
import { useSQL2PostgREST, type PostgRESTRequest } from '../hooks/useSQL2PostgREST';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Copy, CheckCheck, Database, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { useTheme } from '../components/theme-provider';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable';
import { PageLayout } from '../components/page-layout';
const CodeMirror = lazy(() => import('@uiw/react-codemirror'));
import { sql as sqlLang } from '@codemirror/lang-sql';
import { javascript } from '@codemirror/lang-javascript';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';

export const Route = createFileRoute('/supabase')({
  component: Supabase,
})

const SQL_EXAMPLES = [
  {
    label: 'Simple SELECT',
    query: 'SELECT * FROM users WHERE age > 18'
  },
  {
    label: 'Complex WHERE with AND/OR',
    query: `SELECT id, name, email, created_at 
FROM users 
WHERE (age >= 21 AND status = 'active') 
   OR (role = 'admin' AND verified = true)`
  },
  {
    label: 'Pattern Matching (ILIKE)',
    query: `SELECT * FROM products 
WHERE name ILIKE '%phone%' 
  AND price < 1000 
ORDER BY price DESC 
LIMIT 20`
  },
  {
    label: 'Full-text Search',
    query: `SELECT * FROM articles 
WHERE content @@ 'postgres & (sql | database)' 
ORDER BY created_at DESC`
  },
  {
    label: 'JSON Operators',
    query: `SELECT * FROM orders 
WHERE metadata->>'status' = 'shipped'`
  },
  {
    label: 'Array Operators',
    query: `SELECT * FROM posts 
WHERE tags @> ARRAY['javascript', 'react']`
  },
  {
    label: 'Range Operators',
    query: `SELECT * FROM bookings 
WHERE int4range(10, 20) @> capacity`
  },
  {
    label: 'INSERT Single Row',
    query: `INSERT INTO users (name, email, age, role) 
VALUES ('John Doe', 'john@example.com', 28, 'member')`
  },
  {
    label: 'INSERT Multiple Rows',
    query: `INSERT INTO products (name, price, category, in_stock) 
VALUES 
  ('Laptop', 999.99, 'electronics', true),
  ('Mouse', 29.99, 'accessories', true),
  ('Keyboard', 79.99, 'accessories', false)`
  },
  {
    label: 'UPSERT (ON CONFLICT)',
    query: `INSERT INTO inventory (product_id, quantity) 
VALUES (42, 100) 
ON CONFLICT (product_id) 
DO UPDATE SET quantity = EXCLUDED.quantity`
  },
  {
    label: 'UPDATE Simple',
    query: `UPDATE users 
SET status = 'inactive' 
WHERE age < 18`
  },
  {
    label: 'UPDATE with JSON',
    query: `UPDATE profiles 
SET settings = '{"theme": "dark"}'::jsonb 
WHERE user_id IN (1, 2, 3)`
  },
  {
    label: 'DELETE with Conditions',
    query: `DELETE FROM sessions 
WHERE user_id = 123`
  },
  {
    label: 'IN Operator',
    query: `SELECT * FROM users 
WHERE status IN ('active', 'premium', 'trial')`
  },
  {
    label: 'NOT & IS NULL',
    query: `SELECT * FROM posts 
WHERE deleted_at IS NULL 
  AND NOT draft = true`
  }
];

function Supabase() {
  const { convert, isLoading, isReady, error: wasmError, startLoading } = useSQL2PostgREST();
  const { theme } = useTheme();
  const [sqlQuery, setSQLQuery] = useState('SELECT * FROM users WHERE age > 18');
  const [baseURL, setBaseURL] = useState('http://localhost:3000');
  const [result, setResult] = useState<PostgRESTRequest | null>(null);
  const [copied, setCopied] = useState(false);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const timer = setTimeout(() => {
      startLoading();
    }, 100);

    return () => clearTimeout(timer);
  }, [startLoading]);

  const handleConvert = () => {
    if (!sqlQuery.trim()) return;

    const converted = convert(sqlQuery, baseURL);
    if (converted) {
      setResult(converted);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (wasmError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load WASM</CardTitle>
            <CardDescription>{wasmError}</CardDescription>
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
    );
  }

  return (
    <PageLayout title="SQL to Supabase">

        <div className="hidden lg:block mb-12">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="pr-3 space-y-4">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      PostgreSQL Query
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Write your SQL query • Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono">⌘ Enter</kbd> to convert
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
                        <DropdownMenuContent align="start" className="w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                          <DropdownMenuLabel className="text-slate-900 dark:text-slate-100">SQL Examples</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {SQL_EXAMPLES.map((example, i) => (
                            <DropdownMenuItem 
                              key={i} 
                              onClick={() => setSQLQuery(example.query)}
                              className="text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
                            >
                              {example.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="relative">
                      <Suspense
                        fallback={
                          <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                          </div>
                        }
                      >
                        <CodeMirror
                          autoFocus={true}
                          value={sqlQuery}
                          onChange={(value) => setSQLQuery(value)}
                          theme={isDark ? githubDark : githubLight}
                          extensions={[sqlLang()]}
                          placeholder="SELECT * FROM users WHERE age > 18 ORDER BY created_at DESC"
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
                          minHeight='100px'
                          style={{
                            fontSize: '14px',
                          }}
                        />
                      </Suspense>
                      {!isReady && (
                        <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                        </div>
                      )}
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
                        className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        disabled={!isReady}
                      />
                    </div>

                    <Button
                      onClick={handleConvert}
                      disabled={!isReady || !sqlQuery.trim()}
                      className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm transition-all duration-200 font-medium"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Convert to Supabase
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="pl-3 space-y-4">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          Supabase Output
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Generated Supabase client code
                        </p>
                      </div>
                      {result && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                          className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                        >
                          {copied ? (
                            <>
                              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 mr-1.5" />
                              Copy
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    {result ? (
                      <Suspense
                        fallback={
                          <div className="h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-950/80 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                          </div>
                        }
                      >
                        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Parsed JSON</p>
                          <CodeMirror
                            value={JSON.stringify(result, null, 2)}
                            extensions={[javascript({ jsx: false, typescript: false })]}
                            theme={isDark ? githubDark : githubLight}
                            editable={false}
                            basicSetup={{
                              lineNumbers: false,
                              foldGutter: false,
                              highlightActiveLineGutter: false,
                              highlightActiveLine: false,
                            }}
                            className="[&>*:first-child]:p-0"
                            style={{
                              fontSize: '14px',
                            }}
                          />
                        </div>
                      </Suspense>
                    ) : (
                      <div className="text-center py-20">
                        <div className="inline-flex p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                          <Database className="h-12 w-12 text-slate-400 dark:text-slate-600" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          Your converted request will appear here
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        
        <div className="lg:hidden grid gap-6 mb-12">
          <div className="space-y-4">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  PostgreSQL Query
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Write your SQL query • Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono">⌘ Enter</kbd> to convert
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
                    <DropdownMenuContent align="start" className="w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      <DropdownMenuLabel className="text-slate-900 dark:text-slate-100">SQL Examples</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {SQL_EXAMPLES.map((example, i) => (
                        <DropdownMenuItem 
                          key={i} 
                          onClick={() => setSQLQuery(example.query)}
                          className="text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
                        >
                          {example.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="relative">
                  <Suspense
                    fallback={
                      <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                      </div>
                    }
                  >
                    <CodeMirror
                      autoFocus={true}
                      value={sqlQuery}
                      onChange={(value) => setSQLQuery(value)}
                      theme={isDark ? githubDark : githubLight}
                      extensions={[sqlLang()]}
                      placeholder="SELECT * FROM users WHERE age > 18 ORDER BY created_at DESC"
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
                      minHeight='100px'
                      style={{
                        fontSize: '14px',
                      }}
                    />
                  </Suspense>
                  {!isReady && (
                    <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
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
                    className="w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    disabled={!isReady}
                  />
                </div>

                <Button
                  onClick={handleConvert}
                  disabled={!isReady || !sqlQuery.trim()}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm transition-all duration-200 font-medium"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Convert to Supabase
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      Supabase Output
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Generated Supabase client code
                    </p>
                  </div>
                  {result && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                    >
                      {copied ? (
                        <>
                          <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {result ? (
                  <Suspense
                    fallback={
                      <div className="h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-950/80 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                      </div>
                    }
                  >
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Parsed JSON</p>
                      <CodeMirror
                        value={JSON.stringify(result, null, 2)}
                        extensions={[javascript({ jsx: false, typescript: false })]}
                        theme={isDark ? githubDark : githubLight}
                        editable={false}
                        basicSetup={{
                          lineNumbers: false,
                          foldGutter: false,
                          highlightActiveLineGutter: false,
                          highlightActiveLine: false,
                        }}
                        className="[&>*:first-child]:p-0"
                        style={{
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </Suspense>
                ) : (
                  <div className="text-center py-20">
                    <div className="inline-flex p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                      <Database className="h-12 w-12 text-slate-400 dark:text-slate-600" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      Your converted request will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </PageLayout>
  );
}
