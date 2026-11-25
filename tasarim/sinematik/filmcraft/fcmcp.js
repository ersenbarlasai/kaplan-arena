// Minimal MCP stdio istemcisi: FilmCraft CLI'ı tek süreçte sürer.
const { spawn } = require('child_process');
const FC = 'C:/Program Files/FilmCraft/filmcraft-cli.exe';
class FCClient {
  constructor(args = []) {
    this.p = spawn(FC, ['mcp', ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.buf = ''; this.id = 0; this.wait = new Map();
    this.p.stdout.on('data', d => { this.buf += d.toString('utf8'); let i; while ((i = this.buf.indexOf('\n')) >= 0) { const line = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1); if (!line) continue; let m; try { m = JSON.parse(line); } catch (e) { continue; } if (m.id != null && this.wait.has(m.id)) { this.wait.get(m.id)(m); this.wait.delete(m.id); } } });
    this.p.stderr.on('data', d => { if (process.env.FCDEBUG) process.stderr.write('[fc] ' + d); });
  }
  req(method, params) { const id = ++this.id; return new Promise(r => { this.wait.set(id, r); this.p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); }); }
  note(method, params) { this.p.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n'); }
  async init() { const r = await this.req('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'kaplan-build', version: '1' } }); this.note('notifications/initialized', {}); return r; }
  close() { this.p.stdin.end(); }
}
module.exports = { FCClient };
if (require.main === module) (async () => {
  const c = new FCClient(); const i = await c.init(); console.log(JSON.stringify(i.result).slice(0, 600));
  const t = await c.req('tools/list', {}); for (const x of t.result.tools) console.log(x.name, '-', (x.description || '').slice(0, 200).replace(/\n/g, ' '), JSON.stringify(x.inputSchema).slice(0, 300));
  c.close();
})();
