import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildPath = join(__dirname, '../build/server.js');
const envPath = join(__dirname, '../.env');

console.log('Checking configuration...');

// Simple check for .env or env vars
const hasEnvFile = fs.existsSync(envPath);
const hasEnvVars = process.env.GHOST_API_URL && process.env.GHOST_ADMIN_API_KEY;

if (!hasEnvFile && !hasEnvVars) {
  console.error('\x1b[31mError: Missing configuration.\x1b[0m');
  console.error('The Ghost MCP server requires GHOST_API_URL and GHOST_ADMIN_API_KEY.');
  console.error('Please create a .env file in the root directory:');
  console.error('GHOST_API_URL=https://your-ghost-blog.com');
  console.error('GHOST_ADMIN_API_KEY=your:admin:key');
  process.exit(1);
}

console.log('Starting Ghost MCP Server...');

const server = spawn('node', [buildPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  // We rely on the server's own dotenv loading or inherited process.env
});

let buffer = '';

server.stdout.on('data', (data) => {
  const chunk = data.toString();
  buffer += chunk;
  
  const lines = buffer.split('\n');
  // Keep the last partial line in the buffer
  if (buffer.endsWith('\n')) {
      buffer = '';
  } else {
      buffer = lines.pop() || '';
  }

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      
      if (msg.id === 1) {
          console.log('\x1b[32m✔ Server Handshake Successful\x1b[0m');
          console.log('Server Capabilities:', JSON.stringify(msg.result.capabilities, null, 2));
          
          // Send initialized notification
          server.stdin.write(JSON.stringify({
              jsonrpc: '2.0',
              method: 'notifications/initialized'
          }) + '\n');
          
          console.log('Requesting tools list...');
          server.stdin.write(JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/list'
          }) + '\n');
      } else if (msg.id === 2) {
          console.log('\x1b[32m✔ Tools List Retrieved\x1b[0m');
          console.log(`Found ${msg.result.tools.length} tools:`);
          msg.result.tools.forEach(tool => {
              console.log(` - ${tool.name}: ${tool.description}`);
          });
          
          console.log('\n\x1b[32mTest Passed: The MCP server is functioning correctly.\x1b[0m');
          server.kill();
          process.exit(0);
      }
    } catch (e) {
      console.log('Server Output (non-JSON):', line);
    }
  }
});

server.on('error', (err) => {
    console.error('Failed to start server:', err);
});

server.on('close', (code) => {
    if (code !== 0 && code !== null) {
        console.error(`Server exited with code ${code}`);
    }
});

// Send initialize request immediately
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-script', version: '1.0.0' }
  }
}) + '\n');
