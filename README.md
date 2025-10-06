# sql2postgrest

Convert PostgreSQL SQL queries to [PostgREST](https://postgrest.org) REST API requests.

Uses the [Multigres PostgreSQL parser](https://github.com/multigres/multigres) for production-quality SQL parsing.

## 🌐 Try the Web Playground!

**Interactive web app** - Convert SQL to PostgREST in your browser:

[Try it → sql2postg.rest](https://sql2postg.rest)

[More info →](examples/react-example/README.md)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/meech-ward/sql2postgrest
cd sql2postgrest

# Install dependencies
go mod tidy

# Build
go build -o sql2postgrest ./cmd/sql2postgrest

# Use it!
./sql2postgrest "SELECT * FROM users WHERE age > 18"
```

Output:
```json
{"method":"GET","url":"http://localhost:3000/users?age=gt.18"}
```

## Installation

### Option 1: Build from Source

```bash
go mod tidy
go build -o sql2postgrest ./cmd/sql2postgrest
```

### Option 2: Use Makefile

```bash
make build
```

### Option 3: Install to GOPATH

```bash
make install
```

## Usage

### Basic Queries

```bash
# SELECT
./sql2postgrest "SELECT * FROM users WHERE age > 18"
→ {"method":"GET","url":"http://localhost:3000/users?age=gt.18"}

# SELECT with IN
./sql2postgrest "SELECT * FROM users WHERE id IN (1, 2, 3)"
→ {"method":"GET","url":"http://localhost:3000/users?id=in.(1,2,3)"}

# SELECT with BETWEEN
./sql2postgrest "SELECT * FROM products WHERE price BETWEEN 10 AND 100"
→ {"method":"GET","url":"http://localhost:3000/products?price=gte.10&price=lte.100"}

# SELECT with LIKE
./sql2postgrest "SELECT * FROM users WHERE name LIKE 'John%'"
→ {"method":"GET","url":"http://localhost:3000/users?name=like.John*"}

# INSERT
./sql2postgrest "INSERT INTO users (id, name) VALUES (1, 'Alice')"
→ {"method":"POST","url":"http://localhost:3000/users","headers":{"Content-Type":"application/json","Prefer":"return=representation"},"body":[{"id":1,"name":"Alice"}]}

# UPDATE
./sql2postgrest "UPDATE users SET status = 'active' WHERE id = 5"
→ {"method":"PATCH","url":"http://localhost:3000/users?id=eq.5","headers":{"Content-Type":"application/json","Prefer":"return=representation"},"body":{"status":"active"}}

# DELETE
./sql2postgrest "DELETE FROM users WHERE id = 10"
→ {"method":"DELETE","url":"http://localhost:3000/users?id=eq.10"}

# JOIN (converts to embedded resources)
./sql2postgrest "SELECT a.name, b.title FROM authors a LEFT JOIN books b ON b.author_id = a.id"
→ {"method":"GET","url":"http://localhost:3000/authors?select=name,books(title)"}

# Aggregates with JOIN
./sql2postgrest "SELECT a.name, COUNT(b.id) AS book_count, SUM(b.price) AS total_revenue FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.id, a.name"
→ {"method":"GET","url":"http://localhost:3000/authors?select=name,books(id.count():book_count,price.sum():total_revenue)"}
```

### CLI Options

```bash
# Custom base URL
./sql2postgrest --url https://api.myapp.com "SELECT * FROM users"

# Pretty JSON output
./sql2postgrest --pretty "INSERT INTO users (id, name) VALUES (1, 'Alice')"

# Read from stdin
echo "SELECT * FROM users LIMIT 10" | ./sql2postgrest

# Show version
./sql2postgrest --version
```

### Pretty Output Example

```bash
./sql2postgrest --pretty "INSERT INTO users (id, name) VALUES (1, 'Alice')"
```

Output:
```json
{
  "method": "POST",
  "url": "http://localhost:3000/users",
  "headers": {
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  "body": [
    {
      "id": 1,
      "name": "Alice"
    }
  ]
}
```

### Complex Example

```bash
./sql2postgrest "SELECT id, name, email FROM users WHERE status IN ('active', 'pending') AND age BETWEEN 18 AND 65 AND created_at > '2024-01-01' ORDER BY created_at DESC LIMIT 20"
```

Output:
```json
{"method":"GET","url":"http://localhost:3000/users?age=gte.18&age=lte.65&created_at=gt.2024-01-01&limit=20&order=created_at.desc&select=id,name,email&status=in.(active,pending)"}
```

### JOIN Examples

JOINs are automatically converted to PostgREST's [embedded resources](https://postgrest.org/en/stable/references/api/resource_embedding.html):

```bash
# Simple JOIN
./sql2postgrest "SELECT a.name, b.title FROM authors a LEFT JOIN books b ON b.author_id = a.id"
→ {"method":"GET","url":"http://localhost:3000/authors?select=name,books(title)"}

# JOIN with multiple columns
./sql2postgrest "SELECT a.id, a.name, b.title, b.published_date FROM authors a JOIN books b ON b.author_id = a.id"
→ {"method":"GET","url":"http://localhost:3000/authors?select=id,name,books(title,published_date)"}

# JOIN with WHERE, ORDER BY, and LIMIT
./sql2postgrest "SELECT u.email, o.amount FROM users u JOIN orders o ON o.user_id = u.id WHERE u.active = true ORDER BY u.name LIMIT 10"
→ {"method":"GET","url":"http://localhost:3000/users?active=eq.true&limit=10&order=name.asc&select=email,orders(amount)"}

# JOIN with column aliases
./sql2postgrest "SELECT a.name AS author_name, b.title AS book_title FROM authors a JOIN books b ON b.author_id = a.id"
→ {"method":"GET","url":"http://localhost:3000/authors?select=name:author_name,books(title:book_title)"}
```

**Note**: The left-most table in the JOIN becomes the base resource path. All other joined tables become embedded resources.

### Aggregate Functions with JOINs

Aggregate functions (COUNT, SUM, AVG, MAX, MIN) are fully supported with JOINs:

```bash
# Count related records
./sql2postgrest "SELECT a.name, COUNT(b.id) AS book_count FROM authors a LEFT JOIN books b ON b.author_id = a.id GROUP BY a.name"
→ {"method":"GET","url":"http://localhost:3000/authors?select=name,books(id.count():book_count)"}

# Sum values from related table
./sql2postgrest "SELECT c.name, SUM(o.total) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id"
→ {"method":"GET","url":"http://localhost:3000/customers?select=name,orders(total.sum():revenue)"}

# Multiple aggregates
./sql2postgrest "SELECT a.name, COUNT(b.id) AS num_books, AVG(b.price) AS avg_price FROM authors a JOIN books b ON b.author_id = a.id GROUP BY a.name"
→ {"method":"GET","url":"http://localhost:3000/authors?select=name,books(id.count():num_books,price.avg():avg_price)"}

# Aggregates with WHERE, ORDER BY, LIMIT
./sql2postgrest "SELECT c.name, SUM(o.total) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.active = true GROUP BY c.id ORDER BY c.name LIMIT 10"
→ {"method":"GET","url":"http://localhost:3000/customers?active=eq.true&limit=10&order=name.asc&select=name,orders(total.sum():revenue)"}
```

**Note**: Aggregates are placed inside the embedded resource they're aggregating. PostgREST handles GROUP BY automatically.

## Supported SQL Features

### ✅ SELECT Queries

- **Column selection**: `SELECT id, name FROM users`
- **Column aliases**: `SELECT name AS full_name`
- **WHERE operators**: `=`, `<>`, `!=`, `>`, `>=`, `<`, `<=`
- **IN operator**: `WHERE id IN (1, 2, 3)`
- **BETWEEN operator**: `WHERE age BETWEEN 18 AND 65`
- **LIKE/ILIKE**: `WHERE name LIKE 'John%'` (% converts to *)
- **IS NULL / IS NOT NULL**: `WHERE email IS NULL`
- **AND conditions**: Multiple filters combined
- **OR conditions**: `WHERE age < 18 OR age > 65`
- **ORDER BY**: ASC/DESC, NULLS FIRST/LAST
- **LIMIT / OFFSET**: Pagination
- **Aggregate functions**: COUNT, SUM, AVG, MIN, MAX (with JOINs)
- **JOINs**: LEFT JOIN, INNER JOIN, RIGHT JOIN (converts to PostgREST embedded resources)
- **GROUP BY**: Automatic grouping with aggregates in JOINs

### ✅ INSERT Queries

- Single row: `INSERT INTO users (id, name) VALUES (1, 'Alice')`
- Multiple rows: `INSERT INTO users (id, name) VALUES (1, 'Alice'), (2, 'Bob')`
- NULL values: `INSERT INTO users (id, name) VALUES (1, NULL)`

### ✅ UPDATE Queries

- Single column: `UPDATE users SET status = 'active' WHERE id = 1`
- Multiple columns: `UPDATE users SET status = 'active', updated_at = NOW() WHERE id = 1`
- NULL values: `UPDATE users SET deleted_at = NULL WHERE id = 1`

### ✅ DELETE Queries

- With WHERE: `DELETE FROM users WHERE id = 1`
- **Note**: WHERE clause is required for safety

## SQL to PostgREST Mapping

| SQL Pattern | PostgREST Pattern | Example |
|-------------|-------------------|---------|
| `WHERE x = y` | `x=eq.y` | `id=eq.5` |
| `WHERE x <> y` | `x=neq.y` | `status=neq.inactive` |
| `WHERE x > y` | `x=gt.y` | `age=gt.18` |
| `WHERE x >= y` | `x=gte.y` | `age=gte.18` |
| `WHERE x < y` | `x=lt.y` | `age=lt.65` |
| `WHERE x <= y` | `x=lte.y` | `age=lte.65` |
| `WHERE x IN (...)` | `x=in.(...)` | `id=in.(1,2,3)` |
| `WHERE x BETWEEN a AND b` | `x=gte.a&x=lte.b` | `age=gte.18&age=lte.65` |
| `WHERE x LIKE 'pattern%'` | `x=like.pattern*` | `name=like.John*` |
| `WHERE x ILIKE 'pattern%'` | `x=ilike.pattern*` | `email=ilike.*@gmail.com` |
| `WHERE x IS NULL` | `x=is.null` | `deleted_at=is.null` |
| `WHERE x IS NOT NULL` | `x=not.is.null` | `email=not.is.null` |
| `ORDER BY x DESC` | `order=x.desc` | `order=created_at.desc` |
| `LIMIT n` | `limit=n` | `limit=10` |
| `OFFSET n` | `offset=n` | `offset=20` |
| `LEFT/INNER/RIGHT JOIN` | `select=col,table(col)` | `select=name,books(title)` |

## Using as a Go Library

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
    fmt.Println("Path:", result.Path)
    fmt.Println("URL:", conv.URL(result))
}
```

### Making HTTP Requests

```go
package main

import (
    "io"
    "net/http"
    "strings"
    "github.com/meech-ward/sql2postgrest/pkg/converter"
)

func main() {
    conv := converter.NewConverter("https://api.example.com")
    result, _ := conv.Convert("SELECT * FROM users WHERE age > 18")
    
    req, _ := http.NewRequest(result.Method, conv.URL(result), strings.NewReader(result.Body))
    
    for key, value := range result.Headers {
        req.Header.Set(key, value)
    }
    
    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    
    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}
```

### JSON Output

```go
package main

import (
    "fmt"
    "github.com/meech-ward/sql2postgrest/pkg/converter"
)

func main() {
    conv := converter.NewConverter("https://api.example.com")
    
    // Compact JSON
    jsonOutput, _ := conv.ConvertToJSON("SELECT * FROM users WHERE age > 18")
    fmt.Println(jsonOutput)
    
    // Pretty JSON
    prettyOutput, _ := conv.ConvertToJSONPretty("SELECT * FROM users WHERE age > 18")
    fmt.Println(prettyOutput)
}
```

## Testing

```bash
# Run all tests
go test ./pkg/converter/... -v

# Run specific test
go test ./pkg/converter/... -run TestInOperator -v

# Test with coverage
go test ./pkg/converter/... -cover

# Generate coverage report
make test-coverage
```

**Test Coverage:** 66+ comprehensive tests covering:
- All SQL operators
- Edge cases (NULL, negative numbers, quotes)
- Complex queries
- INSERT/UPDATE/DELETE operations
- Error handling

## Building

### Standard Build

```bash
go build -o sql2postgrest ./cmd/sql2postgrest
```

### Cross-Platform Builds

```bash
# Linux
GOOS=linux GOARCH=amd64 go build -o sql2postgrest-linux ./cmd/sql2postgrest

# Windows
GOOS=windows GOARCH=amd64 go build -o sql2postgrest.exe ./cmd/sql2postgrest

# macOS (M1/M2)
GOOS=darwin GOARCH=arm64 go build -o sql2postgrest-mac ./cmd/sql2postgrest

# All platforms at once
make build-all
```

### WASM Build (for JavaScript/Browser)

```bash
# Build WASM version
make wasm

# This creates:
# - wasm/sql2postgrest.wasm (10MB)
# - wasm/wasm_exec.js (Go WASM runtime)
# - wasm/sql2postgrest.js (JavaScript wrapper)
# - wasm/example.html (demo page)
```

## Using in JavaScript/Browser (WASM)

The WASM build allows you to use sql2postgrest directly in the browser or Node.js!

### Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
    <script src="wasm_exec.js"></script>
    <script src="sql2postgrest.js"></script>
</head>
<body>
    <script>
        const converter = new SQL2PostgREST();
        
        // Load WASM
        converter.load('./sql2postgrest.wasm')
            .then(() => {
                // Convert SQL to PostgREST
                const result = converter.convert(
                    "SELECT * FROM users WHERE age > 18",
                    "https://api.example.com"
                );
                
                console.log(result);
                // {
                //   "method": "GET",
                //   "url": "https://api.example.com/users?age=gt.18"
                // }
            });
    </script>
</body>
</html>
```

### Node.js Usage

```javascript
const fs = require('fs');
require('./wasm_exec.js');

async function main() {
    const go = new Go();
    const wasmBuffer = fs.readFileSync('./sql2postgrest.wasm');
    const { instance } = await WebAssembly.instantiate(wasmBuffer, go.importObject);
    
    go.run(instance);
    
    // Wait for WASM to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use the sql2postgrest function
    const result = sql2postgrest(
        "INSERT INTO users (name, active) VALUES ('Alice', true)",
        "http://localhost:3000"
    );
    
    const parsed = JSON.parse(result);
    console.log(parsed);
    // {
    //   "method": "POST",
    //   "url": "http://localhost:3000/users",
    //   "headers": { "Content-Type": "application/json", ... },
    //   "body": [{ "name": "Alice", "active": true }]
    // }
}

main();
```

### NPM Package Usage (if published)

```javascript
import SQL2PostgREST from 'sql2postgrest-wasm';

const converter = new SQL2PostgREST();
await converter.load();

const result = converter.convert(
    "UPDATE users SET verified = true WHERE id = 5"
);

// Use result to make HTTP request
fetch(result.url, {
    method: result.method,
    headers: result.headers,
    body: result.body ? JSON.stringify(result.body) : undefined
});
```

### Testing WASM Build

```bash
# Run the demo in browser
make wasm
open wasm/example.html

# Or test with Node.js
cd wasm
node test-node.js
```

## Dependencies

- **[Multigres PostgreSQL Parser](https://github.com/multigres/multigres)** - Production-quality PostgreSQL parser (automatically downloaded from GitHub)
- **[testify](https://github.com/stretchr/testify)** - Testing framework (dev dependency only)

### Is it Self-Contained?

**YES!** The compiled binary:
- ✅ Has ZERO runtime dependencies
- ✅ Works on any compatible system
- ✅ Can be distributed as a single file (~10MB)
- ✅ No need for Go, Multigres, or any other software to run
- ✅ WASM version works in any modern browser or Node.js

## Project Structure

```
sql2postgrest/
├── pkg/converter/          # Core conversion library
│   ├── converter.go        # Main API & types
│   ├── select.go           # SELECT query conversion
│   ├── insert.go           # INSERT query conversion
│   ├── update.go           # UPDATE query conversion
│   ├── delete.go           # DELETE query conversion
│   ├── where.go            # WHERE clause handling
│   ├── json.go             # JSON output formatting
│   └── converter_test.go   # Comprehensive tests
├── cmd/sql2postgrest/      # CLI tool
│   └── main.go
├── Makefile                # Build automation
├── go.mod                  # Dependencies
└── README.md               # This file
```

## Limitations

### Currently Not Supported

- **Subqueries** - Not supported
- **CTEs (WITH)** - Not supported
- **HAVING** - Not supported
- **Window functions** - Not supported
- **NOT IN** - Planned
- **Complex expressions** - Function calls in WHERE not yet supported
- **JSON functions** - json_agg, json_build_object not supported (use PostgREST's native aggregation)

### By Design (PostgREST Limitations)

- Transactions (PostgREST is stateless)
- Stored procedures
- Advanced PostgreSQL features not in PostgREST

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Ensure all tests pass: `go test ./pkg/converter/... -v`
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Use Cases

- **API Migration**: Convert SQL-based apps to REST APIs
- **Development Tool**: Quickly generate PostgREST API calls
- **Documentation**: Generate API docs from SQL queries
- **Testing**: Parse SQL to create HTTP requests for API testing
- **Query Analysis**: Understand how SQL maps to REST

## Performance

- **Conversion Speed**: ~1000 queries/second
- **Binary Size**: ~10MB
- **Memory Usage**: ~20MB typical
- **Startup Time**: <10ms

## License

Apache 2.0 - See [LICENSE](LICENSE)

## Acknowledgments

- Built using the excellent [Multigres PostgreSQL Parser](https://github.com/multigres/multigres)
- Inspired by [PostgREST](https://postgrest.org)'s elegant REST API design

## Support

- **Issues**: Report bugs or request features via GitHub issues
- **Documentation**: See additional docs in the repository
- **Tests**: Run `go test ./pkg/converter/... -v` to verify functionality

---

**Quick Links:**
- [Installation](#installation)
- [Usage Examples](#usage)
- [Supported Features](#supported-sql-features)
- [Testing](#testing)
- [Building](#building)
