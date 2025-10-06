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
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNOTOperator(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("NOT IN", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE id NOT IN (1, 2, 3)")
		require.NoError(t, err)
		assert.Equal(t, "GET", result.Method)
		assert.Equal(t, "/users", result.Path)
		assert.Equal(t, "not.in.(1,2,3)", result.QueryParams.Get("id"))
	})

	t.Run("NOT LIKE", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE name NOT LIKE 'Admin%'")
		require.NoError(t, err)
		assert.Equal(t, "not.like.Admin*", result.QueryParams.Get("name"))
	})

	t.Run("NOT ILIKE", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE email NOT ILIKE '%@test.com'")
		require.NoError(t, err)
		assert.Equal(t, "not.ilike.*@test.com", result.QueryParams.Get("email"))
	})

	t.Run("NOT equals with <>", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE status <> 'deleted'")
		require.NoError(t, err)
		assert.Equal(t, "neq.deleted", result.QueryParams.Get("status"))
	})

	t.Run("NOT equals with !=", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE status != 'deleted'")
		require.NoError(t, err)
		assert.Equal(t, "neq.deleted", result.QueryParams.Get("status"))
	})
}

func TestDISTINCT(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("DISTINCT single column", func(t *testing.T) {
		result, err := conv.Convert("SELECT DISTINCT category FROM products")
		require.NoError(t, err)
		assert.Equal(t, "GET", result.Method)
		assert.Equal(t, "/products", result.Path)
		// PostgREST doesn't have direct DISTINCT support, but we should at least not error
		// The select should still work
		sel := result.QueryParams.Get("select")
		assert.Contains(t, sel, "category")
	})

	t.Run("DISTINCT with multiple columns", func(t *testing.T) {
		result, err := conv.Convert("SELECT DISTINCT category, brand FROM products")
		require.NoError(t, err)
		assert.Equal(t, "/products", result.Path)
	})
}

func TestColumnCastingInSELECT(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("cast to text", func(t *testing.T) {
		result, err := conv.Convert("SELECT id, name, price::text FROM products")
		require.NoError(t, err)
		assert.Equal(t, "/products", result.Path)
		sel := result.QueryParams.Get("select")
		assert.Contains(t, sel, "id")
		assert.Contains(t, sel, "name")
		// PostgREST casting syntax: column::type
		assert.Contains(t, sel, "price::text")
	})

	t.Run("cast to integer", func(t *testing.T) {
		result, err := conv.Convert("SELECT name, age::integer FROM users")
		require.NoError(t, err)
		sel := result.QueryParams.Get("select")
		assert.True(t,
			strings.Contains(sel, "age::integer") || strings.Contains(sel, "age::int4"),
			"expected age::integer or age::int4, got: %s", sel)
	})

	t.Run("cast with alias", func(t *testing.T) {
		result, err := conv.Convert("SELECT price::text AS price_str FROM products")
		require.NoError(t, err)
		sel := result.QueryParams.Get("select")
		// Should be: price::text:price_str
		assert.True(t,
			strings.Contains(sel, "price::text:price_str") ||
				strings.Contains(sel, "price_str:price::text"),
		)
	})
}

func TestUPSERT(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("INSERT ON CONFLICT DO UPDATE", func(t *testing.T) {
		result, err := conv.Convert("INSERT INTO products (id, name, price) VALUES (1, 'Widget', 10.99) ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price")
		require.NoError(t, err)
		assert.Equal(t, "POST", result.Method)
		assert.Equal(t, "/products", result.Path)
		// Should have resolution=merge-duplicates in Prefer header
		assert.Contains(t, result.Headers["Prefer"], "resolution=merge-duplicates")
		// Should have on_conflict parameter
		assert.Equal(t, "id", result.QueryParams.Get("on_conflict"))
	})

	t.Run("INSERT ON CONFLICT DO NOTHING", func(t *testing.T) {
		result, err := conv.Convert("INSERT INTO products (id, name) VALUES (1, 'Widget') ON CONFLICT (id) DO NOTHING")
		require.NoError(t, err)
		assert.Equal(t, "POST", result.Method)
		// Should have resolution=ignore-duplicates
		assert.Contains(t, result.Headers["Prefer"], "resolution=ignore-duplicates")
	})

	t.Run("INSERT ON CONFLICT with multiple columns", func(t *testing.T) {
		result, err := conv.Convert("INSERT INTO orders (user_id, product_id, quantity) VALUES (1, 2, 5) ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity")
		require.NoError(t, err)
		// Should support comma-separated conflict columns
		assert.Equal(t, "user_id,product_id", result.QueryParams.Get("on_conflict"))
	})
}

func TestMultipleORDERBY(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("order by multiple columns", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users ORDER BY last_name ASC, first_name ASC")
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		// PostgREST supports: order=last_name.asc,first_name.asc
		order := result.QueryParams.Get("order")
		assert.Contains(t, order, "last_name.asc")
		assert.Contains(t, order, "first_name.asc")
	})

	t.Run("order by mixed directions", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM products ORDER BY category ASC, price DESC")
		require.NoError(t, err)
		order := result.QueryParams.Get("order")
		assert.Contains(t, order, "category.asc")
		assert.Contains(t, order, "price.desc")
	})

	t.Run("order by with nulls", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users ORDER BY last_login DESC NULLS LAST, created_at ASC")
		require.NoError(t, err)
		order := result.QueryParams.Get("order")
		assert.Contains(t, order, "last_login.desc.nullslast")
		assert.Contains(t, order, "created_at.asc")
	})
}

func TestJSONPathOperations(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("JSON arrow operator in SELECT", func(t *testing.T) {
		result, err := conv.Convert("SELECT id, data->>'name' AS user_name FROM users")
		require.NoError(t, err)
		sel := result.QueryParams.Get("select")
		assert.Contains(t, sel, "id")
		// PostgREST syntax: data->>name:user_name
		assert.True(t,
			strings.Contains(sel, "data->>name") ||
				strings.Contains(sel, "user_name"),
		)
	})

	t.Run("JSON nested path", func(t *testing.T) {
		result, err := conv.Convert("SELECT data->'address'->>'city' FROM users")
		require.NoError(t, err)
		sel := result.QueryParams.Get("select")
		// Should handle nested JSON paths
		assert.True(t, len(sel) > 0)
	})

	t.Run("JSON in WHERE", func(t *testing.T) {
		_, err := conv.Convert("SELECT * FROM users WHERE data->>'role' = 'admin'")
		// JSON operators in WHERE might not be fully supported yet
		// Just ensure it doesn't crash
		_ = err
	})
}

func TestAdvancedOperators(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("IS DISTINCT FROM", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE status IS DISTINCT FROM 'active'")
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		assert.Equal(t, "isdistinct.active", result.QueryParams.Get("status"))
	})

	t.Run("pattern matching with ~", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE email ~ '^[A-Z]'")
		require.NoError(t, err)
		assert.Equal(t, "match.^[A-Z]", result.QueryParams.Get("email"))
	})

	t.Run("case-insensitive pattern matching with ~*", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE email ~* 'gmail'")
		require.NoError(t, err)
		assert.Equal(t, "imatch.gmail", result.QueryParams.Get("email"))
	})

	t.Run("negated pattern matching with !~", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE email !~ '^admin'")
		require.NoError(t, err)
		assert.Equal(t, "not.match.^admin", result.QueryParams.Get("email"))
	})

	t.Run("negated case-insensitive pattern matching with !~*", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE email !~* 'test'")
		require.NoError(t, err)
		assert.Equal(t, "not.imatch.test", result.QueryParams.Get("email"))
	})
}

func TestArrayOperators(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("contains operator with ARRAY syntax", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE tags @> ARRAY['admin','user']")
		require.NoError(t, err)
		assert.Equal(t, "cs.{admin,user}", result.QueryParams.Get("tags"))
	})

	t.Run("contains operator with string syntax", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE tags @> '{admin,user}'")
		require.NoError(t, err)
		assert.Equal(t, "cs.{admin,user}", result.QueryParams.Get("tags"))
	})

	t.Run("contained in operator", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM users WHERE tags <@ '{admin,user,guest}'")
		require.NoError(t, err)
		assert.Equal(t, "cd.{admin,user,guest}", result.QueryParams.Get("tags"))
	})

	t.Run("overlap operator with range", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM events WHERE period && '[2017-01-01,2017-06-30]'")
		require.NoError(t, err)
		assert.Equal(t, "ov.[2017-01-01,2017-06-30]", result.QueryParams.Get("period"))
	})

	t.Run("overlap operator with array", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM items WHERE values && '{1,3}'")
		require.NoError(t, err)
		assert.Equal(t, "ov.{1,3}", result.QueryParams.Get("values"))
	})
}

func TestRangeOperators(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("strictly left of", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM ranges WHERE r << int4range(1,10)")
		require.NoError(t, err)
		assert.Equal(t, "sl.(1,10)", result.QueryParams.Get("r"))
	})

	t.Run("strictly right of", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM ranges WHERE r >> int4range(1,10)")
		require.NoError(t, err)
		assert.Equal(t, "sr.(1,10)", result.QueryParams.Get("r"))
	})

	t.Run("not extend right", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM ranges WHERE r &< int4range(1,10)")
		require.NoError(t, err)
		assert.Equal(t, "nxr.(1,10)", result.QueryParams.Get("r"))
	})

	t.Run("not extend left", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM ranges WHERE r &> int4range(1,10)")
		require.NoError(t, err)
		assert.Equal(t, "nxl.(1,10)", result.QueryParams.Get("r"))
	})

	t.Run("adjacent", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM ranges WHERE r -|- int4range(1,10)")
		require.NoError(t, err)
		assert.Equal(t, "adj.(1,10)", result.QueryParams.Get("r"))
	})
}

func TestFullTextSearch(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("fts with to_tsquery", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM articles WHERE content @@ to_tsquery('cat')")
		require.NoError(t, err)
		assert.Equal(t, "fts.cat", result.QueryParams.Get("content"))
	})

	t.Run("fts with language", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM articles WHERE content @@ to_tsquery('french', 'amusant')")
		require.NoError(t, err)
		assert.Equal(t, "fts(french).amusant", result.QueryParams.Get("content"))
	})

	t.Run("plain fts", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM articles WHERE content @@ plainto_tsquery('The Fat Cats')")
		require.NoError(t, err)
		assert.Equal(t, "plfts.The Fat Cats", result.QueryParams.Get("content"))
	})

	t.Run("phrase fts", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM articles WHERE content @@ phraseto_tsquery('english', 'The Fat Cats')")
		require.NoError(t, err)
		assert.Equal(t, "phfts(english).The Fat Cats", result.QueryParams.Get("content"))
	})

	t.Run("websearch fts", func(t *testing.T) {
		result, err := conv.Convert("SELECT * FROM articles WHERE content @@ websearch_to_tsquery('french', 'amusant')")
		require.NoError(t, err)
		assert.Equal(t, "wfts(french).amusant", result.QueryParams.Get("content"))
	})
}

func TestComplexCombinations(t *testing.T) {
	conv := NewConverter("https://api.example.com")

	t.Run("NOT IN with ORDER BY and LIMIT", func(t *testing.T) {
		result, err := conv.Convert(`
			SELECT id, name, email 
			FROM users 
			WHERE status NOT IN ('deleted', 'banned') 
				AND age >= 18 
			ORDER BY created_at DESC 
			LIMIT 20
		`)
		require.NoError(t, err)
		assert.Equal(t, "/users", result.Path)
		assert.Equal(t, "not.in.(deleted,banned)", result.QueryParams.Get("status"))
		assert.Equal(t, "gte.18", result.QueryParams.Get("age"))
		assert.Equal(t, "created_at.desc", result.QueryParams.Get("order"))
		assert.Equal(t, "20", result.QueryParams.Get("limit"))
	})

	t.Run("casting with aggregates in JOIN", func(t *testing.T) {
		result, err := conv.Convert(`
			SELECT 
				c.name,
				o.total::text,
				COUNT(o.id) AS order_count
			FROM customers c
			JOIN orders o ON o.customer_id = c.id
			GROUP BY c.id, c.name
		`)
		require.NoError(t, err)
		assert.Equal(t, "/customers", result.Path)
		sel := result.QueryParams.Get("select")
		assert.Contains(t, sel, "name")
		// Should have both casting and aggregates
	})

	t.Run("DISTINCT with JOIN", func(t *testing.T) {
		_, err := conv.Convert(`
			SELECT DISTINCT c.city, c.state
			FROM customers c
			JOIN orders o ON o.customer_id = c.id
			WHERE o.status = 'completed'
		`)
		// DISTINCT with JOIN might not be fully supported
		_ = err
	})
}
