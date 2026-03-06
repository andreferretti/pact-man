const http = require('http');
const fs   = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Load .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) process.env[match[1]] = match[2] || '';
  });
}

const handler = require('./api/negotiate');

const PORT = 3000;

// Thin shim so api/negotiate.js can use res.status().json() like on Vercel
function makeRes(raw) {
  return {
    status(code) { raw.statusCode = code; return this; },
    json(data)   { raw.setHeader('Content-Type', 'application/json'); raw.end(JSON.stringify(data)); },
  };
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/negotiate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try { req.body = JSON.parse(body); } catch { req.body = {}; }
      await handler(req, makeRes(res));
    });
    return;
  }

  // Serve index.html for everything else
  fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Running at ${url}`);
  const open = process.platform === 'win32' ? `start ${url}`
             : process.platform === 'darwin' ? `open ${url}`
             : `xdg-open ${url}`;
  exec(open);
});
