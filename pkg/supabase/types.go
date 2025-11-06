package supabase

// SupabaseQuery represents a parsed Supabase JS query
type SupabaseQuery struct {
	Table      string            // Table name from .from()
	Operation  string            // select, insert, update, delete, rpc
	Select     []string          // Columns from .select()
	Filters    []Filter          // Filter conditions
	Order      []OrderBy         // Order by clauses
	Limit      *int              // Limit value
	Offset     *int              // Offset value
	Range      *Range            // Range (alternative to limit/offset)
	Single     bool              // .single() was called
	MaybeSingle bool             // .maybeSingle() was called
	Data       interface{}       // Data for insert/update
	Upsert     bool              // .upsert() instead of .insert()
	OnConflict string            // Column for upsert conflict
	Count      string            // Count option: exact, planned, estimated
	Headers    map[string]string // Custom headers

	// RPC specific
	RPCFunction string      // Function name for .rpc()
	RPCParams   interface{} // Parameters for .rpc()

	// Special operations (auth, storage, etc.)
	IsSpecialOp bool   // True for .auth, .storage, .rpc
	SpecialType string // "auth", "storage", "rpc"
}

// Filter represents a Supabase filter condition
type Filter struct {
	Column   string      // Column name
	Operator string      // eq, neq, gt, gte, lt, lte, like, ilike, is, in, contains, etc.
	Value    interface{} // Filter value
	Negate   bool        // .not modifier
}

// OrderBy represents an order clause
type OrderBy struct {
	Column     string // Column to order by
	Ascending  bool   // true for asc, false for desc
	NullsFirst bool   // nulls first/last
}

// Range represents a range query
type Range struct {
	From int
	To   int
}

// PostgRESTOutput represents the converted PostgREST request
type PostgRESTOutput struct {
	Method      string            // HTTP method (GET, POST, PATCH, DELETE)
	Path        string            // Request path
	Query       string            // Query parameters
	Body        string            // Request body (JSON)
	Headers     map[string]string // HTTP headers
	IsHTTPOnly  bool              // True for operations that can't be SQL
	Description string            // Human-readable description
	Warnings    []string          // Conversion warnings
}

// ConversionResult wraps the output with metadata
type ConversionResult struct {
	PostgREST PostgRESTOutput
	SQL       string   // If chained conversion is requested
	Warnings  []string // All warnings
	Metadata  map[string]string
}
