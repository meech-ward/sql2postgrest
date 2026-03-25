import { Store } from '@tanstack/store'

interface TerminalState {
  sqlCode: string
  jsCode: string
  // Visibility State
  isSqlEditorOpen: boolean
  isJsEditorOpen: boolean
  isPostgrestOpen: boolean
  isOutputOpen: boolean
  // PostgREST State
  postgrestMethod: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  postgrestPath: string
  postgrestBody: string
  postgrestHeaders: Record<string, string>
  // Sync State
  lastEditedEditor: 'sql' | 'js' | 'postgrest' | null
  syncInProgress: boolean
  // Initialization State
  isInitializing: boolean
  hasInitialSyncCompleted: boolean
  // Error/Warning State
  sqlError: string | null
  jsError: string | null
  postgrestError: string | null
  // Connection Mode
  connectionMode: 'supabase' | 'postgrest'
  // Supabase Credentials (stored in memory only)
  supabaseUrl: string
  supabaseAnonKey: string
  // Generic PostgREST Endpoint
  postgrestEndpointUrl: string
  // Query Execution State
  isExecuting: boolean
  outputData: any
  executionStatus: number | null
  executionStatusText: string | null
  executionTime: number | null
  rowCount: number | null
  executionError: string | null
}

// LocalStorage key
const STORAGE_KEY = 'terminal-state'

// Load persisted state from localStorage
function loadPersistedState(): Partial<TerminalState> {
  if (typeof window === 'undefined') return {}

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}

    const parsed = JSON.parse(stored)
    return {
      sqlCode: parsed.sqlCode || '',
      isSqlEditorOpen: parsed.isSqlEditorOpen ?? true,
      isJsEditorOpen: parsed.isJsEditorOpen ?? true,
      isPostgrestOpen: parsed.isPostgrestOpen ?? true,
      isOutputOpen: parsed.isOutputOpen ?? true,
      // Set lastEditedEditor to 'sql' if we have SQL code to trigger sync
      lastEditedEditor: parsed.sqlCode ? 'sql' : null,
    }
  } catch (error) {
    console.error('Failed to load terminal state from localStorage:', error)
    return {}
  }
}

// Save state to localStorage
function persistState(state: TerminalState) {
  if (typeof window === 'undefined') return

  try {
    const toPersist = {
      sqlCode: state.sqlCode,
      isSqlEditorOpen: state.isSqlEditorOpen,
      isJsEditorOpen: state.isJsEditorOpen,
      isPostgrestOpen: state.isPostgrestOpen,
      isOutputOpen: state.isOutputOpen,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist))
  } catch (error) {
    console.error('Failed to save terminal state to localStorage:', error)
  }
}

const persistedState = loadPersistedState()

const initialState: TerminalState = {
  sqlCode: '',
  jsCode: '',
  // Visibility State
  isSqlEditorOpen: true,
  isJsEditorOpen: true,
  isPostgrestOpen: true,
  isOutputOpen: true,
  // PostgREST State
  postgrestMethod: 'GET',
  postgrestPath: '',
  postgrestBody: '',
  postgrestHeaders: {},
  // Sync State
  lastEditedEditor: null,
  syncInProgress: false,
  // Initialization State
  isInitializing: !!persistedState.sqlCode, // Start initializing if we have SQL to sync
  hasInitialSyncCompleted: false,
  // Error/Warning State
  sqlError: null,
  jsError: null,
  postgrestError: null,
  // Connection Mode
  connectionMode: 'supabase',
  // Supabase Credentials (not persisted - memory only)
  supabaseUrl: '',
  supabaseAnonKey: '',
  // Generic PostgREST Endpoint
  postgrestEndpointUrl: '',
  // Query Execution State
  isExecuting: false,
  outputData: null,
  executionStatus: null,
  executionStatusText: null,
  executionTime: null,
  rowCount: null,
  executionError: null,
  ...persistedState,
}

export const terminalStore = new Store<TerminalState>(initialState)

// Subscribe to state changes and persist
terminalStore.subscribe(() => {
  persistState(terminalStore.state)
})

export const setSqlCode = (sqlCode: string) => {
  terminalStore.setState((state) => ({ ...state, sqlCode }))
}

export const setJsCode = (jsCode: string) => {
  terminalStore.setState((state) => ({ ...state, jsCode }))
}

export const toggleSqlEditor = () => {
  terminalStore.setState((state) => ({ ...state, isSqlEditorOpen: !state.isSqlEditorOpen }))
}

export const toggleJsEditor = () => {
  terminalStore.setState((state) => ({ ...state, isJsEditorOpen: !state.isJsEditorOpen }))
}

export const togglePostgrest = () => {
  terminalStore.setState((state) => ({ ...state, isPostgrestOpen: !state.isPostgrestOpen }))
}

export const toggleOutput = () => {
  terminalStore.setState((state) => ({ ...state, isOutputOpen: !state.isOutputOpen }))
}

export const setPostgrestMethod = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE') => {
  terminalStore.setState((state) => ({ ...state, postgrestMethod: method }))
}

export const setPostgrestPath = (path: string) => {
  terminalStore.setState((state) => ({ ...state, postgrestPath: path }))
}

export const setPostgrestBody = (body: string) => {
  terminalStore.setState((state) => ({ ...state, postgrestBody: body }))
}

export const clearSqlEditor = () => {
  terminalStore.setState((state) => ({ ...state, sqlCode: '' }))
}

export const clearJsEditor = () => {
  terminalStore.setState((state) => ({ ...state, jsCode: '' }))
}

export const setPostgrestHeaders = (headers: Record<string, string>) => {
  terminalStore.setState((state) => ({ ...state, postgrestHeaders: headers }))
}

export const setLastEditedEditor = (editor: 'sql' | 'js' | 'postgrest' | null) => {
  terminalStore.setState((state) => ({ ...state, lastEditedEditor: editor }))
}

export const setSyncInProgress = (inProgress: boolean) => {
  terminalStore.setState((state) => ({ ...state, syncInProgress: inProgress }))
}

export const setSqlError = (error: string | null) => {
  terminalStore.setState((state) => ({ ...state, sqlError: error }))
}

export const setJsError = (error: string | null) => {
  terminalStore.setState((state) => ({ ...state, jsError: error }))
}

export const setPostgrestError = (error: string | null) => {
  terminalStore.setState((state) => ({ ...state, postgrestError: error }))
}

export const setIsExecuting = (isExecuting: boolean) => {
  terminalStore.setState((state) => ({ ...state, isExecuting }))
}

export const setOutputData = (outputData: any) => {
  terminalStore.setState((state) => ({ ...state, outputData }))
}

export const setExecutionStatus = (status: number | null, statusText: string | null) => {
  terminalStore.setState((state) => ({
    ...state,
    executionStatus: status,
    executionStatusText: statusText
  }))
}

export const setExecutionTime = (time: number | null) => {
  terminalStore.setState((state) => ({ ...state, executionTime: time }))
}

export const setRowCount = (count: number | null) => {
  terminalStore.setState((state) => ({ ...state, rowCount: count }))
}

export const setExecutionError = (error: string | null) => {
  terminalStore.setState((state) => ({ ...state, executionError: error }))
}

export const clearOutput = () => {
  terminalStore.setState((state) => ({
    ...state,
    outputData: null,
    executionStatus: null,
    executionStatusText: null,
    executionTime: null,
    rowCount: null,
    executionError: null,
  }))
}

export const setIsInitializing = (isInitializing: boolean) => {
  terminalStore.setState((state) => ({ ...state, isInitializing }))
}

export const setHasInitialSyncCompleted = (hasCompleted: boolean) => {
  terminalStore.setState((state) => ({ ...state, hasInitialSyncCompleted: hasCompleted }))
}

export const setConnectionMode = (mode: 'supabase' | 'postgrest') => {
  terminalStore.setState((state) => ({ ...state, connectionMode: mode }))
}

export const setSupabaseCredentials = (url: string, anonKey: string) => {
  terminalStore.setState((state) => ({
    ...state,
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
  }))
}

export const setPostgrestEndpointUrl = (url: string) => {
  terminalStore.setState((state) => ({ ...state, postgrestEndpointUrl: url }))
}

export const clearCredentials = () => {
  terminalStore.setState((state) => ({
    ...state,
    supabaseUrl: '',
    supabaseAnonKey: '',
    postgrestEndpointUrl: '',
  }))
}

export const hasValidCredentials = () => {
  const state = terminalStore.state
  if (state.connectionMode === 'supabase') {
    return state.supabaseUrl.trim() !== '' && state.supabaseAnonKey.trim() !== ''
  }
  return state.postgrestEndpointUrl.trim() !== ''
}
