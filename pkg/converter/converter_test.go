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

func TestSelectBasic(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantPath   string
		wantParams map[string]string
		wantMethod string
		wantErr    bool
	}{
		{
			name:       "simple select all",
			sql:        "SELECT * FROM users",
			wantPath:   "/users",
			wantParams: map[string]string{},
			wantMethod: "GET",
		},
		{
			name:       "select specific columns",
			sql:        "SELECT id, name FROM users",
			wantPath:   "/users",
			wantParams: map[string]string{"select": "id,name"},
			wantMethod: "GET",
		},
		{
			name:       "select with alias",
			sql:        "SELECT id, name AS full_name FROM users",
			wantPath:   "/users",
			wantParams: map[string]string{"select": "id,name:full_name"},
			wantMethod: "GET",
		},
		{
			name:       "where equals",
			sql:        "SELECT * FROM users WHERE id = 1",
			wantPath:   "/users",
			wantParams: map[string]string{"id": "eq.1"},
			wantMethod: "GET",
		},
		{
			name:       "where greater than",
			sql:        "SELECT * FROM users WHERE age > 18",
			wantPath:   "/users",
			wantParams: map[string]string{"age": "gt.18"},
			wantMethod: "GET",
		},
		{
			name:       "where less than or equal",
			sql:        "SELECT * FROM users WHERE age <= 65",
			wantPath:   "/users",
			wantParams: map[string]string{"age": "lte.65"},
			wantMethod: "GET",
		},
		{
			name:       "order by ascending",
			sql:        "SELECT * FROM users ORDER BY name",
			wantPath:   "/users",
			wantParams: map[string]string{"order": "name.asc"},
			wantMethod: "GET",
		},
		{
			name:       "order by descending",
			sql:        "SELECT * FROM users ORDER BY created_at DESC",
			wantPath:   "/users",
			wantParams: map[string]string{"order": "created_at.desc"},
			wantMethod: "GET",
		},
		{
			name:       "limit",
			sql:        "SELECT * FROM users LIMIT 10",
			wantPath:   "/users",
			wantParams: map[string]string{"limit": "10"},
			wantMethod: "GET",
		},
		{
			name:       "offset",
			sql:        "SELECT * FROM users OFFSET 20",
			wantPath:   "/users",
			wantParams: map[string]string{"offset": "20"},
			wantMethod: "GET",
		},
		{
			name:       "limit and offset",
			sql:        "SELECT * FROM users LIMIT 10 OFFSET 20",
			wantPath:   "/users",
			wantParams: map[string]string{"limit": "10", "offset": "20"},
			wantMethod: "GET",
		},
		{
			name:       "complex query",
			sql:        "SELECT id, name FROM users WHERE age > 18 ORDER BY name LIMIT 10",
			wantPath:   "/users",
			wantParams: map[string]string{"select": "id,name", "age": "gt.18", "order": "name.asc", "limit": "10"},
			wantMethod: "GET",
		},
		{
			name:       "AND conditions",
			sql:        "SELECT * FROM users WHERE age > 18 AND status = 'active'",
			wantPath:   "/users",
			wantParams: map[string]string{"age": "gt.18", "status": "eq.active"},
			wantMethod: "GET",
		},
		{
			name:       "IS NULL",
			sql:        "SELECT * FROM users WHERE deleted_at IS NULL",
			wantPath:   "/users",
			wantParams: map[string]string{"deleted_at": "is.null"},
			wantMethod: "GET",
		},
		{
			name:       "IS NOT NULL",
			sql:        "SELECT * FROM users WHERE email IS NOT NULL",
			wantPath:   "/users",
			wantParams: map[string]string{"email": "not.is.null"},
			wantMethod: "GET",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)

			if tt.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantMethod, result.Method)
			assert.Equal(t, tt.wantPath, result.Path)

			for key, want := range tt.wantParams {
				got := result.QueryParams.Get(key)
				assert.Equal(t, want, got, "param %s mismatch", key)
			}
		})
	}
}

func TestSelectAggregateFunctions(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantSelect string
	}{
		{
			name:       "count all",
			sql:        "SELECT COUNT(*) FROM users",
			wantSelect: "count",
		},
		{
			name:       "count column",
			sql:        "SELECT COUNT(id) FROM users",
			wantSelect: "id.count",
		},
		{
			name:       "sum",
			sql:        "SELECT SUM(amount) FROM orders",
			wantSelect: "amount.sum",
		},
		{
			name:       "avg",
			sql:        "SELECT AVG(age) FROM users",
			wantSelect: "age.avg",
		},
		{
			name:       "max",
			sql:        "SELECT MAX(price) FROM products",
			wantSelect: "price.max",
		},
		{
			name:       "min",
			sql:        "SELECT MIN(price) FROM products",
			wantSelect: "price.min",
		},
		{
			name:       "aggregate with alias",
			sql:        "SELECT COUNT(*) AS total FROM users",
			wantSelect: "count:total",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, tt.wantSelect, result.QueryParams.Get("select"))
		})
	}
}

func TestInsert(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantPath   string
		wantMethod string
		wantBody   string
		wantErr    bool
	}{
		{
			name:       "single row",
			sql:        "INSERT INTO users (id, name) VALUES (1, 'Alice')",
			wantPath:   "/users",
			wantMethod: "POST",
			wantBody:   `[{"id":1,"name":"Alice"}]`,
		},
		{
			name:       "multiple rows",
			sql:        "INSERT INTO users (id, name) VALUES (1, 'Alice'), (2, 'Bob')",
			wantPath:   "/users",
			wantMethod: "POST",
			wantBody:   `[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)

			if tt.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantMethod, result.Method)
			assert.Equal(t, tt.wantPath, result.Path)
			assert.JSONEq(t, tt.wantBody, result.Body)
			assert.Equal(t, "application/json", result.Headers["Content-Type"])
		})
	}
}

func TestUpdate(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantPath   string
		wantMethod string
		wantBody   string
		wantParams map[string]string
		wantErr    bool
	}{
		{
			name:       "simple update",
			sql:        "UPDATE users SET name = 'Bob' WHERE id = 1",
			wantPath:   "/users",
			wantMethod: "PATCH",
			wantBody:   `{"name":"Bob"}`,
			wantParams: map[string]string{"id": "eq.1"},
		},
		{
			name:       "update multiple columns",
			sql:        "UPDATE users SET name = 'Charlie', age = 30 WHERE id = 2",
			wantPath:   "/users",
			wantMethod: "PATCH",
			wantBody:   `{"name":"Charlie","age":30}`,
			wantParams: map[string]string{"id": "eq.2"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)

			if tt.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantMethod, result.Method)
			assert.Equal(t, tt.wantPath, result.Path)
			assert.JSONEq(t, tt.wantBody, result.Body)

			for key, want := range tt.wantParams {
				got := result.QueryParams.Get(key)
				assert.Equal(t, want, got, "param %s mismatch", key)
			}
		})
	}
}

func TestDelete(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantPath   string
		wantMethod string
		wantParams map[string]string
		wantErr    bool
	}{
		{
			name:       "delete with where",
			sql:        "DELETE FROM users WHERE id = 1",
			wantPath:   "/users",
			wantMethod: "DELETE",
			wantParams: map[string]string{"id": "eq.1"},
		},
		{
			name:    "delete without where should error",
			sql:     "DELETE FROM users",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)

			if tt.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantMethod, result.Method)
			assert.Equal(t, tt.wantPath, result.Path)

			for key, want := range tt.wantParams {
				got := result.QueryParams.Get(key)
				assert.Equal(t, want, got, "param %s mismatch", key)
			}
		})
	}
}

func TestURL(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	result, err := conv.Convert("SELECT id, name FROM users WHERE age > 18 ORDER BY name LIMIT 10")
	require.NoError(t, err)

	url := conv.URL(result)
	assert.Contains(t, url, "https://api.example.com/users")
	assert.Contains(t, url, "select=id%2Cname")
	assert.Contains(t, url, "age=gt.18")
	assert.Contains(t, url, "order=name.asc")
	assert.Contains(t, url, "limit=10")
}

func TestEdgeCases(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name    string
		sql     string
		wantErr bool
	}{
		{
			name:    "empty string",
			sql:     "",
			wantErr: true,
		},
		{
			name:    "invalid SQL",
			sql:     "SELECT FROM",
			wantErr: true,
		},
		{
			name:    "multiple statements not supported",
			sql:     "SELECT * FROM users; SELECT * FROM orders;",
			wantErr: true,
		},
		{
			name:    "schema qualified table",
			sql:     "SELECT * FROM public.users",
			wantErr: false,
		},
		{
			name:    "string with quotes",
			sql:     "SELECT * FROM users WHERE name = 'O''Brien'",
			wantErr: false,
		},
		{
			name:    "negative numbers",
			sql:     "SELECT * FROM users WHERE balance < -100",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := conv.Convert(tt.sql)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestOperatorMapping(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		sql     string
		wantOp  string
		wantVal string
	}{
		{"SELECT * FROM users WHERE age = 18", "age", "eq.18"},
		{"SELECT * FROM users WHERE age != 18", "age", "neq.18"},
		{"SELECT * FROM users WHERE age <> 18", "age", "neq.18"},
		{"SELECT * FROM users WHERE age > 18", "age", "gt.18"},
		{"SELECT * FROM users WHERE age >= 18", "age", "gte.18"},
		{"SELECT * FROM users WHERE age < 65", "age", "lt.65"},
		{"SELECT * FROM users WHERE age <= 65", "age", "lte.65"},
	}

	for _, tt := range tests {
		t.Run(tt.sql, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, tt.wantVal, result.QueryParams.Get(tt.wantOp))
		})
	}
}

func TestInsertEdgeCases(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name    string
		sql     string
		wantErr bool
	}{
		{
			name:    "insert without columns",
			sql:     "INSERT INTO users VALUES (1, 'Alice')",
			wantErr: false,
		},
		{
			name:    "insert with null",
			sql:     "INSERT INTO users (id, name) VALUES (1, NULL)",
			wantErr: false,
		},
		{
			name:    "insert numeric values",
			sql:     "INSERT INTO products (id, price) VALUES (1, 99.99)",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := conv.Convert(tt.sql)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestUpdateEdgeCases(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name    string
		sql     string
		wantErr bool
	}{
		{
			name:    "update with multiple where conditions",
			sql:     "UPDATE users SET status = 'active' WHERE age > 18 AND country = 'US'",
			wantErr: false,
		},
		{
			name:    "update with null",
			sql:     "UPDATE users SET deleted_at = NULL WHERE id = 1",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := conv.Convert(tt.sql)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestDeleteSafety(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	_, err := conv.Convert("DELETE FROM users")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "WHERE clause is dangerous")
}

func TestOrConditions(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	result, err := conv.Convert("SELECT * FROM users WHERE age < 18 OR age > 65")
	require.NoError(t, err)

	orParam := result.QueryParams.Get("or")
	assert.Contains(t, orParam, "age.lt.18")
	assert.Contains(t, orParam, "age.gt.65")
}

func TestInOperator(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name    string
		sql     string
		wantCol string
		wantVal string
	}{
		{
			name:    "IN with numbers",
			sql:     "SELECT * FROM users WHERE id IN (1, 2, 3)",
			wantCol: "id",
			wantVal: "in.(1,2,3)",
		},
		{
			name:    "IN with strings",
			sql:     "SELECT * FROM users WHERE status IN ('active', 'pending')",
			wantCol: "status",
			wantVal: "in.(active,pending)",
		},
		{
			name:    "IN with single value",
			sql:     "SELECT * FROM users WHERE id IN (42)",
			wantCol: "id",
			wantVal: "in.(42)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, tt.wantVal, result.QueryParams.Get(tt.wantCol))
		})
	}
}

func TestBetweenOperator(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name    string
		sql     string
		wantCol string
		check   func(*testing.T, *ConversionResult)
	}{
		{
			name:    "BETWEEN numbers",
			sql:     "SELECT * FROM users WHERE age BETWEEN 18 AND 65",
			wantCol: "age",
			check: func(t *testing.T, result *ConversionResult) {
				params := result.QueryParams["age"]
				assert.Contains(t, params, "gte.18")
				assert.Contains(t, params, "lte.65")
			},
		},
		{
			name:    "BETWEEN strings",
			sql:     "SELECT * FROM users WHERE name BETWEEN 'A' AND 'M'",
			wantCol: "name",
			check: func(t *testing.T, result *ConversionResult) {
				params := result.QueryParams["name"]
				assert.Contains(t, params, "gte.A")
				assert.Contains(t, params, "lte.M")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			tt.check(t, result)
		})
	}
}

func TestLikeOperator(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name    string
		sql     string
		wantCol string
		wantOp  string
	}{
		{
			name:    "LIKE with wildcards",
			sql:     "SELECT * FROM users WHERE name LIKE 'John%'",
			wantCol: "name",
			wantOp:  "like.John*",
		},
		{
			name:    "ILIKE case insensitive",
			sql:     "SELECT * FROM users WHERE email ILIKE '%@example.com'",
			wantCol: "email",
			wantOp:  "ilike.*@example.com",
		},
		{
			name:    "LIKE with % on both sides",
			sql:     "SELECT * FROM users WHERE name LIKE '%smith%'",
			wantCol: "name",
			wantOp:  "like.*smith*",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, tt.wantOp, result.QueryParams.Get(tt.wantCol))
		})
	}
}

func TestComplexQueries(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name    string
		sql     string
		wantErr bool
	}{
		{
			name:    "IN with AND",
			sql:     "SELECT * FROM users WHERE id IN (1, 2, 3) AND status = 'active'",
			wantErr: false,
		},
		{
			name:    "BETWEEN with other conditions",
			sql:     "SELECT * FROM users WHERE age BETWEEN 18 AND 65 AND country = 'US'",
			wantErr: false,
		},
		{
			name:    "Multiple different operators",
			sql:     "SELECT * FROM users WHERE age > 18 AND status IN ('active', 'pending') AND name LIKE 'John%'",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.NotNil(t, result)
			}
		})
	}
}

func TestBooleanValues(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name     string
		sql      string
		wantBody string
	}{
		{
			name:     "INSERT with boolean true",
			sql:      "INSERT INTO posts (id, published) VALUES (1, true)",
			wantBody: `[{"id":1,"published":true}]`,
		},
		{
			name:     "INSERT with boolean false",
			sql:      "INSERT INTO posts (id, published) VALUES (2, false)",
			wantBody: `[{"id":2,"published":false}]`,
		},
		{
			name:     "UPDATE with boolean true",
			sql:      "UPDATE users SET active = true WHERE id = 5",
			wantBody: `{"active":true}`,
		},
		{
			name:     "UPDATE with boolean false",
			sql:      "UPDATE users SET active = false WHERE id = 5",
			wantBody: `{"active":false}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.JSONEq(t, tt.wantBody, result.Body)
		})
	}
}

func TestJoins(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantPath   string
		wantSelect string
	}{
		{
			name:       "simple LEFT JOIN with aliases",
			sql:        "SELECT a.name, b.title FROM authors a LEFT JOIN books b ON b.author_id = a.id",
			wantPath:   "/authors",
			wantSelect: "name,books(title)",
		},
		{
			name:       "LEFT JOIN multiple columns",
			sql:        "SELECT a.id, a.name, b.title, b.published_date FROM authors a LEFT JOIN books b ON b.author_id = a.id",
			wantPath:   "/authors",
			wantSelect: "id,name,books(title,published_date)",
		},
		{
			name:       "INNER JOIN without aliases",
			sql:        "SELECT users.name, orders.total FROM users INNER JOIN orders ON orders.user_id = users.id",
			wantPath:   "/users",
			wantSelect: "name,orders(total)",
		},
		{
			name:       "JOIN with WHERE clause",
			sql:        "SELECT u.email, o.amount FROM users u JOIN orders o ON o.user_id = u.id WHERE u.active = true",
			wantPath:   "/users",
			wantSelect: "email,orders(amount)",
		},
		{
			name:       "JOIN with column aliases",
			sql:        "SELECT a.name AS author_name, b.title AS book_title FROM authors a JOIN books b ON b.author_id = a.id",
			wantPath:   "/authors",
			wantSelect: "name:author_name,books(title:book_title)",
		},
		{
			name:       "JOIN with ORDER BY",
			sql:        "SELECT a.name, b.title FROM authors a JOIN books b ON b.author_id = a.id ORDER BY a.name",
			wantPath:   "/authors",
			wantSelect: "name,books(title)",
		},
		{
			name:       "JOIN with LIMIT",
			sql:        "SELECT u.name, p.title FROM users u LEFT JOIN posts p ON p.user_id = u.id LIMIT 10",
			wantPath:   "/users",
			wantSelect: "name,posts(title)",
		},
		{
			name:       "multiple columns from base table",
			sql:        "SELECT u.id, u.name, u.email, o.total FROM users u JOIN orders o ON o.user_id = u.id",
			wantPath:   "/users",
			wantSelect: "id,name,email,orders(total)",
		},
		{
			name:       "SELECT * with JOIN",
			sql:        "SELECT * FROM authors a LEFT JOIN books b ON b.author_id = a.id",
			wantPath:   "/authors",
			wantSelect: "*",
		},
		{
			name:       "RIGHT JOIN treated as join",
			sql:        "SELECT a.name, b.title FROM authors a RIGHT JOIN books b ON b.author_id = a.id",
			wantPath:   "/authors",
			wantSelect: "name,books(title)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, "GET", result.Method)
			assert.Equal(t, tt.wantPath, result.Path)
			assert.Equal(t, tt.wantSelect, result.QueryParams.Get("select"))
		})
	}
}

func TestJoinsWithFilters(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	result, err := conv.Convert("SELECT u.name, o.total FROM users u JOIN orders o ON o.user_id = u.id WHERE u.active = true AND o.total > 100")
	require.NoError(t, err)
	assert.Equal(t, "/users", result.Path)
	assert.Equal(t, "name,orders(total)", result.QueryParams.Get("select"))
	assert.Equal(t, "eq.true", result.QueryParams.Get("active"))
	assert.Equal(t, "gt.100", result.QueryParams.Get("total"))
}

func TestJoinsWithOrderByAndLimit(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	result, err := conv.Convert("SELECT a.name, b.title FROM authors a JOIN books b ON b.author_id = a.id ORDER BY a.name DESC LIMIT 5 OFFSET 10")
	require.NoError(t, err)
	assert.Equal(t, "/authors", result.Path)
	assert.Equal(t, "name,books(title)", result.QueryParams.Get("select"))
	assert.Equal(t, "name.desc", result.QueryParams.Get("order"))
	assert.Equal(t, "5", result.QueryParams.Get("limit"))
	assert.Equal(t, "10", result.QueryParams.Get("offset"))
}

func TestMultipleJoins(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("three table join", func(t *testing.T) {
		result, err := conv.Convert("SELECT o.id, c.name, p.title FROM orders o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN payments p ON p.order_id = o.id")
		require.NoError(t, err)
		assert.Equal(t, "GET", result.Method)
		assert.Equal(t, "/orders", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "id")
		assert.Contains(t, selectStr, "customers(name)")
		assert.Contains(t, selectStr, "payments(title)")
	})

	t.Run("four table join", func(t *testing.T) {
		result, err := conv.Convert("SELECT o.id, c.name, oi.quantity, p.name FROM orders o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN products p ON p.id = oi.product_id")
		require.NoError(t, err)
		assert.Equal(t, "/orders", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "id")
		assert.Contains(t, selectStr, "customers(name)")
		assert.Contains(t, selectStr, "order_items(quantity)")
		assert.Contains(t, selectStr, "products(name)")
	})

	t.Run("multiple joins with aliases", func(t *testing.T) {
		result, err := conv.Convert("SELECT u.id, u.email, p.title, c.content FROM users u JOIN posts p ON p.user_id = u.id JOIN comments c ON c.post_id = p.id")
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "id")
		assert.Contains(t, selectStr, "email")
		assert.Contains(t, selectStr, "posts(title)")
		assert.Contains(t, selectStr, "comments(content)")
	})

	t.Run("multiple joins with all columns from each table", func(t *testing.T) {
		result, err := conv.Convert("SELECT o.id, o.total, c.name, c.email, p.amount FROM orders o JOIN customers c ON c.id = o.customer_id JOIN payments p ON p.order_id = o.id")
		require.NoError(t, err)
		assert.Equal(t, "/orders", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "id")
		assert.Contains(t, selectStr, "total")
		assert.Contains(t, selectStr, "customers(name,email)")
		assert.Contains(t, selectStr, "payments(amount)")
	})

	t.Run("multiple joins with WHERE", func(t *testing.T) {
		result, err := conv.Convert("SELECT o.id, c.name, p.amount FROM orders o JOIN customers c ON c.id = o.customer_id JOIN payments p ON p.order_id = o.id WHERE o.status = 'active'")
		require.NoError(t, err)
		assert.Equal(t, "/orders", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "id")
		assert.Contains(t, selectStr, "customers(name)")
		assert.Contains(t, selectStr, "payments(amount)")
		assert.Equal(t, "eq.active", result.QueryParams.Get("status"))
	})
}

func TestJoinEdgeCases(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name       string
		sql        string
		wantPath   string
		wantSelect string
	}{
		{
			name:       "join with only base table columns selected",
			sql:        "SELECT u.id, u.name FROM users u LEFT JOIN orders o ON o.user_id = u.id",
			wantPath:   "/users",
			wantSelect: "id,name",
		},
		{
			name:       "join with only joined table columns selected",
			sql:        "SELECT o.total FROM users u LEFT JOIN orders o ON o.user_id = u.id",
			wantPath:   "/users",
			wantSelect: "orders(total)",
		},
		{
			name:       "self join pattern (same table joined)",
			sql:        "SELECT u1.name, u2.name FROM users u1 LEFT JOIN users u2 ON u2.manager_id = u1.id",
			wantPath:   "/users",
			wantSelect: "name,users(name)",
		},
		{
			name:       "join with schema qualified table",
			sql:        "SELECT u.name, o.total FROM public.users u JOIN public.orders o ON o.user_id = u.id",
			wantPath:   "/public.users",
			wantSelect: "name,public.orders(total)",
		},
		{
			name:       "join with multiple columns same name different tables",
			sql:        "SELECT u.id, u.created_at, o.id, o.created_at FROM users u JOIN orders o ON o.user_id = u.id",
			wantPath:   "/users",
			wantSelect: "id,created_at,orders(id,created_at)",
		},
		{
			name:       "join with complex WHERE conditions",
			sql:        "SELECT u.email, o.total FROM users u JOIN orders o ON o.user_id = u.id WHERE u.active = true AND o.status IN ('paid', 'shipped') AND o.total > 100",
			wantPath:   "/users",
			wantSelect: "email,orders(total)",
		},
		{
			name:       "join with ORDER BY from different tables",
			sql:        "SELECT u.name, o.total FROM users u JOIN orders o ON o.user_id = u.id ORDER BY u.created_at DESC",
			wantPath:   "/users",
			wantSelect: "name,orders(total)",
		},
		{
			name:       "join with all base table columns using alias",
			sql:        "SELECT u.*, o.total FROM users u JOIN orders o ON o.user_id = u.id",
			wantPath:   "/users",
			wantSelect: "*,orders(total)",
		},
		{
			name:       "join without table prefix on base table",
			sql:        "SELECT name, orders.total FROM users LEFT JOIN orders ON orders.user_id = users.id",
			wantPath:   "/users",
			wantSelect: "name,orders(total)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := conv.Convert(tt.sql)
			require.NoError(t, err)
			assert.Equal(t, "GET", result.Method)
			assert.Equal(t, tt.wantPath, result.Path)
			assert.Equal(t, tt.wantSelect, result.QueryParams.Get("select"))
		})
	}
}

func TestJoinComplexScenarios(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("join with WHERE ORDER BY LIMIT OFFSET", func(t *testing.T) {
		result, err := conv.Convert(`
			SELECT u.id, u.name, o.total, o.status 
			FROM users u 
			JOIN orders o ON o.user_id = u.id 
			WHERE u.active = true AND o.total > 50 
			ORDER BY o.created_at DESC 
			LIMIT 20 OFFSET 10
		`)
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		assert.Equal(t, "id,name,orders(total,status)", result.QueryParams.Get("select"))
		assert.Equal(t, "eq.true", result.QueryParams.Get("active"))
		assert.Equal(t, "gt.50", result.QueryParams.Get("total"))
		assert.Equal(t, "created_at.desc", result.QueryParams.Get("order"))
		assert.Equal(t, "20", result.QueryParams.Get("limit"))
		assert.Equal(t, "10", result.QueryParams.Get("offset"))
	})

	t.Run("multiple joins with IS NULL conditions", func(t *testing.T) {
		result, err := conv.Convert(`
			SELECT u.email, o.total, p.amount 
			FROM users u 
			LEFT JOIN orders o ON o.user_id = u.id 
			LEFT JOIN payments p ON p.order_id = o.id 
			WHERE u.deleted_at IS NULL AND p.refunded_at IS NOT NULL
		`)
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		assert.Equal(t, "email,orders(total),payments(amount)", result.QueryParams.Get("select"))
		assert.Equal(t, "is.null", result.QueryParams.Get("deleted_at"))
		assert.Equal(t, "not.is.null", result.QueryParams.Get("refunded_at"))
	})

	t.Run("join with BETWEEN and LIKE", func(t *testing.T) {
		result, err := conv.Convert(`
			SELECT p.title, c.name 
			FROM posts p 
			JOIN categories c ON c.id = p.category_id 
			WHERE p.created_at BETWEEN '2024-01-01' AND '2024-12-31' 
			AND c.name LIKE 'Tech%'
		`)
		require.NoError(t, err)
		assert.Equal(t, "/posts", result.Path)
		assert.Equal(t, "title,categories(name)", result.QueryParams.Get("select"))
		assert.Equal(t, "gte.2024-01-01", result.QueryParams["created_at"][0])
		assert.Equal(t, "lte.2024-12-31", result.QueryParams["created_at"][1])
		assert.Equal(t, "like.Tech*", result.QueryParams.Get("name"))
	})

	t.Run("four table join with complex aliases", func(t *testing.T) {
		result, err := conv.Convert(`
			SELECT 
				o.id AS order_id,
				c.name AS customer_name,
				oi.quantity AS item_qty,
				p.name AS product_name
			FROM orders o
			LEFT JOIN customers c ON c.id = o.customer_id
			LEFT JOIN order_items oi ON oi.order_id = o.id
			LEFT JOIN products p ON p.id = oi.product_id
			WHERE o.status = 'shipped'
			ORDER BY o.created_at DESC
			LIMIT 50
		`)
		require.NoError(t, err)
		assert.Equal(t, "/orders", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "id:order_id")
		assert.Contains(t, selectStr, "customers(name:customer_name)")
		assert.Contains(t, selectStr, "order_items(quantity:item_qty)")
		assert.Contains(t, selectStr, "products(name:product_name)")
		assert.Equal(t, "eq.shipped", result.QueryParams.Get("status"))
		assert.Equal(t, "created_at.desc", result.QueryParams.Get("order"))
		assert.Equal(t, "50", result.QueryParams.Get("limit"))
	})
}

func TestJoinsNotSupported(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	tests := []struct {
		name        string
		sql         string
		wantErrText string
	}{
		{
			name:        "json_agg not supported",
			sql:         "SELECT a.name, json_agg(b.title) AS books FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.id",
			wantErrText: "json_agg/json_build_object not supported",
		},
		{
			name:        "json_build_object not supported",
			sql:         "SELECT a.name, json_build_object('title', b.title) AS book FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.id",
			wantErrText: "json_agg/json_build_object not supported",
		},
		{
			name:        "complex nested json aggregation not supported",
			sql:         "SELECT o.id, json_build_object('name', c.name) AS customer, json_agg(json_build_object('quantity', oi.quantity, 'product', json_build_object('name', p.name))) AS items FROM orders o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN products p ON p.id = oi.product_id GROUP BY o.id, c.name",
			wantErrText: "json_agg/json_build_object not supported",
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
