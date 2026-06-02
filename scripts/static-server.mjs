/**
 * Minimal static file server for local/E2E testing.
 *
 * Serves the repository root over HTTP so a real browser (Playwright) can load
 * index.html exactly as it would in production. Query strings (e.g. the
 * "?v=1.2" cache-busters on script tags) are stripped before resolving the
 * file on disk.
 *
 * Usage: node scripts/static-server.mjs [port]   (default port 8788)
 */

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.argv[2] || process.env.STATIC_PORT || 8788);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function safeResolve(urlPath) {
  // Strip query/hash, decode, drop leading slash, prevent path traversal.
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = normalize(clean).replace(/^(\.\.(\/|\\|$))+/, '');
  const resolved = join(ROOT, rel);
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

const server = http.createServer(async (req, res) => {
  try {
    let filePath = safeResolve(req.url || '/');
    if (!filePath) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    let info;
    try {
      info = await stat(filePath);
    } catch {
      info = null;
    }

    if (info && info.isDirectory()) {
      filePath = join(filePath, 'index.html');
      try {
        info = await stat(filePath);
      } catch {
        info = null;
      }
    }

    if (!info || !info.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found: ' + (req.url || ''));
      return;
    }

    const body = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Content-Length': body.length
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error: ' + (err && err.message ? err.message : String(err)));
  }
});

server.listen(PORT, () => {
  console.log(`[static-server] serving ${ROOT} on http://127.0.0.1:${PORT}`);
});
