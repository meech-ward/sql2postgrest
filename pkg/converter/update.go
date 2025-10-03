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
	"net/url"

	"github.com/multigres/multigres/go/parser/ast"
)

func (c *Converter) convertUpdate(stmt *ast.UpdateStmt) (*ConversionResult, error) {
	result := &ConversionResult{
		Method:      "PATCH",
		QueryParams: url.Values{},
		Headers:     make(map[string]string),
	}

	if stmt.Relation == nil {
		return nil, fmt.Errorf("UPDATE statement missing table name")
	}

	tableName := stmt.Relation.RelName
	if stmt.Relation.SchemaName != "" {
		tableName = stmt.Relation.SchemaName + "." + tableName
	}
	result.Path = "/" + tableName

	result.Headers["Content-Type"] = "application/json"
	result.Headers["Prefer"] = "return=representation"

	if stmt.TargetList == nil || len(stmt.TargetList.Items) == 0 {
		return nil, fmt.Errorf("UPDATE statement missing SET clause")
	}

	updates := make(map[string]interface{})
	for _, target := range stmt.TargetList.Items {
		resTarget, ok := target.(*ast.ResTarget)
		if !ok {
			return nil, fmt.Errorf("unexpected SET clause item: %T", target)
		}

		if resTarget.Name == "" {
			return nil, fmt.Errorf("SET clause missing column name")
		}

		if resTarget.Val == nil {
			return nil, fmt.Errorf("SET clause missing value for column %s", resTarget.Name)
		}

		value, err := c.extractInsertValue(resTarget.Val)
		if err != nil {
			return nil, fmt.Errorf("failed to extract value for column %s: %w", resTarget.Name, err)
		}

		updates[resTarget.Name] = value
	}

	bodyBytes, err := json.Marshal(updates)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal body: %w", err)
	}
	result.Body = string(bodyBytes)

	if stmt.WhereClause != nil {
		if err := c.addWhereClause(result, stmt.WhereClause); err != nil {
			return nil, fmt.Errorf("failed to process WHERE clause: %w", err)
		}
	}

	if stmt.FromClause != nil {
		return nil, fmt.Errorf("UPDATE with FROM clause not supported")
	}

	if stmt.ReturningList != nil {
		return nil, fmt.Errorf("RETURNING clause not yet supported")
	}

	return result, nil
}
