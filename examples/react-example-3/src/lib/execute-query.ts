export interface ExecutionResult {
  success: boolean
  data: any
  status: number
  statusText: string
  time: number
  rowCount: number | null
  error: string | null
}

export interface SupabaseCredentials {
  url: string
  anonKey: string
}

/**
 * Execute a PostgREST request against Supabase
 */
export async function executePostgrestRequest(
  method: string,
  path: string,
  body: string,
  headers: Record<string, string>,
  credentials: SupabaseCredentials
): Promise<ExecutionResult> {
  const startTime = performance.now()

  try {
    // Build full URL - handle path that may or may not include /rest/v1
    const baseUrl = credentials.url.replace(/\/$/, '') // Remove trailing slash
    const cleanPath = path.startsWith('/rest/v1') ? path : `/rest/v1${path}`
    const restUrl = `${baseUrl}${cleanPath}`

    // Merge headers: PostgREST headers + auth headers
    const requestHeaders: Record<string, string> = {
      ...headers,
      apikey: credentials.anonKey,
      Authorization: `Bearer ${credentials.anonKey}`,
      'Content-Type': 'application/json',
    }

    // Log the complete request
    const requestBody = body && method !== 'GET' && method !== 'DELETE' ? body : undefined
    console.group('🚀 PostgREST Request')
    console.log('Method:', method)
    console.log('URL:', restUrl)
    console.log('Headers:', {
      ...requestHeaders,
      apikey: '[REDACTED]',
      Authorization: '[REDACTED]',
    })
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
