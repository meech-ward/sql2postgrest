package supabase

import (
	"encoding/json"
	"net/url"
	"strings"
	"testing"
)

// Helper to parse and compare query strings
func queryParamsEqual(t *testing.T, got, want string) bool {
	t.Helper()

	gotParams, err := url.ParseQuery(got)
	if err != nil {
		t.Fatalf("Failed to parse got query: %v", err)
	}

	wantParams, err := url.ParseQuery(want)
	if err != nil {
		t.Fatalf("Failed to parse want query: %v", err)
	}

	// Check all want params are present in got
	for key, wantVals := range wantParams {
		gotVals, ok := gotParams[key]
		if !ok {
			t.Errorf("Missing query param %q", key)
			return false
		}

		// For each want value, check if it exists in got
		for _, wantVal := range wantVals {
			found := false
			for _, gotVal := range gotVals {
				if gotVal == wantVal {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("Query param %q missing value %q (got: %v)", key, wantVal, gotVals)
				return false
			}
		}
	}

	return true
}

func TestConverter_SimpleSelect(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	tests := []struct {
		name     string
		input    string
		wantPath string
		wantQuery string
		wantMethod string
	}{
		{
			name:      "select all",
			input:     "supabase.from('users').select('*')",
			wantPath:  "/users",
			wantQuery: "select=*",
			wantMethod: "GET",
		},
		{
			name:      "select specific columns",
			input:     "supabase.from('users').select('id,name,email')",
			wantPath:  "/users",
			wantQuery: "select=id,name,email",
			wantMethod: "GET",
		},
		{
			name:      "select with spaces",
			input:     "supabase.from('users').select('id, name, email')",
			wantPath:  "/users",
			wantQuery: "select=id,name,email",
			wantMethod: "GET",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := c.Convert(tt.input)
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			if result.Method != tt.wantMethod {
				t.Errorf("Method = %v, want %v", result.Method, tt.wantMethod)
			}

			if result.Path != tt.wantPath {
				t.Errorf("Path = %v, want %v", result.Path, tt.wantPath)
			}

			if !queryParamsEqual(t, result.Query, tt.wantQuery) {
				t.Errorf("Query params don't match: got %v, want %v", result.Query, tt.wantQuery)
			}
		})
	}
}

func TestConverter_Filters(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	tests := []struct {
		name      string
		input     string
		wantQuery string
	}{
		{
			name:      "eq filter",
			input:     "supabase.from('users').select('*').eq('age', 18)",
			wantQuery: "select=*&age=eq.18",
		},
		{
			name:      "neq filter",
			input:     "supabase.from('users').select('*').neq('status', 'inactive')",
			wantQuery: "select=*&status=neq.inactive",
		},
		{
			name:      "gt filter",
			input:     "supabase.from('users').select('*').gt('age', 21)",
			wantQuery: "select=*&age=gt.21",
		},
		{
			name:      "gte filter",
			input:     "supabase.from('posts').select('*').gte('views', 100)",
			wantQuery: "select=*&views=gte.100",
		},
		{
			name:      "lt filter",
			input:     "supabase.from('users').select('*').lt('age', 65)",
			wantQuery: "select=*&age=lt.65",
		},
		{
			name:      "lte filter",
			input:     "supabase.from('users').select('*').lte('age', 30)",
			wantQuery: "select=*&age=lte.30",
		},
		{
			name:      "like filter",
			input:     "supabase.from('users').select('*').like('name', '%john%')",
			wantQuery: "select=*&name=like.%25john%25",
		},
		{
			name:      "ilike filter",
			input:     "supabase.from('users').select('*').ilike('email', '%@gmail.com')",
			wantQuery: "select=*&email=ilike.%25%40gmail.com",
		},
		{
			name:      "is null",
			input:     "supabase.from('users').select('*').is('deleted_at', null)",
			wantQuery: "select=*&deleted_at=is.null",
		},
		{
			name:      "in filter",
			input:     "supabase.from('users').select('*').in('status', ['active', 'pending'])",
			wantQuery: "select=*&status=in.('active','pending')",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := c.Convert(tt.input)
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			if !queryParamsEqual(t, result.Query, tt.wantQuery) {
				t.Errorf("Query params don't match: got %v, want %v", result.Query, tt.wantQuery)
			}
		})
	}
}

func TestConverter_MultipleFilters(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	input := "supabase.from('users').select('*').eq('status', 'active').gte('age', 18).lt('age', 65)"
	result, err := c.Convert(input)
	if err != nil {
		t.Fatalf("Convert() error = %v", err)
	}

	// Check that all filters are present
	query := result.Query
	if !strings.Contains(query, "status=eq.active") {
		t.Errorf("Query missing status filter: %v", query)
	}
	if !strings.Contains(query, "age=gte.18") {
		t.Errorf("Query missing gte filter: %v", query)
	}
	if !strings.Contains(query, "age=lt.65") {
		t.Errorf("Query missing lt filter: %v", query)
	}
}

func TestConverter_Order(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	tests := []struct {
		name      string
		input     string
		wantQuery string
	}{
		{
			name:      "order ascending",
			input:     "supabase.from('users').select('*').order('created_at')",
			wantQuery: "select=*&order=created_at.asc",
		},
		{
			name:      "order descending",
			input:     "supabase.from('users').select('*').order('created_at', {ascending: false})",
			wantQuery: "select=*&order=created_at.desc",
		},
		{
			name:      "order with nulls first",
			input:     "supabase.from('users').select('*').order('name', {nullsFirst: true})",
			wantQuery: "select=*&order=name.asc.nullsfirst",
		},
		{
			name:      "multiple orders",
			input:     "supabase.from('users').select('*').order('status').order('created_at', {ascending: false})",
			wantQuery: "select=*&order=status.asc&order=created_at.desc",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := c.Convert(tt.input)
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			if !queryParamsEqual(t, result.Query, tt.wantQuery) {
				t.Errorf("Query params don't match: got %v, want %v", result.Query, tt.wantQuery)
			}
		})
	}
}

func TestConverter_LimitAndRange(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	tests := []struct {
		name        string
		input       string
		wantQuery   string
		wantHeaders map[string]string
	}{
		{
			name:      "limit",
			input:     "supabase.from('users').select('*').limit(10)",
			wantQuery: "select=*&limit=10",
		},
		{
			name:        "range",
			input:       "supabase.from('users').select('*').range(0, 9)",
			wantQuery:   "select=*",
			wantHeaders: map[string]string{"Range": "0-9"},
		},
		{
			name:        "range with limit",
			input:       "supabase.from('users').select('*').range(10, 19).limit(5)",
			wantQuery:   "select=*&limit=5",
			wantHeaders: map[string]string{"Range": "10-19"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := c.Convert(tt.input)
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			if !queryParamsEqual(t, result.Query, tt.wantQuery) {
				t.Errorf("Query params don't match: got %v, want %v", result.Query, tt.wantQuery)
			}

			if tt.wantHeaders != nil {
				for key, want := range tt.wantHeaders {
					if got := result.Headers[key]; got != want {
						t.Errorf("Header %v = %v, want %v", key, got, want)
					}
				}
			}
		})
	}
}

func TestConverter_SingleAndMaybeSingle(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	tests := []struct {
		name        string
		input       string
		wantHeaders map[string]string
	}{
		{
			name:        "single",
			input:       "supabase.from('users').select('*').eq('id', 1).single()",
			wantHeaders: map[string]string{"Accept": "application/vnd.pgrst.object+json"},
		},
		{
			name: "maybeSingle",
			input: "supabase.from('users').select('*').eq('id', 1).maybeSingle()",
			wantHeaders: map[string]string{
				"Accept": "application/vnd.pgrst.object+json",
				"Prefer": "return=representation",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := c.Convert(tt.input)
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			for key, want := range tt.wantHeaders {
				if got := result.Headers[key]; got != want {
					t.Errorf("Header %v = %v, want %v", key, got, want)
				}
			}
		})
	}
}

func TestConverter_Insert(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	tests := []struct {
		name       string
		input      string
		wantMethod string
		wantBody   string
	}{
		{
			name:       "insert single",
			input:      `supabase.from('users').insert({name: 'John', age: 30})`,
			wantMethod: "POST",
			wantBody:   `{"age":30,"name":"John"}`,
		},
		{
			name:       "insert multiple",
			input:      `supabase.from('users').insert([{name: 'John'}, {name: 'Jane'}])`,
			wantMethod: "POST",
			wantBody:   `[{"name":"John"},{"name":"Jane"}]`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := c.Convert(tt.input)
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			if result.Method != tt.wantMethod {
				t.Errorf("Method = %v, want %v", result.Method, tt.wantMethod)
			}

			// Normalize JSON for comparison
			var gotJSON, wantJSON interface{}
			if err := json.Unmarshal([]byte(result.Body), &gotJSON); err != nil {
				t.Fatalf("Failed to parse result body: %v", err)
			}
			if err := json.Unmarshal([]byte(tt.wantBody), &wantJSON); err != nil {
				t.Fatalf("Failed to parse expected body: %v", err)
			}

			gotBytes, _ := json.Marshal(gotJSON)
			wantBytes, _ := json.Marshal(wantJSON)

			if string(gotBytes) != string(wantBytes) {
				t.Errorf("Body = %v, want %v", string(gotBytes), string(wantBytes))
			}
		})
	}
}

func TestConverter_Upsert(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	input := `supabase.from('users').upsert({id: 1, name: 'John'})`
	result, err := c.Convert(input)
	if err != nil {
		t.Fatalf("Convert() error = %v", err)
	}

	if result.Method != "POST" {
		t.Errorf("Method = %v, want POST", result.Method)
	}

	if !strings.Contains(result.Headers["Prefer"], "resolution") || !strings.Contains(result.Headers["Prefer"], "merge-duplicates") {
		t.Errorf("Prefer header should contain resolution for upsert, got: %v", result.Headers["Prefer"])
	}
}

func TestConverter_Update(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	input := `supabase.from('users').update({status: 'active'}).eq('id', 123)`
	result, err := c.Convert(input)
	if err != nil {
		t.Fatalf("Convert() error = %v", err)
	}

	if result.Method != "PATCH" {
		t.Errorf("Method = %v, want PATCH", result.Method)
	}

	if !strings.Contains(result.Body, `"status":"active"`) {
		t.Errorf("Body should contain status field: %v", result.Body)
	}

	if !strings.Contains(result.Query, "id=eq.123") {
		t.Errorf("Query should contain filter: %v", result.Query)
	}
}

func TestConverter_Delete(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	input := `supabase.from('users').delete().eq('id', 999)`
	result, err := c.Convert(input)
	if err != nil {
		t.Fatalf("Convert() error = %v", err)
	}

	if result.Method != "DELETE" {
		t.Errorf("Method = %v, want DELETE", result.Method)
	}

	if !strings.Contains(result.Query, "id=eq.999") {
		t.Errorf("Query should contain filter: %v", result.Query)
	}
}

func TestConverter_RPC(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	tests := []struct {
		name     string
		input    string
		wantPath string
		wantBody string
	}{
		{
			name:     "rpc without params",
			input:    `supabase.rpc('hello_world')`,
			wantPath: "/rpc/hello_world",
			wantBody: "",
		},
		{
			name:     "rpc with params",
			input:    `supabase.rpc('add_numbers', {a: 5, b: 3})`,
			wantPath: "/rpc/add_numbers",
			wantBody: `{"a":5,"b":3}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := c.Convert(tt.input)
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			if result.Method != "POST" {
				t.Errorf("Method = %v, want POST", result.Method)
			}

			if result.Path != tt.wantPath {
				t.Errorf("Path = %v, want %v", result.Path, tt.wantPath)
			}

			if tt.wantBody != "" {
				var gotJSON, wantJSON interface{}
				json.Unmarshal([]byte(result.Body), &gotJSON)
				json.Unmarshal([]byte(tt.wantBody), &wantJSON)

				gotBytes, _ := json.Marshal(gotJSON)
				wantBytes, _ := json.Marshal(wantJSON)

				if string(gotBytes) != string(wantBytes) {
					t.Errorf("Body = %v, want %v", string(gotBytes), string(wantBytes))
				}
			}

			if !result.IsHTTPOnly {
				t.Error("RPC should be marked as HTTP only")
			}

			if len(result.Warnings) == 0 {
				t.Error("RPC should have warnings")
			}
		})
	}
}

func TestConverter_SpecialOperations(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	tests := []struct {
		name         string
		input        string
		wantHTTPOnly bool
		wantWarnings bool
	}{
		{
			name:         "auth operation",
			input:        `supabase.auth.signUp({email: 'test@example.com', password: 'password'})`,
			wantHTTPOnly: true,
			wantWarnings: true,
		},
		{
			name:         "storage operation",
			input:        `supabase.storage.from('avatars').upload('public/avatar.png', file)`,
			wantHTTPOnly: true,
			wantWarnings: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := c.Convert(tt.input)
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			if result.IsHTTPOnly != tt.wantHTTPOnly {
				t.Errorf("IsHTTPOnly = %v, want %v", result.IsHTTPOnly, tt.wantHTTPOnly)
			}

			if tt.wantWarnings && len(result.Warnings) == 0 {
				t.Error("Expected warnings for special operation")
			}
		})
	}
}

func TestConverter_ComplexQuery(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	input := `supabase.from('posts')
		.select('id, title, author:users(name, email)')
		.eq('status', 'published')
		.gte('views', 100)
		.order('created_at', {ascending: false})
		.limit(20)`

	result, err := c.Convert(input)
	if err != nil {
		t.Fatalf("Convert() error = %v", err)
	}

	if result.Method != "GET" {
		t.Errorf("Method = %v, want GET", result.Method)
	}

	if result.Path != "/posts" {
		t.Errorf("Path = %v, want /posts", result.Path)
	}

	// Check for presence of all query components
	query := result.Query
	requiredParts := []string{
		"select=",
		"status=eq.published",
		"views=gte.100",
		"order=created_at.desc",
		"limit=20",
	}

	for _, part := range requiredParts {
		if !strings.Contains(query, part) {
			t.Errorf("Query missing required part %q: %v", part, query)
		}
	}
}

func TestConverter_TextSearch(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	input := `supabase.from('posts').select('*').textSearch('title', 'cats')`
	result, err := c.Convert(input)
	if err != nil {
		t.Fatalf("Convert() error = %v", err)
	}

	if !strings.Contains(result.Query, "title=fts.cats") {
		t.Errorf("Query should contain full text search: %v", result.Query)
	}
}

func TestConverter_Not(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	input := `supabase.from('users').select('*').not('status', 'eq', 'banned')`
	result, err := c.Convert(input)
	if err != nil {
		t.Fatalf("Convert() error = %v", err)
	}

	if !strings.Contains(result.Query, "status=not.eq.banned") {
		t.Errorf("Query should contain negated filter: %v", result.Query)
	}
}

func TestConverter_Count(t *testing.T) {
	c := NewConverter("http://localhost:3000")

	tests := []struct {
		name        string
		input       string
		wantPrefer  string
	}{
		{
			name:       "count exact",
			input:      `supabase.from('users').select('*', {count: 'exact'})`,
			wantPrefer: "count=exact",
		},
		{
			name:       "count planned",
			input:      `supabase.from('users').select('*', {count: 'planned'})`,
			wantPrefer: "count=planned",
		},
		{
			name:       "count estimated",
			input:      `supabase.from('users').select('*', {count: 'estimated'})`,
			wantPrefer: "count=estimated",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := c.Convert(tt.input)
			if err != nil {
				t.Fatalf("Convert() error = %v", err)
			}

			if result.Headers["Prefer"] != tt.wantPrefer {
				t.Errorf("Prefer header = %v, want %v", result.Headers["Prefer"], tt.wantPrefer)
			}
		})
	}
}
