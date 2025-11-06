package reverse

import (
	"fmt"
)

// buildDeleteStatement builds a DELETE statement from a DELETE request
func buildDeleteStatement(req *PostgRESTRequest) (string, error) {
	sql := fmt.Sprintf("DELETE FROM %s", req.Table)

	// WHERE clause is required (already validated in ValidateRequest)
	whereClause, err := buildWhereClause(req.Filters)
	if err != nil {
		return "", err
	}

	sql += " " + whereClause

	return sql, nil
}
