# postgrestToSupabase

A comprehensive library that converts PostgREST JSON requests to Supabase JS client code.

## Features

- ✅ **Complete SELECT support** - All filters, operators, ordering, pagination
- ✅ **Full CRUD operations** - INSERT, UPDATE, DELETE, UPSERT
- ✅ **RPC (stored procedures)** - Function calls with parameters and result filtering
- ✅ **Advanced features** - AND/OR conditions, nullsfirst/nullslast ordering
- ✅ **124 comprehensive tests** - 100% test coverage for all use cases
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Production-ready** - Handles edge cases and complex queries
- ✅ **Dual filter format support** - Both `column.op=value` and `column=op.value` formats
- ✅ **Robust edge case handling** - Decimals, IPs, UUIDs, emails, URLs, special chars

## Usage

```typescript
import { postgrestToSupabase } from './postgrestToSupabase'
import type { PostgRESTRequest } from '../hooks/useSQL2PostgREST'

const request: PostgRESTRequest = {
  method: 'GET',
  url: 'http://localhost:3000/users?age.gte=18&status.eq=active&order=created_at.desc&limit=10'
}

const result = postgrestToSupabase(request)
console.log(result.code)
// Output:
// supabase
//   .from('users')
//   .select('*')
//   .gte('age', 18)
//   .eq('status', 'active')
//   .order('created_at', { ascending: false })
//   .limit(10)
```

> **Note**: The output code starts directly with `supabase` (no `const { data, error } = await` prefix) for maximum flexibility. You can assign it to a variable or use it directly in your code.

## Supported Features

### SELECT Queries

#### Filters

All filters support **two formats**:
- Key format: `column.operator=value` (e.g., `age.gte=18`)
- Value format: `column=operator.value` (e.g., `age=gte.18`)

Both formats work identically - use whichever your PostgREST API generates.

**Supported Operators:**
- **Comparison**: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`
- **Pattern matching**: `like`, `ilike`
- **Null checks**: `is`
- **Negation**: `not`
- **Array operations**: `in`, `cs` (contains), `cd` (contained by), `ov` (overlaps)
- **Range operations**: `sl`, `sr`, `nxl`, `nxr`, `adj`
- **Text search**: `fts`, `plfts`, `phfts`, `wfts`

#### Complex Conditions
- **OR conditions**: `or=(age.gte.21,status.eq.active)` → `.or('(age.gte.21,status.eq.active)')`
- **AND conditions**: `and=(price.gte.100,in_stock.eq.true)` → `.and('(price.gte.100,in_stock.eq.true)')`
- **Nested AND/OR**: Full support for complex PostgREST filter syntax

#### Modifiers
- **Select columns**: `select=id,name,email`
- **Ordering**: `order=column.asc` or `order=column.desc`
- **Null handling**: `order=column.desc.nullslast` or `order=column.asc.nullsfirst`
- **Multiple order**: `order=col1.desc,col2.asc`
- **Pagination**: `limit=10`, `offset=20`

### INSERT Queries

```typescript
const request: PostgRESTRequest = {
  method: 'POST',
  url: 'http://localhost:3000/users',
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
}

// Generates:
// const { data, error } = await supabase
//   .from('users')
//   .insert({
//     "name": "John Doe",
//     "email": "john@example.com"
//   })
//   .select()
```

### UPSERT

```typescript
const request: PostgRESTRequest = {
  method: 'POST',
  url: 'http://localhost:3000/users',
  headers: {
    Prefer: 'resolution=merge-duplicates'
  },
  body: { id: 1, name: 'John Doe' }
}

// Generates:
// const { data, error } = await supabase
//   .from('users')
//   .upsert({ ... })
//   .select()
```

### UPDATE Queries

```typescript
const request: PostgRESTRequest = {
  method: 'PATCH',
  url: 'http://localhost:3000/users?id.eq=1',
  body: { status: 'active' }
}

// Generates:
// const { data, error } = await supabase
//   .from('users')
//   .update({ "status": "active" })
//   .eq('id', 1)
//   .select()
```

### DELETE Queries

```typescript
const request: PostgRESTRequest = {
  method: 'DELETE',
  url: 'http://localhost:3000/users?id.eq=1'
}

// Generates:
// supabase
//   .from('users')
//   .delete()
//   .eq('id', 1)
```

### RPC (Stored Procedures)

```typescript
const request: PostgRESTRequest = {
  method: 'POST',
  url: 'http://localhost:3000/rpc/search_users',
  body: {
    search_term: 'john',
    min_age: 18
  }
}

// Generates:
// supabase
//   .rpc('search_users', {
//     "search_term": "john",
//     "min_age": 18
//   })
```

#### RPC with Filters

```typescript
const request: PostgRESTRequest = {
  method: 'POST',
  url: 'http://localhost:3000/rpc/get_users?age.gte=21&order=created_at.desc&limit=10',
  body: { status: 'active' }
}

// Generates:
// supabase
//   .rpc('get_users', {
//     "status": "active"
//   })
//   .gte('age', 21)
//   .order('created_at', { ascending: false })
//   .limit(10)
```

## Real-World Examples

### Paginated User List
```typescript
const request: PostgRESTRequest = {
  method: 'GET',
  url: 'http://localhost:3000/users?select=id,name,email,created_at&status.eq=active&order=created_at.desc&limit=25&offset=0'
}

// Output:
supabase
  .from('users')
  .select('id,name,email,created_at')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(25)
  .range(0, 24)
```

### Complex OR Conditions
```typescript
const request: PostgRESTRequest = {
  method: 'GET',
  url: 'http://localhost:3000/users?select=id,name,email&or=(age.gte.21,status.eq.active)'
}

// Output:
supabase
  .from('users')
  .select('id,name,email')
  .or('(age.gte.21,status.eq.active)')
```

### AND Conditions
```typescript
const request: PostgRESTRequest = {
  method: 'GET',
  url: 'http://localhost:3000/products?and=(price.gte.100,price.lte.1000,in_stock.eq.true)'
}

// Output:
supabase
  .from('products')
  .select('*')
  .and('(price.gte.100,price.lte.1000,in_stock.eq.true)')
```

### Order with Null Handling
```typescript
const request: PostgRESTRequest = {
  method: 'GET',
  url: 'http://localhost:3000/tasks?order=priority.desc.nullslast,due_date.asc.nullsfirst'
}

// Output:
supabase
  .from('tasks')
  .select('*')
  .order('priority', { ascending: false, nullsFirst: false })
  .order('due_date', { ascending: true, nullsFirst: true })
```

### Search with ILIKE
```typescript
const request: PostgRESTRequest = {
  method: 'GET',
  url: 'http://localhost:3000/products?name.ilike=%laptop%&price.lt=2000&order=price.asc'
}

// Output:
supabase
  .from('products')
  .select('*')
  .ilike('name', '%laptop%')
  .lt('price', 2000)
  .order('price', { ascending: true })
```

### Multiple Row Insert
```typescript
const request: PostgRESTRequest = {
  method: 'POST',
  url: 'http://localhost:3000/products',
  body: [
    { name: 'Laptop', price: 999.99 },
    { name: 'Mouse', price: 29.99 }
  ]
}

// Output:
supabase
  .from('products')
  .insert([
    {
      "name": "Laptop",
      "price": 999.99
    },
    {
      "name": "Mouse",
      "price": 29.99
    }
  ])
  .select()
```

## Type Safety

The library includes full TypeScript support:

```typescript
export interface SupabaseClientCode {
  code: string
  language: 'typescript'
}

function postgrestToSupabase(request: PostgRESTRequest): SupabaseClientCode
```

## Testing

Run the comprehensive test suite:

```bash
npm test
```

All 124 tests cover:

**Core Functionality:**
- ✅ All SELECT filters and operators (both key and value formats)
- ✅ INSERT, UPDATE, DELETE, UPSERT operations
- ✅ RPC (stored procedure) calls with parameters
- ✅ All 27 PostgREST operators in both formats
- ✅ Multiple order clauses (`order=col1.asc,col2.desc`)
- ✅ Null handling in ordering (`nullsfirst`, `nullslast`)
- ✅ AND/OR conditions (explicit parameters)
- ✅ Prefer headers (`return=minimal`, `resolution=merge-duplicates`)

**Edge Cases & Data Types:**
- ✅ Numeric: zero, negatives, decimals, scientific notation, percentages
- ✅ Boolean: true/false (case variations)
- ✅ Strings: empty, quotes, apostrophes, Unicode, emoji
- ✅ Special formats: IPs, URLs, UUIDs, emails, phone numbers, versions
- ✅ JSON: nested objects, arrays, null vs SQL null
- ✅ Timestamps & dates with various formats

**Complex Scenarios:**
- ✅ Real-world query patterns from production use cases
- ✅ Complete SQL example coverage from UI (15 comprehensive scenarios)
- ✅ Complex multi-filter queries with OR conditions
- ✅ Very long filter chains (10+ filters)
- ✅ Nested select columns with foreign key embeds
- ✅ Range operators with encoded values
- ✅ Full-text search with special characters
- ✅ JSON operators (`->>`, `->`, deep paths)
- ✅ Array operators (`@>`, `cs`, `cd`, `ov`)
- ✅ Column names with underscores, hyphens, numbers

**URL Encoding:**
- ✅ Percent-encoding (`%2A`, `%25`, `%28`, `%29`, `%7B`, `%7D`, `%2B`)
- ✅ Plus sign handling (`+` → space)
- ✅ Special characters in values

## Implementation Details

### Value Formatting
The library intelligently formats values based on type:
- Numbers: `25` → `25`
- Booleans: `true` → `true`
- Null: `null` → `null`
- Strings: `john` → `'john'`
- JSON objects: Preserved as-is

### Filter Parsing
PostgREST URL parameters are parsed and converted to Supabase method calls.

**Key format** (operator in parameter name):
- `age.gte=18` → `.gte('age', 18)`
- `status.eq=active` → `.eq('status', 'active')`
- `name.ilike=%john%` → `.ilike('name', '%john%')`

**Value format** (operator in parameter value):
- `age=gte.18` → `.gte('age', 18)`
- `status=eq.active` → `.eq('status', 'active')`
- `name=ilike.%2Aphone%2A` → `.ilike('name', '*phone*')`

URL encoding is automatically handled (e.g., `%2A` → `*`, `%25` → `%`, `+` → space).

### Header Handling
Special headers are recognized:
- `Prefer: resolution=merge-duplicates` → Uses `.upsert()` instead of `.insert()`
- `Prefer: return=minimal` → Omits `.select()` call

## License

Same as parent project (Apache 2.0)
