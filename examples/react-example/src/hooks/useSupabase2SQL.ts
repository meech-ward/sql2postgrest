import { useState, useCallback, useRef } from 'react';

declare global {
  interface Window {
    supabase2sql?: (query: string, baseURL?: string) => Supabase2SQLResult;
    __wasmLoaded?: boolean;
  }
}

export type Supabase2SQLResult = {
  sql: string;
  intermediate_postgrest?: {
    method: string;
    path: string;
    query?: string;
    body?: string;
    headers?: Record<string, string>;
  };
  warnings?: string[];
  metadata?: Record<string, string>;
  http?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string;
  };
  error?: string;
  description?: string;
}

export type UseSupabase2SQLResult = {
  convert: (query: string, baseURL?: string) => Supabase2SQLResult | null;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  startLoading: () => void;
}

// Use injected version or fallback
const WASM_VERSION = typeof __WASM_VERSION__ !== 'undefined' ? __WASM_VERSION__ : Date.now().toString();

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src^="${src.split('?')[0]}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export function useSupabase2SQL(): UseSupabase2SQLResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingStarted = useRef(false);

  const loadWASM = useCallback(async () => {
    if (loadingStarted.current) return;
    loadingStarted.current = true;
    setIsLoading(true);

    try {
      // Check if already loaded
      if (window.__wasmLoaded && window.supabase2sql) {
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      // Load scripts with version for cache busting
      await loadScript(`/wasm/wasm_exec.js?v=${WASM_VERSION}`);
      await loadScript(`/wasm/sql2postgrest.js?v=${WASM_VERSION}`);

      // Small delay to ensure scripts are fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load WASM
      const go = new (window as any).Go();
      const result = await WebAssembly.instantiateStreaming(
        fetch(`/wasm/sql2postgrest.wasm?v=${WASM_VERSION}`),
        go.importObject
      );

      go.run(result.instance);
      window.__wasmLoaded = true;

      // Wait for the WASM function to be available
      let attempts = 0;
      while (!window.supabase2sql && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.supabase2sql) {
        throw new Error('WASM function supabase2sql not available');
      }

      setIsReady(true);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load WASM');
      setIsLoading(false);
      loadingStarted.current = false; // Allow retry
    }
  }, []);

  const startLoading = useCallback(() => {
    if (!isLoading && !isReady && !loadingStarted.current) {
      loadWASM();
    }
  }, [isLoading, isReady, loadWASM]);

  const convert = useCallback(
    (query: string, baseURL = 'http://localhost:3000'): Supabase2SQLResult | null => {
      if (!isReady || !window.supabase2sql) {
        return null;
      }

      try {
        const result = window.supabase2sql(query, baseURL);
        return result;
      } catch (err) {
        console.error('Conversion error:', err);
        return {
          sql: '',
          error: err instanceof Error ? err.message : 'Conversion failed',
        };
      }
    },
    [isReady]
  );

  return { convert, isLoading, isReady, error, startLoading };
}
