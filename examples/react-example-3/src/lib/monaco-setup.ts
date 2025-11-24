import type { Monaco } from '@monaco-editor/react'

// Generic Supabase client type definitions (works with any database)
export const SUPABASE_CLIENT_TYPES = `
// Generic JSON type
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Generic record type for any table
type GenericRecord = Record<string, any>

// Supabase client type definitions
interface PostgrestFilterBuilder<T = GenericRecord> {
  select(query?: string): PostgrestFilterBuilder<T>

  eq(column: string, value: any): PostgrestFilterBuilder<T>

  neq(column: string, value: any): PostgrestFilterBuilder<T>

  gt(column: string, value: any): PostgrestFilterBuilder<T>

  lt(column: string, value: any): PostgrestFilterBuilder<T>

  gte(column: string, value: any): PostgrestFilterBuilder<T>

  lte(column: string, value: any): PostgrestFilterBuilder<T>

  like(column: string, pattern: string): PostgrestFilterBuilder<T>

  ilike(column: string, pattern: string): PostgrestFilterBuilder<T>

  is(column: string, value: null | boolean): PostgrestFilterBuilder<T>

  in(column: string, values: any[]): PostgrestFilterBuilder<T>

  contains(column: string, value: any): PostgrestFilterBuilder<T>

  containedBy(column: string, value: any): PostgrestFilterBuilder<T>

  or(filters: string): PostgrestFilterBuilder<T>

  and(filters: string): PostgrestFilterBuilder<T>

  not(column: string, operator: string, value: any): PostgrestFilterBuilder<T>

  filter(column: string, operator: string, value: any): PostgrestFilterBuilder<T>

  match(query: Record<string, any>): PostgrestFilterBuilder<T>

  textSearch(column: string, query: string, options?: { type?: 'plain' | 'phrase' | 'websearch', config?: string }): PostgrestFilterBuilder<T>

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): PostgrestFilterBuilder<T>

  limit(count: number): PostgrestFilterBuilder<T>

  range(from: number, to: number): PostgrestFilterBuilder<T>

  single(): Promise<{ data: T | null; error: any }>

  maybeSingle(): Promise<{ data: T | null; error: any }>

  then<TResult>(onfulfilled?: (value: { data: T[] | null; error: any }) => TResult): Promise<TResult>
}

interface PostgrestQueryBuilder<T = GenericRecord> {
  select(query?: string): PostgrestFilterBuilder<T>

  insert(values: Partial<T> | Partial<T>[], options?: { onConflict?: string }): PostgrestFilterBuilder<T>

  upsert(values: Partial<T> | Partial<T>[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): PostgrestFilterBuilder<T>

  update(values: Partial<T>): PostgrestFilterBuilder<T>

  delete(): PostgrestFilterBuilder<T>
}

interface SupabaseClient {
  from(table: string): PostgrestQueryBuilder

  auth: {
    signIn(credentials: any): Promise<any>
    signUp(credentials: any): Promise<any>
    signOut(): Promise<any>
    getSession(): Promise<any>
    getUser(): Promise<any>
    onAuthStateChange(callback: (event: string, session: any) => void): { data: { subscription: any } }
  }

  storage: {
    from(bucket: string): any
  }

  rpc(fn: string, args?: Record<string, any>): Promise<{ data: any; error: any }>
}

// Global supabase instance
declare const supabase: SupabaseClient
`

export function setupMonacoTypes(monaco: Monaco) {
  // Clear existing extra libs
  monaco.languages.typescript.typescriptDefaults.setExtraLibs([])

  // Add Supabase client type definitions
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    SUPABASE_CLIENT_TYPES,
    'file:///supabase-client.d.ts'
  )
}
