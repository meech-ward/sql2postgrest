import { PostgrestClient } from "@supabase/postgrest-js"
import { postgrestToSupabase } from "./postgrestToSupabase"

/**
 * Format SQL with proper newlines for readability
 */
function formatSQL(sql: string): string {
  if (!sql) return sql

  // Keywords that should start on a new line
  const newlineKeywords = [
    'FROM',
    'WHERE',
    'AND',
    'OR',
    'ORDER BY',
    'GROUP BY',
    'HAVING',
    'LIMIT',
    'OFFSET',
    'LEFT JOIN',
    'RIGHT JOIN',
    'INNER JOIN',
    'OUTER JOIN',
    'FULL JOIN',
    'CROSS JOIN',
    'JOIN',
    'ON',
    'SET',
    'VALUES',
    'RETURNING',
  ]

  let formatted = sql.trim()

  // Add newline before keywords (case-insensitive)
  for (const keyword of newlineKeywords) {
    // Match keyword with word boundaries, case insensitive
    const regex = new RegExp(`\\s+(${keyword})\\b`, 'gi')
    formatted = formatted.replace(regex, `\n$1`)
  }

  // Clean up any double newlines
  formatted = formatted.replace(/\n\s*\n/g, '\n')

  // Ensure consistent indentation (2 spaces for continuation lines)
  const lines = formatted.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (i === 0) {
      // First line (SELECT, INSERT, UPDATE, DELETE) - no indent
      result.push(line)
    } else {
      // Continuation lines - no indent for main clauses
      result.push(line)
    }
  }

  return result.join('\n')
}

export interface PostgRESTRequest {
  method: string
  url: string
  path: string
  query: string
  body: string
  headers: Record<string, string>
}

export interface ConversionResult<T> {
  success: boolean
  data?: T
  error?: string
  warnings?: string[]
}

/**
 * Parse a full URL into path and query components
 */
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

/**
 * Convert SQL to PostgREST request
 */
export function sqlToPostgREST(
  sqlCode: string,
  baseUrl: string,
  convertFn: (sql: string, baseUrl: string) => any
): ConversionResult<PostgRESTRequest> {
  if (!sqlCode.trim()) {
    return { success: false, error: 'Empty SQL query' }
  }

  try {
    const result = convertFn(sqlCode, baseUrl)
    console.log('[Conv] SQL → PostgREST raw result:', result)

    if (!result) {
      return { success: false, error: 'Conversion failed - no result' }
    }

    const { path, query } = parseURL(result.url)
    console.log('[Conv] Parsed path:', path, 'query:', query)

    // Ensure body is properly stringified
    let bodyString = ''
    if (result.body) {
      if (typeof result.body === 'string') {
        bodyString = result.body
      } else if (typeof result.body === 'object') {
        bodyString = JSON.stringify(result.body, null, 2)
      } else {
        bodyString = String(result.body)
      }
    }

    return {
      success: true,
      data: {
        method: result.method || 'GET',
        url: result.url,
        path,
        query,
        body: bodyString,
        headers: result.headers || {}
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Conversion failed'
    }
  }
}

/**
 * Convert PostgREST to SQL
 */
export function postgrestToSQL(
  request: PostgRESTRequest,
  convertFn: (params: { method: string; path: string; query: string; body: string }) => any
): ConversionResult<string> {
  try {
    // Clean up query parameters - remove metadata params that aren't SQL filters
    // These are added by Supabase JS client but confuse the SQL converter
    let cleanedQuery = request.query
    if (cleanedQuery) {
      const params = new URLSearchParams(cleanedQuery)
      // Remove metadata parameters that aren't actual filters
      params.delete('columns')     // Used by .insert() to specify return columns
      params.delete('select')      // Already handled separately
      cleanedQuery = params.toString()
    }

    const input = {
      method: request.method,
      path: request.path,
      query: cleanedQuery,
      body: request.body
    }

    const result = convertFn(input)

    if (!result) {
      return { success: false, error: 'Conversion failed - no result from converter' }
    }

    // WASM converter returns error object for unsupported conversions
    if (result.error) {
      return {
        success: false,
        error: result.error
      }
    }

    if (!result.sql) {
      return {
        success: false,
        error: 'Conversion failed - no SQL in result'
      }
    }

    // Format the SQL with proper newlines
    const formattedSQL = formatSQL(result.sql)

    return {
      success: true,
      data: formattedSQL,
      warnings: result.warnings
    }
  } catch (err) {
    console.error('[Conv] PostgREST→SQL exception:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Conversion failed'
    }
  }
}

/**
 * Convert Supabase JS to PostgREST request
 */
export async function supabaseJsToPostgREST(
  jsCode: string,
  baseUrl: string
): Promise<ConversionResult<PostgRESTRequest>> {
  if (!jsCode.trim()) {
    return { success: false, error: 'Empty JavaScript code' }
  }

  try {
    const result = await new Promise<{ url: RequestInfo | URL; options: RequestInit | undefined }>((resolve, reject) => {
      const postgrest = new PostgrestClient(baseUrl, {
        fetch: async (...args) => {
          const [url, options] = args
          resolve({ url, options })
          return new Response()
        },
      })

      try {
        // Execute user's code with postgrest object
        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor
        // Replace 'supabase' with 'postgrest' in the code
        const code = jsCode.replace(/\bsupabase\b/g, 'postgrest')
        const userFunction = new AsyncFunction('postgrest', `await ${code}`)
        userFunction(postgrest)

        // Timeout after 1 second
        setTimeout(() => reject(new Error('Conversion timeout')), 1000)
      } catch (err) {
        reject(err)
      }
    })

    const urlString = result.url.toString()
    const { path, query } = parseURL(urlString)

    // Extract headers
    const headers: Record<string, string> = {}
    if (result.options?.headers) {
      // @ts-expect-error - Headers might be iterable
      for (const [key, value] of result.options.headers.entries?.() || []) {
        headers[key] = value
      }
    }

    // Ensure body is properly stringified
    const bodyValue = result.options?.body
    let bodyString = ''
    if (bodyValue !== undefined && bodyValue !== null) {
      if (typeof bodyValue === 'string') {
        bodyString = bodyValue
      } else if (typeof bodyValue === 'object') {
        bodyString = JSON.stringify(bodyValue, null, 2)
      } else {
        bodyString = String(bodyValue)
      }
    }

    return {
      success: true,
      data: {
        method: result.options?.method || 'GET',
        url: urlString,
        path,
        query,
        body: bodyString,
        headers
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Conversion failed'
    }
  }
}

/**
 * Convert PostgREST to Supabase JS
 */
export function postgrestToSupabaseJs(
  request: PostgRESTRequest
): ConversionResult<string> {
  try {
    console.log('[Conv] PostgREST → JS input:', {
      method: request.method,
      url: request.url,
      body: request.body
    })

    const result = postgrestToSupabase({
      method: request.method,
      url: request.url,
      body: request.body
    })

    console.log('[Conv] PostgREST → JS raw result:', result)

    if (!result) {
      return { success: false, error: 'Conversion failed - no result' }
    }

    // Extract code from result object if it has that shape
    let resultString: string
    if (typeof result === 'object' && result !== null && 'code' in result) {
      const code = result.code
      // Ensure code is actually a string
      if (typeof code === 'string') {
        resultString = code
      } else if (code === null || code === undefined) {
        resultString = ''
      } else {
        resultString = String(code)
      }
    } else if (typeof result === 'string') {
      resultString = result
    } else if (result === null || result === undefined) {
      resultString = ''
    } else {
      resultString = JSON.stringify(result)
    }

    return {
      success: true,
      data: resultString
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Conversion failed'
    }
  }
}
