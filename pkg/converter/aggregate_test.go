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

func TestAggregatesWithJoins(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("COUNT with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT a.name, COUNT(b.id) AS book_count FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.id, a.name")
		require.NoError(t, err)
		assert.Equal(t, "/authors", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "books(book_count:id.count())")
	})

	t.Run("COUNT(*) with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT a.name, COUNT(*) AS total FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.name")
		require.NoError(t, err)
		assert.Equal(t, "/authors", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "total:count()")
	})

	t.Run("SUM with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT a.name, SUM(b.price) AS total_price FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.name")
		require.NoError(t, err)
		assert.Equal(t, "/authors", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "books(total_price:price.sum())")
	})

	t.Run("AVG with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT c.name, AVG(o.total) AS avg_order FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id")
		require.NoError(t, err)
		assert.Equal(t, "/customers", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "orders(avg_order:total.avg())")
	})

	t.Run("MAX with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT u.email, MAX(o.amount) AS max_order FROM users u JOIN orders o ON o.user_id = u.id GROUP BY u.id")
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "email")
		assert.Contains(t, selectStr, "orders(max_order:amount.max())")
	})

	t.Run("MIN with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT p.name, MIN(s.quantity) AS min_stock FROM products p JOIN stock s ON s.product_id = p.id GROUP BY p.id")
		require.NoError(t, err)
		assert.Equal(t, "/products", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "stock(min_stock:quantity.min())")
	})
}

func TestMultipleAggregatesWithJoins(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("multiple aggregates same table", func(t *testing.T) {
		result, err := conv.Convert("SELECT a.name, COUNT(b.id) AS book_count, SUM(b.price) AS total_revenue FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.id, a.name")
		require.NoError(t, err)
		assert.Equal(t, "/authors", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "books(")
		assert.Contains(t, selectStr, "book_count:id.count()")
		assert.Contains(t, selectStr, "total_revenue:price.sum()")
	})

	t.Run("aggregates with multiple group by columns", func(t *testing.T) {
		result, err := conv.Convert("SELECT c.name, c.city, SUM(o.total) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name, c.city")
		require.NoError(t, err)
		assert.Equal(t, "/customers", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "city")
		assert.Contains(t, selectStr, "orders(revenue:total.sum())")
	})

	t.Run("aggregate with WHERE clause", func(t *testing.T) {
		result, err := conv.Convert("SELECT a.name, COUNT(b.id) AS published_books FROM authors a JOIN books b ON b.author_id = a.id WHERE b.published = true GROUP BY a.id, a.name")
		require.NoError(t, err)
		assert.Equal(t, "/authors", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "books(published_books:id.count())")
		assert.Equal(t, "eq.true", result.QueryParams.Get("published"))
	})
}

func TestAggregatesWithMultipleJoins(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("aggregates from different joined tables", func(t *testing.T) {
		result, err := conv.Convert(`
			SELECT 
				u.name, 
				COUNT(o.id) AS order_count,
				SUM(p.amount) AS total_paid
			FROM users u
			LEFT JOIN orders o ON o.user_id = u.id
			LEFT JOIN payments p ON p.order_id = o.id
			GROUP BY u.id, u.name
		`)
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "orders(order_count:id.count())")
		assert.Contains(t, selectStr, "payments(total_paid:amount.sum())")
	})

	t.Run("three table join with aggregates", func(t *testing.T) {
		result, err := conv.Convert(`
			SELECT 
				c.name,
				COUNT(o.id) AS num_orders,
				AVG(oi.quantity) AS avg_items
			FROM customers c
			JOIN orders o ON o.customer_id = c.id
			JOIN order_items oi ON oi.order_id = o.id
			GROUP BY c.id, c.name
		`)
		require.NoError(t, err)
		assert.Equal(t, "/customers", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "orders(num_orders:id.count())")
		assert.Contains(t, selectStr, "order_items(avg_items:quantity.avg())")
	})
}

func TestAggregatesEdgeCases(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("aggregate without alias", func(t *testing.T) {
		result, err := conv.Convert("SELECT a.name, SUM(b.price) FROM authors a JOIN books b ON b.author_id = a.id GROUP BY a.name")
		require.NoError(t, err)
		assert.Equal(t, "/authors", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "books(price.sum())")
	})

	t.Run("aggregate with ORDER BY", func(t *testing.T) {
		result, err := conv.Convert("SELECT a.name, COUNT(b.id) AS book_count FROM authors a JOIN books b ON b.author_id = a.id GROUP BY a.id, a.name ORDER BY a.name")
		require.NoError(t, err)
		assert.Equal(t, "/authors", result.Path)
		assert.Equal(t, "name.asc", result.QueryParams.Get("order"))
	})

	t.Run("aggregate with LIMIT", func(t *testing.T) {
		result, err := conv.Convert("SELECT c.name, SUM(o.total) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id LIMIT 10")
		require.NoError(t, err)
		assert.Equal(t, "/customers", result.Path)
		assert.Equal(t, "10", result.QueryParams.Get("limit"))
	})

	t.Run("COUNT with different column styles", func(t *testing.T) {
		tests := []struct {
			name string
			sql  string
		}{
			{"COUNT(column)", "SELECT a.name, COUNT(b.id) FROM authors a JOIN books b ON b.author_id = a.id GROUP BY a.name"},
			{"COUNT(*)", "SELECT a.name, COUNT(*) FROM authors a JOIN books b ON b.author_id = a.id GROUP BY a.name"},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				result, err := conv.Convert(tt.sql)
				require.NoError(t, err)
				assert.Equal(t, "/authors", result.Path)
			})
		}
	})
}

func TestAggregatesComplex(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("full featured aggregate query", func(t *testing.T) {
		result, err := conv.Convert(`
			SELECT 
				c.id,
				c.name,
				c.email,
				COUNT(o.id) AS order_count,
				SUM(o.total) AS total_spent,
				AVG(o.total) AS avg_order,
				MAX(o.total) AS largest_order,
				MIN(o.total) AS smallest_order
			FROM customers c
			LEFT JOIN orders o ON o.customer_id = c.id
			WHERE c.active = true
			GROUP BY c.id, c.name, c.email
			ORDER BY c.name
			LIMIT 50
		`)
		require.NoError(t, err)
		assert.Equal(t, "/customers", result.Path)

		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "id")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "email")
		assert.Contains(t, selectStr, "orders(")
		assert.Contains(t, selectStr, "order_count:id.count()")
		assert.Contains(t, selectStr, "total_spent:total.sum()")
		assert.Contains(t, selectStr, "avg_order:total.avg()")
		assert.Contains(t, selectStr, "largest_order:total.max()")
		assert.Contains(t, selectStr, "smallest_order:total.min()")

		assert.Equal(t, "eq.true", result.QueryParams.Get("active"))
		assert.Equal(t, "name.asc", result.QueryParams.Get("order"))
		assert.Equal(t, "50", result.QueryParams.Get("limit"))
	})

	t.Run("aggregate with complex WHERE", func(t *testing.T) {
		result, err := conv.Convert(`
			SELECT 
				p.category,
				COUNT(s.id) AS num_sales,
				SUM(s.quantity) AS total_quantity
			FROM products p
			JOIN sales s ON s.product_id = p.id
			WHERE p.active = true 
				AND s.sale_date >= '2024-01-01'
				AND s.amount > 100
			GROUP BY p.id, p.category
		`)
		require.NoError(t, err)
		assert.Equal(t, "/products", result.Path)
		assert.Equal(t, "eq.true", result.QueryParams.Get("active"))
		assert.Equal(t, "gte.2024-01-01", result.QueryParams.Get("sale_date"))
		assert.Equal(t, "gt.100", result.QueryParams.Get("amount"))
	})
}

func TestGroupByNative(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("GROUP BY with COUNT", func(t *testing.T) {
		result, err := conv.Convert("SELECT status, COUNT(*) FROM orders GROUP BY status")
		require.NoError(t, err)
		assert.Equal(t, "/orders", result.Path)
		assert.Equal(t, "status,count()", result.QueryParams.Get("select"))
	})

	t.Run("GROUP BY with aliased COUNT", func(t *testing.T) {
		result, err := conv.Convert("SELECT status, COUNT(*) AS total FROM users GROUP BY status")
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		assert.Equal(t, "status,total:count()", result.QueryParams.Get("select"))
	})

	t.Run("GROUP BY with SUM", func(t *testing.T) {
		result, err := conv.Convert("SELECT category, SUM(amount) AS total FROM orders GROUP BY category")
		require.NoError(t, err)
		assert.Equal(t, "category,total:amount.sum()", result.QueryParams.Get("select"))
	})

	t.Run("GROUP BY multiple columns", func(t *testing.T) {
		result, err := conv.Convert("SELECT status, region, COUNT(*) FROM orders GROUP BY status, region")
		require.NoError(t, err)
		assert.Equal(t, "status,region,count()", result.QueryParams.Get("select"))
	})

	t.Run("qualified columns are stripped in output", func(t *testing.T) {
		// PostgREST rejects table qualifiers in select=, so the base-table
		// prefix must be stripped from every emitted item.
		result, err := conv.Convert("SELECT orders.status, SUM(orders.amount) AS total FROM orders GROUP BY orders.status")
		require.NoError(t, err)
		assert.Equal(t, "status,total:amount.sum()", result.QueryParams.Get("select"))
	})

	t.Run("qualified cast is stripped in output", func(t *testing.T) {
		result, err := conv.Convert("SELECT orders.status::text, COUNT(*) FROM orders GROUP BY orders.status")
		require.NoError(t, err)
		assert.Equal(t, "status::text,count()", result.QueryParams.Get("select"))
	})

	t.Run("GROUP BY ordinal pointing at a cast", func(t *testing.T) {
		result, err := conv.Convert("SELECT status::text, COUNT(*) FROM orders GROUP BY 1")
		require.NoError(t, err)
		assert.Equal(t, "status::text,count()", result.QueryParams.Get("select"))
	})

	t.Run("GROUP BY table-qualified column", func(t *testing.T) {
		result, err := conv.Convert("SELECT status, COUNT(*) FROM orders GROUP BY orders.status")
		require.NoError(t, err)
		assert.Equal(t, "status,count()", result.QueryParams.Get("select"))
	})

	t.Run("GROUP BY ordinal", func(t *testing.T) {
		result, err := conv.Convert("SELECT status, COUNT(*) FROM orders GROUP BY 1")
		require.NoError(t, err)
		assert.Equal(t, "status,count()", result.QueryParams.Get("select"))
	})

	t.Run("GROUP BY with WHERE and LIMIT", func(t *testing.T) {
		result, err := conv.Convert("SELECT status, COUNT(*) AS n FROM orders WHERE amount > 100 GROUP BY status LIMIT 5")
		require.NoError(t, err)
		assert.Equal(t, "status,n:count()", result.QueryParams.Get("select"))
		assert.Equal(t, "gt.100", result.QueryParams.Get("amount"))
		assert.Equal(t, "5", result.QueryParams.Get("limit"))
	})

	t.Run("GROUP BY with aliased base table", func(t *testing.T) {
		result, err := conv.Convert("SELECT status, COUNT(*) FROM users u GROUP BY status")
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		assert.Equal(t, "status,count()", result.QueryParams.Get("select"))
	})

	t.Run("GROUP BY output alias", func(t *testing.T) {
		result, err := conv.Convert("SELECT status AS s, COUNT(*) AS total FROM users GROUP BY s")
		require.NoError(t, err)
		assert.Equal(t, "s:status,total:count()", result.QueryParams.Get("select"))
	})

	t.Run("GROUP BY underlying column of aliased select", func(t *testing.T) {
		result, err := conv.Convert("SELECT status AS s, COUNT(*) AS total FROM users GROUP BY status")
		require.NoError(t, err)
		assert.Equal(t, "s:status,total:count()", result.QueryParams.Get("select"))
	})

	t.Run("GROUP BY JSON path", func(t *testing.T) {
		result, err := conv.Convert("SELECT data->>'type', COUNT(*) FROM events GROUP BY data->>'type'")
		require.NoError(t, err)
		assert.Equal(t, "data->>type,count()", result.QueryParams.Get("select"))
	})
}

func TestAggregateArgExpressions(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	cases := []struct{ name, sql, wantSelect string }{
		{"COUNT of JSON path", "SELECT COUNT(data->>'type') FROM events", "data->>type.count()"},
		{"SUM of JSON path with cast", "SELECT SUM(data->>'amount'::numeric) FROM t", "data->>amount::numeric.sum()"},
		{"SUM of JSON path with cast, aliased and grouped", "SELECT category, SUM(data->>'amount'::numeric) AS total FROM t GROUP BY category", "category,total:data->>amount::numeric.sum()"},
		{"nested JSON path aggregate", "SELECT SUM(data->'a'->>'b'::numeric) FROM t", "data->a->>b::numeric.sum()"},
		{"aggregate result cast", "SELECT AVG(amount)::int FROM orders", "amount.avg()::int4"},
		{"aggregate result cast with alias", "SELECT AVG(amount)::int AS avg_amt FROM orders", "avg_amt:amount.avg()::int4"},
		{"count star result cast", "SELECT COUNT(*)::int FROM orders", "count()::int4"},
		{"input and result cast", "SELECT SUM(amount::numeric)::int FROM orders", "amount::numeric.sum()::int4"},
		{"table-qualified JSON path stripped", "SELECT SUM(t.data->>'amount'::numeric) FROM t", "data->>amount::numeric.sum()"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := conv.Convert(tc.sql)
			require.NoError(t, err)
			assert.Equal(t, tc.wantSelect, result.QueryParams.Get("select"))
		})
	}
}

func TestAggregateArgUnsupported(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	cases := []struct{ name, sql, wantErr string }{
		{"arithmetic argument", "SELECT SUM(price * quantity) FROM orders", "arithmetic or computed"},
		{"parenthesized arithmetic", "SELECT SUM((price * quantity)) FROM orders", "arithmetic or computed"},
		{"addition argument", "SELECT SUM(a + b) FROM t", "arithmetic or computed"},
		{"nested function argument", "SELECT SUM(COALESCE(amount, 0)) FROM orders", "arithmetic or computed"},
		{"FILTER clause", "SELECT SUM(amount) FILTER (WHERE amount > 0) FROM orders", "FILTER"},
		{"window function", "SELECT SUM(count(*)) OVER () FROM responses_2026", "window function"},
		{"window function on join", "SELECT a.name, SUM(b.amount) OVER () FROM authors a JOIN books b ON b.author_id = a.id", "window function"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := conv.Convert(tc.sql)
			require.Error(t, err)
			assert.Contains(t, err.Error(), tc.wantErr)
		})
	}
}

func TestGroupByNotSupported(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("GROUP BY column missing from SELECT", func(t *testing.T) {
		_, err := conv.Convert("SELECT COUNT(*) FROM orders GROUP BY status")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "must also appear in SELECT")
	})

	t.Run("SELECT column missing from GROUP BY", func(t *testing.T) {
		_, err := conv.Convert("SELECT status, region, COUNT(*) FROM orders GROUP BY status")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "must also appear in GROUP BY")
	})

	t.Run("GROUP BY without aggregate", func(t *testing.T) {
		_, err := conv.Convert("SELECT status FROM orders GROUP BY status")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "without an aggregate function")
	})

	t.Run("GROUP BY with SELECT star", func(t *testing.T) {
		_, err := conv.Convert("SELECT *, COUNT(*) FROM orders GROUP BY status")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "SELECT *")
	})

	t.Run("GROUP BY with qualified SELECT star", func(t *testing.T) {
		_, err := conv.Convert("SELECT orders.*, COUNT(*) FROM orders GROUP BY status")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "SELECT *")
	})

	t.Run("COUNT DISTINCT rejected", func(t *testing.T) {
		_, err := conv.Convert("SELECT status, COUNT(DISTINCT user_id) AS n FROM orders GROUP BY status")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "DISTINCT")
	})

	t.Run("COUNT DISTINCT rejected on JOIN path", func(t *testing.T) {
		_, err := conv.Convert("SELECT a.name, COUNT(DISTINCT b.id) FROM authors a JOIN books b ON b.author_id = a.id GROUP BY a.name")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "DISTINCT")
	})

	t.Run("COUNT with extra arguments rejected", func(t *testing.T) {
		_, err := conv.Convert("SELECT COUNT(a, b) FROM users")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "COUNT accepts at most one argument")
	})

	t.Run("ORDER BY aggregate alias without GROUP BY", func(t *testing.T) {
		_, err := conv.Convert("SELECT COUNT(*) AS c FROM users ORDER BY c")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "ORDER BY on aggregated column")
	})

	t.Run("GROUP BY ROLLUP", func(t *testing.T) {
		_, err := conv.Convert("SELECT status, COUNT(*) FROM orders GROUP BY ROLLUP(status)")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "ROLLUP/CUBE")
	})

	t.Run("GROUP BY ROLLUP with JOIN", func(t *testing.T) {
		_, err := conv.Convert("SELECT a.name, COUNT(b.id) FROM authors a JOIN books b ON b.author_id = a.id GROUP BY ROLLUP(a.name)")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "ROLLUP/CUBE")
	})

	t.Run("GROUP BY DISTINCT", func(t *testing.T) {
		_, err := conv.Convert("SELECT status, COUNT(*) FROM orders GROUP BY DISTINCT status")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "GROUP BY DISTINCT")
	})

	t.Run("GROUP BY expression", func(t *testing.T) {
		_, err := conv.Convert("SELECT lower(status), COUNT(*) FROM orders GROUP BY lower(status)")
		require.Error(t, err)
		assert.Error(t, err)
	})

	t.Run("GROUP BY on joined-table column", func(t *testing.T) {
		_, err := conv.Convert("SELECT a.name, COUNT(b.id) FROM authors a JOIN books b ON b.author_id = a.id GROUP BY b.genre")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "joined-table column")
	})

	t.Run("ORDER BY aggregate alias", func(t *testing.T) {
		_, err := conv.Convert("SELECT status, COUNT(*) AS total FROM orders GROUP BY status ORDER BY total")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "ORDER BY on aggregated column")
	})

	t.Run("unsupported aggregate function", func(t *testing.T) {
		_, err := conv.Convert("SELECT a.name, STDDEV(b.price) FROM authors a JOIN books b ON b.author_id = a.id GROUP BY a.name")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported aggregate function")
	})
}
