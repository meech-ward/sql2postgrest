// JavaScript wrapper for sql2postgrest WASM

class SQL2PostgREST {
    constructor() {
        this.ready = false;
        this.readyPromise = null;
    }

    async load(wasmPath = './sql2postgrest.wasm') {
        if (this.ready) return;
        if (this.readyPromise) return this.readyPromise;

        this.readyPromise = new Promise((resolve, reject) => {
            const go = new Go();
            
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                WebAssembly.instantiateStreaming(fetch(wasmPath), go.importObject)
                    .then(result => {
                        go.run(result.instance);
                        this.ready = true;
                        resolve();
                    })
                    .catch(reject);
            } else {
                fetch(wasmPath)
                    .then(response => response.arrayBuffer())
                    .then(bytes => WebAssembly.instantiate(bytes, go.importObject))
                    .then(result => {
                        go.run(result.instance);
                        this.ready = true;
                        resolve();
                    })
                    .catch(reject);
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

    // Reverse conversion: PostgREST → SQL
    convertReverse(request) {
        if (!this.ready) {
            throw new Error('WASM not loaded. Call load() first.');
        }

        // Validate input
        if (!request || typeof request !== 'object') {
            throw new Error('Request object required: { method, path, query?, body? }');
        }

        if (!request.path) {
            throw new Error('path is required in request object');
        }

        const result = postgrest2sql(request);

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
