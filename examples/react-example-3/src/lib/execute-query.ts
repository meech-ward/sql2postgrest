export interface ExecutionResult {
  success: boolean
  data: any
  status: number
  statusText: string
  time: number
  rowCount: number | null
  error: string | null
}

export type ConnectionCredentials =
  | { mode: 'supabase'; url: string; anonKey: string }
  | { mode: 'postgrest'; url: string }

/**
 * Execute a PostgREST request
 */
export async function executePostgrestRequest(
  method: string,
  path: string,
  body: string,
  headers: Record<string, string>,
  credentials: ConnectionCredentials
): Promise<ExecutionResult> {
  const startTime = performance.now()

  try {
    const baseUrl = credentials.url.replace(/\/$/, '')

    let restUrl: string
    let requestHeaders: Record<string, string>

    if (credentials.mode === 'supabase') {
      const cleanPath = path.startsWith('/rest/v1') ? path : `/rest/v1${path}`
      restUrl = `${baseUrl}${cleanPath}`
      requestHeaders = {
        ...headers,
        apikey: credentials.anonKey,
        Authorization: `Bearer ${credentials.anonKey}`,
        'Content-Type': 'application/json',
      }
    } else {
      restUrl = `${baseUrl}${path}`
      requestHeaders = {
        ...headers,
        'Content-Type': 'application/json',
      }
    }

    // Log the complete request
    const requestBody = body && method !== 'GET' && method !== 'DELETE' ? body : undefined
    console.group('🚀 PostgREST Request')
    console.log('Method:', method)
    console.log('URL:', restUrl)
    const logHeaders = { ...requestHeaders }
    if (credentials.mode === 'supabase') {
      logHeaders.apikey = '[REDACTED]'
      logHeaders.Authorization = '[REDACTED]'
    }
    console.log('Headers:', logHeaders)
    if (requestBody) {
      console.log('Body:', requestBody)
      try {
        console.log('Body (parsed):', JSON.parse(requestBody))
      } catch {
        // Body is not JSON
      }
    }
    console.groupEnd()

    // Make request
    const response = await fetch(restUrl, {
      method,
      headers: requestHeaders,
      body: requestBody,
    })

    const endTime = performance.now()
    const executionTime = Math.round(endTime - startTime)

    // Parse response
    let data: any = null
    let rowCount: number | null = null

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text()
      if (text) {
        data = JSON.parse(text)

        // Count rows
        if (Array.isArray(data)) {
          rowCount = data.length
        } else if (data && typeof data === 'object') {
          rowCount = 1
        }
      }
    } else {
      // Non-JSON response
      const text = await response.text()
      data = text
    }

    // Check for errors
    if (!response.ok) {
      const errorMessage = data?.message || data?.error || data?.hint || response.statusText

      console.group('❌ PostgREST Response Error')
      console.log('Status:', response.status, response.statusText)
      console.log('Error:', errorMessage)
      console.log('Full Response:', data)
      console.log('Time:', executionTime + 'ms')
      console.groupEnd()

      return {
        success: false,
        data,
        status: response.status,
        statusText: response.statusText,
        time: executionTime,
        rowCount,
        error: errorMessage,
      }
    }

    // Success
    console.group('✅ PostgREST Response Success')
    console.log('Status:', response.status, response.statusText)
    console.log('Row Count:', rowCount)
    console.log('Data:', data)
    console.log('Time:', executionTime + 'ms')
    console.groupEnd()

    return {
      success: true,
      data,
      status: response.status,
      statusText: response.statusText,
      time: executionTime,
      rowCount,
      error: null,
    }
  } catch (err) {
    const endTime = performance.now()
    const executionTime = Math.round(endTime - startTime)

    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'

    console.group('⚠️ PostgREST Network Error')
    console.log('Error:', errorMessage)
    console.log('Exception:', err)
    console.log('Time:', executionTime + 'ms')
    console.groupEnd()

    return {
      success: false,
      data: null,
      status: 0,
      statusText: 'Network Error',
      time: executionTime,
      rowCount: null,
      error: errorMessage,
    }
  }
}
