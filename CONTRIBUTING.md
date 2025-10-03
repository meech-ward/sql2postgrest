# Contributing to sql2postgrest

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Go 1.21 or later
- Git
- Make (optional, but recommended)

### Getting Started

1. **Fork and clone the repository:**

```bash
git clone https://github.com/yourusername/sql2postgrest.git
cd sql2postgrest
```

2. **Install dependencies:**

```bash
go mod download
```

3. **Run tests:**

```bash
make test
# or
go test ./pkg/converter/... -v
```

4. **Build the CLI:**

```bash
make build
# or
go build -o bin/sql2postgrest ./cmd/sql2postgrest
```

## Project Structure

```
sql2postgrest/
├── pkg/converter/          # Core conversion library
│   ├── converter.go        # Main converter & types
│   ├── select.go           # SELECT query handling
│   ├── insert.go           # INSERT query handling
│   ├── update.go           # UPDATE query handling
│   ├── delete.go           # DELETE query handling
│   ├── where.go            # WHERE clause processing
│   └── converter_test.go   # Comprehensive tests
├── cmd/sql2postgrest/      # CLI tool
│   └── main.go
├── examples/               # Usage examples
└── README.md
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Keep changes focused and atomic
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Write Tests

All new features must include tests:

```go
func TestMyNewFeature(t *testing.T) {
    conv := NewConverter("https://api.example.com")
    
    result, err := conv.Convert("SELECT * FROM table WHERE ...")
    require.NoError(t, err)
    
    assert.Equal(t, "expected_value", result.SomeField)
}
```

### 4. Run Tests

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# Run specific tests
go test ./pkg/converter/... -run TestMyNewFeature -v
```

### 5. Format Code

```bash
make fmt
# or
go fmt ./...
```

### 6. Commit Changes

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "Add support for NOT IN operator"
```

Good commit message format:
- Start with a verb in present tense ("Add", "Fix", "Update", "Remove")
- Keep first line under 50 characters
- Add detailed description if needed

### 7. Push and Create PR

```bash
git push origin feature/my-new-feature
```

Then create a Pull Request on GitHub.

## Adding New SQL Features

### Example: Adding NOT IN Support

1. **Update where.go:**

```go
func (c *Converter) addSimpleCondition(result *ConversionResult, expr *ast.A_Expr) error {
    switch expr.Kind {
    case ast.AEXPR_NOT_IN:
        return c.addNotInCondition(result, expr)
    // ... existing cases
    }
}

func (c *Converter) addNotInCondition(result *ConversionResult, expr *ast.A_Expr) error {
    // Implementation
}
```

2. **Add tests in converter_test.go:**

```go
func TestNotInOperator(t *testing.T) {
    conv := NewConverter("https://api.example.com")
    
    result, err := conv.Convert("SELECT * FROM users WHERE id NOT IN (1, 2, 3)")
    require.NoError(t, err)
    
    assert.Equal(t, "not.in.(1,2,3)", result.QueryParams.Get("id"))
}
```

3. **Update README.md** with the new feature

4. **Run tests:**

```bash
make test
```

## Code Style Guidelines

### General Principles

- **Simplicity**: Prefer simple, readable code over clever solutions
- **Clarity**: Use descriptive names for variables and functions
- **Consistency**: Follow existing patterns in the codebase
- **Testing**: Every feature must have tests

### Naming Conventions

- **Functions**: CamelCase (`extractColumnName`)
- **Exported Functions**: Start with capital (`NewConverter`)
- **Private Functions**: Start with lowercase (`addWhereClause`)
- **Variables**: Descriptive names (`columnName` not `cn`)
- **Test Functions**: Start with `Test` (`TestInOperator`)

### Error Handling

Always provide context in errors:

```go
// Good
return fmt.Errorf("failed to extract column name: %w", err)

// Bad
return err
```

### Comments

- Use comments to explain **why**, not **what**
- Document exported functions and types
- Keep comments up-to-date with code

## Testing Guidelines

### Test Coverage

- Aim for high test coverage (current: 66+ tests)
- Test happy paths and error cases
- Test edge cases (NULL, negative numbers, empty strings, etc.)

### Test Structure

Use table-driven tests for multiple cases:

```go
func TestOperators(t *testing.T) {
    conv := NewConverter("https://api.example.com")
    
    tests := []struct {
        name    string
        sql     string
        wantURL string
    }{
        {
            name:    "equal operator",
            sql:     "SELECT * FROM users WHERE age = 18",
            wantURL: "/users?age=eq.18",
        },
        // ... more test cases
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := conv.Convert(tt.sql)
            require.NoError(t, err)
            assert.Contains(t, result.Path, tt.wantURL)
        })
    }
}
```

### Running Specific Tests

```bash
# Run specific test function
go test ./pkg/converter/... -run TestInOperator -v

# Run tests matching pattern
go test ./pkg/converter/... -run "Test.*Operator" -v

# Run with coverage
go test ./pkg/converter/... -cover
```

## Documentation

### Update README.md

When adding features, update:
- Feature list
- Examples section
- Operator mapping table
- Limitations section (remove if you're implementing it!)

### Add Examples

Create example code in `examples/` directory demonstrating your feature.

## Pull Request Process

1. **Ensure all tests pass**
2. **Update documentation**
3. **Add examples if applicable**
4. **Fill out PR template**
5. **Wait for review**

### PR Title Format

- `feat: Add NOT IN operator support`
- `fix: Handle NULL values in INSERT`
- `docs: Update README with new examples`
- `test: Add tests for BETWEEN operator`

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] All existing tests pass
- [ ] New tests added
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes
```

## Questions or Need Help?

- Open an issue for bugs or feature requests
- Check existing issues first
- Provide clear reproduction steps for bugs
- Explain use case for feature requests

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
