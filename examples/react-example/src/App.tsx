import { useState, useEffect } from 'react';
import { useSQL2PostgREST, type PostgRESTRequest } from './hooks/useSQL2PostgREST';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Loader2, Copy, CheckCheck, Database } from 'lucide-react';
import { ModeToggle } from './components/mode-toggle';

function App() {
  const { convert, isLoading, isReady, error: wasmError, startLoading } = useSQL2PostgREST();
  const [sql, setSQL] = useState('SELECT * FROM users WHERE age > 18');
  const [baseURL, setBaseURL] = useState('http://localhost:3000');
  const [result, setResult] = useState<PostgRESTRequest | null>(null);
  const [copied, setCopied] = useState(false);

  // Lazy load WASM after initial render
  useEffect(() => {
    // Start loading WASM after a short delay to let the page render first
    const timer = setTimeout(() => {
      startLoading();
    }, 100);

    return () => clearTimeout(timer);
  }, [startLoading]);

  const handleConvert = () => {
    if (!sql.trim()) return;
    
    const converted = convert(sql, baseURL);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleConvert();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-emerald-200/30 dark:bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/4 -right-1/4 w-[32rem] h-[32rem] bg-teal-200/30 dark:bg-teal-500/20 rounded-full blur-3xl animate-pulse [animation-delay:1s]"></div>
        <div className="absolute -bottom-1/4 left-1/3 w-80 h-80 bg-green-200/30 dark:bg-green-500/20 rounded-full blur-3xl animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 relative z-10">
        {/* Theme Toggle - Top Right */}
        <div className="absolute top-6 right-6">
          <ModeToggle />
        </div>

        {/* Header */}
        <header className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900 shadow-sm">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg">
              <Database className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
              SQL to PostgREST Converter
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Transform PostgreSQL queries into PostgREST API requests instantly.
            No server required, runs entirely in your browser.
          </p>
          {isLoading && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full border border-emerald-100 dark:border-emerald-900 text-sm text-slate-600 dark:text-slate-400 shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>Loading converter...</span>
            </div>
          )}
        </header>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 mb-12">
          {/* Left: SQL Editor */}
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
                <div className="relative">
                  <Textarea
                    value={sql}
                    onChange={(e) => setSQL(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="SELECT * FROM users WHERE age > 18 ORDER BY created_at DESC"
                    className="font-mono text-sm min-h-[320px] resize-y bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    disabled={!isReady}
                  />
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
                  disabled={!isReady || !sql.trim()}
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
                      Convert to PostgREST
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Output */}
          <div className="space-y-4">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      PostgREST Request
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Generated HTTP request details
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
                          Copy JSON
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {result ? (
                  <div className="space-y-4">
                    {/* Method & Headers Pills */}
                    <div className="flex flex-wrap gap-2">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                        result.method === 'GET' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' :
                        result.method === 'POST' ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' :
                        result.method === 'PATCH' ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' :
                        'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                      }`}>
                        <span className="text-xs opacity-70">METHOD</span>
                        <span className="font-semibold">{result.method}</span>
                      </div>
                      {result.headers && Object.keys(result.headers).length > 0 && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          <span className="text-xs opacity-70">HEADERS</span>
                          <span className="font-semibold">{Object.keys(result.headers).length}</span>
                        </div>
                      )}
                    </div>

                    {/* URL */}
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Endpoint URL</p>
                      <p className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all leading-relaxed">{result.url}</p>
                    </div>

                    {/* JSON Output */}
                    <div>
                      <pre className="p-5 bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-200 rounded-xl overflow-x-auto text-xs font-mono leading-relaxed shadow-sm border border-slate-800 dark:border-slate-900">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  </div>
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

        {/* Footer */}
        <footer className="text-center pt-8 pb-6">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>Powered by</span>
            <a
              href="https://github.com/meech-ward/sql2postgrest"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-emerald-200 dark:decoration-emerald-800 hover:decoration-emerald-400 dark:hover:decoration-emerald-600 transition-colors"
            >
              sql2postgrest
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a
              href="https://github.com/multigres/multigres"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-emerald-200 dark:decoration-emerald-800 hover:decoration-emerald-400 dark:hover:decoration-emerald-600 transition-colors"
            >
              multigres
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
