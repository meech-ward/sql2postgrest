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
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestComprehensiveSELECT(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantMethod string
		wantPath   string
		checkFunc  func(*testing.T, *ConversionResult)
	}{
		{
			name:       "simple SELECT all columns",
			sql:        "SELECT * FROM users",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Empty(t, r.QueryParams.Get("select"))
			},
		},
		{
			name:       "SELECT specific columns",
			sql:        "SELECT id, email, created_at FROM users",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "id,email,created_at", r.QueryParams.Get("select"))
			},
		},
		{
			name:       "SELECT with column aliases",
			sql:        "SELECT id, email AS user_email, created_at AS registration_date FROM users",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "id,email:user_email,created_at:registration_date", r.QueryParams.Get("select"))
			},
		},
		{
			name:       "WHERE with all comparison operators",
			sql:        "SELECT * FROM products WHERE price > 10 AND stock >= 5 AND rating < 4.5 AND discount <= 20",
			wantMethod: "GET",
			wantPath:   "/products",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "gt.10", r.QueryParams.Get("price"))
				assert.Equal(t, "gte.5", r.QueryParams.Get("stock"))
				assert.Equal(t, "lt.4.5", r.QueryParams.Get("rating"))
				assert.Equal(t, "lte.20", r.QueryParams.Get("discount"))
			},
		},
		{
			name:       "WHERE with IN operator",
			sql:        "SELECT * FROM users WHERE status IN ('active', 'pending', 'verified')",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "in.(active,pending,verified)", r.QueryParams.Get("status"))
			},
		},
		{
			name:       "WHERE with BETWEEN",
			sql:        "SELECT * FROM orders WHERE total BETWEEN 100 AND 500",
			wantMethod: "GET",
			wantPath:   "/orders",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				values := r.QueryParams["total"]
				assert.Len(t, values, 2)
				assert.Contains(t, values, "gte.100")
				assert.Contains(t, values, "lte.500")
			},
		},
		{
			name:       "WHERE with LIKE",
			sql:        "SELECT * FROM users WHERE name LIKE 'John%'",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "like.John*", r.QueryParams.Get("name"))
			},
		},
		{
			name:       "WHERE with ILIKE",
			sql:        "SELECT * FROM users WHERE email ILIKE '%@gmail.com'",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "ilike.*@gmail.com", r.QueryParams.Get("email"))
			},
		},
		{
			name:       "WHERE with IS NULL",
			sql:        "SELECT * FROM users WHERE deleted_at IS NULL",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "is.null", r.QueryParams.Get("deleted_at"))
			},
		},
		{
			name:       "WHERE with IS NOT NULL",
			sql:        "SELECT * FROM users WHERE email IS NOT NULL",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "not.is.null", r.QueryParams.Get("email"))
			},
		},
		{
			name:       "ORDER BY ascending",
			sql:        "SELECT * FROM users ORDER BY created_at ASC",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "created_at.asc", r.QueryParams.Get("order"))
			},
		},
		{
			name:       "ORDER BY descending",
			sql:        "SELECT * FROM users ORDER BY created_at DESC",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "created_at.desc", r.QueryParams.Get("order"))
			},
		},
		{
			name:       "ORDER BY with NULLS FIRST",
			sql:        "SELECT * FROM users ORDER BY last_login NULLS FIRST",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "last_login.asc.nullsfirst", r.QueryParams.Get("order"))
			},
		},
		{
			name:       "LIMIT only",
			sql:        "SELECT * FROM users LIMIT 25",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "25", r.QueryParams.Get("limit"))
			},
		},
		{
			name:       "OFFSET only",
			sql:        "SELECT * FROM users OFFSET 50",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "50", r.QueryParams.Get("offset"))
			},
		},
		{
			name:       "LIMIT and OFFSET for pagination",
			sql:        "SELECT * FROM users LIMIT 10 OFFSET 20",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "10", r.QueryParams.Get("limit"))
				assert.Equal(t, "20", r.QueryParams.Get("offset"))
			},
		},
		{
			name:       "complex query with everything",
			sql:        "SELECT id, name, email FROM users WHERE age > 18 AND status = 'active' ORDER BY created_at DESC LIMIT 20 OFFSET 40",
			wantMethod: "GET",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "id,name,email", r.QueryParams.Get("select"))
				assert.Equal(t, "gt.18", r.QueryParams.Get("age"))
				assert.Equal(t, "eq.active", r.QueryParams.Get("status"))
				assert.Equal(t, "created_at.desc", r.QueryParams.Get("order"))
				assert.Equal(t, "20", r.QueryParams.Get("limit"))
				assert.Equal(t, "40", r.QueryParams.Get("offset"))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, tt.wantMethod, result.Method)
			assert.Equal(t, tt.wantPath, result.Path)
			if tt.checkFunc != nil {
				tt.checkFunc(t, result)
			}
		})
	}
}

func TestComprehensiveINSERT(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantMethod string
		wantPath   string
		checkBody  func(*testing.T, string)
	}{
		{
			name:       "single row insert",
			sql:        "INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@example.com')",
			wantMethod: "POST",
			wantPath:   "/users",
			checkBody: func(t *testing.T, body string) {
				assert.Contains(t, body, `"id":1`)
				assert.Contains(t, body, `"name":"Alice"`)
				assert.Contains(t, body, `"email":"alice@example.com"`)
			},
		},
		{
			name:       "multiple rows insert",
			sql:        "INSERT INTO users (id, name) VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')",
			wantMethod: "POST",
			wantPath:   "/users",
			checkBody: func(t *testing.T, body string) {
				assert.Contains(t, body, `"id":1`)
				assert.Contains(t, body, `"id":2`)
				assert.Contains(t, body, `"id":3`)
				assert.Contains(t, body, `"name":"Alice"`)
				assert.Contains(t, body, `"name":"Bob"`)
			},
		},
		{
			name:       "insert with NULL",
			sql:        "INSERT INTO users (id, name, deleted_at) VALUES (1, 'Alice', NULL)",
			wantMethod: "POST",
			wantPath:   "/users",
			checkBody: func(t *testing.T, body string) {
				assert.Contains(t, body, `"deleted_at":null`)
			},
		},
		{
			name:       "insert with boolean",
			sql:        "INSERT INTO users (id, active) VALUES (1, true)",
			wantMethod: "POST",
			wantPath:   "/users",
			checkBody: func(t *testing.T, body string) {
				assert.Contains(t, body, `"active":true`)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, tt.wantMethod, result.Method)
			assert.Equal(t, tt.wantPath, result.Path)
			assert.Equal(t, "application/json", result.Headers["Content-Type"])
			if tt.checkBody != nil {
				tt.checkBody(t, result.Body)
			}
		})
	}
}

func TestComprehensiveUPDATE(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantMethod string
		wantPath   string
		checkFunc  func(*testing.T, *ConversionResult)
	}{
		{
			name:       "update single column",
			sql:        "UPDATE users SET status = 'active' WHERE id = 5",
			wantMethod: "PATCH",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "eq.5", r.QueryParams.Get("id"))
				assert.Contains(t, r.Body, `"status":"active"`)
			},
		},
		{
			name:       "update multiple columns",
			sql:        "UPDATE users SET status = 'active', verified = true, updated_at = '2024-01-01' WHERE id = 5",
			wantMethod: "PATCH",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "eq.5", r.QueryParams.Get("id"))
				assert.Contains(t, r.Body, `"status":"active"`)
				assert.Contains(t, r.Body, `"verified":true`)
			},
		},
		{
			name:       "update with NULL",
			sql:        "UPDATE users SET deleted_at = NULL WHERE id = 5",
			wantMethod: "PATCH",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Contains(t, r.Body, `"deleted_at":null`)
			},
		},
		{
			name:       "update with complex WHERE",
			sql:        "UPDATE orders SET status = 'shipped' WHERE customer_id = 10 AND status = 'pending'",
			wantMethod: "PATCH",
			wantPath:   "/orders",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "eq.10", r.QueryParams.Get("customer_id"))
				assert.Equal(t, "eq.pending", r.QueryParams.Get("status"))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, tt.wantMethod, result.Method)
			assert.Equal(t, tt.wantPath, result.Path)
			if tt.checkFunc != nil {
				tt.checkFunc(t, result)
			}
		})
	}
}

func TestComprehensiveDELETE(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantMethod string
		wantPath   string
		checkFunc  func(*testing.T, *ConversionResult)
	}{
		{
			name:       "delete with simple WHERE",
			sql:        "DELETE FROM users WHERE id = 5",
			wantMethod: "DELETE",
			wantPath:   "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "eq.5", r.QueryParams.Get("id"))
			},
		},
		{
			name:       "delete with multiple conditions",
			sql:        "DELETE FROM sessions WHERE user_id = 10 AND expired = true",
			wantMethod: "DELETE",
			wantPath:   "/sessions",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "eq.10", r.QueryParams.Get("user_id"))
				assert.Equal(t, "eq.true", r.QueryParams.Get("expired"))
			},
		},
		{
			name:       "delete with IN clause",
			sql:        "DELETE FROM logs WHERE level IN ('debug', 'trace')",
			wantMethod: "DELETE",
			wantPath:   "/logs",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "in.(debug,trace)", r.QueryParams.Get("level"))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, tt.wantMethod, result.Method)
			assert.Equal(t, tt.wantPath, result.Path)
			if tt.checkFunc != nil {
				tt.checkFunc(t, result)
			}
		})
	}
}

func TestComprehensiveJOINs(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name      string
		sql       string
		wantPath  string
		checkFunc func(*testing.T, *ConversionResult)
	}{
		{
			name:     "simple LEFT JOIN",
			sql:      "SELECT u.name, p.title FROM users u LEFT JOIN posts p ON p.user_id = u.id",
			wantPath: "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				sel := r.QueryParams.Get("select")
				assert.Contains(t, sel, "name")
				assert.Contains(t, sel, "posts(title)")
			},
		},
		{
			name:     "INNER JOIN",
			sql:      "SELECT c.name, o.total FROM customers c INNER JOIN orders o ON o.customer_id = c.id",
			wantPath: "/customers",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				sel := r.QueryParams.Get("select")
				assert.Contains(t, sel, "name")
				assert.Contains(t, sel, "orders(total)")
			},
		},
		{
			name:     "multiple JOINs",
			sql:      "SELECT u.name, p.title, c.content FROM users u JOIN posts p ON p.user_id = u.id JOIN comments c ON c.post_id = p.id",
			wantPath: "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				sel := r.QueryParams.Get("select")
				assert.Contains(t, sel, "name")
				assert.Contains(t, sel, "posts(title)")
				assert.Contains(t, sel, "comments(content)")
			},
		},
		{
			name:     "JOIN with WHERE",
			sql:      "SELECT u.email, o.total FROM users u JOIN orders o ON o.user_id = u.id WHERE u.active = true AND o.status = 'paid'",
			wantPath: "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "eq.true", r.QueryParams.Get("active"))
				assert.Equal(t, "eq.paid", r.QueryParams.Get("status"))
			},
		},
		{
			name:     "JOIN with ORDER BY and LIMIT",
			sql:      "SELECT u.name, o.total FROM users u JOIN orders o ON o.user_id = u.id ORDER BY u.created_at DESC LIMIT 10",
			wantPath: "/users",
			checkFunc: func(t *testing.T, r *ConversionResult) {
				assert.Equal(t, "created_at.desc", r.QueryParams.Get("order"))
				assert.Equal(t, "10", r.QueryParams.Get("limit"))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, "GET", result.Method)
			assert.Equal(t, tt.wantPath, result.Path)
			if tt.checkFunc != nil {
				tt.checkFunc(t, result)
			}
		})
	}
}

func TestErrorCases(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name        string
		sql         string
		wantErrText string
	}{
		{
			name:        "empty SQL",
			sql:         "",
			wantErrText: "no statements found",
		},
		{
			name:        "invalid SQL",
			sql:         "INVALID SQL QUERY",
			wantErrText: "failed to parse SQL",
		},
		{
			name:        "DELETE without WHERE",
			sql:         "DELETE FROM users",
			wantErrText: "DELETE without WHERE",
		},
		{
			name:        "GROUP BY without JOIN",
			sql:         "SELECT status, COUNT(*) FROM orders GROUP BY status",
			wantErrText: "GROUP BY not supported",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := conv.Convert(tt.sql)
			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.wantErrText)
		})
	}
}
