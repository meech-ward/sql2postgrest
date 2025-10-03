#!/usr/bin/env node

// Test script for sql2postgrest WASM in Node.js
const fs = require('fs');
const path = require('path');

// Load the Go WASM runtime
require('./wasm_exec.js');

async function main() {
    console.log('Loading sql2postgrest WASM...\n');
    
    // Create a Go instance
    const go = new Go();
    
    // Load the WASM file
    const wasmPath = path.join(__dirname, 'sql2postgrest.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    
    // Instantiate the WASM module
    const { instance } = await WebAssembly.instantiate(wasmBuffer, go.importObject);
    
    // Run the Go WASM module (this will set up the global sql2postgrest function)
    go.run(instance);
    
    // Wait a bit for WASM to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('✅ WASM loaded successfully!\n');
    
    // Test cases
    const tests = [
        {
            name: 'SELECT with WHERE',
            sql: 'SELECT * FROM users WHERE age > 18',
            baseURL: 'https://api.example.com'
        },
        {
            name: 'INSERT with boolean',
            sql: "INSERT INTO posts (id, title, published) VALUES (1, 'Hello', true)",
            baseURL: 'http://localhost:3000'
        },
        {
            name: 'UPDATE with boolean',
            sql: "UPDATE users SET active = false WHERE id = 5",
            baseURL: 'http://localhost:3000'
        },
        {
            name: 'DELETE',
            sql: 'DELETE FROM users WHERE id = 10',
            baseURL: 'http://localhost:3000'
        },
        {
            name: 'IN operator',
            sql: 'SELECT * FROM users WHERE id IN (1, 2, 3)',
            baseURL: 'http://localhost:3000'
        }
    ];
    
    console.log('Running tests:\n');
    
    for (const test of tests) {
        console.log(`Test: ${test.name}`);
        console.log(`SQL: ${test.sql}`);
        
        try {
            const result = sql2postgrest(test.sql, test.baseURL);
            const parsed = typeof result === 'string' ? JSON.parse(result) : result;
            console.log('Result:', JSON.stringify(parsed, null, 2));
            console.log('✅ PASSED\n');
        } catch (err) {
            console.log('❌ FAILED:', err.message);
            console.log();
        }
    }
    
    console.log('All tests completed!');
    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
