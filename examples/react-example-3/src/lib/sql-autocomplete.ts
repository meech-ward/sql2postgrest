import type { Monaco } from '@monaco-editor/react'
import type { languages, editor, Position } from 'monaco-editor'
import { DATABASE_SCHEMA } from './database-schema'

// SQL Keywords
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET',
  'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
  'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'ILIKE', 'BETWEEN',
  'IS', 'NULL', 'TRUE', 'FALSE', 'ASC', 'DESC',
  'DISTINCT', 'AS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'RETURNING', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX'
]

// SQL Functions
const SQL_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF',
  'CAST', 'CONCAT', 'SUBSTRING', 'LOWER', 'UPPER', 'TRIM',
  'NOW', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME',
  'DATE_TRUNC', 'EXTRACT', 'AGE', 'TO_CHAR', 'TO_DATE'
]

function getTableNameFromContext(textBeforeCursor: string): string | null {
  // Try to find table name in FROM clause
  const fromMatch = textBeforeCursor.match(/FROM\s+(\w+)/i)
  if (fromMatch) return fromMatch[1].toLowerCase()

  // Try to find table name in INSERT INTO
  const insertMatch = textBeforeCursor.match(/INSERT\s+INTO\s+(\w+)/i)
  if (insertMatch) return insertMatch[1].toLowerCase()

  // Try to find table name in UPDATE
  const updateMatch = textBeforeCursor.match(/UPDATE\s+(\w+)/i)
  if (updateMatch) return updateMatch[1].toLowerCase()

  // Try to find table name in DELETE FROM
  const deleteMatch = textBeforeCursor.match(/DELETE\s+FROM\s+(\w+)/i)
  if (deleteMatch) return deleteMatch[1].toLowerCase()

  return null
}

function shouldSuggestTables(textBeforeCursor: string): boolean {
  const trimmed = textBeforeCursor.trim().toUpperCase()
  return (
    trimmed.endsWith('FROM') ||
    trimmed.endsWith('JOIN') ||
    trimmed.endsWith('INTO') ||
    trimmed.endsWith('UPDATE') ||
    /FROM\s*$/i.test(textBeforeCursor) ||
    /JOIN\s*$/i.test(textBeforeCursor) ||
    /INTO\s*$/i.test(textBeforeCursor) ||
    /UPDATE\s*$/i.test(textBeforeCursor)
  )
}

function shouldSuggestColumns(textBeforeCursor: string): boolean {
  return (
    /SELECT\s+$/i.test(textBeforeCursor) ||
    /WHERE\s+$/i.test(textBeforeCursor) ||
    /SET\s+$/i.test(textBeforeCursor) ||
    /ORDER BY\s+$/i.test(textBeforeCursor) ||
    /GROUP BY\s+$/i.test(textBeforeCursor) ||
    /,\s*$/i.test(textBeforeCursor)
  )
}

export function setupSqlAutocomplete(monaco: Monaco): void {
  // Register SQL completion provider
  monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: [' ', '.', ','],
    provideCompletionItems: (model: editor.ITextModel, position: Position): languages.ProviderResult<languages.CompletionList> => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      })

      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: languages.CompletionItem[] = []

      // Suggest tables after FROM, JOIN, INTO, UPDATE
      if (shouldSuggestTables(textUntilPosition)) {
        Object.entries(DATABASE_SCHEMA).forEach(([tableName, tableInfo]) => {
          suggestions.push({
            label: tableName,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: tableInfo.description,
            insertText: tableName,
            range,
            sortText: `0${tableName}`, // Higher priority
          })
        })
      }

      // Suggest columns based on context
      if (shouldSuggestColumns(textUntilPosition)) {
        const tableName = getTableNameFromContext(textUntilPosition)

        if (tableName && tableName in DATABASE_SCHEMA) {
          // Suggest columns from the specific table
          const table = DATABASE_SCHEMA[tableName as keyof typeof DATABASE_SCHEMA]
          table.columns.forEach((column) => {
            suggestions.push({
              label: column,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: `${tableName}.${column}`,
              insertText: column,
              range,
              sortText: `0${column}`,
            })
          })
        } else {
          // Suggest columns from all tables if table context is unclear
          Object.entries(DATABASE_SCHEMA).forEach(([tableName, tableInfo]) => {
            tableInfo.columns.forEach((column) => {
              suggestions.push({
                label: column,
                kind: monaco.languages.CompletionItemKind.Field,
                detail: `${tableName}.${column}`,
                insertText: column,
                range,
                sortText: `1${column}`, // Lower priority
              })
            })
          })
        }
      }

      // Always suggest SQL keywords
      SQL_KEYWORDS.forEach((keyword) => {
        suggestions.push({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range,
          sortText: `2${keyword}`, // Lower priority than tables/columns
        })
      })

      // Suggest SQL functions
      SQL_FUNCTIONS.forEach((func) => {
        suggestions.push({
          label: func,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `${func}()`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: `3${func}`,
        })
      })

      return {
        suggestions,
        incomplete: false,
      }
    },
  })
}
