# API Contracts and Data Structures

This document defines the input/output contracts for all converters in sql2postgrest.

## Table of Contents
1. [Forward Conversions](#forward-conversions)
2. [Reverse Conversions](#reverse-conversions)
3. [Data Structures](#data-structures)
4. [Supported Features Matrix](#supported-features-matrix)
5. [Error Codes](#error-codes)

---

## Forward Conversions

### SQL → PostgREST (pkg/converter)

**Input:** SQL query string

**Output:** ConversionResult

**Examples:**

```go
// Simple SELECT
Input:  "SELECT * FROM users WHERE age >= 18"
Output: {
    Method: "GET",
    Path: "/users",
    QueryParams: {"age": "gte.18"},
    Body: "",
    Headers: {}
}

// SELECT with ORDER and LIMIT
Input:  "SELECT name, email FROM posts ORDER BY created_at DESC LIMIT 10"
Output: {
    Method: "GET",
    Path: "/posts",
    QueryParams: {
        "select": "name,email",
        "order": "created_at.desc",
        "limit": "10"
    },
    Body: "",
    Headers: {}
}

// INSERT
Input:  "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')"
Output: {
    Method: "POST",
    Path: "/users",
    QueryParams: {},
    Body: '{"name":"Alice","email":"alice@example.com"}',
    Headers: {"Content-Type": "application/json"}
}

// UPDATE
Input:  "UPDATE users SET status = 'active' WHERE id = 123"
Output: {
    Method: "PATCH",
    Path: "/users",
    QueryParams: {"id": "eq.123"},
    Body: '{"status":"active"}',
    Headers: {"Content-Type": "application/json"}
}

// DELETE
Input:  "DELETE FROM users WHERE status = 'inactive'"
Output: {
    Method: "DELETE",
    Path: "/users",
    QueryParams: {"status": "eq.inactive"},
    Body: "",
    Headers: {}
}
```

---

## Reverse Conversions

### PostgREST → SQL (pkg/reverse)

**Input:** HTTP method, path, query string, body (optional)

**Output:** SQLResult

**Examples:**

```go
// Simple SELECT
Input:  {
    Method: "GET",
    Path: "/users",
    Query: "age=gte.18"
}
Output: {
    SQL: "SELECT * FROM users WHERE age >= 18",
    Warnings: [],
    Metadata: {}
}

// SELECT with embedded resource
Input:  {
    Method: "GET",
    Path: "/authors",
    Query: "select=name,books(title,year)"
}
Output: {
    SQL: "SELECT authors.name, books.title, books.year FROM authors LEFT JOIN books ON books.author_id = authors.id",
    Warnings: ["Assuming FK convention: books.author_id references authors.id"],
    Metadata: {"join_type": "LEFT JOIN", "fk_convention": "{table}_id"}
}

// INSERT
Input:  {
    Method: "POST",
    Path: "/users",
    Body: '{"name":"Alice","email":"alice@example.com"}'
}
Output: {
    SQL: "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')",
    Warnings: [],
    Metadata: {}
}

// UPDATE
Input:  {
    Method: "PATCH",
    Path: "/users",
    Query: "id=eq.123",
    Body: '{"status":"active"}'
}
Output: {
    SQL: "UPDATE users SET status = 'active' WHERE id = 123",
    Warnings: [],
    Metadata: {}
}

// DELETE
Input:  {
    Method: "DELETE",
    Path: "/users",
    Query: "status=eq.inactive"
}
Output: {
    SQL: "DELETE FROM users WHERE status = 'inactive'",
    Warnings: [],
    Metadata: {}
}
```

### Supabase JS → PostgREST (pkg/supabase)

**Input:** Supabase JavaScript code string

**Output:** PostgRESTRequest

**Examples:**

```go
// Simple SELECT
Input:  "supabase.from('users').select('*')"
Output: {
    Method: "GET",
    Path: "/users",
    QueryParams: {"select": "*"},
    Body: "",
    Headers: {}
}

// SELECT with filters
Input:  "supabase.from('users').select('name,email').eq('status', 'active').gte('age', 18)"
Output: {
    Method: "GET",
    Path: "/users",
    QueryParams: {
        "select": "name,email",
        "status": "eq.active",
        "age": "gte.18"
    },
    Body: "",
    Headers: {}
}

// INSERT
Input:  "supabase.from('users').insert({name: 'Alice', email: 'alice@example.com'})"
Output: {
    Method: "POST",
    Path: "/users",
    QueryParams: {},
    Body: '{"name":"Alice","email":"alice@example.com"}',
    Headers: {"Content-Type": "application/json"}
}

// ORDER BY with options
Input:  "supabase.from('posts').select('*').order('created_at', {ascending: false})"
Output: {
    Method: "GET",
    Path: "/posts",
    QueryParams: {
        "select": "*",
        "order": "created_at.desc"
    },
    Body: "",
    Headers: {}
}
```

### Supabase JS → SQL (pkg/chain)

**Input:** Supabase JavaScript code string

**Output:** SQLResult (with optional HTTPRequest for special operations)

**Examples:**

```go
// Regular query
Input:  "supabase.from('users').select('*').eq('id', 1)"
Output: {
    SQL: "SELECT * FROM users WHERE id = 1",
    HTTPRequest: nil,
    Warnings: [],
    Metadata: {"conversion_path": "supabase → postgrest → sql"}
}

// RPC call (special operation)
Input:  "supabase.rpc('calculate_total', {user_id: 123})"
Output: {
    SQL: "SELECT calculate_total(123)",
    HTTPRequest: {
        Method: "POST",
        URL: "https://xxx.supabase.co/rest/v1/rpc/calculate_total",
        Headers: {"Content-Type": "application/json"},
        Body: '{"user_id":123}'
    },
    Warnings: [
        "RPC calls invoke PostgreSQL functions",
        "SQL shown is the function invocation, not the function body",
        "Actual behavior depends on function implementation"
    ],
    Metadata: {"operation_type": "rpc"}
}

// Auth operation (no SQL)
Input:  "supabase.auth.signIn({email: 'user@example.com', password: 'pass'})"
Output: {
    SQL: "",
    HTTPRequest: {
        Method: "POST",
        URL: "https://xxx.supabase.co/auth/v1/token?grant_type=password",
        Headers: {"Content-Type": "application/json"},
        Body: '{"email":"user@example.com","password":"pass"}'
    },
    Warnings: [
        "Auth operations are Supabase-specific",
        "No SQL equivalent - this is an HTTP API call"
    ],
    Metadata: {"operation_type": "auth"}
}

// Storage operation (no SQL)
Input:  "supabase.storage.from('avatars').upload('file.png', fileData)"
Output: {
    SQL: "",
    HTTPRequest: {
        Method: "POST",
        URL: "https://xxx.supabase.co/storage/v1/object/avatars/file.png",
        Headers: {"Content-Type": "image/png"},
        Body: "[binary data]"
    },
    Warnings: [
        "Storage operations are Supabase-specific",
        "No SQL equivalent - files are stored separately from database"
    ],
    Metadata: {"operation_type": "storage"}
}
```

---

## Data Structures

### Core Types

```go
// Forward conversion result
type ConversionResult struct {
    Method      string            // HTTP method: GET, POST, PATCH, DELETE
    Path        string            // URL path: /table_name
    QueryParams url.Values        // Query parameters
    Body        string            // Request body (JSON)
    Headers     map[string]string // HTTP headers
}

// Reverse conversion result
type SQLResult struct {
    SQL         string              // Generated SQL query
    HTTPRequest *HTTPRequest        // For non-SQL operations (RPC, Auth, Storage)
    Warnings    []string            // Conversion warnings/notes
    Metadata    map[string]string   // Additional context
}

// HTTP request representation
type HTTPRequest struct {
    Method  string            // HTTP method
    URL     string            // Complete URL
    Headers map[string]string // HTTP headers
    Body    string            // Request body
}

// PostgREST request (structured)
type PostgRESTRequest struct {
    Method      string              // GET, POST, PATCH, DELETE
    Table       string              // Table name from path
    Select      []string            // Columns to select
    Filters     []Filter            // WHERE conditions
    Order       []OrderBy           // ORDER BY clauses
    Limit       *int                // LIMIT value
    Offset      *int                // OFFSET value
    Body        interface{}         // Request body for mutations
    Headers     map[string]string   // HTTP headers
    Embedded    []EmbeddedResource  // Nested resources
}

// Filter condition
type Filter struct {
    Column   string      // Column name
    Operator string      // PostgREST operator (eq, gte, like, etc.)
    Value    interface{} // Filter value
    Negated  bool        // NOT condition
    Logical  string      // Logical operator: "and" or "or"
}

// ORDER BY clause
type OrderBy struct {
    Column     string // Column name
    Descending bool   // DESC vs ASC
    NullsFirst bool   // NULLS FIRST/LAST
}

// Embedded resource (JOIN)
type EmbeddedResource struct {
    Relation string              // Relation name
    Select   []string            // Columns to select
    Filters  []Filter            // Filters on embedded resource
    Embedded []EmbeddedResource  // Nested embeds (recursive)
}

// Supabase query representation
type SupabaseQuery struct {
    Type        string                 // "query", "rpc", "auth", "storage"
    Table       string                 // Table name (for queries)
    Method      string                 // "select", "insert", "update", "delete"
    Columns     []string               // select() columns
    Filters     []SupabaseFilter       // Filter conditions
    Modifiers   []SupabaseModifier     // order, limit, range, etc.
    RPCName     string                 // For .rpc() calls
    RPCParams   map[string]interface{} // RPC parameters
    AuthOp      string                 // For .auth operations
    AuthParams  map[string]interface{} // Auth parameters
    StorageOp   string                 // For .storage operations
    StoragePath string                 // Storage path
}

// Supabase filter
type SupabaseFilter struct {
    Method string                 // eq, gte, like, filter, etc.
    Column string                 // Column name
    Value  interface{}            // Filter value
    Config map[string]interface{} // Options (e.g., {ascending: true})
}

// Supabase modifier
type SupabaseModifier struct {
    Type  string      // "order", "limit", "range", "single"
    Value interface{} // Modifier value
}

// Error type
type ConversionError struct {
    Type    string // "syntax", "semantic", "unsupported"
    Message string // Human-readable error
    Input   string // Input that caused error
    Line    int    // Location in input
    Column  int    // Location in input
    Hint    string // Suggestion for fix
}
```

---

## Supported Features Matrix

### Operators

| SQL Operator | PostgREST | Reverse Support | Notes |
|--------------|-----------|-----------------|-------|
| = | eq.value | ✅ | Full support |
| > | gt.value | ✅ | Full support |
| >= | gte.value | ✅ | Full support |
| < | lt.value | ✅ | Full support |
| <= | lte.value | ✅ | Full support |
| != / <> | neq.value | ✅ | Full support |
| LIKE | like.pattern | ✅ | Pattern matching |
| ILIKE | ilike.pattern | ✅ | Case-insensitive |
| ~ | match.pattern | ✅ | Regex match |
| ~* | imatch.pattern | ✅ | Case-insensitive regex |
| @@ | fts.query | ✅ | Full-text search |
| @> | cs.value | ✅ | Contains (array/JSON) |
| <@ | cd.value | ✅ | Contained by |
| && | ov.value | ✅ | Overlap |
| << | sl.range | ✅ | Strictly left |
| >> | sr.range | ✅ | Strictly right |
| &< | nxr.range | ✅ | Not extends right |
| &> | nxl.range | ✅ | Not extends left |
| -\|- | adj.range | ✅ | Adjacent |
| IN | in.(v1,v2) | ✅ | Multiple values |
| IS NULL | is.null | ✅ | NULL check |
| IS NOT NULL | not.is.null | ✅ | NOT NULL check |

### SQL Features

| Feature | Forward (SQL→PG) | Reverse (PG→SQL) | Notes |
|---------|------------------|------------------|-------|
| SELECT | ✅ | ✅ | Full support |
| INSERT | ✅ | ✅ | Single & bulk |
| UPDATE | ✅ | ✅ | With WHERE |
| DELETE | ✅ | ✅ | Requires WHERE |
| WHERE | ✅ | ✅ | All operators |
| AND | ✅ | ✅ | Multiple filters |
| OR | ✅ | ✅ | or=(cond1,cond2) |
| NOT | ✅ | ✅ | not.operator |
| ORDER BY | ✅ | ✅ | ASC/DESC, NULLS |
| LIMIT | ✅ | ✅ | Full support |
| OFFSET | ✅ | ✅ | Full support |
| JOIN | ✅ | ⚠️ | Assumes FK convention |
| LEFT JOIN | ✅ | ⚠️ | Default for embeds |
| INNER JOIN | ✅ | ❌ | Can't infer |
| Aggregates | ✅ | ⚠️ | Limited support |
| GROUP BY | ⚠️ | ❌ | Limited |
| HAVING | ❌ | ❌ | Not supported |
| Subqueries | ❌ | ❌ | Not supported |
| CTEs | ❌ | ❌ | Not supported |
| Window functions | ❌ | ❌ | Not supported |
| UPSERT | ✅ | ⚠️ | From Prefer header |
| RETURNING | ✅ | ⚠️ | From Prefer header |

### Supabase Features

| Feature | Supabase→PG | Supabase→SQL | Notes |
|---------|-------------|--------------|-------|
| .from() | ✅ | ✅ | Full support |
| .select() | ✅ | ✅ | Full support |
| .insert() | ✅ | ✅ | Full support |
| .update() | ✅ | ✅ | Full support |
| .upsert() | ✅ | ✅ | Full support |
| .delete() | ✅ | ✅ | Full support |
| .eq() | ✅ | ✅ | All filter methods |
| .neq() | ✅ | ✅ | All filter methods |
| .gt/gte/lt/lte | ✅ | ✅ | All comparison |
| .like/ilike | ✅ | ✅ | Pattern matching |
| .match() | ✅ | ✅ | Multiple eq |
| .or() | ✅ | ✅ | OR conditions |
| .not() | ✅ | ✅ | Negation |
| .order() | ✅ | ✅ | With options |
| .limit() | ✅ | ✅ | Full support |
| .range() | ✅ | ✅ | Converts to LIMIT+OFFSET |
| .single() | ✅ | ⚠️ | Adds LIMIT 1 |
| .maybeSingle() | ✅ | ⚠️ | Adds LIMIT 1 |
| .rpc() | ⚠️ | ⚠️ | Shows HTTP + invocation |
| .auth | ⚠️ | ❌ | Shows HTTP only |
| .storage | ⚠️ | ❌ | Shows HTTP only |
| .realtime | ❌ | ❌ | Not supported |

**Legend:**
- ✅ Full support
- ⚠️ Partial support (with warnings)
- ❌ Not supported

---

## Error Codes

### Syntax Errors (ERR_SYNTAX_*)

| Code | Description | Example |
|------|-------------|---------|
| ERR_SYNTAX_INVALID_SQL | Malformed SQL | `SELCT * FROM users` |
| ERR_SYNTAX_INVALID_POSTGREST | Malformed PostgREST | `GET /users?age=gt` (missing value) |
| ERR_SYNTAX_INVALID_SUPABASE | Malformed Supabase code | `supabase.from('users').select` (missing parens) |
| ERR_SYNTAX_INVALID_JSON | Invalid JSON body | `{"name": Alice}` (unquoted string) |

### Semantic Errors (ERR_SEMANTIC_*)

| Code | Description | Example |
|------|-------------|---------|
| ERR_SEMANTIC_NO_TABLE | Missing table name | `SELECT * FROM` |
| ERR_SEMANTIC_DELETE_NO_WHERE | DELETE without WHERE | `DELETE FROM users` |
| ERR_SEMANTIC_UPDATE_NO_WHERE | UPDATE without WHERE | `UPDATE users SET status='active'` |
| ERR_SEMANTIC_AMBIGUOUS_JOIN | Can't infer join condition | Complex embedded resource |
| ERR_SEMANTIC_INVALID_OPERATOR | Unknown operator | `age=custom.18` |

### Unsupported Features (ERR_UNSUPPORTED_*)

| Code | Description | Example |
|------|-------------|---------|
| ERR_UNSUPPORTED_CTE | CTEs not supported | `WITH ... SELECT` |
| ERR_UNSUPPORTED_SUBQUERY | Subqueries not supported | `SELECT * FROM (SELECT ...)` |
| ERR_UNSUPPORTED_WINDOW | Window functions not supported | `ROW_NUMBER() OVER (...)` |
| ERR_UNSUPPORTED_HAVING | HAVING clause not supported | `SELECT ... GROUP BY ... HAVING` |
| ERR_UNSUPPORTED_DEEP_NEST | Nesting too deep | Embeds >3 levels |

### Error Response Format

```go
type ErrorResponse struct {
    Code    string   // Error code (e.g., ERR_SYNTAX_INVALID_SQL)
    Type    string   // Error type: "syntax", "semantic", "unsupported"
    Message string   // Human-readable message
    Input   string   // Input that caused error
    Line    int      // Line number (if applicable)
    Column  int      // Column number (if applicable)
    Hint    string   // Suggestion for fix
    Docs    string   // Link to documentation
}
```

**Example:**

```json
{
  "code": "ERR_SEMANTIC_DELETE_NO_WHERE",
  "type": "semantic",
  "message": "DELETE requires WHERE clause for safety",
  "input": "DELETE FROM users",
  "line": 1,
  "column": 1,
  "hint": "Add a WHERE clause to specify which rows to delete, or use TRUNCATE if you want to delete all rows",
  "docs": "https://docs.sql2postgrest.com/errors/delete-no-where"
}
```

---

## Conversion Examples by Category

### Simple Queries

```
SQL:        SELECT * FROM users
PostgREST:  GET /users
Supabase:   supabase.from('users').select('*')
```

### Filtered Queries

```
SQL:        SELECT * FROM users WHERE age >= 18 AND status = 'active'
PostgREST:  GET /users?age=gte.18&status=eq.active
Supabase:   supabase.from('users').select('*').gte('age', 18).eq('status', 'active')
```

### Joins / Embedded Resources

```
SQL:        SELECT authors.name, books.title FROM authors
            LEFT JOIN books ON books.author_id = authors.id
PostgREST:  GET /authors?select=name,books(title)
Supabase:   supabase.from('authors').select('name,books(title)')
```

### Aggregates

```
SQL:        SELECT authors.name, COUNT(books.id) FROM authors
            LEFT JOIN books ON books.author_id = authors.id
            GROUP BY authors.id
PostgREST:  GET /authors?select=name,books(id.count())
Supabase:   supabase.from('authors').select('name,books(id.count())')
```

### Mutations

```
SQL:        INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')
PostgREST:  POST /users
            Body: {"name":"Alice","email":"alice@example.com"}
Supabase:   supabase.from('users').insert({name: 'Alice', email: 'alice@example.com'})
```

### Complex Filters

```
SQL:        SELECT * FROM posts WHERE created_at > '2024-01-01'
            OR (status = 'draft' AND author_id = 5)
PostgREST:  GET /posts?or=(created_at.gt.2024-01-01,(status.eq.draft,author_id.eq.5))
Supabase:   supabase.from('posts').select('*')
            .or('created_at.gt.2024-01-01,and(status.eq.draft,author_id.eq.5)')
```

---

## Version History

- **v1.0.0**: Initial SQL → PostgREST converter
- **v2.0.0**: Added reverse converters (PostgREST → SQL, Supabase ↔ PostgREST)

---

## Migration Guide

### From v1.x to v2.x

**No breaking changes** for existing SQL → PostgREST functionality.

**New APIs:**

```go
// PostgREST → SQL
import "github.com/supabase/sql2postgrest/pkg/reverse"
conv := reverse.NewConverter()
result, err := conv.PostgRESTToSQL(method, path, query, body)

// Supabase → PostgREST
import "github.com/supabase/sql2postgrest/pkg/supabase"
conv := supabase.NewConverter()
result, err := conv.SupabaseToPostgREST(code, baseURL)

// Supabase → SQL (chained)
import "github.com/supabase/sql2postgrest/pkg/chain"
conv := chain.NewConverter()
result, err := conv.SupabaseToSQL(code, baseURL)
```

---

## See Also

- [Architecture Documentation](ARCHITECTURE.md)
- [Implementation Plan](../REVERSE_CONVERSION_PLAN.md)
- [PostgREST Documentation](https://postgrest.org/en/stable/api.html)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
