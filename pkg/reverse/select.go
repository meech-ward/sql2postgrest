package reverse

import (
	"fmt"
	"strings"
)

// buildSelectClause builds the SELECT clause
func buildSelectClause(req *PostgRESTRequest) string {
	if len(req.Select) == 0 || (len(req.Select) == 1 && req.Select[0] == "*") {
		return "SELECT *"
	}

	// Parse embedded resources
	mainCols, embeds, err := ParseEmbeddedResources(req.Select)
	if err != nil {
		// Fallback to simple select
		return "SELECT " + strings.Join(req.Select, ", ")
	}

	// If no embeds, simple select
	if len(embeds) == 0 {
		return "SELECT " + strings.Join(mainCols, ", ")
	}

	// With embeds, we need to qualify columns and include embedded columns
	var allColumns []string

	// Add main table columns (qualified)
	for _, col := range mainCols {
		if col != "*" {
			allColumns = append(allColumns, req.Table+"."+col)
		} else {
			allColumns = append(allColumns, req.Table+".*")
		}
	}

	// Add embedded resource columns (qualified)
	for _, embed := range embeds {
		for _, col := range embed.Select {
			if col != "*" {
				allColumns = append(allColumns, embed.Relation+"."+col)
			} else {
				allColumns = append(allColumns, embed.Relation+".*")
			}
		}
	}

	// Store embeds in request for FROM clause builder
	req.Embedded = embeds

	return "SELECT " + strings.Join(allColumns, ", ")
}

// buildFromClause builds the FROM clause with JOINs for embedded resources
func buildFromClause(req *PostgRESTRequest) (string, []string) {
	warnings := []string{}

	// Start with main table
	fromClause := "FROM " + req.Table

	// Add JOINs for embedded resources
	if len(req.Embedded) > 0 {
		for _, embed := range req.Embedded {
			// Assume foreign key convention: {table}_id
			// This is a limitation - we can't know the actual FK without schema
			joinCondition := fmt.Sprintf("%s.%s = %s.id", embed.Relation, req.Table+"_id", req.Table)

			fromClause += fmt.Sprintf(" LEFT JOIN %s ON %s", embed.Relation, joinCondition)

			warnings = append(warnings, fmt.Sprintf(
				"Assuming FK convention: %s.%s references %s.id",
				embed.Relation,
				req.Table+"_id",
				req.Table,
			))
		}
	}

	return fromClause, warnings
}

// buildOrderByClause builds the ORDER BY clause
func buildOrderByClause(order []OrderBy) string {
	if len(order) == 0 {
		return ""
	}

	var parts []string
	for _, o := range order {
		part := o.Column
		if o.Descending {
			part += " DESC"
		} else {
			part += " ASC"
		}

		// Add NULLS FIRST/LAST if specified
		if o.NullsFirst {
			part += " NULLS FIRST"
		} else if o.NullsLast {
			part += " NULLS LAST"
		}

		parts = append(parts, part)
	}

	return "ORDER BY " + strings.Join(parts, ", ")
}

// buildLimitOffsetClause builds the LIMIT/OFFSET clause
func buildLimitOffsetClause(limit, offset *int) string {
	var parts []string

	if limit != nil {
		parts = append(parts, fmt.Sprintf("LIMIT %d", *limit))
	}

	if offset != nil {
		parts = append(parts, fmt.Sprintf("OFFSET %d", *offset))
	}

	if len(parts) == 0 {
		return ""
	}

	return strings.Join(parts, " ")
}
