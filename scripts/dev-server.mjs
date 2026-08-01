// Server statico minimo per testare app/ in locale (http://localhost invece di file://,
// necessario perche' i link magici via email non possono puntare a un file:// locale).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', 'app');
const PORT = 5500;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

createServer(async (req, res) => {
  const path = req.url === '/' ? '/login.html' : req.url.split('?')[0];
  try {
    const file = await readFile(join(ROOT, decodeURIComponent(path)));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end('Non trovato');
  }
}).listen(PORT, () => console.log(`Server locale su http://localhost:${PORT}`));
