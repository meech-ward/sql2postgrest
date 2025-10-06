# Agent Guidelines for sql2postgrest

## Build/Test/Lint Commands
- **Build**: `go build -o bin/sql2postgrest ./cmd/sql2postgrest`
- **Test**: `go test ./pkg/converter/... -v`
- **Test single**: `go test ./pkg/converter/... -run TestName -v`
- **Coverage**: `go test ./pkg/converter/... -cover`
- **Format**: `go fmt ./...`
- **WASM**: `make wasm`

## Code Style
- **Naming**: Exported=CamelCase, private=camelCase
- **Errors**: Always wrap with context: `fmt.Errorf("desc: %w", err)`
- **Testing**: Use `require.NoError()` and `assert.Equal()`; test happy/error/edge cases
- **Format**: Tabs for indentation, run `go fmt` before committing

## Architecture
- Core: `pkg/converter/` (select.go, insert.go, update.go, delete.go, where.go, join.go)
- CLI: `cmd/sql2postgrest/main.go`
- Parser: Multigres PostgreSQL parser
- Output: PostgREST REST API (GET/POST/PATCH/DELETE with query params/body)

## Supported Features (98% of SQL → PostgREST)
- All comparison operators (eq, neq, gt, gte, lt, lte)
- Pattern matching (LIKE, ILIKE, regex ~, ~*)
- Array/range operators (@>, <@, &&, <<, >>, etc.)
- Full-text search (@@)
- Type casting (::), JSON operators (->>, ->)
- UPSERT (ON CONFLICT)
- JOINs (embedded resources), aggregates
- 200+ tests, 72%+ coverage
