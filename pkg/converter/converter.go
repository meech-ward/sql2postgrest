package converter

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/multigres/multigres/go/parser"
	"github.com/multigres/multigres/go/parser/ast"
)

type ConversionResult struct {
	Method      string
	Path        string
	QueryParams url.Values
	Body        string
	Headers     map[string]string
}

type Converter struct {
	baseURL string
}

func NewConverter(baseURL string) *Converter {
	return &Converter{
		baseURL: strings.TrimSuffix(baseURL, "/"),
	}
}

func (c *Converter) Convert(sql string) (*ConversionResult, error) {
	stmts, err := parser.ParseSQL(sql)
	if err != nil {
		return nil, fmt.Errorf("failed to parse SQL: %w", err)
	}

	if len(stmts) == 0 {
		return nil, fmt.Errorf("no statements found in SQL")
	}

	if len(stmts) > 1 {
		return nil, fmt.Errorf("multiple statements not supported (found %d)", len(stmts))
	}

	stmt := stmts[0]

	switch s := stmt.(type) {
	case *ast.SelectStmt:
		return c.convertSelect(s)
	case *ast.InsertStmt:
		return c.convertInsert(s)
	case *ast.UpdateStmt:
		return c.convertUpdate(s)
	case *ast.DeleteStmt:
		return c.convertDelete(s)
	default:
		return nil, fmt.Errorf("unsupported statement type: %T", stmt)
	}
}

func (c *Converter) URL(result *ConversionResult) string {
	urlStr := c.baseURL + result.Path
	if len(result.QueryParams) > 0 {
		urlStr += "?" + result.QueryParams.Encode()
	}
	return urlStr
}
