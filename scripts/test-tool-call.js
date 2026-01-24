import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildPath = join(__dirname, '../build/server.js');

console.log('Starting Ghost MCP Server for Tool Call Test...');

const server = spawn('node', [buildPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buffer = '';

server.stdout.on('data', (data) => {
  const chunk = data.toString();
  buffer += chunk;
  
  const lines = buffer.split('\n');
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
          console.log('\x1b[32m✔ Handshake Complete\x1b[0m');
          
          // Send initialized
          server.stdin.write(JSON.stringify({
              jsonrpc: '2.0',
              method: 'notifications/initialized'
          }) + '\n');
          
          console.log('Calling tool: users_browse...');
          server.stdin.write(JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                  name: 'users_browse',
                  arguments: { limit: 1 }
              }
          }) + '\n');

      } else if (msg.id === 2) {
          if (msg.error) {
              console.error('\x1b[31m✘ Tool Call Failed:\x1b[0m');
              console.error(JSON.stringify(msg.error, null, 2));
              process.exit(1);
          } else {
              console.log('\x1b[32m✔ Tool Call Successful\x1b[0m');
              console.log('Result Preview:');
              const content = JSON.parse(msg.result.content[0].text);
              console.log(JSON.stringify(content, null, 2));
              process.exit(0);
          }
      }
    } catch (e) {
      console.log('Server Output:', line);
    }
  }
});

server.stderr.on('data', (data) => {
    console.error(`Stderr: ${data}`);
});

server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
});

// Initialize
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-tool-call', version: '1.0.0' }
  }
}) + '\n');
