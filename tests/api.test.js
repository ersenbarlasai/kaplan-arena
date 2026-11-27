// Kaplan Arena — /api/ka yetki kabul testleri (bellek kipi; canlı Redis kullanılmaz). Çalıştırma: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.KA_MEMORY = '1';
const handler = require('../api/ka.js');

function call(body) {
  return new Promise(resolve => {
    const req = { method: 'POST', body: JSON.stringify(body) };
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(s) { resolve({ code: this.statusCode, j: s ? JSON.parse(s) : null }); } };
    handler(req, res);
  });
}
const PIN = '424242', KEY = 'adminAnahtari1234567890', DEV_A = 'devA1234', DEV_B = 'devB1234', DEV_X = 'devX9999';
const ctl = extra => Object.assign({ teams: { t1: { code: '1111', act: true }, t2: { code: '2222', act: true }, t3: { code: '3333', act: false } }, qk: 's1_0_q1', acc: true, jk: true, elig: null }, extra || {});
async function rows(pin) { const r = await call({ fn: 'get', pins: [pin], since: 0 }); return r.j.rows; }

test('denetim kaydı: ilk admin anahtarı bağlanır, başka anahtar reddedilir', async () => {
  assert.equal((await call({ fn: 'ctl', pin: PIN, key: KEY, ctl: ctl() })).code, 200);
  assert.equal((await call({ fn: 'ctl', pin: PIN, key: 'baskaAnahtar1234567890', ctl: ctl({ acc: false }) })).code, 403);
  // genel set yolu: anahtarsız/yanlış anahtarla state, puan, eleme yazılamaz
  assert.equal((await call({ fn: 'set', pin: PIN, path: 'state', value: { hack: 1 } })).code, 403);
  assert.equal((await call({ fn: 'set', pin: PIN, path: 'answers/s1_0_q1/t1/sX', value: { v: 'A', t: Date.now(), dev: DEV_A } })).code, 403);
  assert.equal((await call({ fn: 'set', pin: PIN, path: 'players/all/t2', value: { dev: DEV_X } })).code, 403);
  assert.equal((await call({ fn: 'set', pin: PIN, path: 'state', value: { ok: 1 }, key: KEY })).code, 200);
  const all = await rows(PIN);
  assert.ok(!all.some(r => /hack|answers|players\/all\/t2/.test(r.p + JSON.stringify(r.v))), JSON.stringify(all));
  assert.ok(!JSON.stringify(all).includes('1111'), 'kaptan kodları herkese açık GET yanıtına girmez');
});

test('kaptan katılımı: yanlış kod, elenen takım, başka takımı ele geçirme reddedilir; meşru yeniden bağlanma geçer', async () => {
  let r = await call({ fn: 'join', pin: PIN, tid: 't1', code: '9999', dev: DEV_A });
  assert.equal(r.code, 403); assert.match(r.j.why, /yanlış/);
  r = await call({ fn: 'join', pin: PIN, tid: 't3', code: '3333', dev: DEV_X });
  assert.equal(r.code, 403); assert.equal(r.j.out, true);
  r = await call({ fn: 'join', pin: PIN, tid: 't1', code: '1111', dev: DEV_A });
  assert.equal(r.code, 200); const tokA = r.j.tok; assert.ok(tokA);
  // başka cihaz aynı takımın kodunu bilse de bağlı kaptanı düşüremez
  r = await call({ fn: 'join', pin: PIN, tid: 't1', code: '1111', dev: DEV_B });
  assert.equal(r.code, 409);
  // aynı cihaz başka bir takım adını seçerek o takıma geçemez (kod doğru olsa bile)
  r = await call({ fn: 'join', pin: PIN, tid: 't2', code: '2222', dev: DEV_A });
  assert.equal(r.code, 409);
  // meşru kaptan oturumuyla yeniden bağlanır
  r = await call({ fn: 'join', pin: PIN, tid: 't1', tok: tokA, dev: DEV_A });
  assert.equal(r.code, 200); assert.equal(r.j.tok, tokA);
  r = await call({ fn: 'join', pin: PIN, tid: 't2', code: '2222', dev: DEV_B });
  assert.equal(r.code, 200);
});

test('komut: geçerli cevap yazılır; eski soru, kapalı kabul, sahte oturum, elenen takım reddedilir', async () => {
  const tokA = (await call({ fn: 'join', pin: PIN, tid: 't1', tok: null, code: '1111', dev: DEV_A })).j.tok
    || null;
  // DEV_A zaten bağlı: kodla yeniden giriş aynı cihazdan yeni oturum verir
  assert.ok(tokA);
  let r = await call({ fn: 'cmd', pin: PIN, tok: tokA, op: 'ans', qk: 's1_0_q1', v: 'C', t: Date.now() });
  assert.equal(r.code, 200);
  r = await call({ fn: 'cmd', pin: PIN, tok: tokA, op: 'ans', qk: 's1_9_eski', v: 'C', t: Date.now() });
  assert.equal(r.code, 409);
  r = await call({ fn: 'cmd', pin: PIN, tok: 'sahte', op: 'ans', qk: 's1_0_q1', v: 'C', t: Date.now() });
  assert.equal(r.code, 401);
  r = await call({ fn: 'cmd', pin: PIN, tok: tokA, op: 'ans', qk: 's1_0_q1', v: 'C', t: Date.now() - 60000 });
  assert.equal(r.code, 400);
  r = await call({ fn: 'cmd', pin: PIN, tok: tokA, op: 'jk', qk: 's1_0_q1', j: 'x2', t: Date.now() });
  assert.equal(r.code, 200);
  const a = (await rows(PIN)).filter(x => x.p.startsWith('answers/s1_0_q1/t1/'));
  assert.equal(a.length, 1); assert.equal(a[0].v.dev, DEV_A);
  // admin takımı eler: aynı oturum artık cevap/joker gönderemez, yeniden katılamaz
  await call({ fn: 'ctl', pin: PIN, key: KEY, ctl: ctl({ teams: { t1: { code: '1111', act: false }, t2: { code: '2222', act: true }, t3: { code: '3333', act: false } } }) });
  r = await call({ fn: 'cmd', pin: PIN, tok: tokA, op: 'ans', qk: 's1_0_q1', v: 'A', t: Date.now() });
  assert.equal(r.code, 403); assert.equal(r.j.out, true);
  r = await call({ fn: 'join', pin: PIN, tid: 't1', tok: tokA, dev: DEV_A });
  assert.equal(r.code, 403);
  // kabul kapalıyken aktif takım da yazamaz
  await call({ fn: 'ctl', pin: PIN, key: KEY, ctl: ctl({ acc: false }) });
  const tokB = (await call({ fn: 'join', pin: PIN, tid: 't2', code: '2222', dev: DEV_B })).j.tok;
  r = await call({ fn: 'cmd', pin: PIN, tok: tokB, op: 'ans', qk: 's1_0_q1', v: 'A', t: Date.now() });
  assert.equal(r.code, 409);
  // eşitlik sorusunda yalnız aday takımlar
  await call({ fn: 'ctl', pin: PIN, key: KEY, ctl: ctl({ qk: 'tie_s1_1', jk: false, elig: ['t1'] }) });
  r = await call({ fn: 'cmd', pin: PIN, tok: tokB, op: 'ans', qk: 'tie_s1_1', v: 5, t: Date.now() });
  assert.equal(r.code, 403);
});

test('cihaz devri yalnız admin sıfırlamasıyla; hatalı kod denemesi sınırlı', async () => {
  const P2 = '434343';
  await call({ fn: 'ctl', pin: P2, key: KEY, ctl: ctl() });
  assert.equal((await call({ fn: 'join', pin: P2, tid: 't2', code: '2222', dev: DEV_A })).code, 200);
  assert.equal((await call({ fn: 'join', pin: P2, tid: 't2', code: '2222', dev: DEV_B })).code, 409);
  assert.equal((await call({ fn: 'ctl', pin: P2, key: KEY, ctl: ctl(), reset: ['t2'] })).code, 200);
  assert.equal((await call({ fn: 'join', pin: P2, tid: 't2', code: '2222', dev: DEV_B })).code, 200);
  for (let k = 0; k < 10; k++) await call({ fn: 'join', pin: P2, tid: 't1', code: '0000', dev: DEV_X });
  const r = await call({ fn: 'join', pin: P2, tid: 't1', code: '1111', dev: DEV_X });
  assert.equal(r.code, 429);
});

test('denetim kaydı olmayan eski yarışmada genel yazım eskisi gibi çalışır', async () => {
  assert.equal((await call({ fn: 'set', pin: '515151', path: 'state', value: { eski: true } })).code, 200);
});

test('kurallar 27.11: Risk Jokeri yalnız final denetim kaydıyla; ekran değişikliği bildirimi kaydedilir', async () => {
  const P3 = '454545';
  await call({ fn: 'ctl', pin: P3, key: KEY, ctl: ctl({ risk: false }) });
  const tok = (await call({ fn: 'join', pin: P3, tid: 't1', code: '1111', dev: DEV_A })).j.tok;
  let r = await call({ fn: 'cmd', pin: P3, tok, op: 'jk', qk: 's1_0_q1', j: 'risk', s: 10, t: Date.now() });
  assert.equal(r.code, 409);
  await call({ fn: 'ctl', pin: P3, key: KEY, ctl: ctl({ risk: true }) });
  r = await call({ fn: 'cmd', pin: P3, tok, op: 'jk', qk: 's1_0_q1', j: 'risk', s: 7, t: Date.now() });
  assert.equal(r.code, 409);
  r = await call({ fn: 'cmd', pin: P3, tok, op: 'jk', qk: 's1_0_q1', j: 'risk', s: 15, t: Date.now() });
  assert.equal(r.code, 200);
  assert.equal((await rows(P3)).find(x => x.p === 'jreq/s1_0_q1/t1').v.s, 15);
  const tl = Date.now() - 20000;
  r = await call({ fn: 'cmd', pin: P3, tok, op: 'leave', qk: '-', t: tl, open: true });
  assert.equal(r.code, 200);
  await call({ fn: 'cmd', pin: P3, tok, op: 'leave', qk: '-', t: tl, open: true });
  const v = (await rows(P3)).filter(x => x.p.startsWith('viol/t1/') && x.v);
  assert.equal(v.length, 1, 'aynı olay tekrar gönderilince tek kayıt');
  assert.equal(v[0].v.open, true);
  r = await call({ fn: 'cmd', pin: P3, tok: 'sahte', op: 'leave', qk: '-', t: Date.now() });
  assert.equal(r.code, 401);
});
