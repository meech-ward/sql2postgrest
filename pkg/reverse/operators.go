package reverse

import (
	"fmt"
	"strings"
)

// ReverseOperatorMap maps PostgREST operators to SQL operators
var ReverseOperatorMap = map[string]string{
	// Comparison operators
	"eq":  "=",
	"neq": "!=",
	"gt":  ">",
	"gte": ">=",
	"lt":  "<",
	"lte": "<=",

	// Pattern matching operators
	"like":   "LIKE",
	"ilike":  "ILIKE",
	"match":  "~",    // POSIX regex match
	"imatch": "~*",   // Case-insensitive POSIX regex

	// Array operators
	"cs": "@>", // Contains (e.g., array @> value)
	"cd": "<@", // Contained by (e.g., array <@ value)
	"ov": "&&", // Overlap

	// Range operators
	"sl":  "<<",  // Strictly left of
	"sr":  ">>",  // Strictly right of
	"nxr": "&<",  // Does not extend to the right of
	"nxl": "&>",  // Does not extend to the left of
	"adj": "-|-", // Adjacent to

	// Full-text search operators
	"fts":   "@@", // Full-text search using to_tsquery
	"plfts": "@@", // Full-text search using plainto_tsquery
	"phfts": "@@", // Full-text search using phraseto_tsquery
	"wfts":  "@@", // Full-text search using websearch_to_tsquery

	// Special operators
	"is": "IS", // IS NULL / IS NOT NULL
	"in": "IN", // IN (list)
}

// MapOperator converts a PostgREST operator to SQL operator
func MapOperator(postgrestOp string) (string, error) {
	sqlOp, ok := ReverseOperatorMap[postgrestOp]
	if !ok {
		return "", fmt.Errorf("unsupported operator: %s", postgrestOp)
	}
	return sqlOp, nil
}

// ParseOperatorValue parses a PostgREST filter value (e.g., "gte.18" -> "gte", "18")
func ParseOperatorValue(filterValue string) (operator string, value string, err error) {
	parts := strings.SplitN(filterValue, ".", 2)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid filter format: %s (expected format: operator.value)", filterValue)
	}
	return parts[0], parts[1], nil
}

// FormatValue formats a value for SQL based on its type and operator
func FormatValue(value string, operator string) string {
	// Handle NULL values
	if strings.ToLower(value) == "null" {
		return "NULL"
	}

	// Handle boolean values
	if value == "true" || value == "false" {
		return value
	}

	// Handle numeric values (simple check - starts with digit or negative sign)
	if len(value) > 0 && (isDigit(value[0]) || value[0] == '-') {
		// Check if it's a valid number
		isNumber := true
		hasDecimal := false
		for i, c := range value {
			if i == 0 && c == '-' {
				continue
			}
			if c == '.' {
				if hasDecimal {
					isNumber = false
					break
				}
				hasDecimal = true
				continue
			}
			if !isDigit(byte(c)) {
				isNumber = false
				break
			}
		}
		if isNumber {
			return value
		}
	}

	// Handle IN operator - format as (val1,val2,val3)
	if operator == "in" {
		// Value format: (val1,val2,val3) or val1,val2,val3
		if strings.HasPrefix(value, "(") && strings.HasSuffix(value, ")") {
			// Already formatted
			inner := value[1 : len(value)-1]
			values := strings.Split(inner, ",")
			var formatted []string
			for _, v := range values {
				formatted = append(formatted, formatSingleValue(strings.TrimSpace(v)))
			}
			return "(" + strings.Join(formatted, ", ") + ")"
		}
		// Format individual values
		values := strings.Split(value, ",")
		var formatted []string
		for _, v := range values {
			formatted = append(formatted, formatSingleValue(strings.TrimSpace(v)))
		}
		return "(" + strings.Join(formatted, ", ") + ")"
	}

	// Handle array/range operators - these might have special formatting
	if operator == "cs" || operator == "cd" || operator == "ov" {
		// These expect array or range literals
		// If value looks like an array literal, keep it as-is
		if strings.HasPrefix(value, "{") || strings.HasPrefix(value, "[") {
			return value
		}
	}

	// Default: treat as string and escape
	return formatSingleValue(value)
}

func formatSingleValue(value string) string {
	// Handle NULL
	if strings.ToLower(value) == "null" {
		return "NULL"
	}

	// Handle booleans
	if value == "true" || value == "false" {
		return value
	}

	// Check if numeric
	if len(value) > 0 && (isDigit(value[0]) || value[0] == '-') {
		isNumber := true
		hasDecimal := false
		for i, c := range value {
			if i == 0 && c == '-' {
				continue
			}
			if c == '.' {
				if hasDecimal {
					isNumber = false
					break
				}
				hasDecimal = true
				continue
			}
			if !isDigit(byte(c)) {
				isNumber = false
				break
			}
		}
		if isNumber {
			return value
		}
	}

	// Escape single quotes and wrap in quotes
	escaped := strings.ReplaceAll(value, "'", "''")
	return "'" + escaped + "'"
}

func isDigit(c byte) bool {
	return c >= '0' && c <= '9'
}

// HandleNegation wraps a condition with NOT if needed
func HandleNegation(condition string, negated bool) string {
	if negated {
		return "NOT (" + condition + ")"
	}
	return condition
}

// HandleFullTextSearch formats full-text search operators
func HandleFullTextSearch(column, operator, value string) (string, error) {
	var tsFunc string
	switch operator {
	case "fts":
		tsFunc = "to_tsquery"
	case "plfts":
		tsFunc = "plainto_tsquery"
	case "phfts":
		tsFunc = "phraseto_tsquery"
	case "wfts":
		tsFunc = "websearch_to_tsquery"
	default:
		return "", fmt.Errorf("invalid full-text search operator: %s", operator)
	}

	// Format: column @@ to_tsquery('english', 'search terms')
	// Assuming English language by default
	return fmt.Sprintf("%s @@ %s(%s)", column, tsFunc, formatSingleValue(value)), nil
}

// IsFullTextSearchOperator checks if an operator is a full-text search operator
func IsFullTextSearchOperator(operator string) bool {
	return operator == "fts" || operator == "plfts" || operator == "phfts" || operator == "wfts"
}
