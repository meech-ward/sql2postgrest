# Contributing to sql2postgrest

## Quick Start

```bash
# Clone and setup
git clone https://github.com/yourusername/sql2postgrest.git
cd sql2postgrest
go mod download

# Build and test
go build -o bin/sql2postgrest ./cmd/sql2postgrest
go test ./pkg/converter/... -v
```

## Project Structure

```
pkg/converter/
├── converter.go        # Main converter & types
├── select.go          # SELECT queries
├── insert.go          # INSERT queries  
├── update.go          # UPDATE queries
├── delete.go          # DELETE queries
├── where.go           # WHERE clause & operators
├── join.go            # JOINs & embedded resources
└── *_test.go          # Tests (200+ test cases)
```

## Adding Features

### 1. Add the operator mapping

**File**: `pkg/converter/where.go`

```go
func (c *Converter) mapOperator(sqlOp string, value string) (string, error) {
    switch sqlOp {
    case "~":
        return "match." + value, nil
    // ... add your operator
    }
}
```

### 2. Add tests

**File**: `pkg/converter/advanced_features_test.go` or similar

```go
func TestNewOperator(t *testing.T) {
    conv := NewConverter("https://api.example.com")
    result, err := conv.Convert("SELECT * FROM users WHERE email ~ '^[A-Z]'")
    require.NoError(t, err)
    assert.Equal(t, "match.^[A-Z]", result.QueryParams.Get("email"))
}
```

### 3. Update documentation

- Add to README.md feature list
- Add to operator mapping table
- Add usage example

### 4. Verify

```bash
go test ./pkg/converter/... -v
go fmt ./...
```

## Code Style

- **Naming**: CamelCase for exported, camelCase for private
- **Errors**: Always wrap with context: `fmt.Errorf("desc: %w", err)`
- **Testing**: Use `require.NoError()` and `assert.Equal()`
- **Format**: Run `go fmt ./...` before committing

## Testing

```bash
# All tests
go test ./pkg/converter/... -v

# Specific test
go test ./pkg/converter/... -run TestName -v

# With coverage
go test ./pkg/converter/... -cover
```

## Pull Requests

1. Ensure all tests pass
2. Update documentation
3. Run `go fmt ./...`
4. Clear commit message:
   - `feat: Add regex pattern matching`
   - `fix: Handle NULL in INSERT`
   - `docs: Update README examples`

## Questions?

- Check existing issues first
- Open new issue with clear description
- Include SQL example and expected output

## License

By contributing, you agree that your contributions will be licensed under Apache 2.0.
