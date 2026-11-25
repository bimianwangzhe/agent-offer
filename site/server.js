#!/usr/bin/env node
/* AgentOffer static site server - zero dependencies.
 * Local:  node site/server.js             -> http://127.0.0.1:8899
 * Server: PORT=8899 HOST=127.0.0.1 node site/server.js   (behind nginx)
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8899);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    res.writeHead(400); res.end('Bad request'); return;
  }
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // prevent path traversal
  const resolved = path.resolve(ROOT, '.' + urlPath);
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  let file = resolved;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    // hash-router SPA: unknown non-asset paths fall back to index.html
    if (!path.extname(urlPath)) file = path.join(ROOT, 'index.html');
    else { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 Not Found'); return; }
  }

  const ext = path.extname(file).toLowerCase();
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff'
  };
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(500); res.end('Internal error'); return; }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') res.end(); else res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`AgentOffer site running at http://${HOST}:${PORT}`);
  console.log(`  root: ${ROOT}`);
});
