import { useEffect, useRef } from 'react'
import { useStore } from '@tanstack/react-store'
import {
  terminalStore,
  setSqlCode,
  setJsCode,
  setPostgrestMethod,
  setPostgrestPath,
  setPostgrestBody,
  setPostgrestHeaders,
  setSyncInProgress,
  setSqlError,
  setJsError,
  setPostgrestError,
} from '@/stores/terminal-store'
import {
  sqlToPostgREST,
  postgrestToSQL,
  supabaseJsToPostgREST,
  postgrestToSupabaseJs,
  type PostgRESTRequest,
} from '@/lib/editor-conversions'

interface UseEditorSyncProps {
  convertSQL2PostgREST: (sql: string, baseUrl: string) => any
  convertPostgREST2SQL: (params: {
    method: string
    path: string
    query: string
    body: string
  }) => any
  isReadySQL2PostgREST: boolean
  isReadyPostgREST2SQL: boolean
  baseUrl: string
}

export function useEditorSync({
  convertSQL2PostgREST,
  convertPostgREST2SQL,
  isReadySQL2PostgREST,
  isReadyPostgREST2SQL,
  baseUrl,
}: UseEditorSyncProps) {
  const {
    sqlCode,
    jsCode,
    postgrestMethod,
    postgrestPath,
    postgrestBody,
    postgrestHeaders,
    lastEditedEditor,
    syncInProgress,
  } = useStore(terminalStore)

  // Debounce timers
  const sqlDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jsDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const postgrestDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Previous values to detect actual changes
  const prevSqlCode = useRef(sqlCode)
  const prevJsCode = useRef(jsCode)
  const prevPostgrestState = useRef({ postgrestMethod, postgrestPath, postgrestBody })

  /**
   * Sync from SQL to PostgREST and JS
   */
  const syncFromSQL = async () => {
    if (!isReadySQL2PostgREST || syncInProgress || !sqlCode.trim()) return

    setSyncInProgress(true)
    setSqlError(null)

    try {
      // SQL → PostgREST
      const postgrestResult = sqlToPostgREST(sqlCode, baseUrl, convertSQL2PostgREST)

      if (!postgrestResult.success || !postgrestResult.data) {
        setSqlError(postgrestResult.error || 'Conversion failed')
        setSyncInProgress(false)
        return
      }

      const request = postgrestResult.data
      console.log('[Sync] SQL → PostgREST:', request)

      // Update PostgREST state
      setPostgrestMethod(request.method as any)
      // Combine path and query for display
      const fullPath = request.query ? `${request.path}?${request.query}` : request.path
      setPostgrestPath(fullPath)
      setPostgrestBody(request.body)
      setPostgrestHeaders(request.headers)

      // PostgREST → JS
      const jsResult = postgrestToSupabaseJs(request)
      console.log('[Sync] PostgREST → JS:', jsResult)

      if (jsResult.success && jsResult.data !== undefined && jsResult.data !== null) {
        // Ensure we're setting a string
        const jsCodeString = typeof jsResult.data === 'string' ? jsResult.data : String(jsResult.data || '')
        setJsCode(jsCodeString)
        setJsError(null)
      } else {
        setJsError(jsResult.error || 'Conversion failed')
      }
    } catch (err) {
      setSqlError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncInProgress(false)
    }
  }

  /**
   * Sync from JS to PostgREST and SQL
   */
  const syncFromJS = async () => {
    if (syncInProgress || !jsCode.trim()) return

    setSyncInProgress(true)
    setJsError(null)

    try {
      // JS → PostgREST
      const postgrestResult = await supabaseJsToPostgREST(jsCode, baseUrl)

      if (!postgrestResult.success || !postgrestResult.data) {
        setJsError(postgrestResult.error || 'Conversion failed')
        setSyncInProgress(false)
        return
      }

      const request = postgrestResult.data

      // Update PostgREST state
      setPostgrestMethod(request.method as any)
      // Combine path and query for display
      const fullPath = request.query ? `${request.path}?${request.query}` : request.path
      setPostgrestPath(fullPath)
      setPostgrestBody(request.body)
      setPostgrestHeaders(request.headers)

      // PostgREST → SQL (skip if conversion not supported)
      if (isReadyPostgREST2SQL) {
        const sqlResult = postgrestToSQL(request, convertPostgREST2SQL)

        if (sqlResult.success && sqlResult.data !== undefined && sqlResult.data !== null) {
          // Ensure we're setting a string
          const sqlCodeString = typeof sqlResult.data === 'string' ? sqlResult.data : String(sqlResult.data || '')
          setSqlCode(sqlCodeString)
          setSqlError(null)
        }
        // If conversion fails, silently skip - WASM converter has limitations
        // User can still manually edit SQL editor
      }
    } catch (err) {
      setJsError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncInProgress(false)
    }
  }

  /**
   * Sync from PostgREST to SQL and JS
   */
  const syncFromPostgREST = async () => {
    if (syncInProgress || !postgrestPath.trim()) return

    setSyncInProgress(true)
    setPostgrestError(null)

    try {
      // Parse path and query from postgrestPath (which may include query string)
      const [pathPart, queryPart] = postgrestPath.split('?')

      const request: PostgRESTRequest = {
        method: postgrestMethod,
        url: `${baseUrl}${postgrestPath}`,
        path: pathPart,
        query: queryPart || '',
        body: postgrestBody,
        headers: postgrestHeaders,
      }

      // PostgREST → SQL (skip if conversion not supported)
      if (isReadyPostgREST2SQL) {
        const sqlResult = postgrestToSQL(request, convertPostgREST2SQL)

        if (sqlResult.success && sqlResult.data !== undefined && sqlResult.data !== null) {
          // Ensure we're setting a string
          const sqlCodeString = typeof sqlResult.data === 'string' ? sqlResult.data : String(sqlResult.data || '')
          setSqlCode(sqlCodeString)
          setSqlError(null)
        }
        // If conversion fails, silently skip - WASM converter has limitations
        // User can still manually edit SQL editor
      }

      // PostgREST → JS
      const jsResult = postgrestToSupabaseJs(request)

      if (jsResult.success && jsResult.data !== undefined && jsResult.data !== null) {
        // Ensure we're setting a string
        const jsCodeString = typeof jsResult.data === 'string' ? jsResult.data : String(jsResult.data || '')
        setJsCode(jsCodeString)
        setJsError(null)
      } else {
        setJsError(jsResult.error || 'Conversion failed')
      }
    } catch (err) {
      setPostgrestError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncInProgress(false)
    }
  }

  // Watch SQL changes
  useEffect(() => {
    if (lastEditedEditor !== 'sql' || prevSqlCode.current === sqlCode) return

    prevSqlCode.current = sqlCode

    if (sqlDebounceTimer.current) {
      clearTimeout(sqlDebounceTimer.current)
    }

    sqlDebounceTimer.current = setTimeout(() => {
      syncFromSQL()
    }, 500)

    return () => {
      if (sqlDebounceTimer.current) {
        clearTimeout(sqlDebounceTimer.current)
      }
    }
  }, [sqlCode, lastEditedEditor, isReadySQL2PostgREST])

  // Watch JS changes
  useEffect(() => {
    if (lastEditedEditor !== 'js' || prevJsCode.current === jsCode) return

    prevJsCode.current = jsCode

    if (jsDebounceTimer.current) {
      clearTimeout(jsDebounceTimer.current)
    }

    jsDebounceTimer.current = setTimeout(() => {
      syncFromJS()
    }, 500)

    return () => {
      if (jsDebounceTimer.current) {
        clearTimeout(jsDebounceTimer.current)
      }
    }
  }, [jsCode, lastEditedEditor])

  // Watch PostgREST changes
  useEffect(() => {
    const currentState = { postgrestMethod, postgrestPath, postgrestBody }
    const hasChanged =
      prevPostgrestState.current.postgrestMethod !== currentState.postgrestMethod ||
      prevPostgrestState.current.postgrestPath !== currentState.postgrestPath ||
      prevPostgrestState.current.postgrestBody !== currentState.postgrestBody

    if (lastEditedEditor !== 'postgrest' || !hasChanged) return

    prevPostgrestState.current = currentState

    if (postgrestDebounceTimer.current) {
      clearTimeout(postgrestDebounceTimer.current)
    }

    postgrestDebounceTimer.current = setTimeout(() => {
      syncFromPostgREST()
    }, 500)

    return () => {
      if (postgrestDebounceTimer.current) {
        clearTimeout(postgrestDebounceTimer.current)
      }
    }
  }, [postgrestMethod, postgrestPath, postgrestBody, lastEditedEditor, isReadyPostgREST2SQL])

  return {
    syncFromSQL,
    syncFromJS,
    syncFromPostgREST,
  }
}
