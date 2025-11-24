// JavaScript wrapper for sql2postgrest WASM

class SQL2PostgREST {
    constructor() {
        this.ready = false;
        this.readyPromise = null;
    }

    async load(wasmPath = './sql2postgrest.wasm') {
        if (this.ready) return;
        if (this.readyPromise) return this.readyPromise;

        this.readyPromise = new Promise(async (resolve, reject) => {
            try {
                const go = new Go();

                let result;
                if (typeof WebAssembly.instantiateStreaming === 'function') {
                    result = await WebAssembly.instantiateStreaming(fetch(wasmPath), go.importObject);
                } else {
                    const response = await fetch(wasmPath);
                    const bytes = await response.arrayBuffer();
                    result = await WebAssembly.instantiate(bytes, go.importObject);
                }

                // Run the WASM module
                go.run(result.instance);

                // Wait for the WASM functions to be available
                let attempts = 0;
                while (!window.postgrest2sql && attempts < 50) {
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

                if (!window.postgrest2sql) {
                    throw new Error('postgrest2sql function not available after WASM load');
                }

                this.ready = true;
                resolve();
            } catch (err) {
                reject(err);
            }
        });

        return this.readyPromise;
    }

    convert(sql, baseURL = 'http://localhost:3000') {
        if (!this.ready) {
            throw new Error('WASM not loaded. Call load() first.');
        }

        const result = sql2postgrest(sql, baseURL);

        if (typeof result === 'string') {
            return JSON.parse(result);
        }

        return result;
    }

    async convertAsync(sql, baseURL = 'http://localhost:3000') {
        await this.load();
        return this.convert(sql, baseURL);
    }

    convertReverse(request) {
        if (!this.ready) {
            throw new Error('WASM not loaded. Call load() first.');
        }

        // Check if postgrest2sql function is available
        if (typeof postgrest2sql === 'undefined') {
            throw new Error('postgrest2sql function not available. WASM may not be fully initialized.');
        }

        // Call the postgrest2sql WASM function
        const result = postgrest2sql({
            method: request.method || 'GET',
            path: request.path || '',
            query: request.query || '',
            body: request.body || ''
        });

        if (typeof result === 'string') {
            return JSON.parse(result);
        }

        return result;
    }

    async convertReverseAsync(request) {
        await this.load();
        return this.convertReverse(request);
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SQL2PostgREST;
}
if (typeof window !== 'undefined') {
    window.SQL2PostgREST = SQL2PostgREST;
}
