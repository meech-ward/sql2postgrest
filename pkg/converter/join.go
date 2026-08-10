// Copyright 2025 Supabase, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package converter

import (
	"fmt"
	"strings"

	"github.com/multigres/multigres/go/parser/ast"
)

type joinInfo struct {
	tableName string
	alias     string
	isBase    bool
}

func (c *Converter) extractFromClause(fromClause *ast.NodeList) (string, map[string]joinInfo, error) {
	if fromClause == nil || len(fromClause.Items) == 0 {
		return "", nil, fmt.Errorf("no FROM clause found")
	}

	if len(fromClause.Items) > 1 {
		return "", nil, fmt.Errorf("multiple FROM items not yet supported (use JOINs)")
	}

	item := fromClause.Items[0]

	switch v := item.(type) {
	case *ast.RangeVar:
		tableName := v.RelName
		if v.SchemaName != "" {
			tableName = v.SchemaName + "." + tableName
		}
		joins := make(map[string]joinInfo)
		if v.Alias != nil && v.Alias.AliasName != "" {
			joins[v.Alias.AliasName] = joinInfo{
				tableName: v.RelName,
				alias:     v.Alias.AliasName,
				isBase:    true,
			}
		}
		return tableName, joins, nil

	case *ast.JoinExpr:
		return c.extractJoinExpr(v)

	default:
		return "", nil, fmt.Errorf("unsupported FROM item type: %T", item)
	}
}

func (c *Converter) extractJoinExpr(join *ast.JoinExpr) (string, map[string]joinInfo, error) {
	joins := make(map[string]joinInfo)

	leftTable, err := c.extractJoinSide(join.Larg, joins)
	if err != nil {
		return "", nil, fmt.Errorf("failed to extract left side of join: %w", err)
	}

	rightTable, rightAlias, err := c.extractJoinTable(join.Rarg)
	if err != nil {
		return "", nil, fmt.Errorf("failed to extract right side of join: %w", err)
	}

	if rightAlias != "" {
		joins[rightAlias] = joinInfo{
			tableName: rightTable,
			alias:     rightAlias,
			isBase:    false,
		}
	} else {
		joins[rightTable] = joinInfo{
			tableName: rightTable,
			alias:     "",
			isBase:    false,
		}
	}

	return leftTable, joins, nil
}

func (c *Converter) extractJoinSide(node ast.Node, joins map[string]joinInfo) (string, error) {
	switch v := node.(type) {
	case *ast.RangeVar:
		tableName := v.RelName
		if v.SchemaName != "" {
			tableName = v.SchemaName + "." + tableName
		}
		if v.Alias != nil && v.Alias.AliasName != "" {
			joins[v.Alias.AliasName] = joinInfo{
				tableName: v.RelName,
				alias:     v.Alias.AliasName,
				isBase:    true,
			}
		}
		return tableName, nil

	case *ast.JoinExpr:
		leftTable, moreJoins, err := c.extractJoinExpr(v)
		if err != nil {
			return "", err
		}
		for k, v := range moreJoins {
			joins[k] = v
		}
		return leftTable, nil

	default:
		return "", fmt.Errorf("unsupported join side type: %T", node)
	}
}

func (c *Converter) extractJoinTable(node ast.Node) (string, string, error) {
	rangeVar, ok := node.(*ast.RangeVar)
	if !ok {
		return "", "", fmt.Errorf("unsupported join table type: %T", node)
	}

	tableName := rangeVar.RelName
	if rangeVar.SchemaName != "" {
		tableName = rangeVar.SchemaName + "." + tableName
	}

	alias := ""
	if rangeVar.Alias != nil {
		alias = rangeVar.Alias.AliasName
	}

	return tableName, alias, nil
}

func (c *Converter) buildEmbeddedSelect(targetList *ast.NodeList, joins map[string]joinInfo) (string, error) {
	if targetList == nil || len(targetList.Items) == 0 {
		return "", nil
	}

	type embedInfo struct {
		columns []string
	}

	baseColumns := []string{}
	embeds := make(map[string]*embedInfo)
	embedOrder := []string{}

	addEmbedColumn := func(tableName, column string) {
		if embeds[tableName] == nil {
			embeds[tableName] = &embedInfo{columns: []string{}}
			embedOrder = append(embedOrder, tableName)
		}
		embeds[tableName].columns = append(embeds[tableName].columns, column)
	}

	for _, item := range targetList.Items {
		resTarget, ok := item.(*ast.ResTarget)
		if !ok {
			return "", fmt.Errorf("unsupported target list item: %T", item)
		}

		if resTarget.Val == nil {
			continue
		}

		switch val := resTarget.Val.(type) {
		case *ast.ColumnRef:
			colName := c.extractColumnName(val)

			if colName == "*" {
				baseColumns = append(baseColumns, "*")
				continue
			}

			parts := strings.Split(colName, ".")
			if len(parts) == 2 {
				tableAlias := parts[0]
				column := parts[1]

				if joinInfo, exists := joins[tableAlias]; exists {
					if joinInfo.isBase {
						if resTarget.Name != "" {
							baseColumns = append(baseColumns, resTarget.Name+":"+column)
						} else {
							baseColumns = append(baseColumns, column)
						}
					} else {
						if resTarget.Name != "" {
							addEmbedColumn(joinInfo.tableName, resTarget.Name+":"+column)
						} else {
							addEmbedColumn(joinInfo.tableName, column)
						}
					}
				} else {
					if resTarget.Name != "" {
						baseColumns = append(baseColumns, resTarget.Name+":"+column)
					} else {
						baseColumns = append(baseColumns, column)
					}
				}
			} else {
				if resTarget.Name != "" {
					baseColumns = append(baseColumns, resTarget.Name+":"+colName)
				} else {
					baseColumns = append(baseColumns, colName)
				}
			}

		case *ast.A_Star:
			baseColumns = append(baseColumns, "*")

		case *ast.FuncCall:
			tableName, funcStr, err := c.convertFunctionCallForJoin(val, resTarget.Name, joins)
			if err != nil {
				return "", err
			}

			if tableName == "" {
				baseColumns = append(baseColumns, funcStr)
			} else {
				addEmbedColumn(tableName, funcStr)
			}

		case *ast.TypeCast:
			castStr, err := c.convertTypeCastForJoin(val, resTarget.Name, joins)
			if err != nil {
				return "", err
			}
			baseColumns = append(baseColumns, castStr)

		case *ast.A_Expr:
			// JSON path (data->>'key'); convertJSONPath strips any table
			// qualifier, so it lands as a base-table column like the cast case.
			exprStr, err := c.convertAExpr(val, resTarget.Name)
			if err != nil {
				return "", err
			}
			baseColumns = append(baseColumns, exprStr)

		default:
			return "", fmt.Errorf("unsupported SELECT expression type in JOIN: %T", val)
		}
	}

	var selectParts []string
	if len(baseColumns) > 0 {
		selectParts = append(selectParts, strings.Join(baseColumns, ","))
	}

	// Emit embeds in first-reference order so output is deterministic.
	for _, tableName := range embedOrder {
		embed := embeds[tableName]
		embedStr := tableName + "(" + strings.Join(embed.columns, ",") + ")"
		selectParts = append(selectParts, embedStr)
	}

	return strings.Join(selectParts, ","), nil
}

// stripTablePrefix returns the bare column name from a possibly-qualified
// reference (table.col or schema.table.col). JSON paths use -> / ->> operators
// rather than dots, so they are unaffected.
func (c *Converter) stripTablePrefix(colName string) string {
	if idx := strings.LastIndex(colName, "."); idx >= 0 {
		return colName[idx+1:]
	}
	return colName
}

func (c *Converter) convertFunctionCallForJoin(fn *ast.FuncCall, alias string, joins map[string]joinInfo) (string, string, error) {
	if fn.Funcname == nil || len(fn.Funcname.Items) == 0 {
		return "", "", fmt.Errorf("function name is empty")
	}

	funcNameNode, ok := fn.Funcname.Items[len(fn.Funcname.Items)-1].(*ast.String)
	if !ok {
		return "", "", fmt.Errorf("invalid function name type")
	}

	funcName := strings.ToLower(funcNameNode.SVal)

	if !supportedAggregates[funcName] {
		if funcName == "json_agg" || funcName == "json_build_object" {
			return "", "", fmt.Errorf("json_agg/json_build_object not supported - PostgREST handles JSON automatically via embedded resources. Use: GET /authors?select=name,books(title,published_date) instead")
		}
		return "", "", fmt.Errorf("unsupported aggregate function in JOIN: %s (only count, sum, avg, max, min are supported)", funcName)
	}

	if err := c.rejectUnsupportedAggregateModifiers(fn, funcName); err != nil {
		return "", "", err
	}

	var result string
	var targetTable string

	if funcName == "count" {
		if fn.Args == nil || len(fn.Args.Items) == 0 {
			result = "count()"
		} else if len(fn.Args.Items) == 1 {
			arg := fn.Args.Items[0]
			if _, isStar := arg.(*ast.A_Star); isStar {
				result = "count()"
			} else if colRef, ok := arg.(*ast.ColumnRef); ok {
				colName := c.extractColumnName(colRef)
				parts := strings.Split(colName, ".")

				if len(parts) == 2 {
					tableAlias := parts[0]
					column := parts[1]

					if joinInfo, exists := joins[tableAlias]; exists && !joinInfo.isBase {
						targetTable = joinInfo.tableName
						result = column + ".count()"
					} else {
						result = column + ".count()"
					}
				} else {
					result = colName + ".count()"
				}
			} else {
				return "", "", fmt.Errorf("unsupported COUNT argument type: %T", arg)
			}
		} else {
			return "", "", fmt.Errorf("COUNT accepts at most one argument")
		}
	} else {
		if fn.Args == nil || len(fn.Args.Items) != 1 {
			return "", "", fmt.Errorf("%s requires exactly one argument", strings.ToUpper(funcName))
		}

		arg := fn.Args.Items[0]
		colRef, ok := arg.(*ast.ColumnRef)
		if !ok {
			return "", "", fmt.Errorf("%s argument must be a column reference", strings.ToUpper(funcName))
		}

		colName := c.extractColumnName(colRef)
		parts := strings.Split(colName, ".")

		if len(parts) == 2 {
			tableAlias := parts[0]
			column := parts[1]

			if joinInfo, exists := joins[tableAlias]; exists && !joinInfo.isBase {
				targetTable = joinInfo.tableName
				result = column + "." + funcName + "()"
			} else {
				result = column + "." + funcName + "()"
			}
		} else {
			result = colName + "." + funcName + "()"
		}
	}

	if alias != "" {
		result = alias + ":" + result
	}

	return targetTable, result, nil
}

func (c *Converter) convertTypeCastForJoin(tc *ast.TypeCast, alias string, joins map[string]joinInfo) (string, error) {
	if tc.Arg == nil {
		return "", fmt.Errorf("typecast has no argument")
	}

	colRef, ok := tc.Arg.(*ast.ColumnRef)
	if !ok {
		return "", fmt.Errorf("unsupported typecast argument type in JOIN: %T", tc.Arg)
	}

	colName := c.extractColumnName(colRef)

	parts := strings.Split(colName, ".")
	if len(parts) == 2 {
		colName = parts[1]
	}

	typeName, err := c.extractTypeName(tc.TypeName)
	if err != nil {
		return "", err
	}

	result := colName + "::" + typeName

	if alias != "" {
		result = alias + ":" + result
	}

	return result, nil
}
