// 本地预览用的极简静态服务器（不依赖任何 npm 包）
// 用法: node tools/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const rootDir = resolve(process.cwd());
const port = Number(process.argv[2] || 4321);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = normalize(join(rootDir, urlPath));
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (urlPath.endsWith('/')) filePath = join(filePath, 'index.html');
    let body;
    try {
      body = await readFile(filePath);
    } catch {
      body = await readFile(join(rootDir, '404.html')).catch(() => null);
      if (!body) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 Not Found');
        return;
      }
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(body);
      return;
    }
    res.writeHead(200, {
      'content-type': types[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache'
    }).end(body);
  } catch (err) {
    res.writeHead(500).end('Internal Error');
    console.error(err);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log('serving ' + rootDir);
  console.log('http://127.0.0.1:' + port + '/');
});
