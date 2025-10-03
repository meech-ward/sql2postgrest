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

	"github.com/multigres/multigres/go/parser/ast"
)

func (c *Converter) convertDelete(stmt *ast.DeleteStmt) (*ConversionResult, error) {
	result := &ConversionResult{
		Method:      "DELETE",
		QueryParams: url.Values{},
		Headers:     make(map[string]string),
	}

	if stmt.Relation == nil {
		return nil, fmt.Errorf("DELETE statement missing table name")
	}

	tableName := stmt.Relation.RelName
	if stmt.Relation.SchemaName != "" {
		tableName = stmt.Relation.SchemaName + "." + tableName
	}
	result.Path = "/" + tableName

	result.Headers["Prefer"] = "return=representation"

	if stmt.WhereClause != nil {
		if err := c.addWhereClause(result, stmt.WhereClause); err != nil {
			return nil, fmt.Errorf("failed to process WHERE clause: %w", err)
		}
	} else {
		return nil, fmt.Errorf("DELETE without WHERE clause is dangerous and not supported")
	}

	if stmt.UsingClause != nil {
		return nil, fmt.Errorf("DELETE with USING clause not supported")
	}

	if stmt.ReturningList != nil {
		return nil, fmt.Errorf("RETURNING clause not yet supported")
	}

	return result, nil
}
