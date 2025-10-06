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
	"net/url"
	"strconv"
	"strings"

	"github.com/multigres/multigres/go/parser/ast"
)

func (c *Converter) convertSelect(stmt *ast.SelectStmt) (*ConversionResult, error) {
	result := &ConversionResult{
		Method:      "GET",
		QueryParams: url.Values{},
		Headers:     make(map[string]string),
	}

	tableName, joins, err := c.extractFromClause(stmt.FromClause)
	if err != nil {
		return nil, err
	}
	result.Path = "/" + tableName

	if len(joins) > 0 {
		selectStr, err := c.buildEmbeddedSelect(stmt.TargetList, joins)
		if err != nil {
			return nil, err
		}
		if selectStr != "" {
			result.QueryParams.Set("select", selectStr)
		}
	} else {
		if err := c.addSelectColumns(result, stmt.TargetList); err != nil {
			return nil, err
		}
	}

	if stmt.WhereClause != nil {
		if err := c.addWhereClauseWithJoins(result, stmt.WhereClause, joins); err != nil {
			return nil, err
		}
	}

	if stmt.SortClause != nil && len(stmt.SortClause.Items) > 0 {
		if err := c.addOrderByWithJoins(result, stmt.SortClause, joins); err != nil {
			return nil, err
		}
	}

	if stmt.LimitCount != nil {
		if err := c.addLimit(result, stmt.LimitCount); err != nil {
			return nil, err
		}
	}

	if stmt.LimitOffset != nil {
		if err := c.addOffset(result, stmt.LimitOffset); err != nil {
			return nil, err
		}
	}

	if stmt.DistinctClause != nil {
		return nil, fmt.Errorf("DISTINCT not yet supported")
	}

	if stmt.GroupClause != nil && len(joins) == 0 {
		return nil, fmt.Errorf("GROUP BY not supported for simple queries (use aggregate functions with JOINs or PostgREST's native aggregation)")
	}

	if stmt.HavingClause != nil {
		return nil, fmt.Errorf("HAVING not yet supported")
	}

	if stmt.WithClause != nil {
		return nil, fmt.Errorf("WITH (CTE) not yet supported")
	}

	return result, nil
}

func (c *Converter) extractTableName(fromClause *ast.NodeList) (string, error) {
	if fromClause == nil || len(fromClause.Items) == 0 {
		return "", fmt.Errorf("no FROM clause found")
	}

	if len(fromClause.Items) > 1 {
		return "", fmt.Errorf("multiple FROM items not yet supported (use JOINs)")
	}

	item := fromClause.Items[0]
	rangeVar, ok := item.(*ast.RangeVar)
	if !ok {
		return "", fmt.Errorf("unsupported FROM item type: %T", item)
	}

	if rangeVar.SchemaName != "" {
		return rangeVar.SchemaName + "." + rangeVar.RelName, nil
	}

	return rangeVar.RelName, nil
}

func (c *Converter) addSelectColumns(result *ConversionResult, targetList *ast.NodeList) error {
	if targetList == nil || len(targetList.Items) == 0 {
		return nil
	}

	var columns []string

	for _, item := range targetList.Items {
		resTarget, ok := item.(*ast.ResTarget)
		if !ok {
			return fmt.Errorf("unsupported target list item: %T", item)
		}

		if resTarget.Val == nil {
			continue
		}

		switch val := resTarget.Val.(type) {
		case *ast.ColumnRef:
			colName := c.extractColumnName(val)
			if colName == "*" {
				continue
			}

			if resTarget.Name != "" {
				columns = append(columns, colName+":"+resTarget.Name)
			} else {
				columns = append(columns, colName)
			}

		case *ast.A_Star:
			continue

		case *ast.FuncCall:
			funcStr, err := c.convertFunctionCall(val, resTarget.Name)
			if err != nil {
				return err
			}
			columns = append(columns, funcStr)

		default:
			return fmt.Errorf("unsupported SELECT expression type: %T", val)
		}
	}

	if len(columns) > 0 {
		result.QueryParams.Set("select", strings.Join(columns, ","))
	}

	return nil
}

func (c *Converter) extractColumnName(col *ast.ColumnRef) string {
	if col.Fields == nil || len(col.Fields.Items) == 0 {
		return ""
	}

	var parts []string
	for _, field := range col.Fields.Items {
		switch f := field.(type) {
		case *ast.String:
			parts = append(parts, f.SVal)
		case *ast.A_Star:
			parts = append(parts, "*")
		}
	}

	return strings.Join(parts, ".")
}

func (c *Converter) convertFunctionCall(fn *ast.FuncCall, alias string) (string, error) {
	if fn.Funcname == nil || len(fn.Funcname.Items) == 0 {
		return "", fmt.Errorf("function name is empty")
	}

	funcNameNode, ok := fn.Funcname.Items[len(fn.Funcname.Items)-1].(*ast.String)
	if !ok {
		return "", fmt.Errorf("invalid function name type")
	}

	funcName := strings.ToLower(funcNameNode.SVal)

	var args []string
	if fn.Args != nil {
		for _, arg := range fn.Args.Items {
			if colRef, ok := arg.(*ast.ColumnRef); ok {
				args = append(args, c.extractColumnName(colRef))
			} else {
				return "", fmt.Errorf("unsupported function argument type: %T", arg)
			}
		}
	}

	var result string
	switch funcName {
	case "count":
		if len(args) == 0 || (len(args) == 1 && args[0] == "*") {
			result = "count"
		} else {
			result = args[0] + ".count"
		}
	case "sum", "avg", "max", "min":
		if len(args) != 1 {
			return "", fmt.Errorf("%s requires exactly one argument", funcName)
		}
		result = args[0] + "." + funcName
	default:
		return "", fmt.Errorf("unsupported function: %s", funcName)
	}

	if alias != "" {
		result = result + ":" + alias
	}

	return result, nil
}

func (c *Converter) addOrderBy(result *ConversionResult, sortClause *ast.NodeList) error {
	return c.addOrderByWithJoins(result, sortClause, nil)
}

func (c *Converter) addOrderByWithJoins(result *ConversionResult, sortClause *ast.NodeList, joins map[string]joinInfo) error {
	var orderParts []string

	for _, item := range sortClause.Items {
		sortBy, ok := item.(*ast.SortBy)
		if !ok {
			return fmt.Errorf("unsupported sort clause item: %T", item)
		}

		colRef, ok := sortBy.Node.(*ast.ColumnRef)
		if !ok {
			return fmt.Errorf("unsupported sort expression type: %T", sortBy.Node)
		}

		colName := c.extractColumnName(colRef)
		colName = c.stripTablePrefix(colName)

		direction := "asc"
		if sortBy.SortbyDir == ast.SORTBY_DESC {
			direction = "desc"
		}

		nullsHandling := ""
		if sortBy.SortbyNulls == ast.SORTBY_NULLS_FIRST {
			nullsHandling = ".nullsfirst"
		} else if sortBy.SortbyNulls == ast.SORTBY_NULLS_LAST {
			nullsHandling = ".nullslast"
		}

		orderParts = append(orderParts, colName+"."+direction+nullsHandling)
	}

	if len(orderParts) > 0 {
		result.QueryParams.Set("order", strings.Join(orderParts, ","))
	}

	return nil
}

func (c *Converter) addLimit(result *ConversionResult, limitNode ast.Node) error {
	limitVal, err := c.extractIntValue(limitNode)
	if err != nil {
		return fmt.Errorf("invalid LIMIT value: %w", err)
	}

	result.QueryParams.Set("limit", strconv.Itoa(limitVal))
	return nil
}

func (c *Converter) addOffset(result *ConversionResult, offsetNode ast.Node) error {
	offsetVal, err := c.extractIntValue(offsetNode)
	if err != nil {
		return fmt.Errorf("invalid OFFSET value: %w", err)
	}

	result.QueryParams.Set("offset", strconv.Itoa(offsetVal))
	return nil
}

func (c *Converter) extractIntValue(node ast.Node) (int, error) {
	switch n := node.(type) {
	case *ast.A_Const:
		if n.Val == nil {
			return 0, fmt.Errorf("null value")
		}
		if intVal, ok := n.Val.(*ast.Integer); ok {
			return intVal.IVal, nil
		}
		return 0, fmt.Errorf("not an integer: %T", n.Val)
	default:
		return 0, fmt.Errorf("unsupported value type: %T", node)
	}
}
