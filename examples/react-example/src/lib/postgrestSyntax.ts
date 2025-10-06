import { StreamLanguage } from '@codemirror/language';
import type { StreamParser } from '@codemirror/language';

/**
 * Custom syntax highlighter for PostgREST URLs
 * Designed to match SQL syntax highlighting for consistency
 */
const postgrestUrlParser: StreamParser<{ afterOperator: boolean }> = {
  token(stream, state) {
    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // URL Protocol (http://, https://)
    if (stream.match(/^https?:\/\//)) {
      return 'link';
    }

    // Domain with port and path (e.g., localhost:3000/products)
    if (stream.match(/^[a-zA-Z0-9.-]+(:[0-9]+)?\/[a-zA-Z0-9_-]+/)) {
      return 'link';
    }

    // Question mark or ampersand
    if (stream.match(/^[?&]/)) {
      state.afterOperator = false;
      return 'operator';
    }

    // PostgREST keywords: select, order, limit, offset (when followed by =)
    if (stream.match(/^(select|order|limit|offset)=/)) {
      stream.backUp(1); // Put back the =
      state.afterOperator = false;
      return 'keyword';
    }

    // Logical operators: and, or, not (when followed by =)
    if (stream.match(/^(and|or|not)=/)) {
      stream.backUp(1); // Put back the =
      state.afterOperator = false;
      return 'keyword';
    }

    // Aggregate functions: column.count(), column.sum(), etc.
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*\.(count|sum|avg|min|max|stddev|variance)\(/)) {
      state.afterOperator = false;
      return 'function';
    }

    // PostgREST comparison operators: eq., gt., gte., lt., lte., neq.
    if (stream.match(/^(eq|neq|gt|gte|lt|lte)\./)) {
      state.afterOperator = true;
      return 'keyword';
    }

    // PostgREST pattern operators: like., ilike., match., imatch.
    if (stream.match(/^(like|ilike|match|imatch)\./)) {
      state.afterOperator = true;
      return 'keyword';
    }

    // PostgREST array/range operators: in., is., cs., cd., ov., etc.
    if (stream.match(/^(in|is|cs|cd|ov|sl|sr|nxr|nxl|adj)\./)) {
      state.afterOperator = true;
      return 'keyword';
    }

    // PostgREST full-text search operators: fts., plfts., phfts., wfts.
    if (stream.match(/^(fts|plfts|phfts|wfts)\./)) {
      state.afterOperator = true;
      return 'keyword';
    }

    // Negated operators: not.eq., not.gt., etc.
    if (stream.match(/^not\.(eq|neq|gt|gte|lt|lte|like|ilike|in|is|fts|plfts|phfts|wfts|cs|cd|ov)\./)) {
      state.afterOperator = true;
      return 'keyword';
    }

    // Sort modifiers: .asc, .desc, .nullsfirst, .nullslast
    if (stream.match(/^\.(asc|desc|nullsfirst|nullslast)([,&\s]|$)/)) {
      stream.backUp(stream.current().length - stream.current().lastIndexOf('.') - (stream.current().match(/\.(asc|desc|nullsfirst|nullslast)/)?.[0].length || 0));
      state.afterOperator = false;
      return 'keyword';
    }

    // Alias syntax: ):alias_name
    if (stream.match(/^\):/)) {
      stream.backUp(1);
      state.afterOperator = false;
      return 'bracket';
    }

    // Colon for alias
    if (stream.match(/^:/)) {
      if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
        state.afterOperator = false;
        return 'property';
      }
      return 'operator';
    }

    // Column/filter parameter names (before =)
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*=/)) {
      stream.backUp(1);
      state.afterOperator = false;
      return 'variableName';
    }

    // Equals sign
    if (stream.match(/^=/)) {
      return 'operator';
    }

    // If we're after an operator, treat everything until next & or comma as a value
    if (state.afterOperator) {
      // Wildcards in pattern matching (like ilike.*phone*)
      if (stream.match(/^\*/)) {
        return 'string';
      }

      // ISO Date/timestamp values
      if (stream.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}([T\s][0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})?)?/)) {
        return 'string';
      }

      // Numbers (integers and decimals)
      if (stream.match(/^-?[0-9]+(\.[0-9]+)?/)) {
        return 'number';
      }

      // Boolean and null values
      if (stream.match(/^(true|false|null)([,&\s]|$)/)) {
        stream.backUp(stream.current().length - (stream.current().match(/^(true|false|null)/)?.[0].length || 0));
        return 'atom';
      }

      // Quoted strings
      if (stream.match(/^"([^"\\]|\\.)*"/)) {
        return 'string';
      }
      if (stream.match(/^'([^'\\]|\\.)*'/)) {
        return 'string';
      }

      // URL-encoded values
      if (stream.match(/^%[0-9A-Fa-f]{2}/)) {
        return 'string';
      }

      // Any other characters in value context (like parts of pattern: phone)
      if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
        return 'string';
      }

      // Commas end the value context
      if (stream.peek() === ',' || stream.peek() === '&') {
        state.afterOperator = false;
      }
    }

    // Boolean and null values (outside operator context)
    if (stream.match(/^(true|false|null)([,&)\s]|$)/)) {
      stream.backUp(stream.current().length - (stream.current().match(/^(true|false|null)/)?.[0].length || 0));
      return 'atom';
    }

    // ISO Date/timestamp values (outside operator context)
    if (stream.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}([T\s][0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})?)?/)) {
      return 'string';
    }

    // Numbers (outside operator context)
    if (stream.match(/^-?[0-9]+(\.[0-9]+)?/)) {
      return 'number';
    }

    // Parentheses
    if (stream.match(/^[()]/)) {
      state.afterOperator = false;
      return 'bracket';
    }

    // Commas
    if (stream.match(/^,/)) {
      state.afterOperator = false;
      return 'punctuation';
    }

    // Dots
    if (stream.match(/^\./)) {
      return 'punctuation';
    }

    // Quoted strings
    if (stream.match(/^"([^"\\]|\\.)*"/)) {
      return 'string';
    }
    if (stream.match(/^'([^'\\]|\\.)*'/)) {
      return 'string';
    }

    // URL-encoded values
    if (stream.match(/^%[0-9A-Fa-f]{2}/)) {
      return 'string';
    }

    // Identifiers (column names, table names, resource names)
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return 'variableName';
    }

    // Default: skip character
    stream.next();
    return null;
  },

  startState() {
    return { afterOperator: false };
  },

  copyState(state) {
    return { ...state };
  },
};

/**
 * PostgREST URL syntax highlighting language definition
 * 
 * Token types (matching SQL highlighting):
 * - 'keyword': select, order, limit, operators (gt, eq, desc, asc, like, ilike)
 * - 'function': Aggregate functions (id.count(), column.sum())
 * - 'variableName': Column names (matches SQL column highlighting)
 * - 'property': Alias names (after :)
 * - 'string': String values, wildcards (*), patterns, dates
 * - 'number': Numeric values (20, 1000)
 * - 'operator': =, &, :
 * - 'punctuation': Commas, dots
 * - 'bracket': Parentheses
 * - 'link': URLs
 * - 'atom': Boolean and null values
 */
export const postgrestUrl = StreamLanguage.define(postgrestUrlParser);
