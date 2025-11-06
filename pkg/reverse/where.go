package reverse

import (
	"fmt"
	"strings"
)

// buildWhereClause builds a WHERE clause from filters
func buildWhereClause(filters []Filter) (string, error) {
	if len(filters) == 0 {
		return "", nil
	}

	var conditions []string
	for _, filter := range filters {
		condition, err := buildCondition(filter)
		if err != nil {
			return "", err
		}
		conditions = append(conditions, condition)
	}

	// Join with AND by default (OR handling is more complex and handled separately)
	return "WHERE " + strings.Join(conditions, " AND "), nil
}

// buildCondition builds a single filter condition
func buildCondition(filter Filter) (string, error) {
	// Handle full-text search operators specially
	if IsFullTextSearchOperator(filter.Operator) {
		condition, err := HandleFullTextSearch(filter.Column, filter.Operator, filter.Value.(string))
		if err != nil {
			return "", err
		}
		return HandleNegation(condition, filter.Negated), nil
	}

	// Handle IS NULL / IS NOT NULL
	if filter.Operator == "is" {
		value := strings.ToLower(filter.Value.(string))
		if value == "null" {
			if filter.Negated {
				return filter.Column + " IS NOT NULL", nil
			}
			return filter.Column + " IS NULL", nil
		}
		// IS TRUE / IS FALSE
		if filter.Negated {
			return filter.Column + " IS NOT " + strings.ToUpper(value), nil
		}
		return filter.Column + " IS " + strings.ToUpper(value), nil
	}

	// Map operator
	sqlOp, err := MapOperator(filter.Operator)
	if err != nil {
		return "", err
	}

	// Format value
	value := FormatValue(filter.Value.(string), filter.Operator)

	// Build condition
	var condition string
	if filter.Operator == "in" {
		condition = fmt.Sprintf("%s %s %s", filter.Column, sqlOp, value)
	} else {
		condition = fmt.Sprintf("%s %s %s", filter.Column, sqlOp, value)
	}

	// Handle negation
	return HandleNegation(condition, filter.Negated), nil
}
