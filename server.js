const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    const addr = server.address();
    const actualPort = addr && typeof addr === 'object' && 'port' in addr ? addr.port : PORT;
    console.log(`> Ready on http://localhost:${actualPort}`);
  });
});
