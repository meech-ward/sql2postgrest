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
							baseColumns = append(baseColumns, column+":"+resTarget.Name)
						} else {
							baseColumns = append(baseColumns, column)
						}
					} else {
						if embeds[joinInfo.tableName] == nil {
							embeds[joinInfo.tableName] = &embedInfo{columns: []string{}}
						}
						if resTarget.Name != "" {
							embeds[joinInfo.tableName].columns = append(embeds[joinInfo.tableName].columns, column+":"+resTarget.Name)
						} else {
							embeds[joinInfo.tableName].columns = append(embeds[joinInfo.tableName].columns, column)
						}
					}
				} else {
					if resTarget.Name != "" {
						baseColumns = append(baseColumns, column+":"+resTarget.Name)
					} else {
						baseColumns = append(baseColumns, column)
					}
				}
			} else {
				if resTarget.Name != "" {
					baseColumns = append(baseColumns, colName+":"+resTarget.Name)
				} else {
					baseColumns = append(baseColumns, colName)
				}
			}

		case *ast.A_Star:
			baseColumns = append(baseColumns, "*")

		case *ast.FuncCall:
			return "", fmt.Errorf("aggregate functions in JOINs not yet supported (use PostgREST's aggregate functions instead)")

		default:
			return "", fmt.Errorf("unsupported SELECT expression type in JOIN: %T", val)
		}
	}

	var selectParts []string
	if len(baseColumns) > 0 {
		selectParts = append(selectParts, strings.Join(baseColumns, ","))
	}

	for tableName, embed := range embeds {
		embedStr := tableName + "(" + strings.Join(embed.columns, ",") + ")"
		selectParts = append(selectParts, embedStr)
	}

	return strings.Join(selectParts, ","), nil
}

func (c *Converter) stripTablePrefix(colName string) string {
	parts := strings.Split(colName, ".")
	if len(parts) == 2 {
		return parts[1]
	}
	return colName
}
