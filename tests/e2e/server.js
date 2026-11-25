// Kaplan Arena — yerel test sunucusu: statik dosyalar + /api/ka (bellek deposu; canlı Redis kullanılmaz).
// Kullanım: node tests/e2e/server.js [port]   (varsayılan 3088). Gizli dosyalar ve proje dışı yollar reddedilir.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', '..');
const handler = require(path.join(root, 'api', 'ka.js'));
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json',
  '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8' };
function start(port){
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/api/ka') return handler(req, res);
    if (u.pathname === '/katil' || u.pathname === '/katil/') { res.writeHead(307, { Location:'/kaplan-arena.html?katil' }); return res.end(); }
    let rel; try{ rel = decodeURIComponent(u.pathname); }catch(e){ res.writeHead(400); return res.end(); }
    if (rel === '/') rel = '/index.html';
    if (/(^|\/)\./.test(rel) || !/^\/(index\.html|kaplan-arena\.html|katil\/index\.html|app\/[\w.-]+\.(js|css)|assets\/[\w/.-]+\.(webp|png|svg|woff2|css|txt))$/.test(rel)) { res.writeHead(404); return res.end('404'); }
    const f = path.resolve(root, '.' + rel);
    if (!f.startsWith(root + path.sep) || !fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type':TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(port, () => r(srv)));
}
if (require.main === module) start(+process.argv[2] || 3088).then(() => console.log('test sunucusu http://localhost:' + (+process.argv[2] || 3088)));
module.exports = { start };
