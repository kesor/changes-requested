#!/usr/bin/env node
// Serves the viewer and reviews any URL on demand:  node server.mjs  ->  http://localhost:4173
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capture } from './capture.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = +process.env.PORT || 4173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.json': 'application/json' };
let busy = false;

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/api/capture') {
    res.setHeader('content-type', 'application/json');
    if (busy) { res.statusCode = 429; return res.end('{"error":"A capture is already running"}'); }
    busy = true;
    try { res.end(JSON.stringify(await capture(u.searchParams.get('url') || ''))); }
    catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    finally { busy = false; }
    return;
  }
  const rel = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname.slice(1));
  const file = path.resolve(ROOT, rel);
  const ok = (file === path.join(ROOT, 'index.html') || file.startsWith(path.join(ROOT, 'captures') + path.sep)) && fs.existsSync(file);
  if (!ok) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
  res.setHeader('cache-control', 'no-store');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`a11y review: http://localhost:${PORT}`));
