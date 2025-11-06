package reverse

import (
	"encoding/json"
	"net/url"
	"strconv"
	"strings"
)

// ParsePostgRESTRequest parses a PostgREST HTTP request into a structured representation
func ParsePostgRESTRequest(method, path, query string, body []byte) (*PostgRESTRequest, error) {
	req := &PostgRESTRequest{
		Method:  strings.ToUpper(method),
		Filters: []Filter{},
		Order:   []OrderBy{},
		Headers: make(map[string]string),
	}

	// Extract table name from path
	tableName, err := extractTableName(path)
	if err != nil {
		return nil, err
	}
	req.Table = tableName

	// Parse query parameters
	if query != "" {
		params, err := url.ParseQuery(query)
		if err != nil {
			return nil, NewSyntaxError("invalid query string", query, "check URL encoding")
		}

		err = parseQueryParams(req, params)
		if err != nil {
			return nil, err
		}
	}

	// Parse body for POST/PATCH requests
	if method == "POST" || method == "PATCH" {
		if len(body) > 0 {
			var bodyData interface{}
			if err := json.Unmarshal(body, &bodyData); err != nil {
				return nil, NewSyntaxError("invalid JSON body", string(body), "ensure body is valid JSON")
			}
			req.Body = bodyData
		}
	}

	return req, nil
}

// extractTableName extracts the table name from the path
func extractTableName(path string) (string, error) {
	// Remove leading slash
	path = strings.TrimPrefix(path, "/")

	// Split by slash - first part is table name
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		return "", NewSemanticError("ERR_SEMANTIC_NO_TABLE", "table name is required", path, "path should be /table_name")
	}

	return parts[0], nil
}

// parseQueryParams parses URL query parameters into the request structure
func parseQueryParams(req *PostgRESTRequest, params url.Values) error {
	for key, values := range params {
		if len(values) == 0 {
			continue
		}
		value := values[0]

		// Skip empty values (can happen with empty query strings)
		if value == "" && key != "select" && key != "order" && key != "limit" && key != "offset" {
			continue
		}

		switch key {
		case "select":
			req.Select = parseSelectParam(value)
		case "order":
			orderBy, err := parseOrderParam(value)
			if err != nil {
				return err
			}
			req.Order = orderBy
		case "limit":
			limit, err := strconv.Atoi(value)
			if err != nil {
				return NewSyntaxError("invalid limit value", value, "limit must be an integer")
			}
			req.Limit = &limit
		case "offset":
			offset, err := strconv.Atoi(value)
			if err != nil {
				return NewSyntaxError("invalid offset value", value, "offset must be an integer")
			}
			req.Offset = &offset
		default:
			// It's a filter
			filter, err := parseFilter(key, value)
			if err != nil {
				return err
			}
			req.Filters = append(req.Filters, filter)
		}
	}

	return nil
}

// parseSelectParam parses the select parameter
// Examples: "*", "name,email", "name,posts(title,created_at)"
func parseSelectParam(selectValue string) []string {
	if selectValue == "*" {
		return []string{"*"}
	}

	// Simple split by comma for now
	// TODO: Handle embedded resources (nested parentheses)
	parts := splitSelectColumns(selectValue)
	var columns []string
	for _, part := range parts {
		columns = append(columns, strings.TrimSpace(part))
	}
	return columns
}

// splitSelectColumns splits select columns, handling embedded resources with parentheses
func splitSelectColumns(s string) []string {
	var result []string
	var current strings.Builder
	depth := 0

	for _, c := range s {
		switch c {
		case '(':
			depth++
			current.WriteRune(c)
		case ')':
			depth--
			current.WriteRune(c)
		case ',':
			if depth == 0 {
				if current.Len() > 0 {
					result = append(result, current.String())
					current.Reset()
				}
			} else {
				current.WriteRune(c)
			}
		default:
			current.WriteRune(c)
		}
	}

	if current.Len() > 0 {
		result = append(result, current.String())
	}

	return result
}

// parseOrderParam parses the order parameter
// Examples: "created_at.desc", "name.asc,created_at.desc", "created_at.desc.nullsfirst"
func parseOrderParam(orderValue string) ([]OrderBy, error) {
	var orderBy []OrderBy

	parts := strings.Split(orderValue, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		segments := strings.Split(part, ".")
		if len(segments) < 1 {
			return nil, NewSyntaxError("invalid order format", part, "expected format: column.asc or column.desc")
		}

		order := OrderBy{
			Column:     segments[0],
			Descending: false,
		}

		// Parse direction and nulls options
		for i := 1; i < len(segments); i++ {
			seg := strings.ToLower(segments[i])
			switch seg {
			case "desc":
				order.Descending = true
			case "asc":
				order.Descending = false
			case "nullsfirst":
				order.NullsFirst = true
			case "nullslast":
				order.NullsLast = true
			default:
				return nil, NewSyntaxError("invalid order modifier", seg, "valid modifiers: asc, desc, nullsfirst, nullslast")
			}
		}

		orderBy = append(orderBy, order)
	}

	return orderBy, nil
}

// parseFilter parses a filter parameter
// Examples: age=gte.18, name=eq.Alice, status=in.(active,pending)
func parseFilter(column, filterValue string) (Filter, error) {
	// Skip empty filter values (can happen with empty query params)
	if filterValue == "" {
		return Filter{}, NewSyntaxError("empty filter value", column, "provide a filter value like: column=eq.value")
	}

	// Check for OR conditions
	if strings.HasPrefix(filterValue, "or(") && strings.HasSuffix(filterValue, ")") {
		// TODO: Handle OR conditions - for now, return error
		return Filter{}, NewUnsupportedError("ERR_UNSUPPORTED_OR", "OR conditions not yet supported", filterValue, "use simple filters for now")
	}

	// Check for NOT prefix
	negated := false
	if strings.HasPrefix(filterValue, "not.") {
		negated = true
		filterValue = strings.TrimPrefix(filterValue, "not.")
	}

	// Parse operator and value
	operator, value, err := ParseOperatorValue(filterValue)
	if err != nil {
		return Filter{}, err
	}

	return Filter{
		Column:   column,
		Operator: operator,
		Value:    value,
		Negated:  negated,
		Logical:  "and", // Default to AND
	}, nil
}

// ParseEmbeddedResources parses embedded resources from select columns
// Example: "name,posts(title,created_at)" -> main cols: [name], embeds: [{posts, [title, created_at]}]
func ParseEmbeddedResources(selectCols []string) (mainCols []string, embeds []EmbeddedResource, err error) {
	mainCols = []string{}
	embeds = []EmbeddedResource{}

	for _, col := range selectCols {
		col = strings.TrimSpace(col)

		// Check if it's an embedded resource
		if strings.Contains(col, "(") {
			// Parse embedded resource
			openIdx := strings.Index(col, "(")
			closeIdx := strings.LastIndex(col, ")")

			if closeIdx == -1 || closeIdx < openIdx {
				return nil, nil, NewSyntaxError("invalid embedded resource format", col, "expected format: relation(columns)")
			}

			relation := col[:openIdx]
			innerCols := col[openIdx+1 : closeIdx]

			embed := EmbeddedResource{
				Relation: relation,
				Select:   parseSelectParam(innerCols),
			}

			embeds = append(embeds, embed)
		} else {
			mainCols = append(mainCols, col)
		}
	}

	return mainCols, embeds, nil
}

// ValidateRequest validates a PostgREST request for semantic correctness
func ValidateRequest(req *PostgRESTRequest) error {
	// DELETE must have WHERE clause
	if req.Method == "DELETE" && len(req.Filters) == 0 {
		return NewSemanticError(
			"ERR_SEMANTIC_DELETE_NO_WHERE",
			"DELETE requires WHERE clause for safety",
			"DELETE /"+req.Table,
			"add filters to specify which rows to delete",
		)
	}

	// UPDATE should have WHERE clause (warning, not error)
	// We'll add this as a warning in the result instead of blocking

	return nil
}
