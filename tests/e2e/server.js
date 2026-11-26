// Kaplan Arena — yerel test sunucusu: statik dosyalar + /api/ka (bellek deposu; canlı Redis kullanılmaz).
// Kullanım: node tests/e2e/server.js [port]   (varsayılan 3088). Gizli dosyalar ve proje dışı yollar reddedilir.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', '..');
const handler = require(path.join(root, 'api', 'ka.js'));
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json',
  '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8', '.mp4':'video/mp4', '.m4a':'audio/mp4' };
function start(port){
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/api/ka') return handler(req, res);
    if (u.pathname === '/katil' || u.pathname === '/katil/') { res.writeHead(307, { Location:'/kaplan-arena.html?katil' }); return res.end(); }
    let rel; try{ rel = decodeURIComponent(u.pathname); }catch(e){ res.writeHead(400); return res.end(); }
    if (rel === '/') rel = '/index.html';
    if (/(^|\/)\./.test(rel) || !/^\/(index\.html|kaplan-arena\.html|katil\/index\.html|app\/[\w.-]+\.(js|css)|assets\/[\w/.-]+\.(webp|png|svg|woff2|css|txt|mp4|m4a))$/.test(rel)) { res.writeHead(404); return res.end('404'); }
    const f = path.resolve(root, '.' + rel);
    if (!f.startsWith(root + path.sep) || !fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
    const type = TYPES[path.extname(f)] || 'application/octet-stream';
    if (path.extname(f) === '.mp4'){
      // Video: Vercel/statik sunucular gibi byte-range (206) desteği
      const size = fs.statSync(f).size, m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (req.headers.range && m && (m[1] || m[2])){
        let a = m[1] ? +m[1] : Math.max(0, size - +m[2]), b = m[1] && m[2] ? Math.min(size - 1, +m[2]) : size - 1;
        if (a >= size || a > b){ res.writeHead(416, { 'Content-Range':`bytes */${size}` }); return res.end(); }
        res.writeHead(206, { 'Content-Type':type, 'Accept-Ranges':'bytes', 'Content-Range':`bytes ${a}-${b}/${size}`, 'Content-Length':b - a + 1, 'Cache-Control':'no-store' });
        return fs.createReadStream(f, { start:a, end:b }).pipe(res);
      }
      res.writeHead(200, { 'Content-Type':type, 'Accept-Ranges':'bytes', 'Content-Length':size, 'Cache-Control':'no-store' });
      return fs.createReadStream(f).pipe(res);
    }
    res.writeHead(200, { 'Content-Type':type, 'Cache-Control':'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(port, () => r(srv)));
}
if (require.main === module) start(+process.argv[2] || 3088).then(() => console.log('test sunucusu http://localhost:' + (+process.argv[2] || 3088)));
module.exports = { start };
