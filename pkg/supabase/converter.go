package supabase

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
)

// Converter converts Supabase JS queries to PostgREST requests
type Converter struct {
	BaseURL string
}

// NewConverter creates a new Supabase converter
func NewConverter(baseURL string) *Converter {
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}
	return &Converter{BaseURL: baseURL}
}

// Convert converts a Supabase JS query string to PostgREST
func (c *Converter) Convert(input string) (*PostgRESTOutput, error) {
	// Parse the Supabase query
	query, err := Parse(input)
	if err != nil {
		return nil, err
	}

	// Convert to PostgREST
	return c.toPostgREST(query)
}

// toPostgREST converts a SupabaseQuery to PostgRESTOutput
func (c *Converter) toPostgREST(query *SupabaseQuery) (*PostgRESTOutput, error) {
	output := &PostgRESTOutput{
		Headers:  make(map[string]string),
		Warnings: []string{},
	}

	// Handle special operations
	if query.IsSpecialOp {
		return c.handleSpecialOp(query)
	}

	// Determine HTTP method
	switch query.Operation {
	case "select":
		output.Method = "GET"
	case "insert":
		output.Method = "POST"
	case "update":
		output.Method = "PATCH"
	case "delete":
		output.Method = "DELETE"
	default:
		output.Method = "GET"
	}

	// Build path
	output.Path = "/" + query.Table

	// Build query parameters
	params := url.Values{}

	// Add select columns
	if len(query.Select) > 0 {
		params.Add("select", strings.Join(query.Select, ","))
	}

	// Add filters
	for _, filter := range query.Filters {
		paramValue := c.formatFilter(filter)
		params.Add(filter.Column, paramValue)
	}

	// Add order
	for _, order := range query.Order {
		orderStr := order.Column
		if order.Ascending {
			orderStr += ".asc"
		} else {
			orderStr += ".desc"
		}
		if order.NullsFirst {
			orderStr += ".nullsfirst"
		}
		params.Add("order", orderStr)
	}

	// Add limit
	if query.Limit != nil {
		params.Add("limit", fmt.Sprintf("%d", *query.Limit))
	}

	// Add range
	if query.Range != nil {
		// Range header instead of query param
		output.Headers["Range"] = fmt.Sprintf("%d-%d", query.Range.From, query.Range.To)
	}

	// Add count header
	if query.Count != "" {
		output.Headers["Prefer"] = fmt.Sprintf("count=%s", query.Count)
	}

	// Single/maybeSingle headers
	if query.Single {
		output.Headers["Accept"] = "application/vnd.pgrst.object+json"
	} else if query.MaybeSingle {
		output.Headers["Accept"] = "application/vnd.pgrst.object+json"
		output.Headers["Prefer"] = "return=representation"
	}

	// Upsert handling
	if query.Upsert {
		resolution := "resolution=merge-duplicates"
		if query.OnConflict != "" {
			resolution = fmt.Sprintf("resolution=%s", query.OnConflict)
		}
		output.Headers["Prefer"] = resolution
	}

	// Build request body for mutations
	if query.Data != nil {
		bodyBytes, err := json.Marshal(query.Data)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		output.Body = string(bodyBytes)
		output.Headers["Content-Type"] = "application/json"
	}

	// Set query string
	if len(params) > 0 {
		output.Query = params.Encode()
	}

	return output, nil
}

// formatFilter formats a filter for PostgREST
func (c *Converter) formatFilter(filter Filter) string {
	op := filter.Operator
	value := c.formatValue(filter.Value, filter.Operator)

	result := fmt.Sprintf("%s.%s", op, value)

	if filter.Negate {
		result = "not." + result
	}

	return result
}

// formatValue formats a value for PostgREST
func (c *Converter) formatValue(value interface{}, operator string) string {
	if value == nil {
		return "null"
	}

	switch v := value.(type) {
	case string:
		// For pattern operators, return as-is
		if operator == "like" || operator == "ilike" || operator == "fts" {
			return v
		}
		return v

	case float64:
		return fmt.Sprintf("%v", v)

	case bool:
		return fmt.Sprintf("%v", v)

	case []interface{}:
		// For IN operator
		if operator == "in" {
			parts := []string{}
			for _, item := range v {
				parts = append(parts, c.formatValue(item, ""))
			}
			return "(" + strings.Join(parts, ",") + ")"
		}
		// For array contains
		jsonBytes, _ := json.Marshal(v)
		return string(jsonBytes)

	case map[string]interface{}:
		// For JSON operators
		jsonBytes, _ := json.Marshal(v)
		return string(jsonBytes)

	default:
		return fmt.Sprintf("%v", v)
	}
}

// handleSpecialOp handles special operations like RPC, auth, storage
func (c *Converter) handleSpecialOp(query *SupabaseQuery) (*PostgRESTOutput, error) {
	output := &PostgRESTOutput{
		Headers:    make(map[string]string),
		IsHTTPOnly: true,
		Warnings:   []string{"This operation cannot be directly represented as SQL"},
	}

	switch query.SpecialType {
	case "rpc":
		output.Method = "POST"
		output.Path = "/rpc/" + query.RPCFunction
		output.Description = fmt.Sprintf("RPC call to function '%s'", query.RPCFunction)

		if query.RPCParams != nil {
			bodyBytes, _ := json.Marshal(query.RPCParams)
			output.Body = string(bodyBytes)
			output.Headers["Content-Type"] = "application/json"
		}

	case "auth":
		output.Description = "Supabase Auth operation (not a PostgREST endpoint)"
		output.Warnings = append(output.Warnings, "Auth operations use Supabase's Auth API, not PostgREST")

	case "storage":
		output.Description = "Supabase Storage operation (not a PostgREST endpoint)"
		output.Warnings = append(output.Warnings, "Storage operations use Supabase's Storage API, not PostgREST")

	default:
		return nil, fmt.Errorf("unknown special operation: %s", query.SpecialType)
	}

	return output, nil
}
