// Kaplan Arena - telefon senkronu (Vercel sunucu fonksiyonu)
//
// Yarisma ekrani ve telefonlar bu adrese POST atar:
//   {"fn":"get","pins":["123456"],"since":0}          -> {"t":<ms>,"rows":[{pin,p,v,r}]}
//   {"fn":"set","pin":"123456","path":"state","value":{...}}  -> {"r":<rev>}
//   {"fn":"lock","op":"check|acquire|release","host":"<id>",...} -> {"t","state":"free|mine|other","info"}
//
// Tek yarisma kurali: ayni anda yalnizca bir yarisma ekrani (host) aktif yarisma yurutebilir.
// Aktif ekran kilidi 20 sn'de bir yeniler; 5 dk haber alinmazsa kilit kendiliginden duser.
// Baska bir ekran girmeye calisirsa engellenir ve aktif ekrana uyari (games/<pin>/alert) yazilir.
//
// Veri Upstash Redis'te tutulur (Vercel > Storage > Upstash for Redis).
// Ortam degiskenleri: KV_REST_API_URL + KV_REST_API_TOKEN
//                 (ya da UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
// Redis tanimli degilse ve Vercel disinda calisiyorsa bellekte tutar (yerel deneme icin).
//
// Her yarisma (6 haneli sifre) bir hash: alan = yol, deger = "<rev>|<json>".
// Silinen yollar "<rev>|null" olarak kalir ki telefonlar silindigini gorsun.
// Kayitlar son yazimdan 3 gun sonra kendiliginden silinir.

const TTL = 3 * 24 * 3600;
const PIN_RE = /^\d{6}$/;
const PATH_RE = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/;
const MAX_VALUE = 65536;
const CACHE_MS = 250;

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const USE_MEMORY = !(REDIS_URL && REDIS_TOKEN) && (process.env.VERCEL !== '1' || process.env.KA_MEMORY === '1');

const SET_LUA = `
local r = redis.call('INCR', KEYS[1])
local pre = ARGV[1] .. '/'
local all = redis.call('HGETALL', KEYS[2])
for i = 1, #all, 2 do
  local f, v = all[i], all[i + 1]
  if string.sub(f, 1, #pre) == pre and string.sub(v, -5) ~= '|null' then
    redis.call('HSET', KEYS[2], f, r .. '|null')
  end
end
redis.call('HSET', KEYS[2], ARGV[1], r .. '|' .. ARGV[2])
redis.call('SET', KEYS[3], r)
redis.call('EXPIRE', KEYS[2], ARGV[3])
redis.call('EXPIRE', KEYS[3], ARGV[3])
return r`;

// KEYS: her sifre icin (rev anahtari, hash) cifti. Donus: once her sifrenin son rev'i,
// sonra since'tan yeni kayitlar icin (sifre sirasi, yol, "<rev>|<json>") uclusu.
const GET_LUA = `
local since = tonumber(ARGV[1])
local out = {}
local n = #KEYS / 2
for i = 1, n do
  local pr = tonumber(redis.call('GET', KEYS[2 * i - 1]) or '0')
  out[i] = pr
end
for i = 1, n do
  if out[i] > since then
    local all = redis.call('HGETALL', KEYS[2 * i])
    for j = 1, #all, 2 do
      local v = all[j + 1]
      local bar = string.find(v, '|', 1, true)
      if bar and tonumber(string.sub(v, 1, bar - 1)) > since then
        table.insert(out, i)
        table.insert(out, all[j])
        table.insert(out, v)
      end
    end
  end
end
return out`;

// Kilit degeri: "<host>\n<json bilgi>". ARGV: op, host, yeni deger, sure(sn).
const LOCK_LUA = `
local cur = redis.call('GET', KEYS[1])
local mine = cur and string.sub(cur, 1, #ARGV[2] + 1) == ARGV[2] .. '\\n'
if ARGV[1] == 'release' then
  if mine then redis.call('DEL', KEYS[1]) end
  return ''
end
if ARGV[1] == 'acquire' and ((not cur) or mine) then
  redis.call('SET', KEYS[1], ARGV[3], 'EX', ARGV[4])
  return ARGV[3]
end
return cur or ''`;
const LOCK_TTL = 300;
const HOST_RE = /^[A-Za-z0-9]{8,40}$/;

const kLock = () => 'ka:active';
const kRev = () => 'ka:rev';
const kHash = pin => 'ka:p:' + pin;
const kPinRev = pin => 'ka:r:' + pin;

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('redis: ' + (j.error || r.status));
  return j.result;
}

// ---- bellek deposu (yalnizca yerel deneme) ----
const mem = { rev: 0, games: new Map(), lock: null }; // games: pin -> {rev, rows: Map(path -> {r, v})}
function memLock(op, host, value) {
  if (mem.lock && mem.lock.exp < Date.now()) mem.lock = null;
  const cur = mem.lock && mem.lock.v;
  const mine = !!cur && cur.startsWith(host + '\n');
  if (op === 'release') { if (mine) mem.lock = null; return ''; }
  if (op === 'acquire' && (!cur || mine)) { mem.lock = { v: value, exp: Date.now() + LOCK_TTL * 1000 }; return value; }
  return cur || '';
}
function memSet(pin, path, json) {
  const r = ++mem.rev;
  let g = mem.games.get(pin);
  if (!g) mem.games.set(pin, (g = { rev: 0, rows: new Map() }));
  const pre = path + '/';
  for (const [p, row] of g.rows) if (p.startsWith(pre) && row.v !== 'null') g.rows.set(p, { r, v: 'null' });
  g.rows.set(path, { r, v: json });
  g.rev = r;
  return r;
}
function memGet(pins, since) {
  const revs = [], rows = [];
  for (const pin of pins) {
    const g = mem.games.get(pin);
    revs.push(g ? g.rev : 0);
    if (g && g.rev > since) for (const [p, row] of g.rows) if (row.r > since) rows.push({ pin, p, v: JSON.parse(row.v), r: row.r });
  }
  return { revs, rows };
}

// ---- ayni sunucu orneginde kisa sureli onbellek ----
// Cogu sorgu "degisiklik yok" ile biter; bunlar Redis'e gitmeden yanitlanir.
const pinRevCache = new Map(); // pin -> {rev, at}

async function doGet(pins, since) {
  const now = Date.now();
  const need = pins.filter(pin => {
    const c = pinRevCache.get(pin);
    return !(c && now - c.at < CACHE_MS && c.rev <= since);
  });
  if (!need.length) return [];
  let revs, rows;
  if (USE_MEMORY) {
    ({ revs, rows } = memGet(need, since));
  } else {
    const keys = [];
    for (const pin of need) keys.push(kPinRev(pin), kHash(pin));
    const out = await redis(['EVAL', GET_LUA, String(keys.length), ...keys, String(since)]);
    revs = out.slice(0, need.length).map(Number);
    rows = [];
    for (let i = need.length; i + 2 < out.length; i += 3) {
      const pin = need[Number(out[i]) - 1], s = String(out[i + 2]), bar = s.indexOf('|');
      rows.push({ pin, p: String(out[i + 1]), r: Number(s.slice(0, bar)), v: JSON.parse(s.slice(bar + 1)) });
    }
  }
  const at = Date.now();
  need.forEach((pin, i) => pinRevCache.set(pin, { rev: revs[i], at }));
  return rows;
}

async function doSet(pin, path, json) {
  const r = USE_MEMORY
    ? memSet(pin, path, json)
    : Number(await redis(['EVAL', SET_LUA, '3', kRev(), kHash(pin), kPinRev(pin), path, json, String(TTL)]));
  pinRevCache.set(pin, { rev: r, at: Date.now() });
  return r;
}

const clip = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').slice(0, n);

async function doLock(b) {
  const op = String(b.op || ''), host = String(b.host || '');
  if (!['check', 'acquire', 'release'].includes(op) || !HOST_RE.test(host)) return null;
  const now = Date.now();
  let value = '';
  if (op === 'acquire') {
    const pin = String(b.pin || '');
    if (!PIN_RE.test(pin)) return null;
    value = host + '\n' + JSON.stringify({
      pin, title: clip(b.title, 80), where: clip(b.where, 80),
      since: Number.isFinite(+b.since) ? Math.floor(+b.since) : now, seen: now,
    });
  }
  const cur = USE_MEMORY
    ? memLock(op, host, value)
    : String(await redis(['EVAL', LOCK_LUA, '1', kLock(), op, host, value, String(LOCK_TTL)]) || '');
  if (op === 'release' || !cur) return { state: 'free' };
  if (cur.startsWith(host + '\n')) return { state: 'mine' };
  let info = {};
  try { info = JSON.parse(cur.slice(cur.indexOf('\n') + 1)); } catch (e) {}
  // Engellenen giris denemesini aktif yarisma ekranina bildir (sifre disariya verilmez).
  if (b.notify && PIN_RE.test(String(info.pin || ''))) {
    try { await doSet(info.pin, 'alert', JSON.stringify({ t: now, where: clip(b.where, 80) })); } catch (e) { console.error(e); }
  }
  return { state: 'other', info: { title: info.title || '', where: info.where || '', since: info.since || 0, seen: info.seen || 0 } };
}

async function readBody(req) {
  if (req.body != null && req.body !== '') {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_VALUE * 2) throw new Error('cok buyuk');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  // Yarisma ekrani bilgisayardan dosya olarak (file://) acildiginda da erisebilsin.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') return send(res, 405, { error: 'POST bekleniyor' });
  if (!USE_MEMORY && !(REDIS_URL && REDIS_TOKEN)) return send(res, 503, { error: 'Veri deposu (Upstash Redis) bagli degil' });

  let b;
  try { b = await readBody(req); } catch (e) { return send(res, 400, { error: 'gecersiz istek' }); }
  if (!b || typeof b !== 'object') return send(res, 400, { error: 'gecersiz istek' });

  try {
    if (b.fn === 'get') {
      const pins = Array.isArray(b.pins) ? [...new Set(b.pins.map(String))].slice(0, 20) : [];
      const since = Number.isFinite(+b.since) && +b.since > 0 ? Math.floor(+b.since) : 0;
      if (pins.some(p => !PIN_RE.test(p))) return send(res, 400, { error: 'gecersiz sifre' });
      const rows = pins.length ? await doGet(pins, since) : [];
      return send(res, 200, { t: Date.now(), rows });
    }
    if (b.fn === 'set') {
      const pin = String(b.pin || ''), path = String(b.path || '');
      if (!PIN_RE.test(pin) || !PATH_RE.test(path) || path.length > 200) return send(res, 400, { error: 'gecersiz istek' });
      const json = JSON.stringify(b.value === undefined ? null : b.value);
      if (json.length > MAX_VALUE) return send(res, 413, { error: 'veri cok buyuk' });
      const r = await doSet(pin, path, json);
      return send(res, 200, { r });
    }
    if (b.fn === 'lock') {
      const out = await doLock(b);
      if (!out) return send(res, 400, { error: 'gecersiz istek' });
      return send(res, 200, Object.assign({ t: Date.now() }, out));
    }
    return send(res, 400, { error: 'bilinmeyen islem' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'sunucu hatasi' });
  }
};
