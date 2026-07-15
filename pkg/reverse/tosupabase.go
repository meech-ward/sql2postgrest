package reverse

import (
	"encoding/json"
	"fmt"
	"strings"
)

// SupabaseJSResult holds generated supabase-js client code.
type SupabaseJSResult struct {
	Code     string
	Warnings []string
}

// ConvertToSupabaseJS parses a PostgREST request and renders the equivalent
// supabase-js client code, e.g. supabase.from('t').select('*').eq('id', 1).
func ConvertToSupabaseJS(method, path, query, body string, headers map[string]string) (*SupabaseJSResult, error) {
	req, err := ParsePostgRESTRequest(method, path, query, []byte(body))
	if err != nil {
		return nil, err
	}
	if headers != nil {
		req.Headers = headers
	}
	return BuildSupabaseJS(req)
}

// BuildSupabaseJS renders supabase-js code from a parsed PostgREST request.
func BuildSupabaseJS(req *PostgRESTRequest) (*SupabaseJSResult, error) {
	warnings := []string{}

	var b strings.Builder
	b.WriteString("supabase.from(")
	b.WriteString(jsString(req.Table))
	b.WriteString(")")

	switch strings.ToUpper(req.Method) {
	case "GET", "":
		sel := "*"
		if len(req.Select) > 0 {
			sel = strings.Join(req.Select, ", ")
		}
		if count := preferCount(req.Headers); count != "" {
			b.WriteString(fmt.Sprintf(".select(%s, { count: %s })", jsString(sel), jsString(count)))
		} else {
			b.WriteString(fmt.Sprintf(".select(%s)", jsString(sel)))
		}
		writeFilters(&b, req.Filters)
		writeOrder(&b, req.Order)
		writeLimitOffset(&b, req.Limit, req.Offset, &warnings)

	case "POST":
		data := bodyToJS(req.Body)
		if req.OnConflict != nil && *req.OnConflict != "" {
			b.WriteString(fmt.Sprintf(".upsert(%s, { onConflict: %s })", data, jsString(*req.OnConflict)))
		} else {
			b.WriteString(fmt.Sprintf(".insert(%s)", data))
		}
		if returnsRepresentation(req.Headers) {
			b.WriteString(".select()")
		}

	case "PATCH":
		b.WriteString(fmt.Sprintf(".update(%s)", bodyToJS(req.Body)))
		writeFilters(&b, req.Filters)
		if len(req.Filters) == 0 {
			warnings = append(warnings, "UPDATE without any filter — this matches every row")
		}

	case "DELETE":
		b.WriteString(".delete()")
		writeFilters(&b, req.Filters)
		if len(req.Filters) == 0 {
			warnings = append(warnings, "DELETE without any filter — this matches every row")
		}

	default:
		return nil, NewUnsupportedError("ERR_UNSUPPORTED_METHOD", "unsupported method: "+req.Method, req.Method, "use GET, POST, PATCH, or DELETE")
	}

	if wantsSingleObject(req.Headers) {
		b.WriteString(".single()")
	}

	return &SupabaseJSResult{Code: b.String(), Warnings: warnings}, nil
}

func writeFilters(b *strings.Builder, filters []Filter) {
	for _, f := range filters {
		b.WriteString(filterToJS(f))
	}
}

// filterToJS maps a single PostgREST filter to a supabase-js chained method.
// Negated filters use the generic .not(column, operator, value) form.
func filterToJS(f Filter) string {
	col := jsString(f.Column)
	val := toStringValue(f.Value)

	if f.Negated {
		return fmt.Sprintf(".not(%s, %s, %s)", col, jsString(f.Operator), notValue(f.Operator, val))
	}

	switch f.Operator {
	case "eq", "neq", "gt", "gte", "lt", "lte":
		return fmt.Sprintf(".%s(%s, %s)", f.Operator, col, jsScalar(val))
	case "like", "ilike":
		return fmt.Sprintf(".%s(%s, %s)", f.Operator, col, jsString(strings.ReplaceAll(val, "*", "%")))
	case "is":
		return fmt.Sprintf(".is(%s, %s)", col, jsIsValue(val))
	case "in":
		return fmt.Sprintf(".in(%s, %s)", col, jsArray(val))
	case "cs":
		return fmt.Sprintf(".contains(%s, %s)", col, jsContainer(val))
	case "cd":
		return fmt.Sprintf(".containedBy(%s, %s)", col, jsContainer(val))
	case "ov":
		return fmt.Sprintf(".overlaps(%s, %s)", col, jsContainer(val))
	default:
		// Escape hatch: supabase-js .filter(column, operator, value)
		return fmt.Sprintf(".filter(%s, %s, %s)", col, jsString(f.Operator), jsScalar(val))
	}
}

func notValue(op, val string) string {
	switch op {
	case "in":
		return jsArray(val)
	case "is":
		return jsIsValue(val)
	case "like", "ilike":
		return jsString(strings.ReplaceAll(val, "*", "%"))
	default:
		return jsScalar(val)
	}
}

func writeOrder(b *strings.Builder, order []OrderBy) {
	for _, o := range order {
		opts := []string{}
		if o.Descending {
			opts = append(opts, "ascending: false")
		}
		if o.NullsFirst {
			opts = append(opts, "nullsFirst: true")
		}
		if o.NullsLast {
			opts = append(opts, "nullsFirst: false")
		}
		if len(opts) > 0 {
			b.WriteString(fmt.Sprintf(".order(%s, { %s })", jsString(o.Column), strings.Join(opts, ", ")))
		} else {
			b.WriteString(fmt.Sprintf(".order(%s)", jsString(o.Column)))
		}
	}
}

func writeLimitOffset(b *strings.Builder, limit, offset *int, warnings *[]string) {
	switch {
	case limit != nil && offset != nil:
		b.WriteString(fmt.Sprintf(".range(%d, %d)", *offset, *offset+*limit-1))
	case limit != nil:
		b.WriteString(fmt.Sprintf(".limit(%d)", *limit))
	case offset != nil:
		b.WriteString(fmt.Sprintf(".range(%d, %d)", *offset, *offset+999))
		*warnings = append(*warnings, "OFFSET without LIMIT approximated as .range(offset, offset+999)")
	}
}

// --- value formatting helpers ---

func jsString(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "'", "\\'")
	s = strings.ReplaceAll(s, "\n", "\\n")
	return "'" + s + "'"
}

func toStringValue(v interface{}) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	default:
		return fmt.Sprintf("%v", t)
	}
}

// jsScalar renders a scalar as number/bool/null, otherwise a quoted string.
func jsScalar(v string) string {
	if v == "" {
		return "''"
	}
	switch strings.ToLower(v) {
	case "null":
		return "null"
	case "true":
		return "true"
	case "false":
		return "false"
	}
	if isNumeric(v) {
		return v
	}
	return jsString(v)
}

func jsIsValue(v string) string {
	switch strings.ToLower(v) {
	case "null", "":
		return "null"
	case "true":
		return "true"
	case "false":
		return "false"
	}
	return jsString(v)
}

// jsArray turns a PostgREST in-list "(a,b,c)" into a JS array literal.
func jsArray(v string) string {
	v = strings.TrimSpace(v)
	v = strings.TrimPrefix(v, "(")
	v = strings.TrimSuffix(v, ")")
	if v == "" {
		return "[]"
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		out = append(out, jsScalar(strings.TrimSpace(p)))
	}
	return "[" + strings.Join(out, ", ") + "]"
}

// jsContainer handles cs/cd/ov values: Postgres array literal, JSON, or scalar.
func jsContainer(v string) string {
	v = strings.TrimSpace(v)
	if strings.HasPrefix(v, "{") && strings.HasSuffix(v, "}") && !strings.Contains(v, ":") {
		inner := strings.TrimSuffix(strings.TrimPrefix(v, "{"), "}")
		if inner == "" {
			return "[]"
		}
		parts := strings.Split(inner, ",")
		out := make([]string, 0, len(parts))
		for _, p := range parts {
			out = append(out, jsScalar(strings.TrimSpace(p)))
		}
		return "[" + strings.Join(out, ", ") + "]"
	}
	if strings.HasPrefix(v, "[") || strings.HasPrefix(v, "{") {
		return v // already JSON-shaped, valid JS
	}
	return jsScalar(v)
}

func bodyToJS(body interface{}) string {
	if body == nil {
		return "{}"
	}
	bytes, err := json.Marshal(body)
	if err != nil {
		return "{}"
	}
	return string(bytes)
}

func isNumeric(v string) bool {
	if v == "" {
		return false
	}
	dot := false
	hasDigit := false
	for i := 0; i < len(v); i++ {
		c := v[i]
		if i == 0 && (c == '-' || c == '+') {
			continue
		}
		if c == '.' {
			if dot {
				return false
			}
			dot = true
			continue
		}
		if c < '0' || c > '9' {
			return false
		}
		hasDigit = true
	}
	return hasDigit
}

func preferCount(headers map[string]string) string {
	for k, val := range headers {
		if strings.EqualFold(k, "Prefer") {
			for _, part := range strings.Split(val, ",") {
				part = strings.TrimSpace(part)
				if strings.HasPrefix(strings.ToLower(part), "count=") {
					return part[len("count="):]
				}
			}
		}
	}
	return ""
}

func returnsRepresentation(headers map[string]string) bool {
	for k, val := range headers {
		if strings.EqualFold(k, "Prefer") && strings.Contains(strings.ToLower(val), "return=representation") {
			return true
		}
	}
	return false
}

func wantsSingleObject(headers map[string]string) bool {
	for k, val := range headers {
		if strings.EqualFold(k, "Accept") && strings.Contains(val, "vnd.pgrst.object+json") {
			return true
		}
	}
	return false
}
