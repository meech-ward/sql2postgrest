# Agent Guidelines for sql2postgrest

## Build/Test/Lint Commands
- **Build**: `go build -o bin/sql2postgrest ./cmd/sql2postgrest` or `make build`
- **Test all**: `go test ./pkg/converter/... -v` or `make test`
- **Test single**: `go test ./pkg/converter/... -run TestFunctionName -v`
- **Test coverage**: `make test-coverage`
- **Format**: `go fmt ./...` or `make fmt`
- **Lint**: `golangci-lint run` or `make lint`
- **WASM**: `make wasm`

## Code Style
- **Imports**: Group stdlib, external, internal; use `github.com/multigres/multigres/go/parser` and `github.com/stretchr/testify`
- **Naming**: Exported=CamelCase, private=camelCase, test functions=TestName
- **Error handling**: Always wrap errors with context: `fmt.Errorf("description: %w", err)`
- **Types**: Define explicit types for conversion results; use `url.Values` for query params
- **Comments**: Apache 2.0 license header in new files; explain why not what; document exported functions
- **Testing**: Use table-driven tests with `require.NoError()` and `assert.Equal()`; test happy paths, errors, edge cases
- **Formatting**: Use tabs for indentation, run `go fmt` before committing

## Architecture
- Core logic in `pkg/converter/` (converter.go, select.go, insert.go, update.go, delete.go, where.go, json.go)
- CLI in `cmd/sql2postgrest/main.go`; WASM in `cmd/wasm/main.go`
- Uses Multigres PostgreSQL parser for parsing SQL statements
- Converts SQL to PostgREST REST API format (GET/POST/PATCH/DELETE with query params/body)
