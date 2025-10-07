import { describe, it, expect } from 'vitest'
import { postgrestToSupabase } from './postgrestToSupabase'
import type { PostgRESTRequest } from '../hooks/useSQL2PostgREST'

describe('postgrestToSupabase', () => {
  describe('SELECT queries', () => {
    it('should convert simple SELECT *', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain("supabase")
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain(".select('*')")
      expect(result.code).not.toContain("const { data, error }")
    })

    it('should convert SELECT with specific columns', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?select=id,name,email'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".select('id,name,email')")
    })

    it('should convert SELECT with eq filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?age.eq=25'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('age', 25)")
    })

    it('should convert SELECT with neq filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?status.neq=inactive'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".neq('status', 'inactive')")
    })

    it('should convert SELECT with gt filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?age.gt=18'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".gt('age', 18)")
    })

    it('should convert SELECT with gte filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?age.gte=21'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".gte('age', 21)")
    })

    it('should convert SELECT with lt filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?age.lt=65'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".lt('age', 65)")
    })

    it('should convert SELECT with lte filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?age.lte=100'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".lte('age', 100)")
    })

    it('should convert SELECT with like filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?name.like=John*'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".like('name', 'John%')")
    })

    it('should convert SELECT with ilike filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?name.ilike=%john%'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".ilike('name', '%john%')")
    })

    it('should convert PostgREST wildcards (*) to SQL wildcards (%) for ILIKE', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/products?name=ilike.*phone*'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".ilike('name', '%phone%')")
    })

    it('should convert PostgREST wildcards (*) to SQL wildcards (%) for LIKE', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?name.like=John*'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".like('name', 'John%')")
    })

    it('should convert SELECT with is null filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?deleted_at.is=null'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".is('deleted_at', null)")
    })

    it('should convert SELECT with in filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?status.in=(active,pending,trial)'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".in('status', ['active', 'pending', 'trial'])")
    })

    it('should convert SELECT with contains filter (arrays)', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/posts?tags.cs={javascript,react}'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".contains('tags', {javascript,react})")
    })

    it('should convert SELECT with text search', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/articles?content.fts=postgres'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".textSearch('content', 'postgres', { config: 'english' })")
    })

    it('should convert SELECT with order ascending', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?order=created_at.asc'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".order('created_at', { ascending: true })")
    })

    it('should convert SELECT with order descending', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?order=created_at.desc'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".order('created_at', { ascending: false })")
    })

    it('should convert SELECT with limit', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?limit=10'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.limit(10)')
    })

    it('should convert SELECT with offset', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?offset=20'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.range(20, 29)')
    })

    it('should convert SELECT with limit and offset', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?limit=10&offset=20'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.limit(10)')
      expect(result.code).toContain('.range(20, 29)')
    })

    it('should convert complex SELECT query', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?select=id,name,email&age.gte=18&status.eq=active&order=created_at.desc&limit=20'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain(".select('id,name,email')")
      expect(result.code).toContain(".gte('age', 18)")
      expect(result.code).toContain(".eq('status', 'active')")
      expect(result.code).toContain(".order('created_at', { ascending: false })")
      expect(result.code).toContain('.limit(20)')
    })

    it('should convert SELECT with OR conditions', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?select=id,name,email,created_at&or=(age.gte.21,and(status.eq.active)),and(role.eq.admin,verified.eq.true)'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain(".select('id,name,email,created_at')")
      expect(result.code).toContain(".or('(age.gte.21,and(status.eq.active)),and(role.eq.admin,verified.eq.true)')")
    })
  })

  describe('INSERT queries', () => {
    it('should convert simple INSERT', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/users',
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 25
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain('.insert(')
      expect(result.code).toContain('"name": "John Doe"')
      expect(result.code).toContain('"email": "john@example.com"')
      expect(result.code).toContain('"age": 25')
      expect(result.code).toContain('.select()')
    })

    it('should convert INSERT with multiple rows', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/users',
        body: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Doe', email: 'jane@example.com' }
        ]
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.insert(')
      expect(result.code).toContain('"name": "John Doe"')
      expect(result.code).toContain('"name": "Jane Doe"')
    })

    it('should convert UPSERT', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/users',
        headers: {
          Prefer: 'resolution=merge-duplicates'
        },
        body: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.upsert(')
      expect(result.code).toContain('"id": 1')
    })

    it('should format UPSERT with array body correctly', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/inventory',
        headers: {
          Prefer: 'resolution=merge-duplicates'
        },
        body: [
          {
            product_id: 42,
            quantity: 100
          }
        ]
      }

      const result = postgrestToSupabase(request)
      const expected = `supabase
  .from('inventory')
  .upsert([
    {
      "product_id": 42,
      "quantity": 100
    }
  ])
  .select()`
      expect(result.code).toBe(expected)
    })

    it('should convert INSERT without return', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/users',
        headers: {
          Prefer: 'return=minimal'
        },
        body: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.insert(')
      expect(result.code).not.toContain('.select()')
    })
  })

  describe('UPDATE queries', () => {
    it('should convert UPDATE with eq filter', () => {
      const request: PostgRESTRequest = {
        method: 'PATCH',
        url: 'http://localhost:3000/users?id.eq=1',
        body: {
          name: 'Jane Doe',
          status: 'active'
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain('.update(')
      expect(result.code).toContain('"name": "Jane Doe"')
      expect(result.code).toContain(".eq('id', 1)")
      expect(result.code).toContain('.select()')
    })

    it('should convert UPDATE with multiple filters', () => {
      const request: PostgRESTRequest = {
        method: 'PATCH',
        url: 'http://localhost:3000/users?age.lt=18&status.eq=pending',
        body: {
          status: 'inactive'
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.update(')
      expect(result.code).toContain(".lt('age', 18)")
      expect(result.code).toContain(".eq('status', 'pending')")
    })
  })

  describe('DELETE queries', () => {
    it('should convert DELETE with eq filter', () => {
      const request: PostgRESTRequest = {
        method: 'DELETE',
        url: 'http://localhost:3000/users?id.eq=1'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain('.delete()')
      expect(result.code).toContain(".eq('id', 1)")
    })

    it('should convert DELETE with user_id filter', () => {
      const request: PostgRESTRequest = {
        method: 'DELETE',
        url: 'http://localhost:3000/sessions?user_id.eq=123'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('sessions')")
      expect(result.code).toContain('.delete()')
      expect(result.code).toContain(".eq('user_id', 123)")
      expect(result.code).toBe(`supabase\n  .from('sessions')\n  .delete()\n  .eq('user_id', 123)`)
    })

    it('should convert DELETE with multiple filters', () => {
      const request: PostgRESTRequest = {
        method: 'DELETE',
        url: 'http://localhost:3000/sessions?user_id.eq=123&expired.eq=true'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.delete()')
      expect(result.code).toContain(".eq('user_id', 123)")
      expect(result.code).toContain(".eq('expired', true)")
    })

    it('should convert DELETE with gt filter', () => {
      const request: PostgRESTRequest = {
        method: 'DELETE',
        url: 'http://localhost:3000/logs?created_at.lt=2024-01-01'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.delete()')
      expect(result.code).toContain(".lt('created_at', '2024-01-01')")
    })

    it('should convert DELETE with is null filter', () => {
      const request: PostgRESTRequest = {
        method: 'DELETE',
        url: 'http://localhost:3000/temp_data?processed_at.is=null'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.delete()')
      expect(result.code).toContain(".is('processed_at', null)")
    })
  })

  describe('Edge cases', () => {
    it('should handle boolean values correctly', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?active.eq=true'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('active', true)")
    })

    it('should handle string values with quotes', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: "http://localhost:3000/users?bio.like=It's great"
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".like('bio', 'It's great')")
    })

    it('should return typescript language', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users'
      }

      const result = postgrestToSupabase(request)
      expect(result.language).toBe('typescript')
    })

    it('should handle unsupported methods', () => {
      const request: PostgRESTRequest = {
        method: 'PUT',
        url: 'http://localhost:3000/users'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('// Unsupported method: PUT')
    })

    it('should handle tables with no name gracefully', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('table')")
    })

    it('should handle zero values', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/products?price.eq=0'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('price', 0)")
    })

    it('should handle negative numbers', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/transactions?amount.lt=-100'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".lt('amount', -100)")
    })

    it('should handle decimal numbers in key format', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/products?price.gte=99.99'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".gte('price', 99.99)")
    })

    it('should handle decimal numbers in value format', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/products?price=gte.99.99'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".gte('price', 99.99)")
    })

    it('should handle empty string values', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?bio.eq='
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('bio', '')")
    })

    it('should handle false boolean', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?active.eq=false'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('active', false)")
    })

    it('should handle multiple filters on different columns', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?age.gte=18&age.lte=65&status.eq=active'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".gte('age', 18)")
      expect(result.code).toContain(".lte('age', 65)")
      expect(result.code).toContain(".eq('status', 'active')")
    })

    it('should handle single-element IN array', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?id.in=(123)'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".in('id', [123])")
    })

    it('should handle mixed number and string IN array', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/items?type.in=(1,active,test)'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".in('type', [1, 'active', 'test'])")
    })

    it('should handle column names with underscores', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?created_at.gte=2024-01-01'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".gte('created_at', '2024-01-01')")
    })

    it('should handle timestamp values', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/events?occurred_at.gte=2024-01-01T00:00:00Z'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".gte('occurred_at', '2024-01-01T00:00:00Z')")
    })

    it('should handle very long string values', () => {
      const longString = 'a'.repeat(500)
      const request: PostgRESTRequest = {
        method: 'GET',
        url: `http://localhost:3000/posts?content.like=${longString}`
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(`.like('content', '${longString}')`)
    })

    it('should handle Unicode characters', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?name.eq=José'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('name', 'José')")
    })

    it('should handle emoji in values', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/posts?title.like=🎉 Party'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".like('title', '🎉 Party')")
    })

    it('should handle INSERT with empty body array', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/users',
        body: []
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.insert([])')
    })

    it('should handle INSERT with null values', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/users',
        body: {
          name: 'John',
          bio: null,
          age: 25
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('"bio": null')
    })

    it('should handle UPDATE with empty object', () => {
      const request: PostgRESTRequest = {
        method: 'PATCH',
        url: 'http://localhost:3000/users?id.eq=1',
        body: {}
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.update({})')
    })

    it('should handle nested select columns', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/posts?select=id,title,author(id,name,email)'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".select('id,title,author(id,name,email)')")
    })

    it('should handle select with count aggregate', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?select=status,count'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".select('status,count')")
    })

    it('should handle column with dots in JSON path', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?metadata->settings->theme.eq=dark'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('metadata->settings->theme', 'dark')")
    })

    it('should handle limit only without offset', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?limit=5'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.limit(5)')
      expect(result.code).not.toContain('.range(')
    })

    it('should handle offset only without limit', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?offset=10'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.range(10, 19)')
      expect(result.code).not.toContain('.limit(')
    })

    it('should handle very large numbers', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/stats?views.gte=999999999'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.gte(\'views\', 999999999)')
    })

    it('should handle values with spaces', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?name.eq=John Doe'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('name', 'John Doe')")
    })

    it('should handle multiple order clauses', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?order=age.desc,name.asc'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".order('age', { ascending: false })")
    })

    it('should handle case-sensitive filters', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?Name.eq=JOHN&EMAIL.like=%TEST%'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('Name', 'JOHN')")
      expect(result.code).toContain(".like('EMAIL', '%TEST%')")
    })

    it('should handle array with JSON objects', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/items',
        body: [
          { id: 1, data: { nested: true } },
          { id: 2, data: { nested: false } }
        ]
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('"data": {')
      expect(result.code).toContain('"nested": true')
      expect(result.code).toContain('"nested": false')
    })

    it('should preserve scientific notation in numbers', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/science?value.eq=1.5e10'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('value', 1.5e10)")
    })

    it('should handle DELETE without filters (dangerous but valid)', () => {
      const request: PostgRESTRequest = {
        method: 'DELETE',
        url: 'http://localhost:3000/temp_data'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toBe("supabase\n  .from('temp_data')\n  .delete()")
    })

    it('should handle complex nested OR with AND combinations', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?or=(and(age.gte.18,status.eq.active),and(role.eq.admin,verified.is.true))'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".or('(and(age.gte.18,status.eq.active),and(role.eq.admin,verified.is.true))')")
    })

    it('should handle IP addresses as values', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/logs?ip.eq=192.168.1.1'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('ip', '192.168.1.1')")
    })

    it('should handle URL values with protocols', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/links?url.eq=https://example.com'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('url', 'https://example.com')")
    })

    it('should handle version numbers with multiple dots', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/packages?version.eq=1.2.3'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('version', '1.2.3')")
    })

    it('should handle mixed case boolean values', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/items?available.eq=TRUE'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('available', 'TRUE')")
    })

    it('should handle select with wildcard and specific columns', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?select=*,posts(title,content)'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".select('*,posts(title,content)')")
    })

    it('should handle UPDATE with return=minimal header', () => {
      const request: PostgRESTRequest = {
        method: 'PATCH',
        url: 'http://localhost:3000/users?id.eq=1',
        headers: {
          Prefer: 'return=minimal'
        },
        body: { status: 'active' }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.update({')
      expect(result.code).not.toContain('.select()')
    })

    it('should handle very long filter chains (10+ filters)', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/items?a.eq=1&b.eq=2&c.eq=3&d.eq=4&e.eq=5&f.eq=6&g.eq=7&h.eq=8&i.eq=9&j.eq=10'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('a', 1)")
      expect(result.code).toContain(".eq('j', 10)")
      const eqCount = (result.code.match(/\.eq\(/g) || []).length
      expect(eqCount).toBe(10)
    })

    it('should handle array values in INSERT with special types', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/data',
        body: {
          tags: ['tag1', 'tag2', 'tag3'],
          scores: [95.5, 87.3, 92.1],
          flags: [true, false, true],
          nulls: [null, 'value', null]
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('"tags": [')
      expect(result.code).toContain('"scores": [')
      expect(result.code).toContain('"flags": [')
      expect(result.code).toContain('"nulls": [')
    })

    it('should handle deeply nested JSON in INSERT', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/configs',
        body: {
          settings: {
            ui: {
              theme: {
                colors: {
                  primary: '#FF0000',
                  secondary: '#00FF00'
                }
              }
            }
          }
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('"settings": {')
      expect(result.code).toContain('"ui": {')
      expect(result.code).toContain('"theme": {')
      expect(result.code).toContain('"colors": {')
    })

    it('should handle range with very large offset', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/logs?limit=100&offset=1000000'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain('.limit(100)')
      expect(result.code).toContain('.range(1000000, 1000099)')
    })

    it('should handle filters with hyphens in column names', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/items?created-at.gte=2024-01-01'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".gte('created-at', '2024-01-01')")
    })

    it('should handle filters with numbers in column names', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/stats?metric1.gt=100&metric2.lt=50'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".gt('metric1', 100)")
      expect(result.code).toContain(".lt('metric2', 50)")
    })

    it('should handle percentage values', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/stats?completion.gte=0.95'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".gte('completion', 0.95)")
    })

    it('should handle GUID/UUID values', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/sessions?id.eq=550e8400-e29b-41d4-a716-446655440000'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('id', '550e8400-e29b-41d4-a716-446655440000')")
    })

    it('should handle base64-like strings', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/tokens?hash.eq=SGVsbG8gV29ybGQh'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('hash', 'SGVsbG8gV29ybGQh')")
    })

    it('should handle email addresses in filters', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?email.eq=user@example.com'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('email', 'user@example.com')")
    })

    it('should handle phone numbers with special characters', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/contacts?phone.eq=%2B1-555-123-4567'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".eq('phone', '+1-555-123-4567')")
    })
  })

  describe('AND parameter support', () => {
    it('should convert explicit AND conditions', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?and=(age.gte.18,status.eq.active)'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain(".and('(age.gte.18,status.eq.active)')")
    })

    it('should handle complex nested AND conditions', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/products?and=(price.gte.100,price.lte.1000,in_stock.eq.true)'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".and('(price.gte.100,price.lte.1000,in_stock.eq.true)')")
    })

    it('should prioritize OR over AND when both present', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?or=(age.gte.21,role.eq.admin)&and=(status.eq.active)'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".or('(age.gte.21,role.eq.admin)')")
      expect(result.code).not.toContain(".and(")
    })
  })

  describe('Order nullsfirst/nullslast support', () => {
    it('should handle order with nullslast', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?order=created_at.desc.nullslast'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".order('created_at', { ascending: false, nullsFirst: false })")
    })

    it('should handle order with nullsfirst', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?order=score.desc.nullsfirst'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".order('score', { ascending: false, nullsFirst: true })")
    })

    it('should handle order with nullslast ascending', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/items?order=priority.asc.nullslast'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".order('priority', { ascending: true, nullsFirst: false })")
    })

    it('should handle multiple order clauses with null handling', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/tasks?order=priority.desc.nullslast,created_at.asc.nullsfirst'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".order('priority', { ascending: false, nullsFirst: false })")
      expect(result.code).toContain(".order('created_at', { ascending: true, nullsFirst: true })")
    })

    it('should handle order without null specification', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?order=name.asc'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".order('name', { ascending: true })")
      expect(result.code).not.toContain('nullsFirst')
    })

    it('should handle mixed order clauses with and without nulls', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/posts?order=featured.desc.nullslast,created_at.desc'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".order('featured', { ascending: false, nullsFirst: false })")
      expect(result.code).toContain(".order('created_at', { ascending: false })")
    })
  })

  describe('RPC (stored procedure) support', () => {
    it('should convert RPC call without parameters', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/get_active_users'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('get_active_users')")
    })

    it('should convert RPC call with parameters', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/search_users',
        body: {
          search_term: 'john',
          min_age: 18
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('search_users', {")
      expect(result.code).toContain('"search_term": "john"')
      expect(result.code).toContain('"min_age": 18')
    })

    it('should convert RPC call with filters on results', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/get_users?age.gte=21&status.eq=active',
        body: {}
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('get_users')")
      expect(result.code).toContain(".gte('age', 21)")
      expect(result.code).toContain(".eq('status', 'active')")
    })

    it('should convert RPC call with complex parameters', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/create_report',
        body: {
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          filters: {
            status: 'completed',
            tags: ['important', 'urgent']
          }
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('create_report', {")
      expect(result.code).toContain('"start_date": "2024-01-01"')
      expect(result.code).toContain('"filters": {')
      expect(result.code).toContain('"status": "completed"')
    })

    it('should convert RPC with empty body object', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/refresh_stats',
        body: {}
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toBe("supabase\n  .rpc('refresh_stats')")
    })

    it('should convert RPC with ordering on results', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/get_top_users?order=score.desc&limit=10',
        body: { min_score: 100 }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('get_top_users', {")
      expect(result.code).toContain('"min_score": 100')
      expect(result.code).toContain(".order('score', { ascending: false })")
      expect(result.code).toContain('.limit(10)')
    })

    it('should handle RPC with select on results', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/get_projects?select=id,name,owner(name,email)',
        body: {}
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('get_projects')")
    })

    it('should handle RPC with offset and limit', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/list_items?limit=50&offset=100',
        body: {}
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('list_items')")
      expect(result.code).toContain('.limit(50)')
      expect(result.code).toContain('.range(100, 149)')
    })

    it('should handle RPC with all modifiers', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/complex_query?status.eq=active&order=created_at.desc.nullslast&limit=20',
        body: {
          filter_type: 'advanced',
          options: { include_archived: false }
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('complex_query', {")
      expect(result.code).toContain('"filter_type": "advanced"')
      expect(result.code).toContain(".eq('status', 'active')")
      expect(result.code).toContain(".order('created_at', { ascending: false, nullsFirst: false })")
      expect(result.code).toContain('.limit(20)')
    })

    it('should handle RPC function with underscore in name', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/get_user_stats',
        body: { user_id: 123 }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('get_user_stats', {")
      expect(result.code).toContain('"user_id": 123')
    })

    it('should handle RPC with boolean parameter', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/toggle_feature',
        body: { enabled: true }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('toggle_feature', {")
      expect(result.code).toContain('"enabled": true')
    })

    it('should handle RPC with array parameter', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/rpc/bulk_update',
        body: { 
          ids: [1, 2, 3, 4, 5],
          status: 'processed'
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('bulk_update', {")
      expect(result.code).toContain('"ids": [')
      expect(result.code).toContain('"status": "processed"')
    })

    it('should handle RPC via GET request (query params as function params)', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/rpc/simple_function'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".rpc('simple_function')")
    })
  })

  describe('Combined advanced features', () => {
    it('should handle AND with multiple order clauses including nulls', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/tasks?and=(status.eq.open,assigned_to.not.is.null)&order=priority.desc.nullslast,due_date.asc.nullsfirst'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".and('(status.eq.open,assigned_to.not.is.null)')")
      expect(result.code).toContain(".order('priority', { ascending: false, nullsFirst: false })")
      expect(result.code).toContain(".order('due_date', { ascending: true, nullsFirst: true })")
    })

    it('should handle complex query with all features', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/items?select=id,name,category(name)&or=(featured.eq.true,promoted.eq.true)&order=created_at.desc.nullslast,name.asc&limit=50&offset=0'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".select('id,name,category(name)')")
      expect(result.code).toContain(".or('(featured.eq.true,promoted.eq.true)')")
      expect(result.code).toContain(".order('created_at', { ascending: false, nullsFirst: false })")
      expect(result.code).toContain(".order('name', { ascending: true })")
      expect(result.code).toContain('.limit(50)')
      expect(result.code).toContain('.range(0, 49)')
    })
  })

  describe('Complete SQL examples from UI', () => {
    it('should convert simple SELECT with age filter', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?age=gt.18'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain(".gt('age', 18)")
    })

    it('should convert pattern matching with ILIKE and multiple filters', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/products?limit=20&name=ilike.%2Aphone%2A&order=price.desc&price=lt.1000'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('products')")
      expect(result.code).toContain(".ilike('name', '%phone%')")
      expect(result.code).toContain(".lt('price', 1000)")
      expect(result.code).toContain(".order('price', { ascending: false })")
      expect(result.code).toContain('.limit(20)')
    })

    it('should convert full-text search with special characters', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/articles?content=fts.postgres+%26+%28sql+%7C+database%29&order=created_at.desc'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('articles')")
      expect(result.code).toContain(".textSearch('content', 'postgres & (sql | database)', { config: 'english' })")
      expect(result.code).toContain(".order('created_at', { ascending: false })")
    })
    
    it('should handle actual PostgREST FTS URL format', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/articles?content=fts.postgres+%26+%28sql+%7C+database%29&order=created_at.desc'
      }

      const result = postgrestToSupabase(request)
      
      expect(result.code).toBe(`supabase
  .from('articles')
  .select('*')
  .textSearch('content', 'postgres & (sql | database)', { config: 'english' })
  .order('created_at', { ascending: false })`)
    })

    it('should convert JSON operators (->>) for metadata queries', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/orders?metadata-%3E%3Estatus=eq.shipped'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('orders')")
      expect(result.code).toContain(".eq('metadata->>status', 'shipped')")
    })

    it('should convert array contains operator with encoded values', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/posts?tags=cs.%7Bjavascript%2Creact%7D'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('posts')")
      expect(result.code).toContain(".contains('tags', {javascript,react})")
    })

    it('should convert range operators with encoded brackets', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/bookings?capacity=cs.%5B10%2C20%29'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('bookings')")
      expect(result.code).toContain(".contains('capacity', '[10,20)')")
    })

    it('should convert INSERT single user with array body', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/users',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: [
          {
            age: 28,
            email: 'john@example.com',
            name: 'John Doe',
            role: 'member'
          }
        ]
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain('.insert([')
      expect(result.code).toContain('"name": "John Doe"')
      expect(result.code).toContain('"email": "john@example.com"')
      expect(result.code).toContain('"age": 28')
      expect(result.code).toContain('"role": "member"')
      expect(result.code).toContain('.select()')
    })

    it('should convert INSERT multiple products', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/products',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: [
          {
            category: 'electronics',
            in_stock: true,
            name: 'Laptop',
            price: '999.99'
          },
          {
            category: 'accessories',
            in_stock: true,
            name: 'Mouse',
            price: '29.99'
          },
          {
            category: 'accessories',
            in_stock: false,
            name: 'Keyboard',
            price: '79.99'
          }
        ]
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('products')")
      expect(result.code).toContain('.insert([')
      expect(result.code).toContain('"name": "Laptop"')
      expect(result.code).toContain('"name": "Mouse"')
      expect(result.code).toContain('"name": "Keyboard"')
      expect(result.code).toContain('"in_stock": true')
      expect(result.code).toContain('"in_stock": false')
    })

    it('should convert UPSERT with ON CONFLICT resolution', () => {
      const request: PostgRESTRequest = {
        method: 'POST',
        url: 'http://localhost:3000/inventory?on_conflict=product_id',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation,resolution=merge-duplicates'
        },
        body: [
          {
            product_id: 42,
            quantity: 100
          }
        ]
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('inventory')")
      expect(result.code).toContain('.upsert([')
      expect(result.code).toContain('"product_id": 42')
      expect(result.code).toContain('"quantity": 100')
      expect(result.code).toContain('.select()')
    })

    it('should convert UPDATE with less than filter', () => {
      const request: PostgRESTRequest = {
        method: 'PATCH',
        url: 'http://localhost:3000/users?age=lt.18',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: {
          status: 'inactive'
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain('.update({')
      expect(result.code).toContain('"status": "inactive"')
      expect(result.code).toContain(".lt('age', 18)")
      expect(result.code).toContain('.select()')
    })

    it('should convert UPDATE with IN operator and JSON body', () => {
      const request: PostgRESTRequest = {
        method: 'PATCH',
        url: 'http://localhost:3000/profiles?user_id=in.%281%2C2%2C3%29',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: {
          settings: '{"theme": "dark"}'
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('profiles')")
      expect(result.code).toContain('.update({')
      expect(result.code).toContain('"settings": "{\\"theme\\": \\"dark\\"}"')
      expect(result.code).toContain(".in('user_id', [1, 2, 3])")
      expect(result.code).toContain('.select()')
    })

    it('should convert DELETE with user_id filter', () => {
      const request: PostgRESTRequest = {
        method: 'DELETE',
        url: 'http://localhost:3000/sessions?user_id=eq.123',
        headers: {
          'Prefer': 'return=representation'
        }
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('sessions')")
      expect(result.code).toContain('.delete()')
      expect(result.code).toContain(".eq('user_id', 123)")
    })

    it('should convert SELECT with IN operator (encoded parentheses)', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?status=in.%28active%2Cpremium%2Ctrial%29'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain(".in('status', ['active', 'premium', 'trial'])")
    })

    it('should convert SELECT with IS NULL and NOT operators', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/posts?deleted_at=is.null&draft=not.eq.true'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('posts')")
      expect(result.code).toContain(".is('deleted_at', null)")
      expect(result.code).toContain(".not('draft', 'eq', true)")
    })

    it('should handle complex OR conditions from UI examples', () => {
      const request: PostgRESTRequest = {
        method: 'GET',
        url: 'http://localhost:3000/users?select=id,name,email,created_at&or=(age.gte.21,status.eq.active),(role.eq.admin,verified.eq.true)'
      }

      const result = postgrestToSupabase(request)
      expect(result.code).toContain(".from('users')")
      expect(result.code).toContain(".select('id,name,email,created_at')")
      expect(result.code).toContain(".or('(age.gte.21,status.eq.active),(role.eq.admin,verified.eq.true)')")
    })
  })
})
