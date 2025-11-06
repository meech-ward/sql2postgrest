package reverse

// PostgRESTRequest represents a structured PostgREST HTTP request
type PostgRESTRequest struct {
	Method   string              // GET, POST, PATCH, DELETE
	Table    string              // Table name from path
	Select   []string            // Columns to select
	Filters  []Filter            // WHERE conditions
	Order    []OrderBy           // ORDER BY clauses
	Limit    *int                // LIMIT value
	Offset   *int                // OFFSET value
	Body     interface{}         // Request body for mutations
	Headers  map[string]string   // HTTP headers
	Embedded []EmbeddedResource  // Nested resources (JOINs)
}

// Filter represents a WHERE condition
type Filter struct {
	Column   string      // Column name
	Operator string      // PostgREST operator (eq, gte, like, etc.)
	Value    interface{} // Filter value
	Negated  bool        // NOT condition
	Logical  string      // Logical operator: "and" or "or"
}

// OrderBy represents an ORDER BY clause
type OrderBy struct {
	Column     string // Column name
	Descending bool   // DESC vs ASC
	NullsFirst bool   // NULLS FIRST (only if explicitly set)
	NullsLast  bool   // NULLS LAST (only if explicitly set)
}

// EmbeddedResource represents a nested resource (JOIN)
type EmbeddedResource struct {
	Relation string              // Relation name (table name)
	Select   []string            // Columns to select from embedded resource
	Filters  []Filter            // Filters on embedded resource
	Order    []OrderBy           // ORDER BY on embedded resource
	Limit    *int                // LIMIT on embedded resource
	Embedded []EmbeddedResource  // Nested embeds (recursive)
}

// SQLResult is the result of converting PostgREST to SQL
type SQLResult struct {
	SQL         string            // Generated SQL query
	HTTPRequest *HTTPRequest      // For non-SQL operations
	Warnings    []string          // Conversion warnings/notes
	Metadata    map[string]string // Additional context
}

// HTTPRequest represents an HTTP request (for non-SQL operations)
type HTTPRequest struct {
	Method  string            // HTTP method
	URL     string            // Complete URL
	Headers map[string]string // HTTP headers
	Body    string            // Request body
}

// ConversionError represents a conversion error with context
type ConversionError struct {
	Code    string // Error code (e.g., ERR_SYNTAX_INVALID_POSTGREST)
	Type    string // Error type: "syntax", "semantic", "unsupported"
	Message string // Human-readable error message
	Input   string // Input that caused error
	Line    int    // Line number (if applicable)
	Column  int    // Column number (if applicable)
	Hint    string // Suggestion for fix
}

func (e *ConversionError) Error() string {
	if e.Line > 0 && e.Column > 0 {
		return e.Message + " at line " + string(rune(e.Line)) + ", column " + string(rune(e.Column))
	}
	return e.Message
}

// NewSyntaxError creates a syntax error
func NewSyntaxError(message, input, hint string) *ConversionError {
	return &ConversionError{
		Code:    "ERR_SYNTAX_INVALID_POSTGREST",
		Type:    "syntax",
		Message: message,
		Input:   input,
		Hint:    hint,
	}
}

// NewSemanticError creates a semantic error
func NewSemanticError(code, message, input, hint string) *ConversionError {
	return &ConversionError{
		Code:    code,
		Type:    "semantic",
		Message: message,
		Input:   input,
		Hint:    hint,
	}
}

// NewUnsupportedError creates an unsupported feature error
func NewUnsupportedError(code, message, input, hint string) *ConversionError {
	return &ConversionError{
		Code:    code,
		Type:    "unsupported",
		Message: message,
		Input:   input,
		Hint:    hint,
	}
}
