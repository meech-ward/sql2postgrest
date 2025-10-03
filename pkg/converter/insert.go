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
	"encoding/json"
	"fmt"

	"github.com/multigres/multigres/go/parser/ast"
)

func (c *Converter) convertInsert(stmt *ast.InsertStmt) (*ConversionResult, error) {
	result := &ConversionResult{
		Method:      "POST",
		QueryParams: make(map[string][]string),
		Headers:     make(map[string]string),
	}

	if stmt.Relation == nil {
		return nil, fmt.Errorf("INSERT statement missing table name")
	}

	tableName := stmt.Relation.RelName
	if stmt.Relation.SchemaName != "" {
		tableName = stmt.Relation.SchemaName + "." + tableName
	}
	result.Path = "/" + tableName

	result.Headers["Content-Type"] = "application/json"
	result.Headers["Prefer"] = "return=representation"

	if stmt.SelectStmt == nil {
		return nil, fmt.Errorf("INSERT statement missing values")
	}

	selectStmt, ok := stmt.SelectStmt.(*ast.SelectStmt)
	if !ok {
		return nil, fmt.Errorf("unsupported INSERT SELECT type: %T", stmt.SelectStmt)
	}

	if selectStmt.ValuesLists == nil || len(selectStmt.ValuesLists.Items) == 0 {
		return nil, fmt.Errorf("INSERT statement missing VALUES")
	}

	var columns []string
	if stmt.Cols != nil && len(stmt.Cols.Items) > 0 {
		for _, col := range stmt.Cols.Items {
			resTarget, ok := col.(*ast.ResTarget)
			if !ok {
				return nil, fmt.Errorf("unexpected column type: %T", col)
			}
			columns = append(columns, resTarget.Name)
		}
	}

	var rows []map[string]interface{}
	for _, valuesList := range selectStmt.ValuesLists.Items {
		valList, ok := valuesList.(*ast.NodeList)
		if !ok {
			return nil, fmt.Errorf("unexpected values list type: %T", valuesList)
		}

		row := make(map[string]interface{})

		for i, val := range valList.Items {
			var colName string
			if i < len(columns) {
				colName = columns[i]
			} else {
				colName = fmt.Sprintf("column%d", i+1)
			}

			value, err := c.extractInsertValue(val)
			if err != nil {
				return nil, fmt.Errorf("failed to extract value for column %s: %w", colName, err)
			}

			row[colName] = value
		}

		rows = append(rows, row)
	}

	bodyBytes, err := json.Marshal(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal body: %w", err)
	}
	result.Body = string(bodyBytes)

	if stmt.OnConflictClause != nil {
		return nil, fmt.Errorf("ON CONFLICT not yet supported")
	}

	return result, nil
}

func (c *Converter) extractInsertValue(node ast.Node) (interface{}, error) {
	switch val := node.(type) {
	case *ast.A_Const:
		return c.extractConstValueInterface(val)
	case *ast.ColumnRef:
		return c.extractColumnName(val), nil
	default:
		return nil, fmt.Errorf("unsupported value type: %T", node)
	}
}

func (c *Converter) extractConstValueInterface(aConst *ast.A_Const) (interface{}, error) {
	if aConst.Val == nil {
		return nil, nil
	}

	switch v := aConst.Val.(type) {
	case *ast.Integer:
		return v.IVal, nil
	case *ast.Float:
		return v.FVal, nil
	case *ast.String:
		return v.SVal, nil
	case *ast.BitString:
		return v.BSVal, nil
	case *ast.Boolean:
		return v.BoolVal, nil
	case *ast.Null:
		return nil, nil
	default:
		return nil, fmt.Errorf("unsupported const type: %T", aConst.Val)
	}
}
