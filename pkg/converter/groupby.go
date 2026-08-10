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

var supportedAggregates = map[string]bool{
	"count": true,
	"sum":   true,
	"avg":   true,
	"max":   true,
	"min":   true,
}

var errUnsupportedAggregateArg = fmt.Errorf("unsupported aggregate argument - PostgREST aggregates only accept a column or JSON path (optionally cast), not arithmetic or computed expressions; create a database VIEW instead")

// rejectUnsupportedAggregateModifiers rejects aggregate call modifiers that
// PostgREST cannot express: DISTINCT, window frames (OVER), FILTER, and ordered-set
// / WITHIN GROUP aggregation. Shared by the no-join and JOIN emitters.
func (c *Converter) rejectUnsupportedAggregateModifiers(fn *ast.FuncCall, funcName string) error {
	up := strings.ToUpper(funcName)
	switch {
	case fn.AggDistinct:
		return fmt.Errorf("%s(DISTINCT ...) not supported - PostgREST aggregates cannot express DISTINCT; create a database VIEW instead", up)
	case fn.Over != nil:
		return fmt.Errorf("window functions (%s(...) OVER (...)) not supported - PostgREST has no window-function equivalent; create a database VIEW instead", up)
	case fn.AggFilter != nil:
		return fmt.Errorf("%s(...) FILTER (WHERE ...) not supported - PostgREST aggregates cannot express a FILTER clause; create a database VIEW instead", up)
	case fn.AggWithinGroup:
		return fmt.Errorf("%s(...) WITHIN GROUP (...) not supported - PostgREST aggregates cannot express ordered-set aggregates; create a database VIEW instead", up)
	case fn.AggOrder != nil && len(fn.AggOrder.Items) > 0:
		return fmt.Errorf("%s(... ORDER BY ...) not supported - PostgREST aggregates cannot express ORDER BY within an aggregate; create a database VIEW instead", up)
	}
	return nil
}

// aggregateArgTarget converts one aggregate argument into the PostgREST target
// string (the part before ".sum()"), stripping any base-table qualifier.
// Supports plain columns, "*", JSON paths (data->>'k', with optional inline
// ::cast), and input casts (amount::numeric). Arithmetic and other computed
// expressions are rejected.
func (c *Converter) aggregateArgTarget(arg ast.Node) (string, error) {
	switch a := arg.(type) {
	case *ast.ColumnRef:
		return c.stripTablePrefix(c.extractColumnName(a)), nil
	case *ast.A_Star:
		return "*", nil
	case *ast.A_Expr:
		// JSON path; convertAExpr rejects non-JSON operators (arithmetic).
		jp, err := c.convertAExpr(a, "")
		if err != nil {
			return "", errUnsupportedAggregateArg
		}
		return jp, nil
	case *ast.TypeCast:
		return c.aggregateInputCast(a)
	case *ast.ParenExpr:
		// Unwrap redundant/explicit parentheses; never emit them (a leading
		// paren makes PostgREST silently return unaggregated rows).
		return c.aggregateArgTarget(a.Expr)
	default:
		return "", errUnsupportedAggregateArg
	}
}

// aggregateInputCast handles a cast applied to an aggregate's input column or
// JSON path, e.g. SUM(amount::numeric) -> "amount::numeric".
func (c *Converter) aggregateInputCast(tc *ast.TypeCast) (string, error) {
	typeName, err := c.extractTypeName(tc.TypeName)
	if err != nil {
		return "", err
	}
	base, err := c.aggregateArgTarget(tc.Arg)
	if err != nil {
		return "", err
	}
	if base == "*" {
		return "", errUnsupportedAggregateArg
	}
	return base + "::" + typeName, nil
}

// plainItem is one non-aggregated output column: its normalized column key
// (table prefix stripped) and its output alias, if any. Postgres lets GROUP BY
// reference either, so both are accepted when matching.
type plainItem struct {
	key   string
	alias string
}

// selectInfo summarizes the SELECT target list for GROUP BY validation.
type selectInfo struct {
	plainItems   []plainItem
	aggAliases   map[string]bool // aliases assigned to aggregate expressions
	hasAggregate bool
	hasStar      bool
}

func (p plainItem) matches(groupKey string) bool {
	return groupKey == p.key || (p.alias != "" && groupKey == p.alias)
}

// validateGroupBy checks that a SQL GROUP BY clause can be represented in
// PostgREST. PostgREST has no GROUP BY parameter: when an aggregate such as
// count() appears in select, it implicitly groups by every non-aggregated
// select column (requires PostgREST >= 12 with db-aggregates-enabled=true).
// Validation therefore ensures the SQL grouping matches what PostgREST will
// implicitly do, and rejects anything PostgREST cannot express.
func (c *Converter) validateGroupBy(stmt *ast.SelectStmt, joins map[string]joinInfo) error {
	if stmt.GroupDistinct {
		return fmt.Errorf("GROUP BY DISTINCT not supported - PostgREST has no equivalent")
	}

	hasRealJoins := false
	for _, j := range joins {
		if !j.isBase {
			hasRealJoins = true
			break
		}
	}

	groupKeys := make([]string, 0, len(stmt.GroupClause.Items))
	for _, item := range stmt.GroupClause.Items {
		key, err := c.groupByItemKey(item, stmt.TargetList, joins)
		if err != nil {
			return err
		}
		groupKeys = append(groupKeys, key)
	}

	sel, err := c.collectSelectInfo(stmt.TargetList, joins)
	if err != nil {
		return err
	}

	if !sel.hasAggregate {
		return fmt.Errorf("GROUP BY without an aggregate function is not supported - PostgREST cannot express SELECT DISTINCT semantics; add an aggregate (COUNT, SUM, AVG, MAX, MIN) or create a database VIEW")
	}

	if err := c.checkOrderByAggregates(stmt, sel); err != nil {
		return err
	}

	if hasRealJoins {
		// With JOINs the aggregation happens inside embedded resources, where
		// PostgREST groups per parent row. SQL's GROUP BY parent.id (including
		// functional-dependency forms like GROUP BY a.id with SELECT a.name)
		// matches that shape, so set equality against the select list does not
		// apply. groupByItemKey already rejected grouping on embedded-table
		// columns, which PostgREST cannot express.
		return nil
	}

	if sel.hasStar {
		return fmt.Errorf("GROUP BY with SELECT * is not supported - list the grouped columns explicitly so they map to PostgREST's select parameter")
	}

	// PostgREST groups by exactly the non-aggregated select columns, so the
	// GROUP BY set must equal that set for the conversion to be faithful.
	for _, g := range groupKeys {
		found := false
		for _, item := range sel.plainItems {
			if item.matches(g) {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("GROUP BY column %q must also appear in SELECT - PostgREST derives grouping from the selected columns", g)
		}
	}
	for _, item := range sel.plainItems {
		covered := false
		for _, g := range groupKeys {
			if item.matches(g) {
				covered = true
				break
			}
		}
		if !covered {
			return fmt.Errorf("SELECT column %q must also appear in GROUP BY - PostgREST groups by every non-aggregated column in select", item.key)
		}
	}

	return nil
}

// validateAggregateOrderBy rejects ORDER BY on an aggregate result even when no
// GROUP BY is present (e.g. SELECT COUNT(*) AS c FROM t ORDER BY c), which
// PostgREST cannot express. It is a no-op when the query has no aggregates.
func (c *Converter) validateAggregateOrderBy(stmt *ast.SelectStmt, joins map[string]joinInfo) error {
	if stmt.SortClause == nil {
		return nil
	}
	sel, err := c.collectSelectInfo(stmt.TargetList, joins)
	if err != nil {
		return err
	}
	if !sel.hasAggregate {
		return nil
	}
	return c.checkOrderByAggregates(stmt, sel)
}

// checkOrderByAggregates errors if any ORDER BY item references an aggregate's
// output alias. Unaliased aggregate expressions in ORDER BY are rejected earlier
// by the sort-clause converter (which only accepts plain column references).
func (c *Converter) checkOrderByAggregates(stmt *ast.SelectStmt, sel *selectInfo) error {
	if stmt.SortClause == nil {
		return nil
	}
	for _, item := range stmt.SortClause.Items {
		sortBy, ok := item.(*ast.SortBy)
		if !ok {
			continue
		}
		if colRef, ok := sortBy.Node.(*ast.ColumnRef); ok {
			name := c.stripTablePrefix(c.extractColumnName(colRef))
			if sel.aggAliases[name] {
				return fmt.Errorf("ORDER BY on aggregated column %q is not supported - PostgREST cannot order by aggregate results", name)
			}
		}
	}
	return nil
}

// groupByItemKey converts one GROUP BY item into a comparable key, rejecting
// forms PostgREST cannot express.
func (c *Converter) groupByItemKey(item ast.Node, targetList *ast.NodeList, joins map[string]joinInfo) (string, error) {
	switch v := item.(type) {
	case *ast.ColumnRef:
		name := c.extractColumnName(v)
		if name == "*" {
			return "", fmt.Errorf("GROUP BY * is not valid")
		}
		return c.resolveGroupColumn(name, joins)

	case *ast.A_Const:
		// Ordinal reference: GROUP BY 1
		intVal, ok := v.Val.(*ast.Integer)
		if !ok {
			return "", fmt.Errorf("GROUP BY expressions are not supported - group by the selected column names")
		}
		idx := intVal.IVal
		if targetList == nil || idx < 1 || idx > len(targetList.Items) {
			return "", fmt.Errorf("GROUP BY ordinal %d is out of range", idx)
		}
		resTarget, ok := targetList.Items[idx-1].(*ast.ResTarget)
		if !ok || resTarget.Val == nil {
			return "", fmt.Errorf("GROUP BY ordinal %d does not refer to a column", idx)
		}
		switch target := resTarget.Val.(type) {
		case *ast.ColumnRef:
			name := c.extractColumnName(target)
			if name == "*" {
				return "", fmt.Errorf("GROUP BY ordinal %d refers to *, not a column", idx)
			}
			return c.resolveGroupColumn(name, joins)
		case *ast.TypeCast:
			// GROUP BY 1 pointing at a cast (SELECT status::text ... GROUP BY 1)
			// groups by the underlying column, matching the named form.
			if colRef, ok := target.Arg.(*ast.ColumnRef); ok {
				return c.resolveGroupColumn(c.extractColumnName(colRef), joins)
			}
		case *ast.A_Expr:
			if key, err := c.convertJSONPath(target, ""); err == nil {
				return key, nil
			}
		}
		return "", fmt.Errorf("GROUP BY ordinal %d must refer to a plain column, not an expression or aggregate", idx)

	case *ast.A_Expr:
		// JSON path expressions (data->>'key') are selectable columns in
		// PostgREST and therefore valid implicit grouping columns.
		key, err := c.convertJSONPath(v, "")
		if err != nil {
			return "", fmt.Errorf("GROUP BY expressions are not supported - group by the selected column names")
		}
		return key, nil

	case *ast.GroupingSet:
		return "", fmt.Errorf("GROUP BY ROLLUP/CUBE/GROUPING SETS not supported - PostgREST has no equivalent; create a database VIEW instead")

	default:
		return "", fmt.Errorf("GROUP BY expressions are not supported - group by the selected column names")
	}
}

// resolveGroupColumn strips a base-table qualifier and rejects grouping on
// joined-table columns, which PostgREST embedded aggregation cannot express.
func (c *Converter) resolveGroupColumn(name string, joins map[string]joinInfo) (string, error) {
	parts := strings.SplitN(name, ".", 2)
	if len(parts) != 2 {
		return name, nil
	}
	if ji, ok := joins[parts[0]]; ok && !ji.isBase {
		return "", fmt.Errorf("GROUP BY on joined-table column %q is not supported - PostgREST embedded aggregates group per parent row automatically", name)
	}
	return parts[1], nil
}

// collectSelectInfo walks the target list, classifying items for GROUP BY
// validation.
func (c *Converter) collectSelectInfo(targetList *ast.NodeList, joins map[string]joinInfo) (*selectInfo, error) {
	info := &selectInfo{aggAliases: make(map[string]bool)}
	if targetList == nil {
		return info, nil
	}

	for _, item := range targetList.Items {
		resTarget, ok := item.(*ast.ResTarget)
		if !ok || resTarget.Val == nil {
			continue
		}

		switch val := resTarget.Val.(type) {
		case *ast.ColumnRef:
			key := c.selectColumnKey(c.extractColumnName(val), joins)
			if key == "*" {
				info.hasStar = true
				continue
			}
			info.plainItems = append(info.plainItems, plainItem{key: key, alias: resTarget.Name})

		case *ast.A_Star:
			info.hasStar = true

		case *ast.FuncCall:
			if val.Funcname != nil && len(val.Funcname.Items) > 0 {
				if fn, ok := val.Funcname.Items[len(val.Funcname.Items)-1].(*ast.String); ok {
					if supportedAggregates[strings.ToLower(fn.SVal)] {
						info.hasAggregate = true
						if resTarget.Name != "" {
							info.aggAliases[resTarget.Name] = true
						}
					}
				}
			}

		case *ast.TypeCast:
			// SELECT status::text ... GROUP BY status - Postgres allows
			// expressions over grouped columns, so match on the underlying
			// column name.
			if colRef, ok := val.Arg.(*ast.ColumnRef); ok {
				info.plainItems = append(info.plainItems, plainItem{key: c.selectColumnKey(c.extractColumnName(colRef), joins), alias: resTarget.Name})
			}

		case *ast.A_Expr:
			if key, err := c.convertJSONPath(val, ""); err == nil {
				info.plainItems = append(info.plainItems, plainItem{key: key, alias: resTarget.Name})
			}
		}
	}

	return info, nil
}

// selectColumnKey normalizes a select-list column for comparison with GROUP BY
// keys. Columns on joined tables are excluded from grouping comparison (they
// live inside embedded resources), signalled by keeping their qualified name.
func (c *Converter) selectColumnKey(name string, joins map[string]joinInfo) string {
	parts := strings.SplitN(name, ".", 2)
	if len(parts) != 2 {
		return name
	}
	if ji, ok := joins[parts[0]]; ok && !ji.isBase {
		return name
	}
	return parts[1]
}
