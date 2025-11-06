package supabase

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// Parse parses a Supabase JS query string into a SupabaseQuery
func Parse(input string) (*SupabaseQuery, error) {
	// Clean up the input
	input = strings.TrimSpace(input)

	// Remove line breaks and extra whitespace for easier parsing
	input = regexp.MustCompile(`\s+`).ReplaceAllString(input, " ")

	query := &SupabaseQuery{
		Headers: make(map[string]string),
	}

	// Extract method chain
	methods, err := extractMethodChain(input)
	if err != nil {
		return nil, err
	}

	// Parse each method call
	for _, method := range methods {
		if err := parseMethod(query, method); err != nil {
			return nil, err
		}
	}

	// Validate the query
	if err := validate(query); err != nil {
		return nil, err
	}

	return query, nil
}

// MethodCall represents a single method call
type MethodCall struct {
	Name string
	Args []string
}

// extractMethodChain extracts method calls from the input
func extractMethodChain(input string) ([]MethodCall, error) {
	// Match pattern: supabase.from('table').method(args).method(args)...

	// First, find the starting point (either supabase.from or client.from)
	fromPattern := regexp.MustCompile(`(?:supabase|client)\.from\s*\(\s*['"]([^'"]+)['"]\s*\)`)
	matches := fromPattern.FindStringSubmatch(input)
	matchIndices := fromPattern.FindStringSubmatchIndex(input)

	if len(matches) < 2 {
		// Try to find if it's an RPC call
		rpcPattern := regexp.MustCompile(`(?:supabase|client)\.rpc\s*\(\s*['"]([^'"]+)['"]`)
		rpcMatches := rpcPattern.FindStringSubmatch(input)
		if len(rpcMatches) >= 2 {
			// Handle RPC separately
			return parseRPC(input, rpcMatches[1])
		}

		// Check for auth or storage
		if strings.Contains(input, ".auth") {
			return parseSpecialOp(input, "auth")
		}
		if strings.Contains(input, ".storage") {
			return parseSpecialOp(input, "storage")
		}

		return nil, fmt.Errorf("no valid Supabase query found - expected .from(), .rpc(), .auth, or .storage")
	}

	tableName := matches[1]
	remaining := input[matchIndices[1]:]

	// Extract all method calls
	methods := []MethodCall{{Name: "from", Args: []string{tableName}}}

	// Pattern to match .method(args)
	methodPattern := regexp.MustCompile(`\.(\w+)\s*\(([^)]*)\)`)
	methodMatches := methodPattern.FindAllStringSubmatch(remaining, -1)

	for _, match := range methodMatches {
		methodName := match[1]
		argsStr := strings.TrimSpace(match[2])

		args := []string{}
		if argsStr != "" {
			args = parseArguments(argsStr)
		}

		methods = append(methods, MethodCall{Name: methodName, Args: args})
	}

	return methods, nil
}

// parseArguments parses method arguments
func parseArguments(argsStr string) []string {
	// Handle simple cases first
	argsStr = strings.TrimSpace(argsStr)
	if argsStr == "" {
		return []string{}
	}

	// Try to parse as JSON for complex objects (if starting with { or [, and no commas outside)
	if strings.HasPrefix(argsStr, "{") || strings.HasPrefix(argsStr, "[") {
		return []string{argsStr}
	}

	// Split by comma for multiple args, respecting quotes and brackets
	args := []string{}
	depth := 0
	inQuote := false
	quoteChar := rune(0)
	current := ""

	for _, ch := range argsStr {
		// Handle entering/exiting quotes
		if (ch == '\'' || ch == '"') && !inQuote {
			inQuote = true
			quoteChar = ch
			current += string(ch)
			continue
		}
		if ch == quoteChar && inQuote {
			inQuote = false
			quoteChar = 0
			current += string(ch)
			continue
		}

		// Only process special characters if not in quotes
		if !inQuote {
			switch ch {
			case '(', '[', '{':
				depth++
				current += string(ch)
			case ')', ']', '}':
				depth--
				current += string(ch)
			case ',':
				if depth == 0 {
					args = append(args, strings.TrimSpace(current))
					current = ""
				} else {
					current += string(ch)
				}
			default:
				current += string(ch)
			}
		} else {
			current += string(ch)
		}
	}

	if current != "" {
		args = append(args, strings.TrimSpace(current))
	}

	// Clean up quoted strings
	for i, arg := range args {
		arg = strings.TrimSpace(arg)
		if (strings.HasPrefix(arg, "'") && strings.HasSuffix(arg, "'")) ||
			(strings.HasPrefix(arg, "\"") && strings.HasSuffix(arg, "\"")) {
			args[i] = arg[1 : len(arg)-1]
		} else {
			args[i] = arg
		}
	}

	return args
}

// parseMethod parses a single method call and updates the query
func parseMethod(query *SupabaseQuery, method MethodCall) error {
	switch method.Name {
	case "from":
		if len(method.Args) > 0 {
			query.Table = method.Args[0]
		}

	case "select":
		if len(method.Args) > 0 {
			// Parse select columns
			cols := strings.Split(method.Args[0], ",")
			for _, col := range cols {
				query.Select = append(query.Select, strings.TrimSpace(col))
			}
		} else {
			query.Select = []string{"*"}
		}
		query.Operation = "select"

	case "insert":
		query.Operation = "insert"
		if len(method.Args) > 0 {
			query.Data = parseJSON(method.Args[0])
		}

	case "upsert":
		query.Operation = "insert"
		query.Upsert = true
		if len(method.Args) > 0 {
			query.Data = parseJSON(method.Args[0])
		}

	case "update":
		query.Operation = "update"
		if len(method.Args) > 0 {
			query.Data = parseJSON(method.Args[0])
		}

	case "delete":
		query.Operation = "delete"

	// Filter methods
	case "eq":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "eq",
				Value:    parseValue(method.Args[1]),
			})
		}

	case "neq":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "neq",
				Value:    parseValue(method.Args[1]),
			})
		}

	case "gt":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "gt",
				Value:    parseValue(method.Args[1]),
			})
		}

	case "gte":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "gte",
				Value:    parseValue(method.Args[1]),
			})
		}

	case "lt":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "lt",
				Value:    parseValue(method.Args[1]),
			})
		}

	case "lte":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "lte",
				Value:    parseValue(method.Args[1]),
			})
		}

	case "like":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "like",
				Value:    method.Args[1],
			})
		}

	case "ilike":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "ilike",
				Value:    method.Args[1],
			})
		}

	case "is":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "is",
				Value:    method.Args[1],
			})
		}

	case "in":
		if len(method.Args) >= 2 {
			// Parse array argument
			values := parseArrayArg(method.Args[1])
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "in",
				Value:    values,
			})
		}

	case "contains":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "cs",
				Value:    parseJSON(method.Args[1]),
			})
		}

	case "containedBy":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "cd",
				Value:    parseJSON(method.Args[1]),
			})
		}

	case "textSearch":
		if len(method.Args) >= 2 {
			query.Filters = append(query.Filters, Filter{
				Column:   method.Args[0],
				Operator: "fts",
				Value:    method.Args[1],
			})
		}

	// Modifiers
	case "order":
		if len(method.Args) >= 1 {
			col := method.Args[0]
			ascending := true
			nullsFirst := false

			if len(method.Args) >= 2 {
				opts := parseJSON(method.Args[1])
				if optsMap, ok := opts.(map[string]interface{}); ok {
					if asc, ok := optsMap["ascending"].(bool); ok {
						ascending = asc
					}
					if nf, ok := optsMap["nullsFirst"].(bool); ok {
						nullsFirst = nf
					}
				}
			}

			query.Order = append(query.Order, OrderBy{
				Column:     col,
				Ascending:  ascending,
				NullsFirst: nullsFirst,
			})
		}

	case "limit":
		if len(method.Args) >= 1 {
			if limit, err := strconv.Atoi(method.Args[0]); err == nil {
				query.Limit = &limit
			}
		}

	case "range":
		if len(method.Args) >= 2 {
			from, _ := strconv.Atoi(method.Args[0])
			to, _ := strconv.Atoi(method.Args[1])
			query.Range = &Range{From: from, To: to}
		}

	case "single":
		query.Single = true

	case "maybeSingle":
		query.MaybeSingle = true
	}

	return nil
}

// parseValue parses a value argument
func parseValue(val string) interface{} {
	val = strings.TrimSpace(val)

	// Try to parse as number
	if num, err := strconv.ParseFloat(val, 64); err == nil {
		return num
	}

	// Check for boolean
	if val == "true" {
		return true
	}
	if val == "false" {
		return false
	}

	// Check for null
	if val == "null" {
		return nil
	}

	// Return as string
	return val
}

// parseJSON attempts to parse a JSON string (or JavaScript object literal)
func parseJSON(str string) interface{} {
	str = strings.TrimSpace(str)

	// Try parsing as valid JSON first
	var result interface{}
	if err := json.Unmarshal([]byte(str), &result); err == nil {
		return result
	}

	// Try to convert JavaScript object literal to JSON
	// Convert unquoted keys to quoted keys: {foo: 'bar'} -> {"foo": "bar"}
	jsToJSON := str

	// Replace single quotes with double quotes for strings
	jsToJSON = regexp.MustCompile(`'([^']*)'`).ReplaceAllString(jsToJSON, `"$1"`)

	// Add quotes around unquoted keys
	jsToJSON = regexp.MustCompile(`(\w+):`).ReplaceAllString(jsToJSON, `"$1":`)

	// Try parsing again
	if err := json.Unmarshal([]byte(jsToJSON), &result); err == nil {
		return result
	}

	// If still can't parse, return as-is
	return str
}

// parseArrayArg parses an array argument like [1,2,3]
func parseArrayArg(arg string) []interface{} {
	arg = strings.TrimSpace(arg)

	// Try to parse as JSON array first
	var arr []interface{}
	if err := json.Unmarshal([]byte(arg), &arr); err == nil {
		return arr
	}

	// Fallback: manual parsing
	if strings.HasPrefix(arg, "[") && strings.HasSuffix(arg, "]") {
		arg = arg[1 : len(arg)-1]
	}

	parts := strings.Split(arg, ",")
	result := []interface{}{}
	for _, part := range parts {
		result = append(result, parseValue(strings.TrimSpace(part)))
	}

	return result
}

// parseRPC handles RPC method calls
func parseRPC(input string, functionName string) ([]MethodCall, error) {
	// For now, just mark it as an RPC call
	// We'll handle the full implementation later
	return []MethodCall{{Name: "rpc", Args: []string{functionName}}}, nil
}

// parseSpecialOp handles special operations like auth and storage
func parseSpecialOp(input string, opType string) ([]MethodCall, error) {
	return []MethodCall{{Name: opType, Args: []string{}}}, nil
}

// validate validates the parsed query
func validate(query *SupabaseQuery) error {
	if query.Operation == "" && query.Table != "" {
		// If table is set but no operation, assume select
		query.Operation = "select"
		if len(query.Select) == 0 {
			query.Select = []string{"*"}
		}
	}

	return nil
}
