// Kaplan Arena — sinematik medya senaryoları: açılış filmi, ara döngüsü, ortak duraklatma, kararlı video katmanı,
// yeniden bağlanma, hata/hareket azaltma fallback'i, file:// ve PowerShell yerel sunucusu (mp4 byte-range).
// Autoplay bayrağı KULLANILMAZ: ses, sahnedeki gerçek "Sesi Etkinleştir" tıklamasıyla açılır.
// Çalıştırma: NODE_PATH=<puppeteer-core node_modules> node tests/e2e/media.js
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const { start } = require('./server.js');
const ROOT = path.resolve(__dirname, '..', '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 3091, BASE = `http://localhost:${PORT}`;
const results = [];
function check(name, ok, detail){ results.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail != null && !ok ? ' :: ' + detail : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function clickSel(page, sel){ await page.waitForSelector(sel, { timeout: 15000 }); for (let k = 0; k < 20; k++){ if (await page.evaluate(q => { const el = document.querySelector(q); if (!el) return false; el.click(); return true; }, sel)){ await sleep(200); return; } await sleep(100); } throw new Error('tıklanamadı ' + sel); }
const act = (p, n) => clickSel(p, `[data-act="${n}"]:not([disabled])`);
const vstate = st => st.evaluate(() => { const b = document.getElementById('cine'), v = b && b.querySelector('video');
  return v ? { hidden: b.hidden, on: b.classList.contains('on'), paused: v.paused, t: v.currentTime, src: v.currentSrc || '', muted: v.muted, vol: v.volume, loop: v.loop,
    w: v.videoWidth, h: v.videoHeight, dur: v.duration, mark: v.dataset.mark || '', n: document.querySelectorAll('video').length, welcome: !!document.querySelector('.sgs-welcome') } : null; });
const playing = (st, re, ms) => st.waitForFunction(r => { const v = document.querySelector('#cine video'); return v && !v.paused && v.currentTime > 0.4 && new RegExp(r).test(v.currentSrc); }, { timeout: ms || 20000, polling: 100 }, re);
const bstate = st => st.evaluate(() => { const a = document.getElementById('bgm'); return a ? { paused: a.paused, muted: a.muted, t: a.currentTime, src: a.currentSrc || a.getAttribute('src') || '', vol: a.volume, loop: a.loop } : null; });
const bgmOn = (st, ms) => st.waitForFunction(() => { const a = document.getElementById('bgm'); return a && !a.paused && a.currentTime > 0.3; }, { timeout: ms || 15000, polling: 100 });
const bgmOff = (st, ms) => st.waitForFunction(() => { const a = document.getElementById('bgm'); return a && a.paused; }, { timeout: ms || 8000, polling: 100 });
const stopped = (st, ms) => st.waitForFunction(() => { const b = document.getElementById('cine'), v = b.querySelector('video'); return b.hidden && v.paused; }, { timeout: ms || 10000, polling: 100 });
async function openStage(admin){ const pp = new Promise(r => admin.once('popup', r)); await admin.click('[data-act="openStage"]'); const st = await pp; return st; }
async function seed(admin){
  await admin.evaluate(() => {
    const D = (t, o, a) => ({ id: uid(), type:'ders', subject:'Genel Kültür', text:t, options:o, answer:a });
    const o = ['Mars', 'Jüpiter', 'Venüs', 'Satürn'];
    S.questions = { s1: [D('En büyük gezegen hangisidir?', o, 'B'), D('Halkalı gezegen?', o, 'D')], s2: [D('x', o, 'A')], final: [D('y', o, 'A')], tie: [{ id: uid(), type:'tahmin', text:'z', answer:1, unit:'' }] };
    S.settings.classes = ['9-A', '9-B', '10-A', '10-B']; S.settings.seconds = 60; S.settings.sound = true; S.settings.volume = 80; S.settings.reduceMotion = false;
    syncEmblems(); save();
  });
}

(async () => {
  for (const f of ['assets/sinematik/acilis-60sn.mp4', 'assets/sinematik/ara-30sn-loop.mp4', 'assets/sinematik/ara-poster.webp'])
    check('web kopyası var: ' + f, fs.existsSync(path.join(ROOT, f)), f);
  const srv = await start(PORT);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const errors = [];
  const watch = (p, tag) => { p.on('pageerror', e => errors.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource|yok-boyle/.test(m.text())) errors.push(tag + ': ' + m.text()); }); };
  let ps = null;
  try{
    /* ---------- 1) HTTP (Vercel benzeri statik + byte-range) ---------- */
    const ctx = await browser.createBrowserContext();
    const admin = await ctx.newPage(); watch(admin, 'admin');
    await admin.setViewport({ width: 1366, height: 900 });
    await admin.goto(BASE + '/'); await admin.waitForSelector('[data-act="begin"]');
    await seed(admin); await admin.evaluate(() => render());
    const btns = await admin.evaluate(() => ['cineOpening', 'cineLoop', 'cineStop'].map(a => !!document.querySelector(`[data-act="${a}"]`)));
    check('admin karşılamada sinematik kontrolleri var', btns.every(Boolean), JSON.stringify(btns));
    let stage = await openStage(admin); watch(stage, 'sahne'); await stage.setViewport({ width: 1920, height: 1080 });
    await clickSel(stage, '#snd-on'); await sleep(1500);

    // Karşılama müziği: film yokken sahnede ara müziği döngüde çalar
    await bgmOn(stage);
    let bm = await bstate(stage);
    check('karşılamada (film yok) sahnede ara müziği çalıyor', !bm.paused && !bm.muted && bm.loop && /ara-30sn-loop\.mp4/.test(bm.src) && Math.abs(bm.vol - 0.8) < 0.01, JSON.stringify(bm));
    check('admin sayfasında ses/video öğesi yok', (await admin.$$('audio, video')).length === 0);
    check('admin durum satırı ara müziğini gösteriyor', /ara müziği/.test(await admin.$eval('#cine-st', e => e.textContent)));

    // Açılış filmi
    await act(admin, 'cineOpening');
    await playing(stage, 'acilis-60sn\\.mp4(\\?|$)');
    let v = await vstate(stage);
    check('açılış sahnede oynuyor (görünür, sesli)', v.on && !v.paused && !v.muted && Math.abs(v.vol - 0.8) < 0.01, JSON.stringify(v));
    check('açılış videosu 1920×1080, ~60 s', v.w === 1920 && v.h === 1080 && Math.abs(v.dur - 60) < 0.2, `${v.w}x${v.h} ${v.dur}`);
    check('admin sayfasında video öğesi yok (önizleme sessiz)', (await admin.$$('video')).length === 0);
    check('admin durum satırı açılışı gösteriyor', /açılış filmi/i.test(await admin.$eval('#cine-st', e => e.textContent)));
    check('açılış filmi döngüde (loop)', v.loop, JSON.stringify(v));
    await bgmOff(stage).catch(() => {});
    check('film oynarken karşılama müziği durur (çift ses yok)', (await bstate(stage)).paused);
    await stage.evaluate(() => { document.querySelector('#cine video').dataset.mark = 'kararli'; });
    const t1 = v.t;
    await admin.evaluate(() => { for (let i = 0; i < 6; i++){ render(); pushStage(); } });
    await sleep(2600);
    v = await vstate(stage);
    check('model yenilemeleri videoyu sıfırlamıyor/yeniden başlatmıyor', v.mark === 'kararli' && !v.paused && v.t > t1 + 1.5 && v.n === 1, JSON.stringify(v));
    // Ses sahipliği / merkezi ses
    await admin.evaluate(() => { S.settings.sound = false; save(); render(); });
    await sleep(1500);
    check('merkezi ses kapatılınca sahne videosu susar', (await vstate(stage)).muted);
    // Açılış sonu: durmaz, başa sarıp sürer
    await stage.evaluate(() => { const x = document.querySelector('#cine video'); x.currentTime = x.duration - 0.6; });
    await sleep(2200);
    v = await vstate(stage);
    check('açılış filmi sonda başa sarar, sahne değişmedikçe sürer', !v.paused && v.on && !v.hidden && v.t < 3, JSON.stringify(v));
    await admin.evaluate(() => { S.settings.sound = true; save(); render(); });
    await sleep(1500);
    check('ses yeniden açılınca video sesli', !(await vstate(stage)).muted);
    // Atla
    await act(admin, 'cineSkip'); await stopped(stage);
    v = await vstate(stage);
    check('Atla: video durur, sabit karşılama görünür', v.hidden && v.paused && v.welcome, JSON.stringify(v));
    await bgmOn(stage);
    check('Atla sonrası karşılama müziği yeniden çalar', !(await bstate(stage)).paused);
    // Ses kapalıyken müzik çalmaz
    await admin.evaluate(() => { S.settings.sound = false; save(); render(); });
    await bgmOff(stage).catch(() => {});
    check('merkezi ses kapalıyken karşılama müziği çalmaz', (await bstate(stage)).paused);
    await admin.evaluate(() => { S.settings.sound = true; save(); render(); });
    await bgmOn(stage);
    // Yenileme/yeniden bağlanma: açılış baştan değil kaldığı yerden sürer
    await act(admin, 'cineOpening'); await playing(stage, 'acilis-60sn'); await sleep(6000);
    const el0 = await admin.evaluate(() => cineState().elapsed / 1000);
    await stage.reload(); await stage.waitForSelector('#sg .sg', { timeout: 10000 });
    await clickSel(stage, '#snd-on');
    await playing(stage, 'acilis-60sn', 15000);
    v = await vstate(stage);
    check('sahne yenilenince açılış baştan değil kaldığı yerden sürer', !v.paused && !v.hidden && v.t > 4 && v.t < el0 + 15, JSON.stringify({ v, el0 }));
    await act(admin, 'cineStop');
    // Ara döngüsü
    await act(admin, 'cineLoop'); await playing(stage, 'ara-30sn-loop\\.mp4(\\?|$)');
    v = await vstate(stage);
    check('ara döngüsü oynuyor (loop, sesli)', v.loop && !v.muted && v.on && Math.abs(v.dur - 30) < 0.1, JSON.stringify(v));
    await stage.evaluate(() => { const x = document.querySelector('#cine video'); x.currentTime = x.duration - 0.6; });
    await sleep(2200);
    v = await vstate(stage);
    check('ara döngüsü sonda başa sarar, gizlenmez', !v.paused && v.on && v.t < 3, JSON.stringify(v));
    await stage.reload(); await stage.waitForSelector('#sg .sg', { timeout: 10000 }); await clickSel(stage, '#snd-on');
    await playing(stage, 'ara-30sn-loop');
    check('sahne yenilenince sakin ara döngüsü sürer', true);
    await act(admin, 'cineStop'); await stopped(stage);
    check('Durdur: sahne karşılamaya döner', (await vstate(stage)).welcome);
    await bgmOn(stage);
    check('Durdur sonrası karşılama müziği çalar', !(await bstate(stage)).paused);
    // Eksik dosya → sabit karşılama
    await admin.evaluate(() => { window.__src = CINE.loop.src; CINE.loop.src = 'assets/sinematik/yok-boyle-dosya.mp4'; });
    await act(admin, 'cineLoop'); await sleep(600);
    await stage.waitForFunction(() => document.getElementById('cine').hidden, { timeout: 10000 }).catch(() => {});
    v = await vstate(stage);
    check('eksik video dosyasında sabit karşılama (hata yok)', v.hidden && v.welcome, JSON.stringify(v));
    await admin.evaluate(() => { CINE.loop.src = window.__src; }); await act(admin, 'cineStop');
    // Hareketleri azaltma → açılış oynatılmaz
    await admin.evaluate(() => { S.settings.reduceMotion = true; save(); render(); });
    await act(admin, 'cineOpening'); await sleep(3000);
    v = await vstate(stage);
    check('hareketleri azaltma açıkken açılış filmi oynatılmaz', v.hidden && v.paused && v.welcome, JSON.stringify(v));
    await act(admin, 'cineStop'); await admin.evaluate(() => { S.settings.reduceMotion = false; save(); render(); });

    // ---- Aktif yarışma: ara ortak duraklatmayla; bitiş/Atla yarışmayı ilerletmez ----
    await act(admin, 'begin');
    await bgmOff(stage).catch(() => {});
    check('karşılamadan çıkınca (harita) müzik durur', (await bstate(stage)).paused);
    await act(admin, 'newGameYes');
    await act(admin, 'drawGo'); await admin.waitForFunction(() => S.game.draw && ui.drawShown == null);
    await act(admin, 'drawOk'); await act(admin, 'startStage'); await act(admin, 'showQ');
    await admin.waitForFunction(() => S.game.phase === 'open' && C.isRunning(S.game), { timeout: 10000 });
    await admin.evaluate(() => { S.game.teams.s1[0].score = 30; S.game.teams.s1[1].score = 20; save(); });
    await sleep(1200);
    const before = await admin.evaluate(() => ({ q: S.game.qIndex, left: C.clockLeft(S.game.clock, nowS()), scores: S.game.teams.s1.map(t => t.score), jk: JSON.stringify(S.game.jokers || {}) }));
    await act(admin, 'cineLoop');
    await playing(stage, 'ara-30sn-loop');
    const during = await admin.evaluate(() => ({ screen: ui.screen, running: C.isRunning(S.game), reasons: S.game.clock.reasons.slice(), inWin: C.inWindow(S.game.win, nowS()), left: C.clockLeft(S.game.clock, nowS()) }));
    check('aktif soruda ara: süre durdu (break+admin)', !during.running && during.reasons.includes('break') && during.reasons.includes('admin'), JSON.stringify(during));
    check('aktif soruda ara: cevap kabulü kapalı', during.inWin === false);
    await sleep(3000);
    const later = await admin.evaluate(() => ({ running: C.isRunning(S.game), left: C.clockLeft(S.game.clock, nowS()), phase: S.game.phase, screen: ui.screen }));
    check('ara sürerken kalan süre korunur, yarışma ilerlemez', !later.running && Math.abs(later.left - during.left) < 50 && later.phase === 'open' && later.screen === 'welcome', JSON.stringify(later));
    await stage.evaluate(() => { const x = document.querySelector('#cine video'); x.currentTime = x.duration - 0.4; });
    await sleep(1500);
    check('döngü sınırı yarışmayı başlatmaz', !(await admin.evaluate(() => C.isRunning(S.game))));
    await act(admin, 'begin');
    await stopped(stage);
    const back = await admin.evaluate(() => ({ screen: ui.screen, cine: ui.cine, running: C.isRunning(S.game), reasons: S.game.clock.reasons.slice(), q: S.game.qIndex, left: C.clockLeft(S.game.clock, nowS()), scores: S.game.teams.s1.map(t => t.score), jk: JSON.stringify(S.game.jokers || {}) }));
    check('Yarışmaya Devam: sahnede video kapanır, soru aynı', back.screen === 'game' && !back.cine && back.q === before.q, JSON.stringify(back));
    check('Devam sonrası süre yalnız admin "devam" ile başlar', !back.running && back.reasons.length === 1 && back.reasons[0] === 'admin', JSON.stringify(back.reasons));
    check('puanlar ve jokerler korunur', JSON.stringify(back.scores) === JSON.stringify(before.scores) && back.jk === before.jk, JSON.stringify([before.scores, back.scores]));
    await act(admin, 'resume');
    check('admin devam edince süre çalışır', await admin.evaluate(() => C.isRunning(S.game)));
    // Açılış filmi aktif yarışmada (üst çubuk → Karşılama → Açılış): bitiş/Atla otomatik soru başlatmaz
    await act(admin, 'welcome');
    check('Karşılama aktif soruyu duraklatır', await admin.evaluate(() => !C.isRunning(S.game) && S.game.clock.reasons.includes('break')));
    await act(admin, 'cineOpening'); await playing(stage, 'acilis-60sn');
    await stage.evaluate(() => { const x = document.querySelector('#cine video'); x.currentTime = x.duration - 0.5; });
    await sleep(2000);
    const afterEnd = await admin.evaluate(() => ({ running: C.isRunning(S.game), phase: S.game.phase, q: S.game.qIndex, screen: ui.screen }));
    const vEnd = await vstate(stage);
    check('açılış döngüsü başa sarar, yarışma duraklı kalır (otomatik başlamaz)', !afterEnd.running && afterEnd.phase === 'open' && afterEnd.screen === 'welcome' && !vEnd.paused && vEnd.t < 3, JSON.stringify({ afterEnd, vEnd }));
    await act(admin, 'cineSkip'); await stopped(stage);
    // Telefon sayfası video içermez
    const pin = await admin.evaluate(() => S.game.pin);
    const ph = await (await browser.createBrowserContext()).newPage(); watch(ph, 'telefon');
    await ph.setViewport({ width: 390, height: 844, isMobile: true });
    await ph.goto(`${BASE}/kaplan-arena.html?pin=${pin}`); await sleep(2500);
    check('telefon sayfasında video/ses öğesi yok', (await ph.$$('video, audio')).length === 0);
    await ph.close();
    // Range isteği (Vercel/statik sunucu davranışı)
    const r = await fetch(BASE + '/assets/sinematik/ara-30sn-loop.mp4', { headers: { Range: 'bytes=0-99' } });
    check('test sunucusu mp4 Range → 206', r.status === 206 && /^bytes 0-99\//.test(r.headers.get('content-range') || '') && (await r.arrayBuffer()).byteLength === 100);
    await ctx.close();

    /* ---------- 2) file:// (internetsiz) ---------- */
    const fctx = await browser.createBrowserContext();
    const fa = await fctx.newPage(); watch(fa, 'file-admin');
    await fa.setRequestInterception(true);
    fa.on('request', q => { if (/vercel\.app/.test(q.url())) q.abort('internetdisconnected'); else q.continue(); });
    await fa.setViewport({ width: 1366, height: 860 });
    await fa.goto('file:///' + path.join(ROOT, 'kaplan-arena.html').replace(/\\/g, '/'));
    await fa.waitForSelector('[data-act="begin"]'); await seed(fa); await fa.evaluate(() => render());
    const fst = await openStage(fa); watch(fst, 'file-sahne'); await fst.setViewport({ width: 1366, height: 768 });
    await clickSel(fst, '#snd-on'); await sleep(1500);
    await act(fa, 'cineLoop'); await playing(fst, 'ara-30sn-loop');
    v = await vstate(fst);
    check('file://: ara döngüsü sahnede oynuyor', v.on && !v.paused && v.src.startsWith('file:'), JSON.stringify(v));
    await act(fa, 'cineOpening'); await playing(fst, 'acilis-60sn');
    check('file://: açılış filmi sahnede oynuyor', !(await vstate(fst)).paused);
    await fctx.close();

    /* ---------- 3) PowerShell yerel sunucusu: mp4 MIME + 206 parçaları ---------- */
    ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'kaplan-sunucu.ps1')], { env: Object.assign({}, process.env, { KAPLAN_NO_BROWSER: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; ps.stdout.on('data', d => out += d);
    let port = null;
    for (let k = 0; k < 60 && !port; k++){ await sleep(500); const m = out.match(/localhost:(\d+)\//); if (m) port = m[1]; }
    check('PS yerel sunucu başladı', !!port, out.slice(-300));
    const B = `http://localhost:${port}`;
    const size = fs.statSync(path.join(ROOT, 'assets/sinematik/acilis-60sn.mp4')).size;
    let q = await fetch(B + '/assets/sinematik/acilis-60sn.mp4', { headers: { Range: 'bytes=0-' } });
    let body = await q.arrayBuffer();
    check('PS: mp4 açık uçlu Range → 206, en çok 1 MB', q.status === 206 && q.headers.get('content-type') === 'video/mp4' && body.byteLength === 1048576 && q.headers.get('content-range') === `bytes 0-1048575/${size}`, `${q.status} ${q.headers.get('content-range')} ${body.byteLength}`);
    q = await fetch(B + '/assets/sinematik/acilis-60sn.mp4', { headers: { Range: `bytes=${size - 500}-` } }); body = await q.arrayBuffer();
    check('PS: dosya sonu aralığı doğru', q.status === 206 && body.byteLength === 500, `${q.status} ${body.byteLength}`);
    q = await fetch(B + '/assets/sinematik/acilis-60sn.mp4', { headers: { Range: 'bytes=-300' } }); body = await q.arrayBuffer();
    check('PS: son-ek aralığı (bytes=-300)', q.status === 206 && body.byteLength === 300, `${q.status} ${body.byteLength}`);
    q = await fetch(B + '/assets/sinematik/acilis-60sn.mp4', { headers: { Range: `bytes=${size + 10}-` } });
    check('PS: geçersiz aralık → 416', q.status === 416, q.status);
    q = await fetch(B + '/assets/sinematik/../../.env.local'); check('PS: video yolu dışına çıkış reddedilir', [400, 403, 404].includes(q.status), q.status);
    const pctx = await browser.createBrowserContext();
    const pa = await pctx.newPage(); watch(pa, 'ps-admin');
    await pa.setViewport({ width: 1366, height: 860 });
    await pa.goto(B + '/'); await pa.waitForSelector('[data-act="begin"]'); await seed(pa); await pa.evaluate(() => render());
    const pst = await openStage(pa); watch(pst, 'ps-sahne'); await pst.setViewport({ width: 1366, height: 768 });
    await clickSel(pst, '#snd-on'); await sleep(1500);
    await act(pa, 'cineOpening'); await playing(pst, 'acilis-60sn', 25000);
    const t0 = Date.now(); const info = await fetch(B + '/api/info'); const lat = Date.now() - t0;
    check('PS: video oynarken API istekleri bekletilmez', info.status === 200 && lat < 1500, lat + ' ms');
    await sleep(3000);
    v = await vstate(pst);
    check('PS: açılış filmi parça parça akarak oynuyor', !v.paused && v.t > 2.5, JSON.stringify(v));
    await pst.evaluate(() => { const x = document.querySelector('#cine video'); x.currentTime = 45; });
    await sleep(2500);
    v = await vstate(pst);
    check('PS: ileri sarma (seek) çalışıyor', !v.paused && v.t > 45.5, JSON.stringify(v));
    await pctx.close();
  } catch (e){ check('senaryo hatasız tamamlandı', false, e.stack); }
  finally {
    if (ps){ try{ spawn('taskkill', ['/pid', String(ps.pid), '/T', '/F']); }catch(e){} }
    check('konsol/sayfa hatası yok', errors.length === 0, errors.join(' | '));
    await browser.close(); srv.close();
    const pass = results.filter(r => r.ok).length;
    console.log(`\n${pass}/${results.length} geçti`);
    fs.writeFileSync(path.join(__dirname, 'son-rapor-medya.json'), JSON.stringify({ tarih: new Date().toISOString(), gecen: pass, toplam: results.length, sonuclar: results }, null, 1));
    process.exit(pass === results.length ? 0 : 1);
  }
})();
