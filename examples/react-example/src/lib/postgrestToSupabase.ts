import type { PostgRESTRequest } from '../hooks/useSQL2PostgREST'

export interface SupabaseClientCode {
  code: string
  language: 'typescript'
}

/**
 * Converts PostgREST request JSON to Supabase JS client code
 */
export function postgrestToSupabase(request: PostgRESTRequest): SupabaseClientCode {
  const { method, url, headers, body } = request

  // Parse the URL to extract table name and query parameters
  const urlObj = new URL(url)
  const pathname = urlObj.pathname
  const pathParts = pathname.split('/').filter(Boolean)
  const tableName = pathParts[pathParts.length - 1] || 'table'
  const searchParams = urlObj.searchParams

  // Check if this is an RPC call
  const isRPC = pathParts.length >= 2 && pathParts[pathParts.length - 2] === 'rpc'

  let code = ''

  if (isRPC) {
    code = buildRPCQuery(tableName, body, searchParams)
  } else {
    switch (method) {
      case 'GET':
        code = buildSelectQuery(tableName, searchParams)
        break
      case 'POST':
        code = buildInsertQuery(tableName, body, headers)
        break
      case 'PATCH':
        code = buildUpdateQuery(tableName, body, searchParams, headers)
        break
      case 'DELETE':
        code = buildDeleteQuery(tableName, searchParams)
        break
      default:
        code = `// Unsupported method: ${method}`
    }
  }

  return {
    code,
    language: 'typescript'
  }
}

function buildSelectQuery(tableName: string, searchParams: URLSearchParams): string {
  let code = `supabase\n  .from('${tableName}')`

  // Handle select columns
  const select = searchParams.get('select')
  if (select) {
    code += `\n  .select('${select}')`
  } else {
    code += `\n  .select('*')`
  }

  // Check for OR filter first
  const orFilter = searchParams.get('or')
  const andFilter = searchParams.get('and')
  
  if (orFilter) {
    code += `\n  .or('${orFilter}')`
  } else if (andFilter) {
    code += `\n  .and('${andFilter}')`
  } else {
    // Handle regular filters
    for (const [key, value] of searchParams.entries()) {
      if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset' || key === 'and' || key === 'or') {
        continue
      }

      const filter = parseFilter(key, value)
      if (filter) {
        code += `\n  ${filter}`
      }
    }
  }

  // Handle order (supports multiple: order=col1.asc,col2.desc.nullslast)
  const order = searchParams.get('order')
  if (order) {
    const orderClauses = order.split(',')
    for (const clause of orderClauses) {
      const orderParts = clause.trim().split('.')
      const column = orderParts[0]
      const direction = orderParts[1] === 'desc' ? false : true
      
      // Check for nullsfirst/nullslast (3rd part)
      let nullsOption = ''
      if (orderParts[2]) {
        if (orderParts[2] === 'nullsfirst') {
          nullsOption = ', nullsFirst: true'
        } else if (orderParts[2] === 'nullslast') {
          nullsOption = ', nullsFirst: false'
        }
      }
      
      code += `\n  .order('${column}', { ascending: ${direction}${nullsOption} })`
    }
  }

  // Handle limit
  const limit = searchParams.get('limit')
  if (limit) {
    code += `\n  .limit(${limit})`
  }

  // Handle offset/range
  const offset = searchParams.get('offset')
  if (offset) {
    const rangeEnd = limit ? parseInt(offset) + parseInt(limit) - 1 : parseInt(offset) + 9
    code += `\n  .range(${offset}, ${rangeEnd})`
  }

  return code
}

function parseFilter(key: string, value: string): string | null {
  let column: string
  let operator: string
  let filterValue: string

  const validOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 
                          'cs', 'cd', 'ov', 'sl', 'sr', 'nxl', 'nxr', 'adj', 
                          'fts', 'plfts', 'phfts', 'wfts', 'not']

  if (key.includes('.')) {
    const parts = key.split('.')
    column = parts[0]
    operator = parts.slice(1).join('.')
    filterValue = value
  } else if (value.includes('.')) {
    const valueParts = value.split('.')
    const potentialOp = valueParts[0]
    
    if (validOperators.includes(potentialOp)) {
      column = key
      operator = potentialOp
      filterValue = valueParts.slice(1).join('.')
    } else {
      column = key
      operator = 'eq'
      filterValue = value
    }
  } else {
    column = key
    operator = 'eq'
    filterValue = value
  }

  switch (operator) {
    case 'eq':
      return `.eq('${column}', ${formatValue(filterValue)})`
    case 'neq':
      return `.neq('${column}', ${formatValue(filterValue)})`
    case 'gt':
      return `.gt('${column}', ${formatValue(filterValue)})`
    case 'gte':
      return `.gte('${column}', ${formatValue(filterValue)})`
    case 'lt':
      return `.lt('${column}', ${formatValue(filterValue)})`
    case 'lte':
      return `.lte('${column}', ${formatValue(filterValue)})`
    case 'like':
      const likeValue = safeDecodeURIComponent(filterValue).replace(/\*/g, '%');
      return `.like('${column}', '${likeValue}')`
    case 'ilike':
      const ilikeValue = safeDecodeURIComponent(filterValue).replace(/\*/g, '%');
      return `.ilike('${column}', '${ilikeValue}')`
    case 'is':
      return `.is('${column}', ${filterValue === 'null' ? 'null' : formatValue(filterValue)})`
    case 'in':
      const inValues = filterValue.replace(/[()]/g, '').split(',').map(v => formatValue(v.trim()))
      return `.in('${column}', [${inValues.join(', ')}])`
    case 'cs':
      return `.contains('${column}', ${formatValue(filterValue)})`
    case 'cd':
      return `.containedBy('${column}', ${formatValue(filterValue)})`
    case 'ov':
      return `.overlaps('${column}', ${formatValue(filterValue)})`
    case 'sl':
      return `.rangeLt('${column}', '${filterValue}')`
    case 'sr':
      return `.rangeGt('${column}', '${filterValue}')`
    case 'nxl':
      return `.rangeGte('${column}', '${filterValue}')`
    case 'nxr':
      return `.rangeLte('${column}', '${filterValue}')`
    case 'adj':
      return `.rangeAdjacent('${column}', '${filterValue}')`
    case 'fts':
      const ftsValue = safeDecodeURIComponent(filterValue);
      return `.textSearch('${column}', '${ftsValue.replace(/'/g, "\\'")}', { config: 'english' })`
    case 'plfts':
      return `.textSearch('${column}', '${safeDecodeURIComponent(filterValue)}', { type: 'plain', config: 'english' })`
    case 'phfts':
      return `.textSearch('${column}', '${safeDecodeURIComponent(filterValue)}', { type: 'phrase', config: 'english' })`
    case 'wfts':
      return `.textSearch('${column}', '${safeDecodeURIComponent(filterValue)}', { type: 'websearch', config: 'english' })`
    case 'not':
      if (filterValue.includes('.')) {
        const notParts = filterValue.split('.')
        const notOp = notParts[0]
        const notValue = notParts.slice(1).join('.')
        return `.not('${column}', '${notOp}', ${formatValue(notValue)})`
      }
      return null
    default:
      return null
  }
}

function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str)
  } catch {
    return str
  }
}

function buildInsertQuery(tableName: string, body: any, headers?: Record<string, string>): string {
  const prefer = headers?.['Prefer'] || headers?.['prefer']
  const isUpsert = prefer?.includes('resolution=merge-duplicates')
  const returnRepresentation = !prefer?.includes('return=minimal')

  let code = `supabase\n  .from('${tableName}')`

  if (isUpsert) {
    code += `\n  .upsert(${formatBodyValue(body)})`
  } else {
    code += `\n  .insert(${formatBodyValue(body)})`
  }

  if (returnRepresentation) {
    code += `\n  .select()`
  }

  return code
}

function buildUpdateQuery(tableName: string, body: any, searchParams: URLSearchParams, headers?: Record<string, string>): string {
  let code = `supabase\n  .from('${tableName}')\n  .update(${formatBodyValue(body)})`

  // Handle filters for WHERE clause
  for (const [key, value] of searchParams.entries()) {
    const filter = parseFilter(key, value)
    if (filter) {
      code += `\n  ${filter}`
    }
  }

  const prefer = headers?.['Prefer'] || headers?.['prefer']
  const returnRepresentation = !prefer?.includes('return=minimal')
  
  if (returnRepresentation) {
    code += `\n  .select()`
  }

  return code
}

function buildDeleteQuery(tableName: string, searchParams: URLSearchParams): string {
  let code = `supabase\n  .from('${tableName}')\n  .delete()`

  // Handle filters for WHERE clause
  for (const [key, value] of searchParams.entries()) {
    const filter = parseFilter(key, value)
    if (filter) {
      code += `\n  ${filter}`
    }
  }

  return code
}

function buildRPCQuery(functionName: string, body: any, searchParams: URLSearchParams): string {
  let code = `supabase\n  .rpc('${functionName}'`
  
  // Add parameters if body exists
  if (body && Object.keys(body).length > 0) {
    code += `, ${formatBodyValue(body)}`
  }
  
  code += ')'

  // Handle filters for filtering RPC results
  for (const [key, value] of searchParams.entries()) {
    if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset') {
      continue
    }
    
    const filter = parseFilter(key, value)
    if (filter) {
      code += `\n  ${filter}`
    }
  }

  // Handle order
  const order = searchParams.get('order')
  if (order) {
    const orderClauses = order.split(',')
    for (const clause of orderClauses) {
      const orderParts = clause.trim().split('.')
      const column = orderParts[0]
      const direction = orderParts[1] === 'desc' ? false : true
      
      let nullsOption = ''
      if (orderParts[2]) {
        if (orderParts[2] === 'nullsfirst') {
          nullsOption = ', nullsFirst: true'
        } else if (orderParts[2] === 'nullslast') {
          nullsOption = ', nullsFirst: false'
        }
      }
      
      code += `\n  .order('${column}', { ascending: ${direction}${nullsOption} })`
    }
  }

  // Handle limit
  const limit = searchParams.get('limit')
  if (limit) {
    code += `\n  .limit(${limit})`
  }

  // Handle offset/range
  const offset = searchParams.get('offset')
  if (offset) {
    const rangeEnd = limit ? parseInt(offset) + parseInt(limit) - 1 : parseInt(offset) + 9
    code += `\n  .range(${offset}, ${rangeEnd})`
  }

  return code
}

function formatValue(value: string): string {
  // Check if it's a number
  if (!isNaN(Number(value)) && value.trim() !== '') {
    return value
  }

  // Check if it's a boolean
  if (value === 'true' || value === 'false') {
    return value
  }

  // Check if it's null
  if (value === 'null') {
    return 'null'
  }

  // Check if it's already quoted JSON
  if ((value.startsWith('{') && value.endsWith('}')) || 
      (value.startsWith('[') && value.endsWith(']'))) {
    return value
  }

  // Otherwise, treat as string
  return `'${value.replace(/'/g, "\\'")}'`
}

function formatBodyValue(body: any): string {
  const json = JSON.stringify(body, null, 2)
  const lines = json.split('\n')
  
  if (lines.length === 1) {
    return json
  }
  
  return lines.map((line, index) => {
    if (index === 0) return line
    return '  ' + line
  }).join('\n')
}
