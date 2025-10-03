# sql2postgrest WASM

WebAssembly build of sql2postgrest for use in browsers and Node.js.

## Files

- `sql2postgrest.wasm` - The compiled WASM binary (10MB)
- `wasm_exec.js` - Go WebAssembly runtime (from Go toolchain)
- `sql2postgrest.js` - JavaScript wrapper for easy usage
- `example.html` - Interactive demo page
- `test-node.js` - Node.js test script

## Quick Start

### Browser

Open `example.html` in your browser to see an interactive demo, or include in your own HTML:

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
                "SELECT * FROM users WHERE age > 18",
                "https://api.example.com"
            );
            
            console.log(JSON.stringify(result, null, 2));
        });
    </script>
</body>
</html>
```

### Node.js

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
        "INSERT INTO users (name, active) VALUES ('Alice', true)",
        "http://localhost:3000"
    );
    
    console.log(JSON.parse(result));
}

main();
```

Or run the included test:

```bash
node test-node.js
```

## API

### JavaScript Wrapper (Browser)

```javascript
const converter = new SQL2PostgREST();

// Load WASM (returns a Promise)
await converter.load('./sql2postgrest.wasm');

// Convert SQL to PostgREST
const result = converter.convert(sqlQuery, baseURL);
```

**Parameters:**
- `sqlQuery` (string) - PostgreSQL SQL query
- `baseURL` (string, optional) - Base URL for PostgREST API (default: `http://localhost:3000`)

**Returns:** Object with:
- `method` - HTTP method (GET, POST, PATCH, DELETE)
- `url` - Full PostgREST URL
- `headers` - Request headers (if any)
- `body` - Request body (if any)

### Direct WASM Function (Node.js)

```javascript
const result = sql2postgrest(sqlQuery, baseURL);
// Returns JSON string
```

## Examples

### SELECT Query

```javascript
const result = converter.convert(
    "SELECT id, name FROM users WHERE age > 21",
    "https://api.example.com"
);

// Result:
{
  "method": "GET",
  "url": "https://api.example.com/users?age=gt.21&select=id%2Cname"
}
```

### INSERT with Boolean

```javascript
const result = converter.convert(
    "INSERT INTO posts (title, published) VALUES ('Hello', true)",
    "http://localhost:3000"
);

// Result:
{
  "method": "POST",
  "url": "http://localhost:3000/posts",
  "headers": {
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  "body": [
    { "title": "Hello", "published": true }
  ]
}
```

### UPDATE

```javascript
const result = converter.convert(
    "UPDATE users SET active = false WHERE id = 5"
);

// Result:
{
  "method": "PATCH",
  "url": "http://localhost:3000/users?id=eq.5",
  "headers": {
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  "body": { "active": false }
}
```

### Making HTTP Requests

```javascript
const result = converter.convert(
    "SELECT * FROM users WHERE status = 'active'"
);

// Use with fetch
const response = await fetch(result.url, {
    method: result.method,
    headers: result.headers || {},
    body: result.body ? JSON.stringify(result.body) : undefined
});

const data = await response.json();
console.log(data);
```

## Building

To rebuild the WASM binary:

```bash
cd ..
make wasm
```

This will:
1. Compile the Go code to WASM
2. Copy `wasm_exec.js` from Go toolchain
3. Create all necessary files in the `wasm/` directory

## File Size

- `sql2postgrest.wasm`: ~10MB (includes Go runtime and Multigres parser)
- `wasm_exec.js`: ~17KB (Go WASM runtime)
- `sql2postgrest.js`: ~2KB (JavaScript wrapper)

Total: ~10MB for the WASM bundle

## Browser Compatibility

Works in all modern browsers that support WebAssembly:
- Chrome/Edge 57+
- Firefox 52+
- Safari 11+
- Node.js 8+

## Performance

- **Initial load**: ~100-200ms (WASM compilation)
- **Conversion**: <1ms per query (after load)
- **Memory**: ~20-30MB (includes Go runtime)

## Troubleshooting

### WASM not loading

Make sure all three files are served from the same origin:
- `sql2postgrest.wasm`
- `wasm_exec.js`
- `sql2postgrest.js`

### CORS errors

If loading from `file://`, some browsers may block. Use a local server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000/example.html`

### Node.js version

Requires Node.js 8+ for WebAssembly support. For best results, use Node.js 14+.

## License

Apache 2.0 - Same as parent project
