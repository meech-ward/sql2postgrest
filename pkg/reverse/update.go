package reverse

import (
	"fmt"
	"strings"
)

// buildUpdateStatement builds an UPDATE statement from a PATCH request
func buildUpdateStatement(req *PostgRESTRequest) (string, error) {
	if req.Body == nil {
		return "", NewSemanticError(
			"ERR_SEMANTIC_NO_BODY",
			"PATCH request requires a body",
			"",
			"provide JSON body with column values to update",
		)
	}

	// Body should be a map of column -> value
	data, ok := req.Body.(map[string]interface{})
	if !ok {
		return "", NewSyntaxError(
			"invalid body format",
			fmt.Sprintf("%v", req.Body),
			"body should be a JSON object with column values",
		)
	}

	if len(data) == 0 {
		return "", NewSemanticError(
			"ERR_SEMANTIC_EMPTY_BODY",
			"UPDATE requires at least one column to update",
			"",
			"provide column values in body",
		)
	}

	// Build SET clause
	var setParts []string
	for col, val := range data {
		setParts = append(setParts, fmt.Sprintf("%s = %s", col, formatJSONValue(val)))
	}

	sql := fmt.Sprintf("UPDATE %s SET %s", req.Table, strings.Join(setParts, ", "))

	// Add WHERE clause if filters exist
	if len(req.Filters) > 0 {
		whereClause, err := buildWhereClause(req.Filters)
		if err != nil {
			return "", err
		}
		sql += " " + whereClause
	}

	return sql, nil
}
