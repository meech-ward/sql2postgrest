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
		assert.Contains(t, selectStr, "books(id.count():book_count)")
	})

	t.Run("COUNT(*) with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT a.name, COUNT(*) AS total FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.name")
		require.NoError(t, err)
		assert.Equal(t, "/authors", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "count():total")
	})

	t.Run("SUM with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT a.name, SUM(b.price) AS total_price FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.name")
		require.NoError(t, err)
		assert.Equal(t, "/authors", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "books(price.sum():total_price)")
	})

	t.Run("AVG with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT c.name, AVG(o.total) AS avg_order FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id")
		require.NoError(t, err)
		assert.Equal(t, "/customers", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "orders(total.avg():avg_order)")
	})

	t.Run("MAX with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT u.email, MAX(o.amount) AS max_order FROM users u JOIN orders o ON o.user_id = u.id GROUP BY u.id")
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "email")
		assert.Contains(t, selectStr, "orders(amount.max():max_order)")
	})

	t.Run("MIN with JOIN", func(t *testing.T) {
		result, err := conv.Convert("SELECT p.name, MIN(s.quantity) AS min_stock FROM products p JOIN stock s ON s.product_id = p.id GROUP BY p.id")
		require.NoError(t, err)
		assert.Equal(t, "/products", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "stock(quantity.min():min_stock)")
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
		assert.Contains(t, selectStr, "id.count():book_count")
		assert.Contains(t, selectStr, "price.sum():total_revenue")
	})

	t.Run("aggregates with multiple group by columns", func(t *testing.T) {
		result, err := conv.Convert("SELECT c.name, c.city, SUM(o.total) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name, c.city")
		require.NoError(t, err)
		assert.Equal(t, "/customers", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "city")
		assert.Contains(t, selectStr, "orders(total.sum():revenue)")
	})

	t.Run("aggregate with WHERE clause", func(t *testing.T) {
		result, err := conv.Convert("SELECT a.name, COUNT(b.id) AS published_books FROM authors a JOIN books b ON b.author_id = a.id WHERE b.published = true GROUP BY a.id, a.name")
		require.NoError(t, err)
		assert.Equal(t, "/authors", result.Path)
		selectStr := result.QueryParams.Get("select")
		assert.Contains(t, selectStr, "name")
		assert.Contains(t, selectStr, "books(id.count():published_books)")
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
		assert.Contains(t, selectStr, "orders(id.count():order_count)")
		assert.Contains(t, selectStr, "payments(amount.sum():total_paid)")
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
		assert.Contains(t, selectStr, "orders(id.count():num_orders)")
		assert.Contains(t, selectStr, "order_items(quantity.avg():avg_items)")
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
		assert.Contains(t, selectStr, "id.count():order_count")
		assert.Contains(t, selectStr, "total.sum():total_spent")
		assert.Contains(t, selectStr, "total.avg():avg_order")
		assert.Contains(t, selectStr, "total.max():largest_order")
		assert.Contains(t, selectStr, "total.min():smallest_order")

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

func TestAggregatesNotSupported(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("GROUP BY without JOIN not supported", func(t *testing.T) {
		_, err := conv.Convert("SELECT status, COUNT(*) FROM orders GROUP BY status")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "GROUP BY not supported for simple queries")
	})

	t.Run("unsupported aggregate function", func(t *testing.T) {
		_, err := conv.Convert("SELECT a.name, STDDEV(b.price) FROM authors a JOIN books b ON b.author_id = a.id GROUP BY a.name")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported aggregate function")
	})
}
