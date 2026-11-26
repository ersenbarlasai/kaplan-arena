// Kaplan Arena - telefon senkronu (Vercel sunucu fonksiyonu)
//
// Yarisma ekrani ve telefonlar bu adrese POST atar:
//   {"fn":"get","pins":["123456"],"since":0}          -> {"t":<ms>,"rows":[{pin,p,v,r}]}
//   {"fn":"set","pin":"123456","path":"state","value":{...}}  -> {"r":<rev>}
//   {"fn":"lock","op":"check|acquire|release","host":"<id>",...} -> {"t","state":"free|mine|other","info"}
//   {"fn":"ctl","pin","key","ctl":{teams,qk,acc,elig,jk},"reset":[tid]}  -> admin denetim kaydi (yeni yarismalar)
//   {"fn":"join","pin","tid","code"|"tok","dev"}  -> {"ok","tok"}  kaptan katilimi (takima ozel kod)
//   {"fn":"cmd","pin","tok","op":"ans|jk","qk","v"|"j","t"} -> {"ok"}  cevap / joker istegi (sunucu dogrular)
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

// ---- yarisma yetkisi (yeni yarismalar) ----
// Ozel kayitlar herkese acik hash'e (GET) girmez:
//   ka:c:<pin>  denetim kaydi (JSON): { adm:<sha256(admin anahtari)>, teams:{tid:{code,act}}, qk, acc, elig:[tid]|null, jk }
//   ka:b:<pin>  kaptan baglari (hash): tid -> "<dev>|<sha256(oturum)>", "f:<tid>" -> hatali kod sayaci
// Denetim kaydi olan yarismada: state/meta vb. yazimlari yalniz admin anahtariyla; telefonlar yalniz join/cmd ile
// (aktif takim, gecerli oturum, acik soru, dogru soru anahtari, uygun aday). Genel set yolu telefona kapali.
// Denetim kaydi olmayan (eski) yarismalarda eski davranis surer.
const crypto = require('crypto');
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const rnd = n => crypto.randomBytes(n).toString('hex');
const TID_RE = /^t\d{1,3}$/;
const KEY_RE = /^[A-Za-z0-9]{16,64}$/;
const DEV_RE = /^[A-Za-z0-9]{4,40}$/;
const QK_RE = /^[A-Za-z0-9_-]{1,120}$/;
const MAX_FAIL = 10;
const kCtl = pin => 'ka:c:' + pin;
const kBind = pin => 'ka:b:' + pin;

const CTL_GET_LUA = `return {redis.call('GET', KEYS[1]) or '', redis.call('HGETALL', KEYS[2])}`;
// Kaptan bagi: bos ya da ayni cihazsa yazilir (atomik). ARGV: tid, dev, tokhash, ttl
const BIND_LUA = `
local cur = redis.call('HGET', KEYS[1], ARGV[1])
if cur and cur ~= '' then
  local bar = string.find(cur, '|', 1, true)
  if bar and string.sub(cur, 1, bar - 1) ~= ARGV[2] then return cur end
end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2] .. '|' .. ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[4])
return 'OK'`;

const memCtl = new Map();   // pin -> { ctl, bind: Map }
async function ctlRead(pin) {
  if (USE_MEMORY) {
    const m = memCtl.get(pin);
    return { ctl: m ? m.ctl : null, bind: m ? Object.fromEntries(m.bind) : {} };
  }
  const out = await redis(['EVAL', CTL_GET_LUA, '2', kCtl(pin), kBind(pin)]);
  const raw = out[0] ? String(out[0]) : '', arr = out[1] || [], bind = {};
  for (let i = 0; i + 1 < arr.length; i += 2) bind[String(arr[i])] = String(arr[i + 1]);
  let ctl = null; try { ctl = raw ? JSON.parse(raw) : null; } catch (e) { ctl = null; }
  return { ctl, bind };
}
async function ctlWrite(pin, ctl) {
  if (USE_MEMORY) { let m = memCtl.get(pin); if (!m) memCtl.set(pin, (m = { ctl: null, bind: new Map() })); m.ctl = ctl; return; }
  await redis(['SET', kCtl(pin), JSON.stringify(ctl), 'EX', String(TTL)]);
}
async function bindSet(pin, tid, dev, tokh) {
  if (USE_MEMORY) {
    const m = memCtl.get(pin); const cur = m.bind.get(tid);
    if (cur && cur.split('|')[0] !== dev) return cur;
    m.bind.set(tid, dev + '|' + tokh); return 'OK';
  }
  return String(await redis(['EVAL', BIND_LUA, '1', kBind(pin), tid, dev, tokh, String(TTL)]));
}
async function bindDel(pin, fields) {
  if (!fields.length) return;
  if (USE_MEMORY) { const m = memCtl.get(pin); if (m) fields.forEach(f => m.bind.delete(f)); return; }
  await redis(['HDEL', kBind(pin), ...fields]);
}
async function failInc(pin, tid) {
  if (USE_MEMORY) { const m = memCtl.get(pin), k = 'f:' + tid, n = (+(m.bind.get(k) || 0)) + 1; m.bind.set(k, String(n)); return n; }
  const n = await redis(['HINCRBY', kBind(pin), 'f:' + tid, '1']);
  await redis(['EXPIRE', kBind(pin), String(TTL)]);
  return Number(n);
}
const devOf = v => String(v || '').split('|')[0];
const tokOf = v => String(v || '').split('|')[1] || '';
const deny = (res, code, why, extra) => send(res, code, Object.assign({ ok: false, why }, extra || {}));

// Admin denetim kaydini kurar/gunceller. Ilk kayit anahtari baglar; sonrakiler ayni anahtari ister.
async function doCtl(b, res) {
  const pin = String(b.pin || ''), key = String(b.key || '');
  if (!PIN_RE.test(pin) || !KEY_RE.test(key)) return deny(res, 400, 'gecersiz istek');
  const { ctl: cur } = await ctlRead(pin);
  if (cur && cur.adm !== sha(key)) return deny(res, 403, 'yetkisiz');
  const c = b.ctl && typeof b.ctl === 'object' ? b.ctl : {};
  const teams = {};
  for (const tid of Object.keys(c.teams || {}).slice(0, 64)) {
    const t = c.teams[tid];
    if (!TID_RE.test(tid) || !t || !/^\d{4,8}$/.test(String(t.code || ''))) return deny(res, 400, 'gecersiz takim');
    teams[tid] = { code: String(t.code), act: !!t.act };
  }
  const next = {
    adm: sha(key), teams: Object.keys(teams).length ? teams : (cur ? cur.teams : {}),
    qk: c.qk && QK_RE.test(String(c.qk)) ? String(c.qk) : null, acc: !!c.acc, jk: !!c.jk,
    elig: Array.isArray(c.elig) ? c.elig.filter(x => TID_RE.test(String(x))).map(String) : null
  };
  await ctlWrite(pin, next);
  const reset = Array.isArray(b.reset) ? b.reset.filter(x => TID_RE.test(String(x))).map(String) : [];
  if (reset.length) {
    await bindDel(pin, reset.flatMap(t => [t, 'f:' + t]));
    for (const t of reset) await doSet(pin, 'players/all/' + t, 'null');
  }
  return send(res, 200, { ok: true, r: reset.length });
}

// Kaptan katilimi: takima ozel kod (ya da daha once verilen oturum). Elenen takim katilamaz.
async function doJoin(b, res) {
  const pin = String(b.pin || ''), tid = String(b.tid || ''), dev = String(b.dev || '');
  if (!PIN_RE.test(pin) || !TID_RE.test(tid) || !DEV_RE.test(dev)) return deny(res, 400, 'gecersiz istek');
  const { ctl, bind } = await ctlRead(pin);
  if (!ctl) return deny(res, 404, 'Bu kodla açık bir yarışma bulunamadı.');
  const t = ctl.teams[tid];
  if (!t) return deny(res, 404, 'Takım bu yarışmada yok.');
  if (!t.act) return deny(res, 403, 'Bu takım elendi; yarışmaya devam edemez.', { out: true });
  const cur = bind[tid] || '';
  if (b.tok && cur && tokOf(cur) === sha(String(b.tok)) && devOf(cur) === dev) {
    await doSet(pin, 'players/all/' + tid, JSON.stringify({ dev, t: Date.now() }));
    return send(res, 200, { ok: true, tok: String(b.tok) });
  }
  if (+(bind['f:' + tid] || 0) >= MAX_FAIL) return deny(res, 429, 'Çok fazla hatalı kod denendi. Yönetimden bu takım için cihaz sıfırlaması isteyin.');
  if (String(b.code || '') !== t.code) { await failInc(pin, tid); return deny(res, 403, 'Kaptan kodu yanlış.'); }
  for (const f of Object.keys(bind)) {
    if (f !== tid && !f.startsWith('f:') && devOf(bind[f]) === dev) return deny(res, 409, 'Bu telefon başka bir takımın kaptanı olarak kayıtlı. Takım değiştirmek için yönetime başvurun.');
  }
  if (cur && devOf(cur) !== dev) return deny(res, 409, 'Bu takıma başka bir kaptan telefonu bağlı. Telefon değişikliği için yönetimden cihaz sıfırlaması isteyin.');
  const tok = rnd(16);
  const r = await bindSet(pin, tid, dev, sha(tok));
  if (r !== 'OK') return deny(res, 409, 'Bu takıma başka bir kaptan telefonu bağlı. Telefon değişikliği için yönetimden cihaz sıfırlaması isteyin.');
  await doSet(pin, 'players/all/' + tid, JSON.stringify({ dev, t: Date.now() }));
  return send(res, 200, { ok: true, tok });
}

// Telefon komutu: cevap ya da joker istegi. Sunucu dogrular, yolu ve cihazi kendisi yazar.
async function doCmd(b, res) {
  const pin = String(b.pin || ''), tok = String(b.tok || ''), op = String(b.op || ''), qk = String(b.qk || '');
  if (!PIN_RE.test(pin) || !tok || !QK_RE.test(qk) || !['ans', 'jk'].includes(op)) return deny(res, 400, 'gecersiz istek');
  const { ctl, bind } = await ctlRead(pin);
  if (!ctl) return deny(res, 404, 'Yarışma bulunamadı.');
  const th = sha(tok), tid = Object.keys(bind).find(f => !f.startsWith('f:') && tokOf(bind[f]) === th);
  if (!tid) return deny(res, 401, 'Kaptan oturumu geçersiz. Takımınızı yeniden seçip kodu girin.', { relogin: true });
  const t = ctl.teams[tid];
  if (!t || !t.act) return deny(res, 403, 'Bu takım elendi; cevap ve joker gönderemez.', { out: true });
  if (!ctl.acc || ctl.qk !== qk) return deny(res, 409, 'Bu soru için cevap kabulü kapalı.');
  if (ctl.elig && !ctl.elig.includes(tid)) return deny(res, 403, 'Bu soruyu yalnız eşitlikteki takımlar cevaplar.');
  const tt = Number(b.t), now = Date.now();
  if (!Number.isFinite(tt) || tt < now - 8000 || tt > now + 3000) return deny(res, 400, 'Gönderim zamanı geçersiz; sayfayı yenileyin.');
  const dev = devOf(bind[tid]), t0 = Math.round(tt);
  if (op === 'ans') {
    const v = b.v;
    const ok = (typeof v === 'string' && /^[ABCD]{1,2}$/.test(v)) || (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e15);
    if (!ok) return deny(res, 400, 'Geçersiz cevap.');
    const sid = 's' + t0 + rnd(3);
    const r = await doSet(pin, `answers/${qk}/${tid}/${sid}`, JSON.stringify({ v, t: t0, dev }));
    return send(res, 200, { ok: true, r, t: t0 });
  }
  if (!ctl.jk) return deny(res, 409, 'Bu soruda joker kullanılamaz.');
  const j = String(b.j || '');
  if (!['double', 'x2'].includes(j)) return deny(res, 400, 'Geçersiz joker.');
  const r = await doSet(pin, `jreq/${qk}/${tid}`, JSON.stringify({ j, t: t0, dev }));
  return send(res, 200, { ok: true, r, t: t0 });
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
      // Denetim kaydi olan yarismada genel yazim yalniz admin anahtariyla (telefonlar join/cmd kullanir).
      const { ctl } = await ctlRead(pin);
      if (ctl && ctl.adm !== sha(String(b.key || ''))) return send(res, 403, { error: 'yetkisiz' });
      const r = await doSet(pin, path, json);
      return send(res, 200, { r });
    }
    if (b.fn === 'ctl') return await doCtl(b, res);
    if (b.fn === 'join') return await doJoin(b, res);
    if (b.fn === 'cmd') return await doCmd(b, res);
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
