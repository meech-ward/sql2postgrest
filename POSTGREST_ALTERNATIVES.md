# PostgREST Alternatives for Complex SQL Patterns

This document shows PostgREST-native ways to achieve results that complex SQL queries with aggregations would produce.

## Complex JOIN with Aggregations

### ❌ SQL Pattern (Not Supported)

```sql
SELECT 
    o.id,
    json_build_object('name', c.name) AS customer,
    json_agg(json_build_object(
        'quantity', oi.quantity,
        'product', json_build_object('name', p.name)
    )) AS items
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
GROUP BY o.id, c.name;
```

### ✅ PostgREST Alternative

Instead, use PostgREST's native embedded resources which automatically handle the relationships:

```bash
# Get orders with embedded customer and items
GET /orders?select=id,customer:customers(name),order_items(quantity,product:products(name))
```

This returns:
```json
[
  {
    "id": 1,
    "customer": {
      "name": "John Doe"
    },
    "order_items": [
      {
        "quantity": 2,
        "product": {
          "name": "Widget"
        }
      },
      {
        "quantity": 1,
        "product": {
          "name": "Gadget"
        }
      }
    ]
  }
]
```

## Using sql2postgrest for Simple JOINs

For queries **without aggregations**, sql2postgrest can help:

```bash
# Simple JOIN - works!
./sql2postgrest "SELECT o.id, c.name, oi.quantity, p.name FROM orders o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN products p ON p.id = oi.product_id"

# Output:
# {"method":"GET","url":"http://localhost:3000/orders?select=id,customers(name),order_items(quantity),products(name)"}
```

## Aggregation Alternatives

### ❌ COUNT with JOIN

```sql
SELECT a.name, COUNT(b.id) as book_count 
FROM authors a 
LEFT JOIN books b ON b.author_id = a.id 
GROUP BY a.id;
```

### ✅ PostgREST Alternative

Use the `count` hint:

```bash
GET /authors?select=name,books(count)
```

Or use the Prefer header for total count:

```bash
GET /books?select=title&author_id=eq.5
Prefer: count=exact
```

### ❌ SUM/AVG with JOIN

```sql
SELECT c.name, SUM(o.total) as total_spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id;
```

### ✅ PostgREST Alternative

Use aggregate functions in the select:

```bash
GET /customers?select=name,orders.total.sum()
```

## Nested Resources

PostgREST automatically handles nested relationships. The structure matches your foreign key constraints:

```bash
# Three levels deep
GET /users?select=name,posts(title,comments(content,author:users(name)))

# With filters on nested resources
GET /authors?select=name,books(title)&books.published_year=gte.2020

# With limits on nested resources
GET /authors?select=name,books(title)&books.limit=5
```

## Resources

- [PostgREST Resource Embedding](https://postgrest.org/en/stable/references/api/resource_embedding.html)
- [PostgREST Aggregate Functions](https://postgrest.org/en/stable/references/api/aggregate_functions.html)
- [PostgREST Filters](https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-filtering)
