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

func (c *Converter) addWhereClause(result *ConversionResult, whereClause ast.Node) error {
	switch expr := whereClause.(type) {
	case *ast.A_Expr:
		return c.addSimpleCondition(result, expr)
	case *ast.BoolExpr:
		return c.addBoolExpr(result, expr)
	case *ast.NullTest:
		return c.addNullTest(result, expr)
	default:
		return fmt.Errorf("unsupported WHERE clause type: %T", whereClause)
	}
}

func (c *Converter) addSimpleCondition(result *ConversionResult, expr *ast.A_Expr) error {
	switch expr.Kind {
	case ast.AEXPR_IN:
		return c.addInCondition(result, expr)
	case ast.AEXPR_BETWEEN:
		return c.addBetweenCondition(result, expr, false)
	case ast.AEXPR_NOT_BETWEEN:
		return c.addBetweenCondition(result, expr, true)
	case ast.AEXPR_LIKE:
		return c.addLikeCondition(result, expr, false, false)
	case ast.AEXPR_ILIKE:
		return c.addLikeCondition(result, expr, true, false)
	case ast.AEXPR_OP:
		return c.addOperatorCondition(result, expr)
	default:
		return fmt.Errorf("unsupported A_Expr kind: %d", expr.Kind)
	}
}

func (c *Converter) addOperatorCondition(result *ConversionResult, expr *ast.A_Expr) error {
	if expr.Name == nil || len(expr.Name.Items) == 0 {
		return fmt.Errorf("operator name is empty")
	}

	opNode, ok := expr.Name.Items[0].(*ast.String)
	if !ok {
		return fmt.Errorf("invalid operator type")
	}

	operator := opNode.SVal

	colRef, ok := expr.Lexpr.(*ast.ColumnRef)
	if !ok {
		return fmt.Errorf("left side of operator must be a column reference")
	}

	colName := c.extractColumnName(colRef)

	rightValue, err := c.extractWhereValue(expr.Rexpr)
	if err != nil {
		return fmt.Errorf("failed to extract right value: %w", err)
	}

	postgrestOp, err := c.mapOperator(operator, rightValue)
	if err != nil {
		return err
	}

	result.QueryParams.Add(colName, postgrestOp)

	return nil
}

func (c *Converter) addInCondition(result *ConversionResult, expr *ast.A_Expr) error {
	colRef, ok := expr.Lexpr.(*ast.ColumnRef)
	if !ok {
		return fmt.Errorf("IN: left side must be a column reference")
	}

	colName := c.extractColumnName(colRef)

	listNode, ok := expr.Rexpr.(*ast.NodeList)
	if !ok {
		return fmt.Errorf("IN: right side must be a list")
	}

	var values []string
	for _, item := range listNode.Items {
		val, err := c.extractWhereValue(item)
		if err != nil {
			return fmt.Errorf("IN: failed to extract value: %w", err)
		}
		values = append(values, val)
	}

	if len(values) == 0 {
		return fmt.Errorf("IN: empty value list")
	}

	result.QueryParams.Add(colName, "in.("+strings.Join(values, ",")+")")
	return nil
}

func (c *Converter) addBetweenCondition(result *ConversionResult, expr *ast.A_Expr, negate bool) error {
	colRef, ok := expr.Lexpr.(*ast.ColumnRef)
	if !ok {
		return fmt.Errorf("BETWEEN: left side must be a column reference")
	}

	colName := c.extractColumnName(colRef)

	listNode, ok := expr.Rexpr.(*ast.NodeList)
	if !ok || len(listNode.Items) != 2 {
		return fmt.Errorf("BETWEEN: right side must have exactly 2 values")
	}

	minVal, err := c.extractWhereValue(listNode.Items[0])
	if err != nil {
		return fmt.Errorf("BETWEEN: failed to extract min value: %w", err)
	}

	maxVal, err := c.extractWhereValue(listNode.Items[1])
	if err != nil {
		return fmt.Errorf("BETWEEN: failed to extract max value: %w", err)
	}

	if negate {
		result.QueryParams.Add(colName, fmt.Sprintf("not.and(gte.%s,lte.%s)", minVal, maxVal))
	} else {
		result.QueryParams.Add(colName, fmt.Sprintf("gte.%s", minVal))
		result.QueryParams.Add(colName, fmt.Sprintf("lte.%s", maxVal))
	}

	return nil
}

func (c *Converter) addLikeCondition(result *ConversionResult, expr *ast.A_Expr, caseInsensitive bool, negate bool) error {
	colRef, ok := expr.Lexpr.(*ast.ColumnRef)
	if !ok {
		return fmt.Errorf("LIKE: left side must be a column reference")
	}

	colName := c.extractColumnName(colRef)

	pattern, err := c.extractWhereValue(expr.Rexpr)
	if err != nil {
		return fmt.Errorf("LIKE: failed to extract pattern: %w", err)
	}

	pattern = c.convertLikePattern(pattern)

	var op string
	if caseInsensitive {
		if negate {
			op = "not.ilike"
		} else {
			op = "ilike"
		}
	} else {
		if negate {
			op = "not.like"
		} else {
			op = "like"
		}
	}

	result.QueryParams.Add(colName, op+"."+pattern)
	return nil
}

func (c *Converter) convertLikePattern(pattern string) string {
	pattern = strings.ReplaceAll(pattern, "%", "*")
	return pattern
}

func (c *Converter) addBoolExpr(result *ConversionResult, expr *ast.BoolExpr) error {
	switch expr.Boolop {
	case ast.AND_EXPR:
		for _, arg := range expr.Args.Items {
			if err := c.addWhereClause(result, arg); err != nil {
				return err
			}
		}
		return nil

	case ast.OR_EXPR:
		orParts := []string{}
		for _, arg := range expr.Args.Items {
			part, err := c.extractOrCondition(arg)
			if err != nil {
				return fmt.Errorf("OR clause too complex: %w", err)
			}
			orParts = append(orParts, part)
		}
		result.QueryParams.Add("or", "("+strings.Join(orParts, ",")+")")
		return nil

	case ast.NOT_EXPR:
		return fmt.Errorf("NOT expressions not yet supported")

	default:
		return fmt.Errorf("unsupported boolean operation: %v", expr.Boolop)
	}
}

func (c *Converter) extractOrCondition(node ast.Node) (string, error) {
	switch expr := node.(type) {
	case *ast.A_Expr:
		if expr.Name == nil || len(expr.Name.Items) == 0 {
			return "", fmt.Errorf("operator name is empty")
		}

		opNode, ok := expr.Name.Items[0].(*ast.String)
		if !ok {
			return "", fmt.Errorf("invalid operator type")
		}

		operator := opNode.SVal

		colRef, ok := expr.Lexpr.(*ast.ColumnRef)
		if !ok {
			return "", fmt.Errorf("left side must be a column reference")
		}

		colName := c.extractColumnName(colRef)

		rightValue, err := c.extractWhereValue(expr.Rexpr)
		if err != nil {
			return "", err
		}

		postgrestOp, err := c.mapOperator(operator, rightValue)
		if err != nil {
			return "", err
		}

		return colName + "." + postgrestOp, nil

	default:
		return "", fmt.Errorf("unsupported OR condition type: %T", node)
	}
}

func (c *Converter) addNullTest(result *ConversionResult, expr *ast.NullTest) error {
	colRef, ok := expr.Arg.(*ast.ColumnRef)
	if !ok {
		return fmt.Errorf("NULL test argument must be a column reference")
	}

	colName := c.extractColumnName(colRef)

	if expr.Nulltesttype == ast.IS_NULL {
		result.QueryParams.Add(colName, "is.null")
	} else if expr.Nulltesttype == ast.IS_NOT_NULL {
		result.QueryParams.Add(colName, "not.is.null")
	} else {
		return fmt.Errorf("unsupported NULL test type: %v", expr.Nulltesttype)
	}

	return nil
}

func (c *Converter) mapOperator(sqlOp string, value string) (string, error) {
	switch sqlOp {
	case "=":
		return "eq." + value, nil
	case "<>", "!=":
		return "neq." + value, nil
	case ">":
		return "gt." + value, nil
	case ">=":
		return "gte." + value, nil
	case "<":
		return "lt." + value, nil
	case "<=":
		return "lte." + value, nil
	case "~~":
		return "like." + value, nil
	case "~~*":
		return "ilike." + value, nil
	case "!~~":
		return "not.like." + value, nil
	case "!~~*":
		return "not.ilike." + value, nil
	default:
		return "", fmt.Errorf("unsupported operator: %s", sqlOp)
	}
}

func (c *Converter) extractWhereValue(node ast.Node) (string, error) {
	switch val := node.(type) {
	case *ast.A_Const:
		return c.extractConstValue(val)
	case *ast.ColumnRef:
		return c.extractColumnName(val), nil
	case *ast.A_Expr:
		if val.Name != nil && len(val.Name.Items) > 0 {
			if opNode, ok := val.Name.Items[0].(*ast.String); ok && opNode.SVal == "-" {
				if rightVal, err := c.extractWhereValue(val.Rexpr); err == nil {
					return "-" + rightVal, nil
				}
			}
		}
		return "", fmt.Errorf("complex expressions in WHERE not supported")
	default:
		return "", fmt.Errorf("unsupported value type in WHERE: %T", node)
	}
}

func (c *Converter) extractConstValue(aConst *ast.A_Const) (string, error) {
	if aConst.Val == nil {
		return "null", nil
	}

	switch v := aConst.Val.(type) {
	case *ast.Integer:
		return fmt.Sprintf("%d", v.IVal), nil
	case *ast.Float:
		return v.FVal, nil
	case *ast.String:
		return v.SVal, nil
	case *ast.BitString:
		return v.BSVal, nil
	case *ast.Boolean:
		if v.BoolVal {
			return "true", nil
		}
		return "false", nil
	case *ast.Null:
		return "null", nil
	default:
		return "", fmt.Errorf("unsupported const type: %T", aConst.Val)
	}
}
