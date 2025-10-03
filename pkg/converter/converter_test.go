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
