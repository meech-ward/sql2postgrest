package reverse

import (
	"encoding/json"
	"fmt"
	"strings"
)

// buildInsertStatement builds an INSERT statement from a POST request
func buildInsertStatement(req *PostgRESTRequest) (string, error) {
	if req.Body == nil {
		return "", NewSemanticError(
			"ERR_SEMANTIC_NO_BODY",
			"POST request requires a body",
			"",
			"provide JSON body with column values",
		)
	}

	// Check if body is a single object or an array (bulk insert)
	switch body := req.Body.(type) {
	case map[string]interface{}:
		// Single row insert
		return buildSingleInsert(req.Table, body)
	case []interface{}:
		// Bulk insert
		return buildBulkInsert(req.Table, body)
	default:
		return "", NewSyntaxError(
			"invalid body format",
			fmt.Sprintf("%v", req.Body),
			"body should be a JSON object or array of objects",
		)
	}
}

// buildSingleInsert builds an INSERT for a single row
func buildSingleInsert(table string, data map[string]interface{}) (string, error) {
	if len(data) == 0 {
		return "", NewSemanticError(
			"ERR_SEMANTIC_EMPTY_BODY",
			"INSERT requires at least one column",
			"",
			"provide column values in body",
		)
	}

	var columns []string
	var values []string

	for col, val := range data {
		columns = append(columns, col)
		values = append(values, formatJSONValue(val))
	}

	sql := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s)",
		table,
		strings.Join(columns, ", "),
		strings.Join(values, ", "),
	)

	return sql, nil
}

// buildBulkInsert builds an INSERT for multiple rows
func buildBulkInsert(table string, rows []interface{}) (string, error) {
	if len(rows) == 0 {
		return "", NewSemanticError(
			"ERR_SEMANTIC_EMPTY_BODY",
			"INSERT requires at least one row",
			"",
			"provide array of objects in body",
		)
	}

	// Get columns from first row
	firstRow, ok := rows[0].(map[string]interface{})
	if !ok {
		return "", NewSyntaxError(
			"invalid row format",
			fmt.Sprintf("%v", rows[0]),
			"each row should be a JSON object",
		)
	}

	var columns []string
	for col := range firstRow {
		columns = append(columns, col)
	}

	// Build values for each row
	var allValues []string
	for _, row := range rows {
		rowMap, ok := row.(map[string]interface{})
		if !ok {
			return "", NewSyntaxError(
				"invalid row format",
				fmt.Sprintf("%v", row),
				"each row should be a JSON object",
			)
		}

		var values []string
		for _, col := range columns {
			val, ok := rowMap[col]
			if !ok {
				// Column missing in this row
				values = append(values, "NULL")
			} else {
				values = append(values, formatJSONValue(val))
			}
		}

		allValues = append(allValues, "("+strings.Join(values, ", ")+")")
	}

	sql := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES %s",
		table,
		strings.Join(columns, ", "),
		strings.Join(allValues, ", "),
	)

	return sql, nil
}

// formatJSONValue formats a JSON value for SQL
func formatJSONValue(val interface{}) string {
	if val == nil {
		return "NULL"
	}

	switch v := val.(type) {
	case string:
		// Escape single quotes
		escaped := strings.ReplaceAll(v, "'", "''")
		return "'" + escaped + "'"
	case bool:
		if v {
			return "true"
		}
		return "false"
	case float64:
		return fmt.Sprintf("%v", v)
	case int:
		return fmt.Sprintf("%d", v)
	case int64:
		return fmt.Sprintf("%d", v)
	case []interface{}, map[string]interface{}:
		// JSON array or object - format as JSON string
		jsonBytes, err := json.Marshal(v)
		if err != nil {
			return "NULL"
		}
		escaped := strings.ReplaceAll(string(jsonBytes), "'", "''")
		return "'" + escaped + "'"
	default:
		// Fallback - convert to string
		return fmt.Sprintf("'%v'", v)
	}
}
