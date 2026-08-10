import { Loader2 } from 'lucide-react'

interface TerminalLoadingOverlayProps {
  status: 'loading-wasm' | 'syncing-editors'
  wasmSQL2PostgRESTReady: boolean
  wasmPostgREST2SQLReady: boolean
}

export function TerminalLoadingOverlay({
  status,
  wasmSQL2PostgRESTReady,
  wasmPostgREST2SQLReady,
}: TerminalLoadingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-surface z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 max-w-md">
        {/* Spinner */}
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-blue-400/20" />
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {status === 'loading-wasm' ? 'Initializing Terminal' : 'Syncing Editors'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {status === 'loading-wasm'
              ? 'Loading SQL conversion modules...'
              : 'Converting SQL to JavaScript and PostgREST...'}
          </p>
        </div>

        {/* WASM Module Status */}
        {status === 'loading-wasm' && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono">SQL → PostgREST</span>
              {wasmSQL2PostgRESTReady ? (
                <span className="text-green-400 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Ready
                </span>
              ) : (
                <span className="text-blue-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono">PostgREST → SQL</span>
              {wasmPostgREST2SQLReady ? (
                <span className="text-green-400 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Ready
                </span>
              ) : (
                <span className="text-blue-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress bar for syncing */}
        {status === 'syncing-editors' && (
          <div className="w-full">
            <div className="h-1 w-full bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
