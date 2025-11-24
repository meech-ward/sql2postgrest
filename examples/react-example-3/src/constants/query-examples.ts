export interface QueryExample {
  label: string
  category: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'Advanced'
  sql: string
  supabaseJs: string
  postgrest: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    path: string
    body?: string
  }
}

export const QUERY_EXAMPLES: QueryExample[] = [
  // --- SELECT ---
  {
    label: 'Simple SELECT',
    category: 'SELECT',
    sql: 'SELECT * FROM users WHERE age > 18',
    supabaseJs: `supabase
  .from('users')
  .select('*')
  .gt('age', 18)`,
    postgrest: {
      method: 'GET',
      path: '/rest/v1/users?age=gt.18',
    }
  },
  {
    label: 'Complex WHERE with AND/OR',
    category: 'SELECT',
    sql: `SELECT id, name, email, created_at
FROM users
WHERE (age >= 21 AND status = 'active')
   OR (role = 'admin' AND verified = true)`,
    supabaseJs: `supabase
  .from('users')
  .select('id, name, email, created_at')
  .or('and(age.gte.21,status.eq.active),and(role.eq.admin,verified.eq.true)')`,
    postgrest: {
      method: 'GET',
      path: '/rest/v1/users?select=id,name,email,created_at&or=(and(age.gte.21,status.eq.active),and(role.eq.admin,verified.eq.true))',
    }
  },
  {
    label: 'Pattern Matching (ILIKE)',
    category: 'SELECT',
    sql: `SELECT * FROM products
WHERE name ILIKE '%phone%'
  AND price < 1000
ORDER BY price DESC
LIMIT 20`,
    supabaseJs: `supabase
  .from('products')
  .select('*')
  .ilike('name', '%phone%')
  .lt('price', 1000)
  .order('price', { ascending: false })
  .limit(20)`,
    postgrest: {
      method: 'GET',
      path: '/rest/v1/products?name=ilike.*phone*&price=lt.1000&order=price.desc&limit=20',
    }
  },
  {
    label: 'IN Operator',
    category: 'SELECT',
    sql: `SELECT * FROM users
WHERE status IN ('active', 'premium', 'trial')`,
    supabaseJs: `supabase
  .from('users')
  .select('*')
  .in('status', ['active', 'premium', 'trial'])`,
    postgrest: {
      method: 'GET',
      path: '/rest/v1/users?status=in.(active,premium,trial)',
    }
  },
  {
    label: 'NOT & IS NULL',
    category: 'SELECT',
    sql: `SELECT * FROM posts
WHERE deleted_at IS NULL
  AND NOT draft = true`,
    supabaseJs: `supabase
  .from('posts')
  .select('*')
  .is('deleted_at', null)
  .neq('draft', true)`,
    postgrest: {
      method: 'GET',
      path: '/rest/v1/posts?deleted_at=is.null&draft=neq.true',
    }
  },

  // --- INSERT ---
  {
    label: 'INSERT Single Row',
    category: 'INSERT',
    sql: `INSERT INTO users (name, email, age, role)
VALUES ('John Doe', 'john@example.com', 28, 'member')`,
    supabaseJs: `supabase
  .from('users')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    age: 28,
    role: 'member'
  })`,
    postgrest: {
      method: 'POST',
      path: '/rest/v1/users',
      body: `{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 28,
  "role": "member"
}`
    }
  },
  {
    label: 'INSERT Multiple Rows',
    category: 'INSERT',
    sql: `INSERT INTO products (name, price, category, in_stock)
VALUES
  ('Laptop', 999.99, 'electronics', true),
  ('Mouse', 29.99, 'accessories', true),
  ('Keyboard', 79.99, 'accessories', false)`,
    supabaseJs: `supabase
  .from('products')
  .insert([
    { name: 'Laptop', price: 999.99, category: 'electronics', in_stock: true },
    { name: 'Mouse', price: 29.99, category: 'accessories', in_stock: true },
    { name: 'Keyboard', price: 79.99, category: 'accessories', in_stock: false }
  ])`,
    postgrest: {
      method: 'POST',
      path: '/rest/v1/products',
      body: `[
  { "name": "Laptop", "price": 999.99, "category": "electronics", "in_stock": true },
  { "name": "Mouse", "price": 29.99, "category": "accessories", "in_stock": true },
  { "name": "Keyboard", "price": 79.99, "category": "accessories", "in_stock": false }
]`
    }
  },
  {
    label: 'UPSERT (ON CONFLICT)',
    category: 'INSERT',
    sql: `INSERT INTO inventory (product_id, quantity)
VALUES (42, 100)
ON CONFLICT (product_id)
DO UPDATE SET quantity = EXCLUDED.quantity`,
    supabaseJs: `supabase
  .from('inventory')
  .upsert(
    { product_id: 42, quantity: 100 },
    { onConflict: 'product_id' }
  )`,
    postgrest: {
      method: 'POST',
      path: '/rest/v1/inventory?on_conflict=product_id',
      body: `{
  "product_id": 42,
  "quantity": 100
}`
    }
  },

  // --- UPDATE ---
  {
    label: 'UPDATE Simple',
    category: 'UPDATE',
    sql: `UPDATE users
SET status = 'inactive'
WHERE age < 18`,
    supabaseJs: `supabase
  .from('users')
  .update({ status: 'inactive' })
  .lt('age', 18)`,
    postgrest: {
      method: 'PATCH',
      path: '/rest/v1/users?age=lt.18',
      body: `{
  "status": "inactive"
}`
    }
  },
  {
    label: 'UPDATE with JSON',
    category: 'UPDATE',
    sql: `UPDATE profiles
SET settings = '{"theme": "dark"}'::jsonb
WHERE user_id IN (1, 2, 3)`,
    supabaseJs: `supabase
  .from('profiles')
  .update({ settings: { theme: 'dark' } })
  .in('user_id', [1, 2, 3])`,
    postgrest: {
      method: 'PATCH',
      path: '/rest/v1/profiles?user_id=in.(1,2,3)',
      body: `{
  "settings": { "theme": "dark" }
}`
    }
  },

  // --- DELETE ---
  {
    label: 'DELETE with Conditions',
    category: 'DELETE',
    sql: `DELETE FROM sessions
WHERE user_id = 123`,
    supabaseJs: `supabase
  .from('sessions')
  .delete()
  .eq('user_id', 123)`,
    postgrest: {
      method: 'DELETE',
      path: '/rest/v1/sessions?user_id=eq.123',
    }
  },

  // --- ADVANCED ---
  {
    label: 'JSON Operators',
    category: 'Advanced',
    sql: `SELECT * FROM orders
WHERE metadata->>'status' = 'shipped'`,
    supabaseJs: `supabase
  .from('orders')
  .select('*')
  .eq('metadata->>status', 'shipped')`,
    postgrest: {
      method: 'GET',
      path: '/rest/v1/orders?metadata->>status=eq.shipped',
    }
  },
  {
    label: 'Array Contains',
    category: 'Advanced',
    sql: `SELECT * FROM posts
WHERE tags @> ARRAY['javascript', 'react']`,
    supabaseJs: `supabase
  .from('posts')
  .select('*')
  .contains('tags', ['javascript', 'react'])`,
    postgrest: {
      method: 'GET',
      path: '/rest/v1/posts?tags=cs.{javascript,react}',
    }
  },
  {
    label: 'Full-text Search',
    category: 'Advanced',
    sql: `SELECT * FROM articles
WHERE content @@ to_tsquery('postgres & (sql | database)')
ORDER BY created_at DESC`,
    supabaseJs: `supabase
  .from('articles')
  .select('*')
  .textSearch('content', 'postgres & (sql | database)')
  .order('created_at', { ascending: false })`,
    postgrest: {
      method: 'GET',
      path: '/rest/v1/articles?content=fts.postgres%20%26%20(sql%20%7C%20database)&order=created_at.desc',
    }
  },
]

export const EXAMPLE_CATEGORIES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'Advanced'] as const
