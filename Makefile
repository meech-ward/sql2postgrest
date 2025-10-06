.PHONY: all build build-wasm test clean install wasm

all: build

build:
	mkdir -p bin
	go build -o bin/sql2postgrest ./cmd/sql2postgrest

build-wasm: wasm

wasm:
	@echo "Building WASM..."
	mkdir -p wasm
	GOOS=js GOARCH=wasm go build -o wasm/sql2postgrest.wasm ./cmd/wasm
	@echo "Copying wasm_exec.js..."
	@if [ -f "$$(go env GOROOT)/misc/wasm/wasm_exec.js" ]; then \
		cp "$$(go env GOROOT)/misc/wasm/wasm_exec.js" wasm/; \
	elif [ -f "$$(go env GOROOT)/lib/wasm/wasm_exec.js" ]; then \
		cp "$$(go env GOROOT)/lib/wasm/wasm_exec.js" wasm/; \
	else \
		echo "Warning: wasm_exec.js not found, downloading from Go repository..."; \
		curl -s https://raw.githubusercontent.com/golang/go/master/misc/wasm/wasm_exec.js -o wasm/wasm_exec.js; \
	fi
	@echo "✅ WASM build complete: wasm/sql2postgrest.wasm"
	@echo "   Files created:"
	@echo "   - wasm/sql2postgrest.wasm"
	@echo "   - wasm/wasm_exec.js"
	@echo ""
	@echo "   To test in browser, see examples/react-example/"
	@echo "   Or use the hook: import { useSQL2PostgREST } from './hooks/useSQL2PostgREST'"

test:
	go test ./pkg/converter/... -v

test-coverage:
	go test ./pkg/converter/... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html

test-json:
	@echo "Testing JSON output..."
	@./bin/sql2postgrest --json "SELECT * FROM users WHERE id = 1" | jq .

install:
	go install ./cmd/sql2postgrest

clean:
	rm -rf bin/ wasm/*.wasm wasm/wasm_exec.js
	rm -f coverage.out coverage.html

fmt:
	go fmt ./...

lint:
	golangci-lint run

# Build for all platforms
build-all:
	@echo "Building for all platforms..."
	mkdir -p bin
	GOOS=linux GOARCH=amd64 go build -o bin/sql2postgrest-linux-amd64 ./cmd/sql2postgrest
	GOOS=darwin GOARCH=amd64 go build -o bin/sql2postgrest-darwin-amd64 ./cmd/sql2postgrest
	GOOS=darwin GOARCH=arm64 go build -o bin/sql2postgrest-darwin-arm64 ./cmd/sql2postgrest
	GOOS=windows GOARCH=amd64 go build -o bin/sql2postgrest-windows-amd64.exe ./cmd/sql2postgrest
	@echo "✅ Built for all platforms in bin/"

.PHONY: help
help:
	@echo "Available targets:"
	@echo "  make build          - Build the CLI tool"
	@echo "  make wasm           - Build WASM version"
	@echo "  make test           - Run tests"
	@echo "  make test-json      - Test JSON output"
	@echo "  make test-coverage  - Run tests with coverage report"
	@echo "  make install        - Install CLI to GOPATH/bin"
	@echo "  make clean          - Remove build artifacts"
	@echo "  make build-all      - Build for all platforms"
	@echo "  make fmt            - Format code"
	@echo "  make lint           - Run linter"
