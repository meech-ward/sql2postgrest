/**
 * Formats a PostgREST URL for beautiful display in a code block
 * 
 * Handles:
 * - Multi-line formatting with proper indentation
 * - Nested select parameters with embedded resources
 * - Logical operators (or, and, not) with nested conditions
 * - All query parameters with proper alignment
 * 
 * @param url - The PostgREST URL to format
 * @returns A formatted string suitable for display in a code block
 */
export function formatPostgRESTUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    // No params? Return simple format
    if (params.size === 0) {
      return `${urlObj.origin}${urlObj.pathname}`;
    }

    const lines: string[] = [];
    
    // Start with base URL and opening ?
    lines.push(`${urlObj.origin}${urlObj.pathname}?`);

    const paramEntries = Array.from(params.entries());
    
    // Parameters that need special nested formatting
    const specialParams = ['select', 'or', 'and', 'not'];
    
    // Separate special params from simple ones
    const selectEntry = paramEntries.find(([key]) => key === 'select');
    const logicalEntries = paramEntries.filter(([key]) => ['or', 'and', 'not'].includes(key));
    const simpleEntries = paramEntries.filter(([key]) => !specialParams.includes(key));

    // Format select first
    if (selectEntry) {
      const [, selectValue] = selectEntry;
      const formattedSelect = formatNestedParameter(selectValue);
      lines.push(`  select=${formattedSelect}`);
    }

    // Format logical operators
    logicalEntries.forEach(([key, value]) => {
      const prefix = lines.length === 1 ? '  ' : '  &';
      const formattedValue = formatNestedParameter(value);
      lines.push(`${prefix}${key}=${formattedValue}`);
    });

    // Add simple parameters
    simpleEntries.forEach(([key, value]) => {
      const prefix = lines.length === 1 ? '  ' : '  &';
      lines.push(`${prefix}${key}=${value}`);
    });

    return lines.join('\n');
  } catch (error) {
    console.error('Error formatting PostgREST URL:', error);
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Formats parameter values with nested structures (select, or, and, not)
 * 
 * Handles:
 * - Embedded resources: posts(id,title,comments(id,text))
 * - Logical operators: or=(and(age.gte.21,status.eq.active),and(role.eq.admin))
 * - Proper indentation for each nesting level
 */
function formatNestedParameter(value: string): string {
  let depth = 0;
  const result: string[] = [];
  let currentToken = '';

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const nextChar = value[i + 1];

    switch (char) {
      case '(':
        // Add the current token (function/resource name) and opening paren
        result.push(currentToken + char);
        currentToken = '';
        depth++;
        
        // Add newline and indentation unless it's an empty set ()
        if (nextChar !== ')') {
          result.push('\n' + '  '.repeat(depth + 1));
        }
        break;

      case ')':
        // Add current token if any
        if (currentToken) {
          result.push(currentToken);
          currentToken = '';
        }
        
        // Add newline and indentation before closing paren (unless it's empty parens)
        if (result[result.length - 1] !== '(') {
          result.push('\n' + '  '.repeat(depth));
        }
        
        result.push(char);
        depth--;
        break;

      case ',':
        // Add current token and comma
        result.push(currentToken + char);
        currentToken = '';
        
        // Add newline and indentation after comma (unless we're at the end or closing paren)
        if (nextChar && nextChar !== ')') {
          result.push('\n' + '  '.repeat(depth + 1));
        }
        break;

      default:
        currentToken += char;
    }
  }

  // Add any remaining token
  if (currentToken) {
    result.push(currentToken);
  }

  return result.join('').trim();
}
