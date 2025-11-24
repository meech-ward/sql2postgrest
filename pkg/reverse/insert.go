package reverse

import (
	"encoding/json"
	"fmt"
	"strings"
)

// buildInsertStatement builds an INSERT statement from a POST request
func buildInsertStatement(req *PostgRESTRequest) (string, []string, error) {
	warnings := []string{}

	if req.Body == nil {
		return "", nil, NewSemanticError(
			"ERR_SEMANTIC_NO_BODY",
			"POST request requires a body",
			"",
			"provide JSON body with column values",
		)
	}

	// Check for upsert (Prefer: resolution=merge-duplicates header or on_conflict parameter)
	isUpsert := false
	var conflictColumns []string

	if prefer, ok := req.Headers["Prefer"]; ok {
		if strings.Contains(prefer, "resolution=merge-duplicates") {
			isUpsert = true
		}
	}

	// Check for on_conflict parameter (takes precedence)
	if req.OnConflict != nil && *req.OnConflict != "" {
		isUpsert = true
		// Parse conflict columns (can be comma-separated)
		conflictColumns = strings.Split(*req.OnConflict, ",")
		for i, col := range conflictColumns {
			conflictColumns[i] = strings.TrimSpace(col)
		}
	}

	// Check if body is a single object or an array (bulk insert)
	var sql string
	var err error
	var bodyColumns []string

	switch body := req.Body.(type) {
	case map[string]interface{}:
		// Single row insert
		sql, err = buildSingleInsert(req.Table, body)
		// Extract columns from body for ON CONFLICT DO UPDATE
		for col := range body {
			bodyColumns = append(bodyColumns, col)
		}
	case []interface{}:
		// Bulk insert
		sql, err = buildBulkInsert(req.Table, body)
		// Extract columns from first row for ON CONFLICT DO UPDATE
		if len(body) > 0 {
			if firstRow, ok := body[0].(map[string]interface{}); ok {
				for col := range firstRow {
					bodyColumns = append(bodyColumns, col)
				}
			}
		}
	default:
		return "", nil, NewSyntaxError(
			"invalid body format",
			fmt.Sprintf("%v", req.Body),
			"body should be a JSON object or array of objects",
		)
	}

	if err != nil {
		return "", nil, err
	}

	// Add ON CONFLICT clause if upsert
	if isUpsert {
		if len(conflictColumns) > 0 {
			// We have specific conflict columns - generate full ON CONFLICT clause
			sql += " ON CONFLICT (" + strings.Join(conflictColumns, ", ") + ") DO UPDATE SET "

			// Generate SET clause for all columns except conflict columns
			var updateCols []string
			for _, col := range bodyColumns {
				isConflictCol := false
				for _, conflictCol := range conflictColumns {
					if col == conflictCol {
						isConflictCol = true
						break
					}
				}
				if !isConflictCol {
					updateCols = append(updateCols, col+" = EXCLUDED."+col)
				}
			}

			if len(updateCols) > 0 {
				sql += strings.Join(updateCols, ", ")
			} else {
				// All columns are conflict columns - just update one of them to itself
				sql += conflictColumns[0] + " = EXCLUDED." + conflictColumns[0]
			}
		} else {
			// No specific conflict columns - add placeholder
			sql += " ON CONFLICT (/* conflict_target */) DO UPDATE SET /* update_columns */"
			warnings = append(warnings, "UPSERT detected but conflict target cannot be determined from PostgREST request - please specify ON CONFLICT clause manually")
		}
	}

	// Add RETURNING clause if select parameter is present
	if req.Select != nil && len(req.Select) > 0 {
		if len(req.Select) == 1 && req.Select[0] == "*" {
			sql += " RETURNING *"
		} else {
			sql += " RETURNING " + strings.Join(req.Select, ", ")
		}
	}

	return sql, warnings, nil
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
