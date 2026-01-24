import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildPath = join(__dirname, '../build/server.js');

console.log('Starting Ghost MCP Server in SSE Mode...');

const serverProcess = spawn('node', [buildPath, '--transport', 'sse', '--port', '3001'], {
  stdio: 'inherit',
});

// Wait for server to start
setTimeout(() => {
    console.log('Test 1: Connect and immediately disconnect...');
    const req1 = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/sse',
        method: 'GET',
    }, (res) => {
        console.log(`Req1 Status: ${res.statusCode}`);
        res.destroy(); // Force disconnect
    });
    req1.on('error', (e) => { /* Ignore expected error on destroy */ });
    req1.end();
    
    // Destroy after a brief moment to ensure connection was established
    setTimeout(() => {
        req1.destroy();
    }, 100);

    setTimeout(() => {
        console.log('Test 2: Reconnect...');
        const req2 = http.request({
            hostname: 'localhost',
            port: 3001,
            path: '/sse',
            method: 'GET',
        }, (res) => {
            console.log(`Req2 Status: ${res.statusCode}`);
             res.on('data', (chunk) => {
                console.log(`Req2 Data: ${chunk.toString()}`);
             });
        });
        req2.on('error', (e) => console.log('Req2 Error:', e.message));
        req2.end();
        
        // Cleanup after a bit
        setTimeout(() => {
             serverProcess.kill();
             process.exit(0);
        }, 2000);
    }, 1000);

}, 2000);

function sendInitialize() {
    // ... unused in this version
}
