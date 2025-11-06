package reverse

import (
	"fmt"
)

// Converter converts PostgREST requests to SQL
type Converter struct {
	baseURL string
}

// NewConverter creates a new reverse converter
func NewConverter() *Converter {
	return &Converter{}
}

// Convert converts a PostgREST request to SQL
func (c *Converter) Convert(method, path, query, body string) (*SQLResult, error) {
	// Parse the PostgREST request
	req, err := ParsePostgRESTRequest(method, path, query, []byte(body))
	if err != nil {
		return nil, err
	}

	// Validate the request
	if err := ValidateRequest(req); err != nil {
		return nil, err
	}

	// Convert based on HTTP method
	switch req.Method {
	case "GET":
		return c.convertSelect(req)
	case "POST":
		return c.convertInsert(req)
	case "PATCH":
		return c.convertUpdate(req)
	case "DELETE":
		return c.convertDelete(req)
	default:
		return nil, NewSemanticError(
			"ERR_SEMANTIC_INVALID_METHOD",
			fmt.Sprintf("unsupported HTTP method: %s", req.Method),
			method,
			"supported methods: GET, POST, PATCH, DELETE",
		)
	}
}

// ConvertRequest converts a structured PostgRESTRequest to SQL
func (c *Converter) ConvertRequest(req *PostgRESTRequest) (*SQLResult, error) {
	// Validate the request
	if err := ValidateRequest(req); err != nil {
		return nil, err
	}

	// Convert based on HTTP method
	switch req.Method {
	case "GET":
		return c.convertSelect(req)
	case "POST":
		return c.convertInsert(req)
	case "PATCH":
		return c.convertUpdate(req)
	case "DELETE":
		return c.convertDelete(req)
	default:
		return nil, NewSemanticError(
			"ERR_SEMANTIC_INVALID_METHOD",
			fmt.Sprintf("unsupported HTTP method: %s", req.Method),
			req.Method,
			"supported methods: GET, POST, PATCH, DELETE",
		)
	}
}

// convertSelect converts a GET request to SELECT statement
func (c *Converter) convertSelect(req *PostgRESTRequest) (*SQLResult, error) {
	result := &SQLResult{
		Warnings: []string{},
		Metadata: make(map[string]string),
	}

	// Build SELECT clause
	selectClause := buildSelectClause(req)

	// Build FROM clause (with JOINs if embedded resources)
	fromClause, warnings := buildFromClause(req)
	result.Warnings = append(result.Warnings, warnings...)

	// Build WHERE clause
	whereClause, err := buildWhereClause(req.Filters)
	if err != nil {
		return nil, err
	}

	// Build ORDER BY clause
	orderByClause := buildOrderByClause(req.Order)

	// Build LIMIT/OFFSET
	limitOffsetClause := buildLimitOffsetClause(req.Limit, req.Offset)

	// Combine all parts
	sql := selectClause + " " + fromClause
	if whereClause != "" {
		sql += " " + whereClause
	}
	if orderByClause != "" {
		sql += " " + orderByClause
	}
	if limitOffsetClause != "" {
		sql += " " + limitOffsetClause
	}

	result.SQL = sql
	return result, nil
}

// convertInsert converts a POST request to INSERT statement
func (c *Converter) convertInsert(req *PostgRESTRequest) (*SQLResult, error) {
	result := &SQLResult{
		Warnings: []string{},
		Metadata: make(map[string]string),
	}

	sql, err := buildInsertStatement(req)
	if err != nil {
		return nil, err
	}

	result.SQL = sql
	return result, nil
}

// convertUpdate converts a PATCH request to UPDATE statement
func (c *Converter) convertUpdate(req *PostgRESTRequest) (*SQLResult, error) {
	result := &SQLResult{
		Warnings: []string{},
		Metadata: make(map[string]string),
	}

	// Warn if no WHERE clause
	if len(req.Filters) == 0 {
		result.Warnings = append(result.Warnings, "UPDATE without WHERE clause will affect all rows")
	}

	sql, err := buildUpdateStatement(req)
	if err != nil {
		return nil, err
	}

	result.SQL = sql
	return result, nil
}

// convertDelete converts a DELETE request to DELETE statement
func (c *Converter) convertDelete(req *PostgRESTRequest) (*SQLResult, error) {
	result := &SQLResult{
		Warnings: []string{},
		Metadata: make(map[string]string),
	}

	sql, err := buildDeleteStatement(req)
	if err != nil {
		return nil, err
	}

	result.SQL = sql
	return result, nil
}
