import { useState, useCallback, useRef } from 'react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SQL2PostgREST: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Go: any;
    __wasmLoaded?: boolean;
  }
  const __WASM_VERSION__: string;
}

export type PostgRESTRequest = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
}

export type UseSQL2PostgRESTResult = {
  convert: (sql: string, baseURL?: string) => PostgRESTRequest | null;
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

export function useSQL2PostgREST(): UseSQL2PostgRESTResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [converter, setConverter] = useState<any>(null);
  const loadingStarted = useRef(false);

  const loadWASM = useCallback(async () => {
    if (loadingStarted.current) return;
    loadingStarted.current = true;
    setIsLoading(true);

    try {
      // Check if already loaded
      if (window.__wasmLoaded && window.SQL2PostgREST) {
        const converterInstance = new window.SQL2PostgREST();
        await converterInstance.load(`/wasm/sql2postgrest.wasm?v=${WASM_VERSION}`);
        
        setConverter(converterInstance);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      // Load scripts with version for cache busting
      await loadScript(`/wasm/wasm_exec.js?v=${WASM_VERSION}`);
      await loadScript(`/wasm/sql2postgrest.js?v=${WASM_VERSION}`);

      // Small delay to ensure scripts are fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));

      window.__wasmLoaded = true;

      const converterInstance = new window.SQL2PostgREST();
      
      // Load WASM with version parameter for cache busting
      await converterInstance.load(`/wasm/sql2postgrest.wasm?v=${WASM_VERSION}`);

      setConverter(converterInstance);
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
    (sql: string, baseURL: string = 'http://localhost:3000'): PostgRESTRequest | null => {
      if (!isReady || !converter) {
        return null;
      }

      try {
        const result = converter.convert(sql, baseURL);
        return result;
      } catch (err) {
        console.error('Conversion error:', err);
        return null;
      }
    },
    [isReady, converter]
  );

  return { convert, isLoading, isReady, error, startLoading };
}
