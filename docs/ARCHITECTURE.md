# sql2postgrest Architecture

## Overview

This document describes the complete architecture of sql2postgrest, including both forward and reverse conversion systems.

## Package Structure

```
sql2postgrest/
├── cmd/
│   ├── sql2postgrest/       # CLI: SQL → PostgREST
│   ├── postgrest2sql/       # CLI: PostgREST → SQL
│   ├── supabase2postgrest/  # CLI: Supabase → PostgREST
│   ├── supabase2sql/        # CLI: Supabase → SQL
│   └── wasm/                # WASM builds for all converters
├── pkg/
│   ├── converter/           # SQL → PostgREST (existing)
│   ├── reverse/             # PostgREST → SQL (new)
│   ├── supabase/            # Supabase ↔ PostgREST (new)
│   └── chain/               # Multi-step conversions (new)
├── examples/
│   └── react-example/       # Interactive web UI
└── docs/                    # Documentation

```

## Conversion Flows

### Forward Conversions (Existing)

```
SQL → PostgREST
  Parser (multigres) → AST
  ↓
  Type-based dispatcher (SelectStmt, InsertStmt, etc.)
  ↓
  Handler functions (convertSelect, convertInsert, etc.)
  ↓
  ConversionResult (Method, Path, QueryParams, Body, Headers)
```

### Reverse Conversions (New)

```
PostgREST → SQL
  Request Parser → Structured representation
  ↓
  SQL Generator (based on HTTP method)
  ↓
  SQL string with metadata and warnings
```

```
Supabase JS → PostgREST
  Method chain tokenizer → SupabaseQuery
  ↓
  Method handlers → PostgREST components
  ↓
  PostgRESTRequest
```

```
Supabase JS → SQL (Chained)
  Supabase Parser → PostgREST Request → SQL Generator
```

## Data Structures

### Forward Conversion (pkg/converter)

```go
type ConversionResult struct {
    Method      string            // HTTP method
    Path        string            // URL path
    QueryParams url.Values        // Query parameters
    Body        string            // Request body (JSON)
    Headers     map[string]string // HTTP headers
}
```

### Reverse Conversion (pkg/reverse)

```go
type PostgRESTRequest struct {
    Method      string            // GET, POST, PATCH, DELETE
    Table       string            // Table name
    Select      []string          // Columns to select
    Filters     []Filter          // WHERE conditions
    Order       []OrderBy         // ORDER BY clauses
    Limit       *int              // LIMIT value
    Offset      *int              // OFFSET value
    Body        interface{}       // Request body
    Headers     map[string]string // HTTP headers
    Embedded    []EmbeddedResource // Nested resources
}

type Filter struct {
    Column   string
    Operator string      // eq, gte, like, etc.
    Value    interface{}
    Negated  bool
    Logical  string      // and, or
}

type SQLResult struct {
    SQL         string              // Generated SQL
    HTTPRequest *HTTPRequest        // For non-SQL operations
    Warnings    []string            // Conversion notes
    Metadata    map[string]string   // Additional context
}
```

### Supabase Parsing (pkg/supabase)

```go
type SupabaseQuery struct {
    Type        string              // query, rpc, auth, storage
    Table       string              // Table name (for queries)
    Method      string              // select, insert, update, delete
    Columns     []string            // select() columns
    Filters     []SupabaseFilter    // Filter conditions
    Modifiers   []SupabaseModifier  // order, limit, range
    RPCName     string              // For .rpc() calls
    RPCParams   map[string]interface{}
    AuthOp      string              // For .auth operations
    StorageOp   string              // For .storage operations
}

type SupabaseFilter struct {
    Method string                  // eq, gte, like, filter, etc.
    Column string
    Value  interface{}
    Config map[string]interface{}  // Options
}
```

## Module Responsibilities

### pkg/converter (Existing: SQL → PostgREST)

| File | Responsibility |
|------|----------------|
| converter.go | Main API, type definitions, dispatcher |
| select.go | SELECT → GET conversion |
| where.go | WHERE clause processing (40+ operators) |
| join.go | JOIN → embedded resources |
| insert.go | INSERT → POST |
| update.go | UPDATE → PATCH |
| delete.go | DELETE conversion |
| json.go | JSON output formatting |

### pkg/reverse (New: PostgREST → SQL)

| File | Responsibility |
|------|----------------|
| parser.go | Parse PostgREST HTTP requests |
| converter.go | Main reverse converter API |
| select.go | Generate SELECT statements |
| where.go | Generate WHERE clauses |
| joins.go | Generate JOINs from embeds |
| insert.go | Generate INSERT statements |
| update.go | Generate UPDATE statements |
| delete.go | Generate DELETE statements |
| operators.go | Reverse operator mapping |
| formatter.go | SQL formatting utilities |

### pkg/supabase (New: Supabase ↔ PostgREST)

| File | Responsibility |
|------|----------------|
| parser.go | Parse Supabase method chains |
| converter.go | Main Supabase converter API |
| methods.go | Handle all query builder methods |
| postgrest.go | Convert to PostgREST |
| special.go | Handle RPC, Auth, Storage |
| http.go | HTTP request formatting |

### pkg/chain (New: Multi-step conversions)

| File | Responsibility |
|------|----------------|
| chain.go | Chain multiple converters |
| supabase_to_sql.go | Supabase → PostgREST → SQL |

## Design Principles

### 1. Separation of Concerns
- Each package has a single, clear responsibility
- Parsers don't generate output
- Generators don't parse input
- Converters orchestrate parser + generator

### 2. Explicit Error Handling
- All errors include context (line, column, hint)
- Failed conversions return helpful messages
- Warnings for ambiguous conversions

### 3. Metadata Preservation
- Track conversion path
- Document assumptions made
- Provide intermediate representations

### 4. Safety First
- Prevent SQL injection
- Require WHERE for DELETE
- Validate inputs

### 5. Performance
- Minimize allocations
- Cache repeated operations
- Stream large results

## Operator Mappings

### Forward (SQL → PostgREST)

| SQL Operator | PostgREST |
|--------------|-----------|
| = | eq.value |
| > | gt.value |
| >= | gte.value |
| < | lt.value |
| <= | lte.value |
| != / <> | neq.value |
| LIKE | like.pattern |
| ILIKE | ilike.pattern |
| ~ | match.pattern |
| @@ | fts.query |
| @> | cs.value (contains) |
| <@ | cd.value (contained) |
| && | ov.value (overlap) |
| IN | in.(val1,val2) |
| IS NULL | is.null |

### Reverse (PostgREST → SQL)

Simply the inverse of the above mapping.

## Assumptions & Limitations

### PostgREST → SQL

**Assumptions:**
1. Foreign keys follow naming convention: `{table}_id`
2. Embedded resources map to LEFT JOINs
3. Default schema is public
4. All tables are accessible

**Limitations:**
1. Can't infer exact join conditions without schema
2. Can't distinguish views from tables
3. Aggregates in embeds may be ambiguous
4. Deeply nested embeds (>3 levels) not supported

### Supabase → PostgREST

**Assumptions:**
1. Code uses standard Supabase client patterns
2. Method chains are linear (no branches)
3. Variables are literals (no complex expressions)

**Limitations:**
1. Can't parse dynamic queries (variables, conditionals)
2. RPC functions are opaque (show invocation only)
3. Auth/Storage operations don't map to SQL
4. Realtime subscriptions not supported

## Testing Strategy

### Unit Tests
- Test each converter function in isolation
- One test per operator/feature
- Edge cases and error conditions
- 80%+ code coverage target

### Integration Tests
- Test complete conversion flows
- Round-trip tests (SQL → PostgREST → SQL)
- Cross-validation with forward converters
- Real-world query examples

### Performance Tests
- Benchmark conversion speed
- Memory usage profiling
- Stress tests (1000s of queries)
- WASM performance testing

### Quality Targets
- 200+ test cases per converter
- <5ms conversion time
- <1MB memory per conversion
- Zero critical bugs

## Deployment Options

### 1. Go Library
```go
import "github.com/supabase/sql2postgrest/pkg/reverse"

conv := reverse.NewConverter()
result, err := conv.PostgRESTToSQL("GET /users?age=gte.18")
```

### 2. CLI
```bash
postgrest2sql "GET /users?age=gte.18"
supabase2sql "supabase.from('users').select('*')"
```

### 3. WASM (Browser/Node.js)
```javascript
const result = postgrest2sql("GET /users?age=gte.18")
console.log(result.sql)
```

### 4. React App
Interactive playground with live conversion and examples.

## Error Handling

### Error Types

```go
type ConversionError struct {
    Type    string  // "syntax", "semantic", "unsupported"
    Message string  // Human-readable error
    Input   string  // Input that caused error
    Line    int     // Location in input
    Column  int     // Location in input
    Hint    string  // Suggestion for fix
}
```

### Error Categories

1. **Syntax Errors**: Malformed input
2. **Semantic Errors**: Valid syntax, invalid meaning
3. **Unsupported Features**: Feature exists but not implemented

## Future Enhancements

### Phase 2 Features
- GraphQL → SQL conversion
- SQL optimization suggestions
- Query cost estimation
- Schema-aware conversions
- Visual query builder
- VS Code extension
- Postman collection generator

### Advanced Parsing
- JavaScript AST parsing for Supabase
- Runtime instrumentation
- Variable substitution
- Conditional query handling

## References

- [PostgREST Documentation](https://postgrest.org/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [multigres SQL Parser](https://github.com/multigres/multigres)
