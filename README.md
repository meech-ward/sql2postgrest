# sql2postgrest

Convert PostgreSQL SQL queries to [PostgREST](https://postgrest.org) REST API requests.

**[Try the web playground →](https://sql2postg.rest)**

## Quick Start

```bash
# Install
go install github.com/meech-ward/sql2postgrest/cmd/sql2postgrest@latest

# Or build from source
git clone https://github.com/meech-ward/sql2postgrest
cd sql2postgrest
go build -o sql2postgrest ./cmd/sql2postgrest

# Use it
./sql2postgrest "SELECT * FROM users WHERE age > 18"
```

**Output:**
```json
{"method":"GET","url":"http://localhost:3000/users?age=gt.18"}
```

## Usage

```bash
# SELECT with filters
./sql2postgrest "SELECT id, name FROM users WHERE status = 'active' LIMIT 10"
→ GET /users?select=id,name&status=eq.active&limit=10

# INSERT
./sql2postgrest "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')"
→ POST /users

# UPDATE
./sql2postgrest "UPDATE users SET status = 'inactive' WHERE id = 5"
→ PATCH /users?id=eq.5

# DELETE
./sql2postgrest "DELETE FROM users WHERE created_at < '2020-01-01'"
→ DELETE /users?created_at=lt.2020-01-01

# JOINs (converted to embedded resources)
./sql2postgrest "SELECT a.name, b.title FROM authors a JOIN books b ON b.author_id = a.id"
→ GET /authors?select=name,books(title)

# Aggregates
./sql2postgrest "SELECT a.name, COUNT(b.id) AS book_count FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.id"
→ GET /authors?select=name,books(id.count():book_count)
```

## Supported SQL Features

### ✅ Queries
- **SELECT**: Column selection, aliases, WHERE, ORDER BY, LIMIT, OFFSET
- **INSERT**: Single/bulk insert, UPSERT (ON CONFLICT)
- **UPDATE**: Single/multiple columns with WHERE
- **DELETE**: With WHERE clause

### ✅ Operators
- **Comparison**: `=, <>, !=, >, >=, <, <=`
- **Pattern**: `LIKE, ILIKE, NOT LIKE, NOT ILIKE`
- **Regex**: `~, ~*, !~, !~*`
- **Lists**: `IN, NOT IN`
- **Range**: `BETWEEN, NOT BETWEEN`
- **Null**: `IS NULL, IS NOT NULL`
- **Distinct**: `IS DISTINCT FROM`
- **Array**: `@> (contains), <@ (contained)`
- **Range**: `<<, >>, &<, &>, -|- (strictly left/right, adjacent)`
- **Overlap**: `&&`
- **Full-text**: `@@` with `to_tsquery, plainto_tsquery, phraseto_tsquery, websearch_to_tsquery`

### ✅ Advanced
- **Type casting**: `SELECT price::text AS price_str`
- **JSON paths**: `SELECT data->>'name', data->'address'->>'city'`
- **JOINs**: LEFT/INNER/RIGHT (converted to embedded resources)
- **Aggregates**: COUNT, SUM, AVG, MIN, MAX (with/without JOINs)
- **OR conditions**: `WHERE age < 18 OR age > 65`

### ❌ Not Supported
- **CTEs (WITH), Subqueries, Window functions** - No PostgREST equivalent
- **HAVING** - Create a database VIEW instead:
  ```sql
  -- ❌ Can't convert: SELECT author_id, COUNT(*) FROM books GROUP BY author_id HAVING COUNT(*) > 5
  -- ✅ Create VIEW: CREATE VIEW prolific_authors AS SELECT ... HAVING COUNT(*) > 5
  -- Then query: GET /prolific_authors
  ```
- **json_agg/json_build_object** - PostgREST handles JSON automatically:
  ```sql
  -- ❌ Don't use: SELECT a.name, json_agg(...) FROM authors a JOIN books b ...
  -- ✅ Instead use: SELECT a.name, b.title FROM authors a JOIN books b ...
  -- Result: GET /authors?select=name,books(title) - PostgREST returns JSON array
  ```

## Examples

### Pattern Matching
```bash
./sql2postgrest "SELECT * FROM users WHERE email ~ '^admin'"
→ email=match.^admin

./sql2postgrest "SELECT * FROM users WHERE name NOT ILIKE '%test%'"
→ name=not.ilike.*test*
```

### Arrays & Ranges
```bash
./sql2postgrest "SELECT * FROM users WHERE tags @> ARRAY['admin','user']"
→ tags=cs.{admin,user}

./sql2postgrest "SELECT * FROM events WHERE period && '[2024-01-01,2024-12-31]'"
→ period=ov.[2024-01-01,2024-12-31]
```

### Full-Text Search
```bash
./sql2postgrest "SELECT * FROM articles WHERE content @@ plainto_tsquery('english', 'fat cats')"
→ content=plfts(english).fat cats
```

### UPSERT
```bash
./sql2postgrest "INSERT INTO products (id, name, price) VALUES (1, 'Widget', 10.99) ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price"
→ POST /products?on_conflict=id
   Headers: Prefer: resolution=merge-duplicates
```

## CLI Options

```bash
# Custom base URL
./sql2postgrest --url https://api.myapp.com "SELECT * FROM users"

# Pretty JSON output
./sql2postgrest --pretty "SELECT * FROM users"

# Read from stdin
echo "SELECT * FROM users LIMIT 10" | ./sql2postgrest

# Version
./sql2postgrest --version
```

## Use as Go Library

```go
package main

import (
    "fmt"
    "github.com/meech-ward/sql2postgrest/pkg/converter"
)

func main() {
    conv := converter.NewConverter("https://api.example.com")
    
    result, err := conv.Convert("SELECT * FROM users WHERE age > 18")
    if err != nil {
        panic(err)
    }
    
    fmt.Println("Method:", result.Method)
    fmt.Println("URL:", conv.URL(result))
}
```

## WASM (Browser/Node.js)

```bash
# Build WASM
make wasm

# Use in browser
<script src="wasm_exec.js"></script>
<script src="sql2postgrest.js"></script>
<script>
  const converter = new SQL2PostgREST();
  converter.load('./sql2postgrest.wasm').then(() => {
    const result = converter.convert("SELECT * FROM users WHERE age > 18");
    console.log(result);
  });
</script>
```

See [WASM_USAGE.md](WASM_USAGE.md) for details.

## SQL to PostgREST Mapping

| SQL | PostgREST | Example |
|-----|-----------|---------|
| `WHERE x = y` | `x=eq.y` | `id=eq.5` |
| `WHERE x > y` | `x=gt.y` | `age=gt.18` |
| `WHERE x IN (...)` | `x=in.(...)` | `id=in.(1,2,3)` |
| `WHERE x NOT IN (...)` | `x=not.in.(...)` | `status=not.in.(deleted,banned)` |
| `WHERE x LIKE 'y%'` | `x=like.y*` | `name=like.John*` |
| `WHERE x ~ 'regex'` | `x=match.regex` | `email=match.^[A-Z]` |
| `WHERE x @> ARRAY[...]` | `x=cs.{...}` | `tags=cs.{admin,user}` |
| `WHERE x && range` | `x=ov.range` | `period=ov.[2024-01-01,2024-12-31]` |
| `WHERE x @@ to_tsquery('y')` | `x=fts.y` | `content=fts.cat` |
| `SELECT col::type` | `col::type` | `price::text` |
| `SELECT data->>'key'` | `data->>key` | `data->>name` |
| `ORDER BY x DESC` | `order=x.desc` | `order=created_at.desc` |
| `LIMIT n` | `limit=n` | `limit=10` |

## Testing

```bash
# Run all tests (200+ test cases, 72%+ coverage)
go test ./pkg/converter/... -v

# Run specific test
go test ./pkg/converter/... -run TestName -v

# With coverage
go test ./pkg/converter/... -cover
```

## Performance

- **Conversion Speed**: ~1000 queries/second
- **Binary Size**: ~10MB
- **Memory Usage**: ~20MB typical

## Project Structure

```
pkg/converter/      # Core conversion library
├── converter.go    # Main API & types
├── select.go       # SELECT queries
├── insert.go       # INSERT queries
├── update.go       # UPDATE queries
├── delete.go       # DELETE queries
├── where.go        # WHERE clause & all operators
├── join.go         # JOINs & embedded resources
└── *_test.go       # 200+ comprehensive tests

cmd/sql2postgrest/  # CLI tool
cmd/wasm/          # WASM build
examples/          # Usage examples
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- Fork the repository
- Add tests for new features
- Ensure all tests pass: `go test ./pkg/converter/... -v`
- Update documentation
- Submit pull request

## Resources

- [PostgREST Documentation](https://postgrest.org)
- [PostgREST Resource Embedding](https://postgrest.org/en/stable/references/api/resource_embedding.html)
- [PostgREST Operators](https://postgrest.org/en/stable/references/api/tables_views.html#operators)

## License

Apache 2.0 - See [LICENSE](LICENSE)

## Acknowledgments

- Built with [Multigres PostgreSQL Parser](https://github.com/multigres/multigres)
- Inspired by [PostgREST](https://postgrest.org)
