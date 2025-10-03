# Using sql2postgrest as WASM

sql2postgrest can be compiled to WebAssembly and used directly in browsers or Node.js!

## Quick Start

### Build WASM

```bash
make wasm
```

This creates:
- `wasm/sql2postgrest.wasm` - The WASM binary (~10MB)
- `wasm/wasm_exec.js` - Go WASM runtime
- `wasm/sql2postgrest.js` - JavaScript wrapper
- `wasm/example.html` - Interactive demo

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
        
        converter.load('./sql2postgrest.wasm').then(() => {
            const result = converter.convert(
                "SELECT * FROM users WHERE age > 18"
            );
            console.log(result);
            // { method: "GET", url: "http://localhost:3000/users?age=gt.18" }
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
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = sql2postgrest(
        "INSERT INTO users (name) VALUES ('Alice')",
        "http://localhost:3000"
    );
    
    console.log(JSON.parse(result));
}

main();
```

## Output Format

All conversions return JSON with HTTP request details:

```json
{
  "method": "GET|POST|PATCH|DELETE",
  "url": "full PostgREST URL with query params",
  "headers": { "optional headers" },
  "body": "optional request body"
}
```

## Examples

### Making HTTP Requests

```javascript
const result = converter.convert(
    "UPDATE users SET status = 'active' WHERE id = 5"
);

// Use with fetch
const response = await fetch(result.url, {
    method: result.method,
    headers: result.headers || {},
    body: result.body ? JSON.stringify(result.body) : undefined
});
```

### Error Handling

```javascript
try {
    const result = converter.convert("INVALID SQL");
} catch (err) {
    console.error("Conversion failed:", err.message);
}
```

## Testing

```bash
# Browser demo
open wasm/example.html

# Node.js test
cd wasm
node test-node.js
```

## File Sizes

- WASM binary: ~10MB (includes Go runtime + Multigres parser)
- JavaScript wrapper: ~2KB
- Go WASM runtime: ~17KB

## Browser Support

Works in all modern browsers with WebAssembly:
- Chrome/Edge 57+
- Firefox 52+
- Safari 11+
- Node.js 8+

See `wasm/README.md` for detailed documentation.
