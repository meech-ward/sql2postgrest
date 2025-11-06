# Reverse Conversion Implementation Plan

Complete roadmap for building bidirectional conversion: PostgREST ↔ SQL and Supabase ↔ PostgREST ↔ SQL

## Overview

This plan covers building three new conversion directions:
1. **PostgREST → SQL**: Convert REST API requests to equivalent SQL queries
2. **Supabase JS → PostgREST**: Parse Supabase client code to PostgREST requests
3. **Supabase JS → SQL**: Chain the above two conversions

### Goals
- Complete implementations (not prototypes)
- Comprehensive test coverage (200+ tests like existing converter)
- Handle edge cases gracefully with clear error messages
- Support non-convertible operations (RPC, Auth) with HTTP request output
- CLI, WASM, and Go library support for all conversions
- Updated React app with new conversion routes

---

## Phase 1: Foundation & Architecture

### 1.1 Design Overall Architecture ✓

**Deliverables:**
- [ ] Architecture diagram showing all conversion flows
- [ ] Package structure design document
- [ ] API contract specifications
- [ ] Error handling strategy

**Package Structure:**
```
pkg/
  converter/              # Existing: SQL → PostgREST
  reverse/                # New: PostgREST → SQL
    parser.go             # Parse PostgREST requests
    select.go             # Generate SELECT statements
    where.go              # Generate WHERE clauses
    insert.go             # Generate INSERT statements
    update.go             # Generate UPDATE statements
    delete.go             # Generate DELETE statements
    operators.go          # Reverse operator mapping
    joins.go              # Generate JOINs from embeds
    formatter.go          # SQL formatting utilities
  supabase/               # New: Supabase JS parsing
    parser.go             # Parse Supabase method chains
    postgrest.go          # Convert to PostgREST
    methods.go            # Handle all query builder methods
    special.go            # Handle RPC, Auth, Storage
    http.go               # HTTP request formatter
  chain/                  # New: Multi-step conversions
    supabase_to_sql.go    # Supabase → PostgREST → SQL
```

**Data Structures:**
```go
// PostgREST request representation
type PostgRESTRequest struct {
    Method      string            // GET, POST, PATCH, DELETE
    Table       string            // Table name from path
    Select      []string          // Columns to select
    Filters     []Filter          // WHERE conditions
    Order       []OrderBy         // ORDER BY clauses
    Limit       *int              // LIMIT value
    Offset      *int              // OFFSET value
    Body        interface{}       // Request body (POST/PATCH)
    Headers     map[string]string // HTTP headers
    Embedded    []EmbeddedResource // Nested resources
}

type Filter struct {
    Column   string
    Operator string // eq, gte, like, etc.
    Value    interface{}
    Negated  bool
    Logical  string // and, or
}

type EmbeddedResource struct {
    Relation string
    Select   []string
    Filters  []Filter
    // Recursive for deeply nested embeds
}

// Supabase query representation
type SupabaseQuery struct {
    Type        string            // query, rpc, auth, storage
    Table       string            // For query operations
    Method      string            // select, insert, update, delete
    Columns     []string          // select() columns
    Filters     []SupabaseFilter  // Filter conditions
    Modifiers   []SupabaseModifier // order, limit, range, etc.
    RPCName     string            // For .rpc() calls
    RPCParams   map[string]interface{}
    AuthOp      string            // For .auth operations
    StorageOp   string            // For .storage operations
}

type SupabaseFilter struct {
    Method string      // eq, gte, like, filter, etc.
    Column string
    Value  interface{}
    Config map[string]interface{} // For options like {ascending: true}
}

// Conversion result with metadata
type ConversionResult struct {
    SQL         string            // Generated SQL (if applicable)
    HTTPRequest *HTTPRequest      // For non-SQL operations
    Warnings    []string          // Conversion limitations
    Metadata    map[string]string // Additional context
}

type HTTPRequest struct {
    Method  string
    URL     string
    Headers map[string]string
    Body    string
}
```

### 1.2 Document API Contracts

**Deliverables:**
- [ ] Input/output examples for each conversion type
- [ ] Supported vs unsupported features matrix
- [ ] Error code definitions
- [ ] Migration guide from existing converter

**Example Contracts:**

**PostgREST → SQL:**
```
Input:  GET /users?age=gte.18&order=name.asc&limit=10
Output: SELECT * FROM users WHERE age >= 18 ORDER BY name ASC LIMIT 10
```

**Supabase → PostgREST:**
```
Input:  supabase.from('users').select('*').gte('age', 18).order('name')
Output: GET /users?select=*&age=gte.18&order=name.asc
```

**Supabase → SQL:**
```
Input:  supabase.from('users').select('name,email').eq('id', 1)
Output: SELECT name, email FROM users WHERE id = 1
```

**Supabase RPC (non-SQL):**
```
Input:  supabase.rpc('calculate_total', { user_id: 123 })
Output: {
  sql: "SELECT calculate_total(123)",
  http: {
    method: "POST",
    url: "https://xxx.supabase.co/rest/v1/rpc/calculate_total",
    body: '{"user_id": 123}'
  },
  warnings: ["RPC calls execute PostgreSQL functions - SQL shown is the function invocation"]
}
```

---

## Phase 2: PostgREST → SQL Converter

### 2.1 Build PostgREST Request Parser

**File:** `pkg/reverse/parser.go`

**Tasks:**
- [ ] Parse HTTP method (GET/POST/PATCH/DELETE)
- [ ] Extract table name from path
- [ ] Parse query parameters into structured filters
- [ ] Handle URL encoding/decoding
- [ ] Parse `select` parameter (columns, embeds, aggregates)
- [ ] Parse `order` parameter
- [ ] Parse `limit` and `offset` parameters
- [ ] Parse request body (JSON for POST/PATCH)
- [ ] Handle `Prefer` headers (return=representation, resolution=merge-duplicates)

**Test Cases:** (30+ tests)
```go
func TestParseBasicGET(t *testing.T)
func TestParseComplexFilters(t *testing.T)
func TestParseEmbeddedResources(t *testing.T)
func TestParseAggregates(t *testing.T)
func TestParseInvalidRequests(t *testing.T)
```

**Example Implementation:**
```go
func ParsePostgRESTRequest(method, path, query string, body []byte) (*PostgRESTRequest, error) {
    req := &PostgRESTRequest{
        Method: method,
        Filters: []Filter{},
    }

    // Extract table from path
    req.Table = extractTableName(path)

    // Parse query parameters
    params, err := url.ParseQuery(query)
    if err != nil {
        return nil, err
    }

    // Process each parameter
    for key, values := range params {
        switch key {
        case "select":
            req.Select = parseSelectParam(values[0])
        case "order":
            req.Order = parseOrderParam(values[0])
        case "limit":
            req.Limit = parseIntParam(values[0])
        case "offset":
            req.Offset = parseIntParam(values[0])
        default:
            // It's a filter
            filter := parseFilter(key, values[0])
            req.Filters = append(req.Filters, filter)
        }
    }

    return req, nil
}
```

### 2.2 Implement Operator Reverse Mapping

**File:** `pkg/reverse/operators.go`

**Tasks:**
- [ ] Create reverse mapping for all 40+ operators
- [ ] Handle comparison operators (eq, neq, gt, gte, lt, lte)
- [ ] Handle pattern matching (like, ilike, match)
- [ ] Handle array operators (cs, cd, ov)
- [ ] Handle range operators (sl, sr, nxr, nxl, adj)
- [ ] Handle full-text search (fts, plfts, phfts, wfts)
- [ ] Handle JSON operators (->>, ->, #>, #>>, @>, <@, ?)
- [ ] Handle negation (not.eq, not.like, etc.)
- [ ] Handle NULL checks (is.null, not.is.null)

**Test Cases:** (40+ tests, one per operator)
```go
func TestReverseOperatorEq(t *testing.T)
func TestReverseOperatorGte(t *testing.T)
func TestReverseOperatorLike(t *testing.T)
// ... etc
```

**Operator Mapping Table:**
```go
var reverseOperatorMap = map[string]string{
    "eq":    "=",
    "neq":   "!=",
    "gt":    ">",
    "gte":   ">=",
    "lt":    "<",
    "lte":   "<=",
    "like":  "LIKE",
    "ilike": "ILIKE",
    "match": "~",
    "imatch": "~*",
    "in":    "IN",
    "is":    "IS",
    "fts":   "@@",
    "cs":    "@>",  // contains
    "cd":    "<@",  // contained by
    "ov":    "&&",  // overlap
    // ... etc
}
```

### 2.3 Build WHERE Clause Generator

**File:** `pkg/reverse/where.go`

**Tasks:**
- [ ] Generate simple WHERE conditions
- [ ] Handle AND logic (multiple filters)
- [ ] Handle OR logic (or=(cond1,cond2))
- [ ] Handle NOT logic (not.operator)
- [ ] Handle nested conditions
- [ ] Handle NULL checks
- [ ] Handle array/range values
- [ ] Handle string escaping and SQL injection prevention
- [ ] Handle type casting (::text, ::integer)

**Test Cases:** (50+ tests)
```go
func TestWhereSimpleCondition(t *testing.T)
func TestWhereMultipleAND(t *testing.T)
func TestWhereORConditions(t *testing.T)
func TestWhereNestedLogic(t *testing.T)
func TestWhereSQLInjectionPrevention(t *testing.T)
```

**Example:**
```go
func generateWhereClause(filters []Filter) (string, error) {
    if len(filters) == 0 {
        return "", nil
    }

    var conditions []string
    for _, filter := range filters {
        cond, err := generateCondition(filter)
        if err != nil {
            return "", err
        }
        conditions = append(conditions, cond)
    }

    // Join with AND by default
    return "WHERE " + strings.Join(conditions, " AND "), nil
}

func generateCondition(filter Filter) (string, error) {
    op := reverseOperatorMap[filter.Operator]
    if op == "" {
        return "", fmt.Errorf("unsupported operator: %s", filter.Operator)
    }

    value := formatValue(filter.Value)

    if filter.Negated {
        return fmt.Sprintf("NOT (%s %s %s)", filter.Column, op, value), nil
    }

    return fmt.Sprintf("%s %s %s", filter.Column, op, value), nil
}
```

### 2.4 Implement SELECT Clause Generator

**File:** `pkg/reverse/select.go`

**Tasks:**
- [ ] Generate column lists
- [ ] Handle wildcard (*)
- [ ] Handle embedded resources (convert to JOINs)
- [ ] Handle aggregates (count, sum, avg, min, max)
- [ ] Handle column aliases
- [ ] Handle JSON operators in select
- [ ] Handle computed columns
- [ ] Detect ambiguous cases (document limitations)

**Test Cases:** (30+ tests)
```go
func TestSelectAllColumns(t *testing.T)
func TestSelectSpecificColumns(t *testing.T)
func TestSelectWithEmbeds(t *testing.T)
func TestSelectWithAggregates(t *testing.T)
```

**Example:**
```
Input:  select=name,email,posts(title,created_at)
Output: SELECT users.name, users.email, posts.title, posts.created_at
        FROM users
        LEFT JOIN posts ON posts.user_id = users.id
```

### 2.5 Build JOIN Generator from Embedded Resources

**File:** `pkg/reverse/joins.go`

**Tasks:**
- [ ] Detect foreign key relationships from embed syntax
- [ ] Generate LEFT JOIN by default
- [ ] Handle one-to-many relationships
- [ ] Handle many-to-one relationships
- [ ] Handle multiple embeds
- [ ] Handle nested embeds (limited depth)
- [ ] Add warnings for ambiguous relationships
- [ ] Document assumptions (FK naming conventions)

**Test Cases:** (25+ tests)
```go
func TestJoinOneToMany(t *testing.T)
func TestJoinManyToOne(t *testing.T)
func TestJoinMultipleTables(t *testing.T)
func TestJoinNestedEmbeds(t *testing.T)
```

**Assumptions to Document:**
```
- Foreign keys follow convention: {table}_id
- Embeds default to LEFT JOIN (inclusive)
- Nested embeds limited to 3 levels deep
- Many-to-many requires explicit junction table
```

### 2.6 Implement ORDER BY, LIMIT, OFFSET Generators

**File:** `pkg/reverse/select.go`

**Tasks:**
- [ ] Parse order parameter (col.asc, col.desc)
- [ ] Handle multiple order columns
- [ ] Handle nulls first/last
- [ ] Generate LIMIT clause
- [ ] Generate OFFSET clause
- [ ] Handle combined limit+offset (pagination)

**Test Cases:** (15+ tests)
```go
func TestOrderBySingle(t *testing.T)
func TestOrderByMultiple(t *testing.T)
func TestOrderByWithNulls(t *testing.T)
func TestLimitOffset(t *testing.T)
```

**Example:**
```
Input:  order=created_at.desc,name.asc&limit=20&offset=40
Output: ORDER BY created_at DESC, name ASC LIMIT 20 OFFSET 40
```

### 2.7 Build INSERT Statement Generator

**File:** `pkg/reverse/insert.go`

**Tasks:**
- [ ] Parse JSON body into column/value pairs
- [ ] Generate INSERT statement
- [ ] Handle multiple rows (bulk insert)
- [ ] Handle RETURNING clause (from Prefer header)
- [ ] Handle ON CONFLICT (from Prefer: resolution=merge-duplicates)
- [ ] Handle default values
- [ ] Validate required columns

**Test Cases:** (20+ tests)
```go
func TestInsertSingleRow(t *testing.T)
func TestInsertMultipleRows(t *testing.T)
func TestInsertWithReturning(t *testing.T)
func TestInsertWithConflict(t *testing.T)
```

**Example:**
```
Input:  POST /users
        Body: {"name": "Alice", "email": "alice@example.com"}
        Prefer: return=representation

Output: INSERT INTO users (name, email)
        VALUES ('Alice', 'alice@example.com')
        RETURNING *
```

### 2.8 Build UPDATE Statement Generator

**File:** `pkg/reverse/update.go`

**Tasks:**
- [ ] Parse JSON body into SET clauses
- [ ] Generate WHERE clause from query params
- [ ] Handle RETURNING clause
- [ ] Prevent UPDATE without WHERE (safety)
- [ ] Handle JSON column updates
- [ ] Handle array column updates

**Test Cases:** (15+ tests)
```go
func TestUpdateWithWhere(t *testing.T)
func TestUpdateWithoutWhere(t *testing.T) // Should error
func TestUpdateWithReturning(t *testing.T)
func TestUpdateJSONColumn(t *testing.T)
```

**Example:**
```
Input:  PATCH /users?id=eq.123
        Body: {"name": "Alice Updated"}

Output: UPDATE users
        SET name = 'Alice Updated'
        WHERE id = 123
```

### 2.9 Build DELETE Statement Generator

**File:** `pkg/reverse/delete.go`

**Tasks:**
- [ ] Generate WHERE clause from query params
- [ ] Require WHERE clause (safety)
- [ ] Handle RETURNING clause
- [ ] Handle soft deletes vs hard deletes

**Test Cases:** (10+ tests)
```go
func TestDeleteWithWhere(t *testing.T)
func TestDeleteWithoutWhere(t *testing.T) // Should error
func TestDeleteWithReturning(t *testing.T)
```

**Example:**
```
Input:  DELETE /users?status=eq.inactive

Output: DELETE FROM users
        WHERE status = 'inactive'
```

### 2.10 Write Comprehensive Tests

**File:** `pkg/reverse/converter_test.go`

**Test Coverage Goals:**
- [ ] 200+ test cases total
- [ ] 80%+ code coverage
- [ ] All operators tested
- [ ] All statement types tested
- [ ] Edge cases (empty results, nulls, special characters)
- [ ] Error cases (invalid syntax, unsupported features)
- [ ] Round-trip tests (SQL → PostgREST → SQL)

**Test Structure:**
```go
func TestPostgRESTToSQL(t *testing.T) {
    tests := []struct {
        name     string
        method   string
        path     string
        query    string
        body     string
        expected string
        wantErr  bool
    }{
        {
            name:     "simple select",
            method:   "GET",
            path:     "/users",
            query:    "age=gte.18",
            expected: "SELECT * FROM users WHERE age >= 18",
        },
        // ... 200+ more cases
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            conv := NewReverseConverter()
            result, err := conv.Convert(tt.method, tt.path, tt.query, tt.body)
            if tt.wantErr {
                require.Error(t, err)
                return
            }
            require.NoError(t, err)
            assert.Equal(t, tt.expected, result.SQL)
        })
    }
}
```

---

## Phase 3: Supabase JS → PostgREST Converter

### 3.1 Create Supabase Parser Package

**File:** `pkg/supabase/parser.go`

**Tasks:**
- [ ] Design parser strategy (AST vs string parsing vs runtime capture)
- [ ] Implement tokenizer for method chains
- [ ] Handle JavaScript string escaping
- [ ] Handle variable interpolation
- [ ] Parse method names and arguments
- [ ] Build query representation tree

**Parser Strategy Decision:**

**Option A: String-based parser** (Recommended for Phase 1)
- Parse JavaScript code as text
- Use regex/tokenizer to extract method calls
- Simpler, no JS engine needed
- Limitations: Can't handle complex expressions

**Option B: JavaScript AST parser**
- Use a JS parser library (acorn, babel-parser)
- Full semantic understanding
- More robust, handles complex code
- Requires JS parser dependency

**Option C: Runtime instrumentation**
- Create mock Supabase client
- Capture calls at runtime
- Most accurate, handles all cases
- Requires JS runtime (Node.js/Deno)

**Recommended:** Start with Option A, plan for Option B later

### 3.2 Implement Supabase Method Chain Parser

**File:** `pkg/supabase/parser.go`

**Tasks:**
- [ ] Parse `.from(table)` method
- [ ] Parse `.select(columns)` method
- [ ] Parse filter methods (.eq, .neq, .gt, .gte, etc.)
- [ ] Parse modifier methods (.order, .limit, .range, etc.)
- [ ] Parse `.insert(data)` method
- [ ] Parse `.update(data)` method
- [ ] Parse `.delete()` method
- [ ] Parse `.rpc(name, params)` method
- [ ] Parse `.auth` methods
- [ ] Parse `.storage` methods
- [ ] Handle method chaining
- [ ] Handle multi-line chains

**Test Cases:** (40+ tests)
```go
func TestParseFrom(t *testing.T)
func TestParseSelect(t *testing.T)
func TestParseChainedFilters(t *testing.T)
func TestParseRPC(t *testing.T)
```

**Example Parser:**
```go
type MethodCall struct {
    Name   string
    Args   []interface{}
    Line   int
}

func ParseSupabaseQuery(code string) (*SupabaseQuery, error) {
    // Tokenize method calls
    calls := tokenizeMethodChain(code)

    query := &SupabaseQuery{
        Filters:   []SupabaseFilter{},
        Modifiers: []SupabaseModifier{},
    }

    for _, call := range calls {
        switch call.Name {
        case "from":
            query.Table = call.Args[0].(string)
        case "select":
            query.Columns = parseSelectArgs(call.Args)
        case "eq", "neq", "gt", "gte", "lt", "lte":
            query.Filters = append(query.Filters, parseFilter(call))
        case "order":
            query.Modifiers = append(query.Modifiers, parseOrder(call))
        case "rpc":
            query.Type = "rpc"
            query.RPCName = call.Args[0].(string)
            query.RPCParams = call.Args[1].(map[string]interface{})
        // ... etc
        }
    }

    return query, nil
}

func tokenizeMethodChain(code string) []MethodCall {
    // Extract supabase.from(...).method(...).method(...)
    // Return list of method calls with arguments
}
```

### 3.3 Build Query Builder Method Handlers

**File:** `pkg/supabase/methods.go`

**Tasks:**
- [ ] Implement handler for each Supabase method (50+ methods)
- [ ] Map method arguments to PostgREST equivalents
- [ ] Handle method variants (.filter() vs .eq())
- [ ] Handle options/config objects
- [ ] Document unsupported method combinations

**Method Categories:**

**Query Methods:**
- `.select(columns, options)` - options: {count: 'exact'}
- `.insert(data, options)` - options: {returning: 'minimal'}
- `.update(data, options)`
- `.upsert(data, options)` - options: {onConflict: 'id'}
- `.delete(options)`

**Filter Methods:**
- `.eq(column, value)`
- `.neq(column, value)`
- `.gt(column, value)`
- `.gte(column, value)`
- `.lt(column, value)`
- `.lte(column, value)`
- `.like(column, pattern)`
- `.ilike(column, pattern)`
- `.is(column, value)`
- `.in(column, values)`
- `.contains(column, value)`
- `.containedBy(column, value)`
- `.rangeGt(column, range)`
- `.rangeGte(column, range)`
- `.rangeLt(column, range)`
- `.rangeLte(column, range)`
- `.rangeAdjacent(column, range)`
- `.overlaps(column, value)`
- `.textSearch(column, query, options)`
- `.match(object)` - Multiple eq conditions
- `.not(column, operator, value)`
- `.or(filters)`
- `.filter(column, operator, value)`

**Modifier Methods:**
- `.order(column, options)` - options: {ascending: true, nullsFirst: true}
- `.limit(count)`
- `.range(from, to)`
- `.single()` - Expect single row
- `.maybeSingle()` - Maybe single row

**Relationship Methods:**
- Embedded in select: `.select('*, posts(*)')`

**Test Cases:** (50+ tests, one per method)
```go
func TestMethodSelect(t *testing.T)
func TestMethodEq(t *testing.T)
func TestMethodOrder(t *testing.T)
// ... etc
```

### 3.4 Implement Supabase → PostgREST Converter

**File:** `pkg/supabase/postgrest.go`

**Tasks:**
- [ ] Convert parsed Supabase query to PostgRESTRequest
- [ ] Map table name
- [ ] Map columns to select parameter
- [ ] Map filters to query parameters
- [ ] Map order to order parameter
- [ ] Map limit/range to limit/offset
- [ ] Map insert/update/delete to HTTP method + body
- [ ] Handle Prefer headers from options
- [ ] Generate complete PostgREST URL

**Test Cases:** (40+ tests)
```go
func TestConvertSelect(t *testing.T)
func TestConvertFilters(t *testing.T)
func TestConvertInsert(t *testing.T)
func TestConvertComplexQuery(t *testing.T)
```

**Example:**
```go
func (sq *SupabaseQuery) ToPostgREST(baseURL string) (*PostgRESTRequest, error) {
    if sq.Type != "query" {
        return nil, fmt.Errorf("only query type can be converted to PostgREST")
    }

    req := &PostgRESTRequest{
        Table:   sq.Table,
        Headers: make(map[string]string),
    }

    // Map method to HTTP method
    switch sq.Method {
    case "select":
        req.Method = "GET"
    case "insert":
        req.Method = "POST"
    case "update":
        req.Method = "PATCH"
    case "delete":
        req.Method = "DELETE"
    }

    // Map columns
    if len(sq.Columns) > 0 {
        req.Select = sq.Columns
    }

    // Map filters
    for _, filter := range sq.Filters {
        req.Filters = append(req.Filters, convertFilter(filter))
    }

    // Map modifiers
    for _, mod := range sq.Modifiers {
        switch mod.Type {
        case "order":
            req.Order = append(req.Order, convertOrder(mod))
        case "limit":
            limit := mod.Value.(int)
            req.Limit = &limit
        case "range":
            // Convert range to limit+offset
        }
    }

    return req, nil
}
```

### 3.5 Handle Special Supabase Operations

**File:** `pkg/supabase/special.go`

**Tasks:**
- [ ] Detect `.rpc()` calls
- [ ] Detect `.auth` operations
- [ ] Detect `.storage` operations
- [ ] Generate HTTP request representation
- [ ] Generate SQL representation (where applicable)
- [ ] Add warnings about limitations

**RPC Handling:**
```go
func (sq *SupabaseQuery) HandleRPC(baseURL string) (*ConversionResult, error) {
    result := &ConversionResult{
        SQL: fmt.Sprintf("SELECT %s(%s)", sq.RPCName, formatParams(sq.RPCParams)),
        HTTPRequest: &HTTPRequest{
            Method: "POST",
            URL:    fmt.Sprintf("%s/rpc/%s", baseURL, sq.RPCName),
            Headers: map[string]string{
                "Content-Type": "application/json",
            },
            Body: marshalJSON(sq.RPCParams),
        },
        Warnings: []string{
            "RPC calls invoke PostgreSQL functions",
            "SQL shown is the function invocation, not the function body",
            "Actual behavior depends on function implementation",
        },
    }
    return result, nil
}
```

**Auth Handling:**
```go
// Examples:
// supabase.auth.signUp({email, password})
// supabase.auth.signIn({email, password})
// supabase.auth.signOut()

func (sq *SupabaseQuery) HandleAuth(baseURL string) (*ConversionResult, error) {
    result := &ConversionResult{
        HTTPRequest: &HTTPRequest{
            Method: mapAuthMethod(sq.AuthOp),
            URL:    fmt.Sprintf("%s/auth/v1/%s", baseURL, sq.AuthOp),
            Headers: map[string]string{
                "Content-Type": "application/json",
            },
            Body: marshalJSON(sq.AuthParams),
        },
        Warnings: []string{
            "Auth operations are Supabase-specific",
            "No SQL equivalent - this is an HTTP API call",
        },
    }
    return result, nil
}
```

**Storage Handling:**
```go
// Examples:
// supabase.storage.from('avatars').upload('file.png', file)
// supabase.storage.from('avatars').download('file.png')
// supabase.storage.from('avatars').list()

func (sq *SupabaseQuery) HandleStorage(baseURL string) (*ConversionResult, error) {
    result := &ConversionResult{
        HTTPRequest: &HTTPRequest{
            Method: mapStorageMethod(sq.StorageOp),
            URL:    fmt.Sprintf("%s/storage/v1/object/%s", baseURL, sq.StoragePath),
            Headers: map[string]string{
                "Content-Type": detectContentType(sq.StorageOp),
            },
            Body: formatStorageBody(sq.StorageParams),
        },
        Warnings: []string{
            "Storage operations are Supabase-specific",
            "No SQL equivalent - files are stored separately from database",
        },
    }
    return result, nil
}
```

### 3.6 Build HTTP Request Formatter

**File:** `pkg/supabase/http.go`

**Tasks:**
- [ ] Format HTTP method
- [ ] Build complete URL with params
- [ ] Format headers (Content-Type, Authorization, Prefer)
- [ ] Format JSON body
- [ ] Pretty-print for display
- [ ] Generate cURL command equivalent

**Output Format:**
```go
type HTTPRequestDisplay struct {
    Method      string
    URL         string
    Headers     map[string]string
    Body        string
    CurlCommand string
}

func formatHTTPRequest(req *HTTPRequest) HTTPRequestDisplay {
    // Pretty print for display
    display := HTTPRequestDisplay{
        Method:  req.Method,
        URL:     req.URL,
        Headers: req.Headers,
        Body:    prettyJSON(req.Body),
    }

    // Generate curl command
    display.CurlCommand = fmt.Sprintf(
        "curl -X %s '%s' \\\n  -H 'Content-Type: %s' \\\n  -d '%s'",
        req.Method,
        req.URL,
        req.Headers["Content-Type"],
        req.Body,
    )

    return display
}
```

### 3.7 Write Comprehensive Tests

**File:** `pkg/supabase/converter_test.go`

**Test Coverage:**
- [ ] 100+ test cases
- [ ] All method types
- [ ] Complex method chains
- [ ] RPC, Auth, Storage operations
- [ ] Edge cases (empty args, null values)
- [ ] Error cases (invalid syntax)

---

## Phase 4: Chain Converters

### 4.1 Create Supabase → SQL Chain Converter

**File:** `pkg/chain/supabase_to_sql.go`

**Tasks:**
- [ ] Combine Supabase → PostgREST → SQL
- [ ] Handle errors at each stage
- [ ] Aggregate warnings from both conversions
- [ ] Add metadata about conversion path
- [ ] Optimize (skip intermediate representation where possible)

**Implementation:**
```go
type ChainConverter struct {
    supabaseConverter *supabase.Converter
    reverseConverter  *reverse.Converter
}

func (cc *ChainConverter) ConvertSupabaseToSQL(code string, baseURL string) (*ConversionResult, error) {
    // Step 1: Supabase → PostgREST
    postgrestReq, err := cc.supabaseConverter.Convert(code, baseURL)
    if err != nil {
        return nil, fmt.Errorf("supabase parsing failed: %w", err)
    }

    // Check if it's a special operation
    if postgrestReq.Type == "rpc" || postgrestReq.Type == "auth" || postgrestReq.Type == "storage" {
        return postgrestReq.Result, nil // Already has HTTP request
    }

    // Step 2: PostgREST → SQL
    sqlResult, err := cc.reverseConverter.Convert(postgrestReq)
    if err != nil {
        return nil, fmt.Errorf("SQL generation failed: %w", err)
    }

    // Combine warnings
    sqlResult.Warnings = append(postgrestReq.Warnings, sqlResult.Warnings...)

    // Add metadata
    sqlResult.Metadata["conversion_path"] = "supabase → postgrest → sql"
    sqlResult.Metadata["intermediate_postgrest"] = postgrestReq.String()

    return sqlResult, nil
}
```

**Test Cases:** (30+ tests)
```go
func TestChainSimpleQuery(t *testing.T)
func TestChainComplexQuery(t *testing.T)
func TestChainRPCOperation(t *testing.T)
func TestChainErrorPropagation(t *testing.T)
```

---

## Phase 5: CLI Integration

### 5.1 Build CLI Commands for Reverse Conversions

**File:** `cmd/postgrest2sql/main.go`, `cmd/supabase2postgrest/main.go`, `cmd/supabase2sql/main.go`

**Tasks:**
- [ ] Create `postgrest2sql` CLI command
- [ ] Create `supabase2postgrest` CLI command
- [ ] Create `supabase2sql` CLI command
- [ ] Support stdin/args input
- [ ] Add flags: --url, --pretty, --format (sql|http|json)
- [ ] Add --show-warnings flag
- [ ] Add --show-metadata flag
- [ ] Support piping between commands
- [ ] Add version flag
- [ ] Add help documentation

**Command Examples:**
```bash
# PostgREST to SQL
postgrest2sql "GET /users?age=gte.18&order=name.asc"
# Output: SELECT * FROM users WHERE age >= 18 ORDER BY name ASC

# Supabase to PostgREST
supabase2postgrest "supabase.from('users').select('*').gte('age', 18)"
# Output: GET /users?select=*&age=gte.18

# Supabase to SQL (chain)
supabase2sql "supabase.from('users').select('name,email').eq('id', 1)"
# Output: SELECT name, email FROM users WHERE id = 1

# With RPC
supabase2sql --format=http "supabase.rpc('calculate_total', {user_id: 123})"
# Output:
# SQL: SELECT calculate_total(123)
# HTTP Request:
#   POST https://xxx.supabase.co/rest/v1/rpc/calculate_total
#   Content-Type: application/json
#   Body: {"user_id": 123}

# Piping
echo "supabase.from('users').select('*')" | supabase2sql --pretty
```

**CLI Structure:**
```go
package main

import (
    "flag"
    "fmt"
    "os"
    "github.com/supabase/sql2postgrest/pkg/reverse"
)

func main() {
    var (
        url          = flag.String("url", "https://api.example.com", "Base URL")
        pretty       = flag.Bool("pretty", false, "Pretty print output")
        format       = flag.String("format", "sql", "Output format: sql, http, json")
        showWarnings = flag.Bool("warnings", false, "Show conversion warnings")
        version      = flag.Bool("version", false, "Show version")
    )

    flag.Parse()

    if *version {
        fmt.Println("postgrest2sql version 1.0.0")
        return
    }

    // Read input from args or stdin
    input := getInput(flag.Args())

    // Convert
    converter := reverse.NewConverter(*url)
    result, err := converter.Convert(input)
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)
    }

    // Output
    printResult(result, *format, *pretty, *showWarnings)
}
```

---

## Phase 6: WASM Integration

### 6.1 Add WASM Exports for Reverse Converters

**File:** `cmd/wasm/main.go`

**Tasks:**
- [ ] Export `postgrest2sql()` function
- [ ] Export `supabase2postgrest()` function
- [ ] Export `supabase2sql()` function
- [ ] Return JSON with SQL, HTTP request, warnings
- [ ] Handle errors gracefully
- [ ] Test in browser and Node.js

**WASM Exports:**
```go
//go:build wasm
package main

import (
    "encoding/json"
    "syscall/js"
    "github.com/supabase/sql2postgrest/pkg/reverse"
    "github.com/supabase/sql2postgrest/pkg/supabase"
    "github.com/supabase/sql2postgrest/pkg/chain"
)

func postgrest2sql(this js.Value, args []js.Value) interface{} {
    if len(args) < 1 {
        return map[string]interface{}{
            "error": "Missing input argument",
        }
    }

    input := args[0].String()

    converter := reverse.NewConverter("https://api.example.com")
    result, err := converter.Convert(input)
    if err != nil {
        return map[string]interface{}{
            "error": err.Error(),
        }
    }

    return map[string]interface{}{
        "sql":      result.SQL,
        "warnings": result.Warnings,
        "metadata": result.Metadata,
    }
}

func supabase2postgrest(this js.Value, args []js.Value) interface{} {
    if len(args) < 1 {
        return map[string]interface{}{
            "error": "Missing input argument",
        }
    }

    code := args[0].String()

    converter := supabase.NewConverter()
    result, err := converter.Convert(code, "https://xxx.supabase.co")
    if err != nil {
        return map[string]interface{}{
            "error": err.Error(),
        }
    }

    return map[string]interface{}{
        "method":      result.Method,
        "path":        result.Path,
        "queryParams": result.QueryParams,
        "body":        result.Body,
        "headers":     result.Headers,
    }
}

func supabase2sql(this js.Value, args []js.Value) interface{} {
    if len(args) < 1 {
        return map[string]interface{}{
            "error": "Missing input argument",
        }
    }

    code := args[0].String()

    converter := chain.NewChainConverter()
    result, err := converter.ConvertSupabaseToSQL(code, "https://xxx.supabase.co")
    if err != nil {
        return map[string]interface{}{
            "error": err.Error(),
        }
    }

    output := map[string]interface{}{
        "warnings": result.Warnings,
        "metadata": result.Metadata,
    }

    if result.SQL != "" {
        output["sql"] = result.SQL
    }

    if result.HTTPRequest != nil {
        output["http"] = map[string]interface{}{
            "method":  result.HTTPRequest.Method,
            "url":     result.HTTPRequest.URL,
            "headers": result.HTTPRequest.Headers,
            "body":    result.HTTPRequest.Body,
        }
    }

    return output
}

func main() {
    c := make(chan struct{})

    js.Global().Set("postgrest2sql", js.FuncOf(postgrest2sql))
    js.Global().Set("supabase2postgrest", js.FuncOf(supabase2postgrest))
    js.Global().Set("supabase2sql", js.FuncOf(supabase2sql))

    <-c
}
```

**JavaScript Usage:**
```javascript
// Load WASM
const go = new Go();
const result = await WebAssembly.instantiateStreaming(
    fetch("sql2postgrest.wasm"),
    go.importObject
);
go.run(result.instance);

// Use reverse converters
const sqlResult = postgrest2sql("GET /users?age=gte.18");
console.log(sqlResult.sql); // SELECT * FROM users WHERE age >= 18

const postgrestResult = supabase2postgrest("supabase.from('users').select('*')");
console.log(postgrestResult.path); // /users

const chainResult = supabase2sql("supabase.from('users').select('*')");
console.log(chainResult.sql); // SELECT * FROM users
```

---

## Phase 7: React App Updates

### 7.1 Update React App with PostgREST → SQL Route

**File:** `examples/react-example/src/routes/postgrest-to-sql.tsx`

**Tasks:**
- [ ] Create new route `/postgrest-to-sql`
- [ ] Create PostgREST input editor (method, path, query params, body)
- [ ] Add example PostgREST requests
- [ ] Integrate WASM `postgrest2sql()` function
- [ ] Display generated SQL
- [ ] Display warnings
- [ ] Add copy button
- [ ] Add syntax highlighting for SQL output
- [ ] Responsive layout

**Component Structure:**
```tsx
export default function PostgRESTToSQL() {
    const [method, setMethod] = useState('GET')
    const [path, setPath] = useState('/users')
    const [queryParams, setQueryParams] = useState('age=gte.18')
    const [body, setBody] = useState('')
    const [result, setResult] = useState<ConversionResult | null>(null)
    const { convert, isLoading, error } = usePostgREST2SQL()

    const handleConvert = async () => {
        const result = await convert({method, path, queryParams, body})
        setResult(result)
    }

    return (
        <div className="container">
            <h1>PostgREST to SQL Converter</h1>

            <ExampleSelector examples={postgrestExamples} onSelect={setExample} />

            <div className="input-section">
                <select value={method} onChange={e => setMethod(e.target.value)}>
                    <option>GET</option>
                    <option>POST</option>
                    <option>PATCH</option>
                    <option>DELETE</option>
                </select>

                <input
                    type="text"
                    value={path}
                    onChange={e => setPath(e.target.value)}
                    placeholder="/table_name"
                />

                <input
                    type="text"
                    value={queryParams}
                    onChange={e => setQueryParams(e.target.value)}
                    placeholder="age=gte.18&order=name.asc"
                />

                {(method === 'POST' || method === 'PATCH') && (
                    <CodeMirror
                        value={body}
                        onChange={setBody}
                        lang="json"
                    />
                )}
            </div>

            <button onClick={handleConvert} disabled={isLoading}>
                {isLoading ? 'Converting...' : 'Convert to SQL'}
            </button>

            {result && (
                <div className="result-section">
                    <h2>Generated SQL</h2>
                    <CodeMirror value={result.sql} lang="sql" readOnly />
                    <CopyButton text={result.sql} />

                    {result.warnings.length > 0 && (
                        <div className="warnings">
                            <h3>Warnings</h3>
                            <ul>
                                {result.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
```

**Example Requests:**
```typescript
const postgrestExamples = [
    {
        name: "Simple SELECT",
        method: "GET",
        path: "/users",
        query: "age=gte.18",
        expected: "SELECT * FROM users WHERE age >= 18"
    },
    {
        name: "SELECT with ORDER and LIMIT",
        method: "GET",
        path: "/posts",
        query: "order=created_at.desc&limit=10",
        expected: "SELECT * FROM posts ORDER BY created_at DESC LIMIT 10"
    },
    {
        name: "SELECT with embedded resource",
        method: "GET",
        path: "/authors",
        query: "select=name,books(title)",
        expected: "SELECT authors.name, books.title FROM authors LEFT JOIN books ON books.author_id = authors.id"
    },
    // ... 10+ more examples
]
```

### 7.2 Update React App with Supabase → SQL Route

**File:** `examples/react-example/src/routes/supabase-to-sql.tsx`

**Tasks:**
- [ ] Create new route `/supabase-to-sql`
- [ ] Create Supabase code editor (CodeMirror with JS syntax)
- [ ] Add example Supabase queries
- [ ] Integrate WASM `supabase2sql()` function
- [ ] Display generated SQL
- [ ] Display HTTP request (for RPC/Auth/Storage)
- [ ] Display warnings
- [ ] Show conversion path metadata
- [ ] Add copy buttons
- [ ] Syntax highlighting
- [ ] Responsive layout

**Component Structure:**
```tsx
export default function SupabaseToSQL() {
    const [code, setCode] = useState("supabase.from('users').select('*')")
    const [result, setResult] = useState<ConversionResult | null>(null)
    const { convert, isLoading, error } = useSupabase2SQL()

    const handleConvert = async () => {
        const result = await convert(code)
        setResult(result)
    }

    return (
        <div className="container">
            <h1>Supabase to SQL Converter</h1>

            <ExampleSelector examples={supabaseExamples} onSelect={setCode} />

            <div className="editor-section">
                <CodeMirror
                    value={code}
                    onChange={setCode}
                    lang="javascript"
                    placeholder="supabase.from('users').select('*')"
                />
            </div>

            <button onClick={handleConvert} disabled={isLoading}>
                {isLoading ? 'Converting...' : 'Convert to SQL'}
            </button>

            {result && (
                <div className="result-section">
                    {result.sql && (
                        <>
                            <h2>Generated SQL</h2>
                            <CodeMirror value={result.sql} lang="sql" readOnly />
                            <CopyButton text={result.sql} />
                        </>
                    )}

                    {result.http && (
                        <>
                            <h2>HTTP Request</h2>
                            <div className="http-display">
                                <div><strong>Method:</strong> {result.http.method}</div>
                                <div><strong>URL:</strong> {result.http.url}</div>
                                <div><strong>Headers:</strong></div>
                                <pre>{JSON.stringify(result.http.headers, null, 2)}</pre>
                                <div><strong>Body:</strong></div>
                                <CodeMirror value={result.http.body} lang="json" readOnly />
                            </div>
                            <CopyButton text={formatCurl(result.http)} label="Copy as cURL" />
                        </>
                    )}

                    {result.warnings.length > 0 && (
                        <div className="warnings">
                            <h3>⚠️ Conversion Notes</h3>
                            <ul>
                                {result.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {result.metadata && (
                        <details className="metadata">
                            <summary>Conversion Details</summary>
                            <pre>{JSON.stringify(result.metadata, null, 2)}</pre>
                        </details>
                    )}
                </div>
            )}
        </div>
    )
}
```

**Example Queries:**
```typescript
const supabaseExamples = [
    {
        name: "Simple SELECT",
        code: "supabase.from('users').select('*')",
        expected: "SELECT * FROM users"
    },
    {
        name: "SELECT with filters",
        code: "supabase.from('users').select('name,email').eq('status', 'active').gte('age', 18)",
        expected: "SELECT name, email FROM users WHERE status = 'active' AND age >= 18"
    },
    {
        name: "INSERT",
        code: "supabase.from('users').insert({name: 'Alice', email: 'alice@example.com'})",
        expected: "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')"
    },
    {
        name: "RPC call (shows HTTP)",
        code: "supabase.rpc('calculate_total', {user_id: 123})",
        expected: "HTTP POST to /rpc/calculate_total"
    },
    // ... 15+ more examples
]
```

### 7.3 Update Navigation and Routing

**File:** `examples/react-example/src/App.tsx`

**Tasks:**
- [ ] Add navigation links for new routes
- [ ] Update router configuration
- [ ] Add route descriptions
- [ ] Update home page with new converters
- [ ] Create unified navigation component

**Navigation:**
```tsx
const routes = [
    { path: '/', label: 'SQL → PostgREST', icon: '→' },
    { path: '/postgrest-to-sql', label: 'PostgREST → SQL', icon: '←' },
    { path: '/supabase', label: 'PostgREST → Supabase', icon: '→' },
    { path: '/supabase-to-sql', label: 'Supabase → SQL', icon: '⇄' },
]
```

### 7.4 Create WASM Hooks for Reverse Converters

**File:** `examples/react-example/src/hooks/usePostgREST2SQL.ts`

**Tasks:**
- [ ] Create `usePostgREST2SQL` hook
- [ ] Create `useSupabase2SQL` hook
- [ ] Reuse WASM loading logic from existing hook
- [ ] Handle loading states
- [ ] Handle errors
- [ ] Type definitions

**Hook Implementation:**
```typescript
interface PostgRESTRequest {
    method: string
    path: string
    queryParams: string
    body?: string
}

interface ConversionResult {
    sql?: string
    http?: HTTPRequest
    warnings: string[]
    metadata: Record<string, any>
}

export function usePostgREST2SQL() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const convert = useCallback(async (request: PostgRESTRequest): Promise<ConversionResult> => {
        setIsLoading(true)
        setError(null)

        try {
            // Ensure WASM is loaded
            await loadWASM()

            // Call WASM function
            const input = `${request.method} ${request.path}?${request.queryParams}`
            const result = (window as any).postgrest2sql(input)

            if (result.error) {
                throw new Error(result.error)
            }

            return result
        } catch (err) {
            setError(err as Error)
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    return { convert, isLoading, error }
}

export function useSupabase2SQL() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const convert = useCallback(async (code: string): Promise<ConversionResult> => {
        setIsLoading(true)
        setError(null)

        try {
            await loadWASM()

            const result = (window as any).supabase2sql(code)

            if (result.error) {
                throw new Error(result.error)
            }

            return result
        } catch (err) {
            setError(err as Error)
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    return { convert, isLoading, error }
}
```

---

## Phase 8: Documentation & Examples

### 8.1 Create Example Library

**File:** `examples/reverse_examples.md`

**Tasks:**
- [ ] Document 50+ example conversions
- [ ] PostgREST → SQL examples (20+)
- [ ] Supabase → PostgREST examples (15+)
- [ ] Supabase → SQL examples (15+)
- [ ] Edge cases and limitations
- [ ] Common patterns and best practices

**Example Structure:**
```markdown
# Reverse Conversion Examples

## PostgREST → SQL

### Basic SELECT
Input:  GET /users?age=gte.18
Output: SELECT * FROM users WHERE age >= 18

### SELECT with ORDER and LIMIT
Input:  GET /posts?order=created_at.desc&limit=10
Output: SELECT * FROM posts ORDER BY created_at DESC LIMIT 10

[... 20+ more examples ...]

## Supabase → PostgREST

### Simple Query
Input:  supabase.from('users').select('*')
Output: GET /users?select=*

[... 15+ more examples ...]

## Supabase → SQL

### Complete Chain
Input:  supabase.from('users').select('name,email').eq('status', 'active')
Output: SELECT name, email FROM users WHERE status = 'active'

[... 15+ more examples ...]

## Special Operations

### RPC Call
Input:  supabase.rpc('calculate_total', {user_id: 123})
Output:
  SQL: SELECT calculate_total(123)
  HTTP: POST /rpc/calculate_total
  Body: {"user_id": 123}
  Warning: RPC calls invoke functions - actual behavior depends on implementation

[... more special cases ...]
```

### 8.2 Write Documentation

**File:** `docs/REVERSE_CONVERTERS.md`

**Tasks:**
- [ ] Overview and use cases
- [ ] Installation and setup
- [ ] API reference for each converter
- [ ] CLI usage guide
- [ ] WASM usage guide
- [ ] Go library usage guide
- [ ] React app integration guide
- [ ] Supported features matrix
- [ ] Limitations and known issues
- [ ] Troubleshooting guide
- [ ] Contributing guide for new operators

**Documentation Structure:**
```markdown
# Reverse Converters Documentation

## Table of Contents
1. Overview
2. Installation
3. PostgREST → SQL Converter
4. Supabase → PostgREST Converter
5. Supabase → SQL Converter (Chain)
6. Usage Guides (CLI, WASM, Go Library)
7. Supported Features
8. Limitations
9. Troubleshooting
10. Contributing

## Overview
[Purpose, use cases, architecture]

## Installation
[Go package, CLI, WASM, React app]

## PostgREST → SQL Converter
[Detailed documentation...]

[... etc ...]
```

### 8.3 Update Main README

**File:** `README.md`

**Tasks:**
- [ ] Add reverse converters section
- [ ] Update feature list
- [ ] Add bidirectional conversion diagram
- [ ] Update installation instructions
- [ ] Add reverse conversion examples
- [ ] Update links to new documentation

**README Addition:**
```markdown
## Bidirectional Conversion

sql2postgrest now supports conversion in both directions:

### Forward Converters
- **SQL → PostgREST**: Convert SQL queries to REST API requests
- **PostgREST → Supabase**: Convert REST requests to Supabase client code

### Reverse Converters (NEW!)
- **PostgREST → SQL**: Convert REST API requests back to SQL
- **Supabase → PostgREST**: Parse Supabase client code to REST requests
- **Supabase → SQL**: Direct conversion from Supabase to SQL

### Conversion Flow Diagram
```
SQL ←→ PostgREST ←→ Supabase
```

[Examples, links to docs...]
```

---

## Phase 9: Testing & Quality Assurance

### 9.1 Create Integration Tests

**File:** `test/integration/reverse_test.go`

**Tasks:**
- [ ] End-to-end tests for each converter
- [ ] Round-trip tests (SQL → PostgREST → SQL)
- [ ] Cross-validation tests (compare with forward converter)
- [ ] Performance benchmarks
- [ ] Memory usage tests
- [ ] Concurrent conversion tests

**Integration Tests:**
```go
func TestRoundTripSQLToSQL(t *testing.T) {
    // SQL → PostgREST → SQL
    // Should produce equivalent query (not necessarily identical)

    original := "SELECT name FROM users WHERE age >= 18"

    // Forward conversion
    forwardConv := converter.NewConverter("https://api.example.com")
    postgrestReq, err := forwardConv.Convert(original)
    require.NoError(t, err)

    // Reverse conversion
    reverseConv := reverse.NewConverter()
    regenerated, err := reverseConv.Convert(postgrestReq)
    require.NoError(t, err)

    // Verify semantic equivalence
    assert.True(t, areQueriesEquivalent(original, regenerated.SQL))
}

func TestSupabaseChainConsistency(t *testing.T) {
    // Verify Supabase → PostgREST → Supabase produces same result

    code := "supabase.from('users').select('*').eq('id', 1)"

    // Convert to PostgREST
    supabaseConv := supabase.NewConverter()
    postgrestReq, err := supabaseConv.Convert(code, "https://api.example.com")
    require.NoError(t, err)

    // Convert to Supabase (using existing converter)
    supabaseCode := postgrestReq.ToSupabaseJS()

    // Should be semantically equivalent
    assert.True(t, areSupabaseQueriesEquivalent(code, supabaseCode))
}
```

### 9.2 Add Error Handling and Validation

**Tasks:**
- [ ] Validate input formats
- [ ] Handle malformed requests gracefully
- [ ] Provide helpful error messages
- [ ] Add error recovery strategies
- [ ] Log errors for debugging
- [ ] Create error taxonomy (syntax, semantic, unsupported)

**Error Handling:**
```go
type ConversionError struct {
    Type    string // "syntax", "semantic", "unsupported"
    Message string
    Input   string
    Line    int
    Column  int
    Hint    string // Suggestion for fix
}

func (e *ConversionError) Error() string {
    return fmt.Sprintf("%s error at %d:%d: %s\nHint: %s",
        e.Type, e.Line, e.Column, e.Message, e.Hint)
}

// Example usage
func validatePostgRESTRequest(req *PostgRESTRequest) error {
    if req.Table == "" {
        return &ConversionError{
            Type:    "semantic",
            Message: "table name is required",
            Hint:    "PostgREST path should be /table_name",
        }
    }

    if req.Method == "DELETE" && len(req.Filters) == 0 {
        return &ConversionError{
            Type:    "semantic",
            Message: "DELETE requires WHERE clause for safety",
            Hint:    "Add filters to specify which rows to delete",
        }
    }

    return nil
}
```

### 9.3 Performance Testing and Optimization

**File:** `test/benchmark/reverse_bench_test.go`

**Tasks:**
- [ ] Benchmark each converter
- [ ] Identify bottlenecks
- [ ] Optimize hot paths
- [ ] Reduce allocations
- [ ] Add caching where appropriate
- [ ] Profile memory usage
- [ ] Compare performance with forward converters

**Benchmarks:**
```go
func BenchmarkPostgRESTToSQL(b *testing.B) {
    conv := reverse.NewConverter()

    tests := []string{
        "GET /users?age=gte.18",
        "GET /posts?order=created_at.desc&limit=10",
        "GET /authors?select=name,books(title)",
        // ... more examples
    }

    for _, test := range tests {
        b.Run(test, func(b *testing.B) {
            for i := 0; i < b.N; i++ {
                _, err := conv.Convert(test)
                if err != nil {
                    b.Fatal(err)
                }
            }
        })
    }
}

func BenchmarkSupabaseToSQL(b *testing.B) {
    conv := chain.NewChainConverter()

    tests := []string{
        "supabase.from('users').select('*')",
        "supabase.from('posts').select('*').order('created_at')",
        // ... more examples
    }

    for _, test := range tests {
        b.Run(test, func(b *testing.B) {
            for i := 0; i < b.N; i++ {
                _, err := conv.ConvertSupabaseToSQL(test, "https://api.example.com")
                if err != nil {
                    b.Fatal(err)
                }
            }
        })
    }
}
```

**Performance Goals:**
- PostgREST → SQL: <5ms per conversion
- Supabase → PostgREST: <10ms per conversion
- Supabase → SQL: <15ms per conversion (chained)
- Memory: <1MB per conversion
- Throughput: >1000 conversions/second

---

## Phase 10: Release & Deployment

### 10.1 Prepare Release

**Tasks:**
- [ ] Version bump (2.0.0 - major version for reverse converters)
- [ ] Update CHANGELOG.md
- [ ] Tag release in git
- [ ] Build binaries for all platforms (Linux, macOS, Windows)
- [ ] Build WASM modules
- [ ] Create GitHub release
- [ ] Publish to Go package registry

### 10.2 Update React App Deployment

**Tasks:**
- [ ] Build production React app with new routes
- [ ] Update WASM files in public directory
- [ ] Test deployment build
- [ ] Deploy to hosting (Vercel/Netlify)
- [ ] Update live demo URL in README

### 10.3 Documentation Website

**Tasks:**
- [ ] Create or update docs website
- [ ] Add interactive examples
- [ ] Add API reference
- [ ] Add migration guide
- [ ] SEO optimization
- [ ] Analytics setup

---

## Implementation Timeline

### Sprint 1 (Week 1-2): Foundation
- ✓ Complete Phase 1 (Architecture & Design)
- ✓ Complete Phase 2.1-2.3 (PostgREST Parser & Operators)

### Sprint 2 (Week 3-4): Core Conversion
- ✓ Complete Phase 2.4-2.6 (SELECT, JOIN, modifiers)
- ✓ Complete Phase 2.7-2.9 (INSERT, UPDATE, DELETE)

### Sprint 3 (Week 5-6): Testing & Supabase Parser
- ✓ Complete Phase 2.10 (PostgREST → SQL tests)
- ✓ Complete Phase 3.1-3.2 (Supabase parser)

### Sprint 4 (Week 7-8): Supabase Converter
- ✓ Complete Phase 3.3-3.5 (Method handlers, special ops)
- ✓ Complete Phase 3.6-3.7 (HTTP formatter, tests)

### Sprint 5 (Week 9-10): Chain & CLI
- ✓ Complete Phase 4 (Chain converters)
- ✓ Complete Phase 5 (CLI integration)

### Sprint 6 (Week 11-12): WASM & React App
- ✓ Complete Phase 6 (WASM exports)
- ✓ Complete Phase 7 (React app updates)

### Sprint 7 (Week 13-14): Documentation & Polish
- ✓ Complete Phase 8 (Documentation & examples)
- ✓ Complete Phase 9 (Testing & QA)

### Sprint 8 (Week 15-16): Release
- ✓ Complete Phase 10 (Release & deployment)
- ✓ Announce release
- ✓ Gather feedback

---

## Success Metrics

### Code Quality
- [ ] 200+ test cases for reverse converters
- [ ] 80%+ code coverage
- [ ] Zero critical bugs
- [ ] All linters passing

### Performance
- [ ] <5ms conversion time (PostgREST → SQL)
- [ ] <15ms conversion time (Supabase → SQL)
- [ ] <1MB memory per conversion

### Documentation
- [ ] Complete API reference
- [ ] 50+ examples
- [ ] Migration guide
- [ ] Video tutorials (optional)

### Adoption
- [ ] 100+ GitHub stars (cumulative)
- [ ] 10+ community contributions
- [ ] 1000+ npm downloads/month

---

## Risk Mitigation

### Technical Risks
- **Risk:** Supabase JS parsing is complex
- **Mitigation:** Start with string-based parser, upgrade to AST later

- **Risk:** Ambiguous PostgREST → SQL conversions
- **Mitigation:** Document assumptions, add warnings, provide metadata

- **Risk:** WASM bundle size too large
- **Mitigation:** Optimize build, lazy load, consider code splitting

### Timeline Risks
- **Risk:** Scope creep
- **Mitigation:** Prioritize core functionality, defer advanced features

- **Risk:** Testing takes longer than expected
- **Mitigation:** Write tests alongside code, not at the end

### Adoption Risks
- **Risk:** Users don't need reverse conversion
- **Mitigation:** Validate use cases, create compelling examples

---

## Future Enhancements (Post-1.0)

### Phase 11 (Future)
- [ ] Advanced Supabase features (realtime, storage policies)
- [ ] GraphQL → SQL conversion
- [ ] SQL optimization suggestions
- [ ] Query cost estimation
- [ ] Visual query builder
- [ ] Browser extension
- [ ] VS Code extension
- [ ] Postman collection generator

---

## Appendix: File Checklist

### New Files to Create

**Go Packages:**
- [ ] pkg/reverse/parser.go
- [ ] pkg/reverse/select.go
- [ ] pkg/reverse/where.go
- [ ] pkg/reverse/joins.go
- [ ] pkg/reverse/insert.go
- [ ] pkg/reverse/update.go
- [ ] pkg/reverse/delete.go
- [ ] pkg/reverse/operators.go
- [ ] pkg/reverse/formatter.go
- [ ] pkg/reverse/converter_test.go
- [ ] pkg/supabase/parser.go
- [ ] pkg/supabase/postgrest.go
- [ ] pkg/supabase/methods.go
- [ ] pkg/supabase/special.go
- [ ] pkg/supabase/http.go
- [ ] pkg/supabase/converter_test.go
- [ ] pkg/chain/supabase_to_sql.go
- [ ] pkg/chain/chain_test.go

**CLI Commands:**
- [ ] cmd/postgrest2sql/main.go
- [ ] cmd/supabase2postgrest/main.go
- [ ] cmd/supabase2sql/main.go

**WASM:**
- [ ] cmd/wasm/reverse_exports.go (or update existing)

**React App:**
- [ ] examples/react-example/src/routes/postgrest-to-sql.tsx
- [ ] examples/react-example/src/routes/supabase-to-sql.tsx
- [ ] examples/react-example/src/hooks/usePostgREST2SQL.ts
- [ ] examples/react-example/src/hooks/useSupabase2SQL.ts

**Documentation:**
- [ ] docs/REVERSE_CONVERTERS.md
- [ ] docs/SUPABASE_PARSING.md
- [ ] examples/reverse_examples.md
- [ ] REVERSE_CONVERSION_PLAN.md (this file)

**Tests:**
- [ ] test/integration/reverse_test.go
- [ ] test/benchmark/reverse_bench_test.go

---

## Notes & Assumptions

1. **Foreign Key Convention:** Assume FK naming: `{table}_id`
2. **Default JOIN Type:** Use LEFT JOIN for embedded resources
3. **Null Handling:** Preserve PostgreSQL null semantics
4. **String Escaping:** Properly escape SQL strings to prevent injection
5. **Type Inference:** May require hints for ambiguous types
6. **Supabase Versions:** Target Supabase JS v2 (latest)
7. **PostgREST Version:** Target PostgREST v10+
8. **Browser Support:** Modern browsers (ES2020+)

---

This plan provides a complete roadmap for implementing reverse conversion. Each phase builds on the previous, with clear deliverables and test requirements. The modular approach allows for parallel development and incremental releases.
