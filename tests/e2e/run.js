// Kaplan Arena — uçtan uca tarayıcı senaryosu (admin + ayrı sahne + iki öğrenci telefonu).
// Çalıştırma: NODE_PATH=<puppeteer-core kurulu node_modules> node tests/e2e/run.js
// Canlı Redis/Vercel kullanılmaz: tests/e2e/server.js bellek kipindeki /api/ka ile çalışır.
const path = require('path'), fs = require('fs');
const puppeteer = require('puppeteer-core');
const { start } = require('./server.js');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'tasarim', 'ekran-goruntuleri');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 3088, BASE = `http://localhost:${PORT}`;
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail){ results.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail != null && !ok ? ' :: ' + detail : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(body){ const r = await fetch(BASE + '/api/ka', { method:'POST', body:JSON.stringify(body) }); return r.json(); }
async function kvState(pin){ const j = await api({ fn:'get', pins:[pin], since:0 }); const row = j.rows.find(r => r.p === 'state'); return { st: row ? row.v : null, t: j.t, rows: j.rows }; }
async function clickSel(page, sel){
  await page.waitForSelector(sel, { timeout: 15000 });
  for (let k = 0; k < 20; k++){
    const ok = await page.evaluate(q => { const el = document.querySelector(q); if (!el) return false; el.click(); return true; }, sel);
    if (ok){ await sleep(250); return; }
    await sleep(100);
  }
  throw new Error('tıklanamadı: ' + sel);
}
const selOf = (attr, name, data) => `[data-${attr}="${name}"]${data ? Object.entries(data).map(([k, v]) => `[data-${k}="${v}"]`).join('') : ''}:not([disabled])`;
async function act(page, name, data){
  if (name === 'openStage'){ const s = selOf('act', name, data); await page.waitForSelector(s); await page.click(s); return sleep(300); }   // açılır pencere gerçek tıklama ister
  return clickSel(page, selOf('act', name, data));
}
async function pl(page, name, data){ return clickSel(page, selOf('pl', name, data)); }
async function typeNum(page, val){
  await page.waitForSelector('#pl-num:not([disabled])', { timeout: 15000 });
  await page.evaluate(v => { const el = document.getElementById('pl-num'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, val);
  await sleep(100);
}
const G = page => page.evaluate(() => JSON.parse(JSON.stringify(S.game)));
async function waitG(page, fn, arg, timeout){ await page.waitForFunction(fn, { timeout: timeout || 20000, polling: 100 }, arg); }
async function shot(page, name, w, h){ if (w) await page.setViewport({ width:w, height:h }); await sleep(450); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }
const textOf = page => page.evaluate(() => document.body.innerText);
async function waitKv(pin, pred, ms){ const end = Date.now() + (ms || 6000); let k; while (Date.now() < end){ k = await kvState(pin); if (k.st && pred(k.st)) return k; await sleep(150); } return k; }

(async () => {
  const srv = await start(PORT);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--disable-features=Translate'] });
  const errors = [];
  const watch = (p, tag) => { p.on('pageerror', e => errors.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(tag + ': ' + m.text()); }); };
  try{
    /* ---------- admin ---------- */
    const ctxA = await browser.createBrowserContext();
    const admin = await ctxA.newPage(); watch(admin, 'admin');
    await admin.setViewport({ width: 1366, height: 900 });
    await admin.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);   // kura animasyonu anında biter
    await admin.goto(BASE + '/');
    await admin.waitForSelector('[data-act="begin"]');
    await shot(admin, 'admin-karsilama-1366', 1366, 768);
    const txtW = await textOf(admin);
    const names = ['Ersen BARLAS', 'Alp Han KOÇDEMİR', 'Emre Burak Tölegen', 'Burak Yoğurtçu', 'Halil Mert ACAR', 'Yekta Efe Konuk', 'Çınar Arda', 'Yusuf Emir Kuş', 'Ömer Araf Boncuk', 'Emir Karatay'];
    check('karşılama: künye eksiksiz ve sıralı', names.every(n => txtW.includes(n)) && txtW.indexOf('Ersen BARLAS') < txtW.indexOf('Alp Han KOÇDEMİR') && txtW.indexOf('Emre Burak Tölegen') < txtW.indexOf('Emir Karatay'));
    check('karşılama: başlıklar', /KAPLAN OKULLARI YAPAYZEKA KULÜBÜ SUNAR/.test(txtW) && /KAPLAN ARENA/.test(txtW) && /Efsaneye Yolculuk/.test(txtW) && /Yolculuğa Başla/.test(txtW));

    // test soru seti (gerçek okul verisi değil) + kısa süre
    await admin.evaluate(() => {
      const D = (s, t, o, a) => ({ id: uid(), type:'ders', subject:s, text:t, options:o, answer:a });
      const T = (t, a, u) => ({ id: uid(), type:'tahmin', text:t, answer:a, unit:u || '' });
      S.questions = {
        s1: [T('Kızılırmak kaç kilometredir?', 1355, 'km'),
             D('Türkçe', 'Aşağıdaki cümlelerin hangisinde "de" bağlacının yazımı yanlıştır? Bu soru, uzun soru metinlerinin sahnede kırpılmadan ve okunaklı biçimde gösterildiğini sınamak için özellikle uzun tutulmuştur.', ['Sen de gelecek misin?', 'Kitap çantanın içinde duruyor.', 'Ali de Ayşe de sınavı geçti.', 'Kardeşimde bu okula gidiyor; şıkların uzun olması durumunda da okunaklı kalmalıdır.'], 'D'),
             T('Dünya ile Güneş arası kaç milyon km?', 149.6, 'milyon km'),
             D('Matematik', 'log₂64 + log₃81 kaçtır?', ['8', '9', '10', '12'], 'C')],
        s2: [D('Fen Bilimleri', '26 numaralı element?', ['Bakır', 'Demir', 'Çinko', 'Nikel'], 'B'), T('Selimiye kaç yılında bitti?', 1575, '')],
        final: [D('Sosyal Bilimler', 'Kanun-i Esasi hangi padişah döneminde?', ['Abdülaziz', 'V. Murat', 'II. Abdülhamit', 'Mehmed Reşad'], 'C'), T('Bir futbol maçı kaç dakika?', 90, 'dk')],
        tie: [T('Everest kaç metredir?', 8849, 'm'), T('Türkiye kaç ilden oluşur?', 81, '')]
      };
      S.settings.seconds = 30; save();
    });
    await act(admin, 'begin');
    await shot(admin, 'admin-ana-menu-1366', 1366, 900);
    await act(admin, 'newGameYes');
    await waitG(admin, () => S.game.started);
    const pin = (await G(admin)).pin;
    check('yarışma başladı ve 6 haneli kod üretildi', /^\d{6}$/.test(pin), pin);

    /* ---------- sahne penceresi ---------- */
    const popupP = new Promise(r => admin.once('popup', r));
    await act(admin, 'openStage');
    const stage = await popupP; watch(stage, 'sahne');
    await stage.setViewport({ width: 1920, height: 1080 });
    const stageApi = []; stage.on('request', r => { if (r.url().includes('/api/')) stageApi.push(r.url()); });
    await stage.waitForSelector('#snd-on');
    await stage.evaluate(() => { window.__played = []; const p = StageAudio.play; StageAudio.play = k => { window.__played.push(k); return p(k); }; });
    await clickSel(stage, '#snd-on');
    await sleep(1800);
    check('sahne: ses etkinleştirme/test adımı', await stage.evaluate(() => StageAudio.ready() && window.__played.includes('test')));
    await waitG(admin, () => StageHost.count() > 0);
    check('admin sahneyi tanıdı ve etkin ses sahnesi seçildi', await admin.evaluate(() => StageHost.count() === 1 && !!StageHost.soundStage()));

    // kura
    await act(admin, 'drawGo');
    await waitG(admin, () => S.game.draw && ui.drawShown == null);
    await shot(stage, 'sahne-kura-1920');
    await act(admin, 'drawOk');
    await waitG(admin, () => S.game.view === 'teams');
    const g0 = await G(admin);
    const T0 = g0.teams.s1[0].name, T1 = g0.teams.s1[1].name, T2 = g0.teams.s1[2].name;

    /* ---------- telefonlar ---------- */
    const ctxB = await browser.createBrowserContext(), ctxC = await browser.createBrowserContext();
    const phB = await ctxB.newPage(), phC = await ctxC.newPage(); watch(phB, 'telefonB'); watch(phC, 'telefonC');
    await phB.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await phC.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
    await phB.goto(BASE + '/katil'); await phB.waitForSelector('#pl-pin');
    await shot(phB, 'telefon-katilim-390');
    await phB.type('#pl-pin', pin); await pl(phB, 'join');
    await phC.goto(`${BASE}/kaplan-arena.html?pin=${pin}`);
    await phB.waitForSelector('[data-pl="pick"]'); await shot(phB, 'telefon-sinif-secimi-390');
    await pl(phB, 'pick', { i: 0 }); await pl(phC, 'pick', { i: 1 });
    await shot(phC, 'telefon-hazir-360');
    await waitG(admin, () => NET.joined && NET.joined[0] && NET.joined[1]);
    check('iki telefon sınıflarını aldı', true);
    await shot(stage, 'sahne-katilim-1920');
    const devB = await phB.evaluate(() => P.dev), devC = await phC.evaluate(() => P.dev);

    /* ---------- Soru 1 (tahmin): hazırlık sızıntısı yok, çifte puan + ceza, duraklama, kilit ---------- */
    await act(admin, 'startStage');
    await waitG(admin, () => S.game.view === 'question' && S.game.phase === 'ready');
    await sleep(900);
    let kv = await kvState(pin);
    check('hazırlık: telefonlara soru gönderilmez', kv.st && kv.st.phase === 'ready' && kv.st.q === null);
    check('hazırlık: sahne soruyu göstermez', !(await textOf(stage)).includes('Kızılırmak') && (await textOf(stage)).includes('Hazır mısınız'));
    check('hazırlık: telefon soru metnini görmez', !(await textOf(phB)).includes('Kızılırmak'));
    check('hazırlıkta süre işlemez', !(await admin.evaluate(() => C.isRunning(S.game))));
    await shot(stage, 'sahne-hazirlik-1920'); await shot(phB, 'telefon-hazirlik-390'); await shot(admin, 'admin-hazirlik-1366', 1366, 900);
    await act(admin, 'showQ');
    await waitG(admin, () => S.game.phase === 'open' && C.isRunning(S.game));
    await phB.waitForSelector('#pl-num');
    check('soru gösterilince sahne ve telefon soruyu görür', (await textOf(stage)).includes('Kızılırmak') && (await textOf(phB)).includes('Kızılırmak'));
    await typeNum(phB, '1300'); await pl(phB, 'send');
    await shot(phB, 'telefon-tahmin-gonderildi-390');
    // C: Çifte Puan (onay penceresiyle)
    await pl(phC, 'jkAsk', { j: 'x2' });
    await shot(phC, 'telefon-joker-onay-360');
    await pl(phC, 'jkYes');
    await waitG(admin, () => !!S.game.intro);
    await sleep(300);
    await shot(stage, 'sahne-joker-tanitimi-1920');
    let gA = await G(admin);
    check('joker kabul: hak tüketildi', gA.jokers[T1] && gA.jokers[T1].x2 && gA.jokers[T1].x2.startsWith('s1_0'));
    check('joker tanıtımı: ortak saat durdu', gA.clock.runAt === null && gA.clock.reasons.includes('joker'));
    kv = await kvState(pin);
    check('telefon durumu: duraklama yayımlandı', kv.st.open === false && kv.st.paused.includes('joker'));
    // duraklama sırasında doğrudan gönderilen cevap kabul edilmemeli
    await api({ fn:'set', pin, path:`answers/${kv.st.qk}/0/sPAUSE`, value:{ v: 1355, t: kv.t, dev: devB } });
    await shot(phB, 'telefon-duraklama-390');
    await waitG(admin, () => !S.game.intro && C.isRunning(S.game), null, 8000);
    check('tanıtım bitince saat kendiliğinden devam etti (başka neden yok)', true);
    // C tahmin gönderir; B fikrini değiştirip yeniden gönderir
    await typeNum(phC, '1400'); await pl(phC, 'send');
    await typeNum(phB, '1350'); await pl(phB, 'send');
    await sleep(900);
    // süre dolsun
    await waitG(admin, () => S.game.phase === 'locked', null, 40000);
    kv = await waitKv(pin, st => st.phase === 'locked');
    check('süre sıfırda cevap kabulü kilitlendi (aşama locked, otomatik açıklama yok)', kv.st.phase === 'locked' && kv.st.answer === null);
    await api({ fn:'set', pin, path:`answers/${kv.st.qk}/0/sLATE`, value:{ v: 1355, t: kv.t + 500, dev: devB } });
    await sleep(2500);
    check('kilit sonrası otomatik açıklama/ilerleme yok', (await G(admin)).phase === 'locked');
    await shot(phB, 'telefon-sure-doldu-390');
    await act(admin, 'revealAsk');
    await waitG(admin, () => S.game.phase === 'revealed');
    gA = await G(admin);
    const fr1 = gA.frozen[Object.keys(gA.frozen).find(k => k.startsWith('s1_0'))];
    check('kabul edilen: son geçerli gönderim (1350); duraklamadaki ve süre sonrası 1355 sayılmadı', fr1[0] && fr1[0].v === 1350, JSON.stringify(fr1));
    kv = await kvState(pin);
    check('açıklamada puan gösterilmez', kv.st.view === 'question' && kv.st.lastDelta === null && !(await textOf(stage)).includes('Puan Durumu'));
    await shot(stage, 'sahne-tahmin-aciklama-1920');
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    gA = await G(admin);
    check('Soru 1: normal doğru +10, Çifte Puan kazanamadı → ceza 0 puanda 0', gA.teams.s1[0].score === 10 && gA.teams.s1[1].score === 0 && gA.last.delta[1] === 0, JSON.stringify(gA.last.delta));
    await admin.evaluate(() => { ACT.showScores(); ui.screen = 'game'; });
    await admin.evaluate(() => { S.game.view = 'question'; S.game.phase = 'revealed'; ACT.showScores(); });
    check('tekrar puan gösterme puanı çoğaltmaz', (await G(admin)).teams.s1[0].score === 10);
    await sleep(600);
    await shot(stage, 'sahne-puan-tablosu-1920');
    await shot(phC, 'telefon-joker-cezasi-360');
    check('telefon: joker cezası gösterimi', (await textOf(phC)).includes('JOKER CEZASI'));
    await sleep(6000);
    check('puan ekranı kendiliğinden geçmez', (await G(admin)).view === 'scoreboard');

    /* ---------- Soru 2 (şıklı, uzun): Çift Cevap, erken açıklama onayı ---------- */
    await act(admin, 'next');
    await waitG(admin, () => S.game.phase === 'ready' && S.game.qIndex === 1);
    check('sonraki soru hazırlıkla açılır, süre başlamaz', !(await admin.evaluate(() => C.isRunning(S.game))));
    await act(admin, 'showQ');
    await phC.waitForSelector('[data-pl="pick-opt"]');
    // B önce cevap gönderir, sonra joker ister → ret
    await pl(phB, 'pick-opt', { v: 'A' }); await pl(phB, 'send');
    await sleep(900);
    kv = await kvState(pin);
    await api({ fn:'set', pin, path:`jreq/${kv.st.qk}/0`, value:{ j:'x2', t: kv.t, dev: devB } });
    await sleep(1500);
    gA = await G(admin);
    check('ilk cevaptan sonra joker reddedilir', gA.jrej[0] && /Cevap gönderildikten/.test(gA.jrej[0].why), gA.jrej[0] && gA.jrej[0].why);
    check('reddedilen jokerin hakkı tüketilmez', !gA.jokers[T0] || gA.jokers[T0].x2 == null);
    await pl(phC, 'jkAsk', { j: 'double' }); await pl(phC, 'jkYes');
    await waitG(admin, () => S.game.intro || (S.game.jrej && S.game.jrej[1]), null, 6000).catch(() => {});
    gA = await G(admin);
    if (!(gA.jokers[T1] && gA.jokers[T1].double)) console.log('   C çift cevap durumu:', JSON.stringify({ jrej: gA.jrej, jk: gA.jokers[T1], phone: await phC.evaluate(() => ({ jk: P.jk, can: plCan(), st: P.st && { open: P.st.open, phase: P.st.phase } })), win: gA.win }));
    await waitG(admin, () => !S.game.intro && C.isRunning(S.game), null, 9000);
    kv = await kvState(pin);
    await api({ fn:'set', pin, path:`jreq/${kv.st.qk}/1`, value:{ j:'x2', t: kv.t, dev: devC } });
    await sleep(1500);
    gA = await G(admin);
    check('aynı soruda ikinci joker isteği reddedilir', gA.jrej[1] && /zaten bir joker/.test(gA.jrej[1].why), gA.jrej[1] && gA.jrej[1].why);
    check('reddedilen ikinci joker hakkı tüketmez', gA.jokers[T1].x2 && gA.jokers[T1].x2.startsWith('s1_0'));
    await phC.waitForSelector('[data-pl="pick-opt"]:not([disabled])');
    await pl(phC, 'pick-opt', { v: 'B' });
    check('Çift Cevap: tek seçimle gönderilemez', await phC.$eval('[data-pl="send"]', b => b.disabled));
    await pl(phC, 'pick-opt', { v: 'D' });
    await shot(phC, 'telefon-cift-cevap-360');
    await pl(phC, 'send');
    await sleep(1000);
    await shot(stage, 'sahne-sikli-uzun-1920');
    await act(admin, 'revealAsk');
    await admin.waitForSelector('[data-act="revealYes"]');
    check('süre bitmeden açıklama onay ister', true);
    await act(admin, 'revealYes');
    await waitG(admin, () => S.game.phase === 'revealed');
    await sleep(500);
    await shot(stage, 'sahne-sikli-aciklama-1920');
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    gA = await G(admin);
    check('Soru 2: Çift Cevap biri doğru +10; yanlış normal cevap 0', gA.teams.s1[1].score === 10 && gA.teams.s1[0].score === 10 && gA.last.delta[1] === 10, JSON.stringify(gA.last.delta));
    await shot(phC, 'telefon-dogru-cevap-360');

    /* ---------- Soru 3 (tahmin): ceza −10 ve iptal (gerçek delta, joker iadesi, tekrar iptal) ---------- */
    await act(admin, 'next'); await act(admin, 'showQ');
    await phB.waitForSelector('[data-pl="jkAsk"][data-j="x2"]:not([disabled])');
    await pl(phB, 'jkAsk', { j: 'x2' }); await pl(phB, 'jkYes');
    await waitG(admin, () => !S.game.intro && C.isRunning(S.game), null, 9000);
    await typeNum(phB, '500'); await pl(phB, 'send');
    await typeNum(phC, '150'); await pl(phC, 'send');
    await sleep(900);
    await act(admin, 'revealAsk'); await act(admin, 'revealYes');
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    gA = await G(admin);
    check('Soru 3: Çifte Puan yanlış −10 (10→0), en yakın +10', gA.teams.s1[0].score === 0 && gA.teams.s1[1].score === 20 && gA.last.delta[0] === -10, JSON.stringify(gA.last.delta));
    const before = gA.teams.s1.map(t => t.score);
    await act(admin, 'cancelAsk'); await act(admin, 'cancelYes');
    await waitG(admin, () => S.game.phase === 'cancelled');
    gA = await G(admin);
    check('iptal: puan etkisi geri alındı', gA.teams.s1[0].score === 10 && gA.teams.s1[1].score === 10, JSON.stringify(gA.teams.s1.map(t => t.score)));
    check('iptal: bu sorudaki joker iade edildi, önceki jokerler korundu', gA.jokers[T0].x2 === null && gA.jokers[T1].x2 && gA.jokers[T1].double);
    await admin.evaluate(() => ACT.cancelYes());
    check('tekrar iptal ikinci iade yapmaz', JSON.stringify((await G(admin)).teams.s1.map(t => t.score)) === JSON.stringify(gA.teams.s1.map(t => t.score)));
    await sleep(800);
    check('iptal durumu sahne ve telefonda', (await textOf(stage)).includes('Soru iptal edildi') && (await textOf(phB)).includes('Soru iptal edildi'));
    await shot(stage, 'sahne-iptal-1920'); await shot(phB, 'telefon-iptal-390');
    void before;

    /* ---------- Soru 4 (şıklı): eşzamanlı jokerler, admin jokeri, sahne kaybı, telefon kopması, ses tekilleştirme ---------- */
    await act(admin, 'next'); await act(admin, 'showQ');
    await phB.waitForSelector('[data-pl="jkAsk"][data-j="double"]:not([disabled])');
    kv = await kvState(pin);
    const tSim = kv.t;
    await Promise.all([
      api({ fn:'set', pin, path:`jreq/${kv.st.qk}/0`, value:{ j:'double', t: tSim, dev: devB } }),
      api({ fn:'set', pin, path:`jreq/${kv.st.qk}/3`, value:{ j:'x2', t: tSim, dev: 'baska-telefon' } })
    ]);
    await waitG(admin, () => S.game.intro && S.game.intro.items.length === 2, null, 6000).catch(() => {});
    gA = await G(admin);
    check('eşzamanlı jokerler tek tanıtımda birleşti', gA.intro && gA.intro.items.length === 2, JSON.stringify(gA.intro));
    await sleep(300); await shot(stage, 'sahne-cift-joker-tanitimi-1920');
    const nPlayed = await stage.evaluate(() => window.__played.filter(k => k === 'joker').length);
    const nJokerEv = await admin.evaluate(() => S.game.events.filter(e => e.kind === 'joker').length);
    await waitG(admin, () => !S.game.intro && C.isRunning(S.game), null, 9000);
    // admin jokeri (telefonsuz sınıf 2)
    await act(admin, 'jkAsk', { i: 2, j: 'x2' }); await act(admin, 'jkYes');
    await waitG(admin, () => S.game.intro);
    check('admin telefonsuz sınıf için joker kullandı', (await G(admin)).jokers[T2].x2 != null);
    await waitG(admin, () => !S.game.intro && C.isRunning(S.game), null, 9000);
    // B iki şık seçip gönderir (C doğru)
    await phB.waitForSelector('[data-pl="pick-opt"]:not([disabled])');
    await pl(phB, 'pick-opt', { v: 'A' }); await pl(phB, 'pick-opt', { v: 'C' }); await pl(phB, 'send');
    // telefon kopması: C kapanır, yarışma durmaz
    await phC.close();
    await sleep(1500);
    check('tek telefonun kopması yarışmayı durdurmaz', await admin.evaluate(() => C.isRunning(S.game)));
    // sahne kaybı
    await stage.close();
    await waitG(admin, () => S.game.clock.reasons.includes('stage'), null, 8000);
    gA = await G(admin);
    check('sahne kaybında süre ve cevap kabulü durdu', gA.clock.runAt === null && gA.clock.reasons.includes('admin'));
    kv = await waitKv(pin, st => st.paused && st.paused.includes('stage'));
    check('telefona sahne duraklaması yayımlandı', kv.st.open === false && kv.st.paused.includes('stage'));
    await shot(admin, 'admin-sahne-kaybi-1366', 1366, 900);
    const leftLost = gA.clock.left;
    const popup2 = new Promise(r => admin.once('popup', r));
    await act(admin, 'openStage');
    const stage2 = await popup2; watch(stage2, 'sahne2');
    await stage2.setViewport({ width: 1920, height: 1080 });
    await stage2.evaluate(() => { window.__played = []; const p = StageAudio.play; StageAudio.play = k => { window.__played.push(k); return p(k); }; });
    await clickSel(stage2, '#snd-on');
    await waitG(admin, () => !S.game.clock.reasons.includes('stage'), null, 8000);
    gA = await G(admin);
    check('sahne dönünce aynı soru/kalan süre; devam admin onayında', gA.clock.runAt === null && gA.clock.reasons.join() === 'admin' && gA.clock.left === leftLost);
    await sleep(800);
    check('yeniden açılan sahne eski sesleri çalmadı', await stage2.evaluate(() => !window.__played.includes('joker')));
    await act(admin, 'resume');
    await waitG(admin, () => C.isRunning(S.game));
    // ara: karşılamaya dönüş süreyi ve cevap kabulünü durdurur; dönüş yarışmayı bitirmez, devam admin onayında
    const leftBefore = await admin.evaluate(() => C.clockLeft(S.game.clock, nowS()));
    await act(admin, 'welcome');
    gA = await G(admin);
    check('ara: karşılamaya dönüşte süre durdu (break + admin)', gA.clock.runAt === null && gA.clock.reasons.includes('break') && gA.clock.reasons.includes('admin') && gA.brk === true);
    await waitKv(pin, st => st.brk === true);
    await phB.waitForFunction(() => document.body.innerText.includes('Ara verildi'), { timeout: 8000 });
    await shot(phB, 'telefon-ara-390'); await sleep(300); await shot(stage2, 'sahne-ara-karsilama-1920');
    await act(admin, 'begin');
    gA = await G(admin);
    check('ara dönüşü: yarışma bitmedi, aynı soru, kalan süre korundu, devam admin onayında', gA.view === 'question' && gA.phase === 'open' && gA.clock.runAt === null && gA.clock.reasons.join() === 'admin' && Math.abs(gA.clock.left - leftBefore) < 1500);
    await act(admin, 'resume');
    await waitG(admin, () => C.isRunning(S.game));
    // C yeniden bağlanır: haklar geri gelir
    const phC2 = await ctxC.newPage(); watch(phC2, 'telefonC2');
    await phC2.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
    await phC2.goto(BASE + '/katil');
    await phC2.waitForSelector('.ph-jleft, .ph-jbar', { timeout: 15000 });
    check('telefon yeniden bağlandı: kullanılan jokerler mühürlü', await phC2.evaluate(() => { const k = plJk(); return k[0] === 1 && k[1] === 1; }));
    await pl(phC2, 'pick-opt', { v: 'C' }); await pl(phC2, 'send');
    await sleep(900);
    // telefonsuz sınıf 5 adına süre içinde gönderilip açıklamayla aynı anda ulaşan cevap
    const kvLate = await kvState(pin);
    const lateWrite = api({ fn:'set', pin, path:`answers/${kvLate.st.qk}/5/sGEC`, value:{ v:'C', t: kvLate.t, dev:'gec-telefon' } });
    await act(admin, 'revealAsk'); await act(admin, 'revealYes'); await lateWrite;
    await waitG(admin, () => { const f = S.game.frozen[currentQk()] || {}; return !!f[5]; }, null, 6000).catch(() => {});
    check('süre içinde gönderilip geç ulaşan cevap açıklamadan sonra da sayılır', !!((await G(admin)).frozen[kvLate.st.qk] || {})[5]);
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    gA = await G(admin);
    check('Soru 4: Çift Cevap +10, admin jokeri cevapsız (0 puan → 0), normal doğru +10, geç ulaşan doğru +10', gA.teams.s1[0].score === 20 && gA.teams.s1[1].score === 20 && gA.last.delta[2] === 0 && gA.last.delta[5] === 10, JSON.stringify(gA.last.delta));
    check('sahne ses: joker sesi tanıtım başına bir kez çaldı (gruplu tanıtım tek ses)', nPlayed === nJokerEv && nJokerEv === 4, nPlayed + '/' + nJokerEv);
    check('sahne host kilidi ya da API isteği yapmadı', stageApi.length === 0, stageApi.join(','));
    check('admin ve telefon ses üretmez (StageAudio yalnız sahnede)', await phB.evaluate(() => typeof window.__played === 'undefined'));

    /* ---------- etap sonu, eşitlik, final ---------- */
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    await shot(stage2, 'sahne-etap-sonu-1920');
    await act(admin, 'advance');
    await act(admin, 'startStage');
    for (let k = 0; k < 2; k++){ await act(admin, 'showQ'); await act(admin, 'revealAsk'); await act(admin, 'revealYes'); await act(admin, 'showScores'); await act(admin, 'next'); }
    await waitG(admin, () => S.game.view === 'stageEnd');
    gA = await G(admin);
    check('2. etapta herkes 0 → eşitlik', gA.result.tie && gA.result.tie.candidates.length === 5);
    await act(admin, 'startTie');
    await waitG(admin, () => S.game.view === 'tie' && S.game.phase === 'ready');
    check('eşitlik sorusunda joker yok', (await kvState(pin)).st.jk.every(x => x[0] !== 2 && x[1] !== 2) && !(await admin.$('[data-act="jkAsk"]:not([disabled])')));
    await act(admin, 'showQ'); await sleep(400); await shot(stage2, 'sahne-esitlik-1920');
    await act(admin, 'revealAsk'); await act(admin, 'revealYes');
    await admin.evaluate(() => { S.game.tie.candidates.forEach((i, k) => ui.guesses[i] = String(8000 + k * 200)); render(); });
    await act(admin, 'resolveTie');
    await waitG(admin, () => S.game.view === 'stageEnd' && !S.game.result.tie);
    await act(admin, 'advance');
    await waitG(admin, () => S.game.view === 'teams' && S.game.stage === 2);
    gA = await G(admin);
    check('finale 4 sınıf çıktı', gA.teams.final.length === 4);
    await act(admin, 'startStage');
    kv = await kvState(pin);
    const iB = kv.st.teams.indexOf(T0), iC = kv.st.teams.indexOf(T1);
    check('finalde haklar korunur: C iki jokeri de kullanmış, B Çifte Puanı (iade edilen) kullanabilir', iB >= 0 && iC >= 0 && kv.st.jk[iC].join() === '1,1' && kv.st.jk[iB].join() === '1,0', JSON.stringify(kv.st.jk));
    await act(admin, 'showQ');
    await phB.waitForSelector('[data-pl="jkAsk"][data-j="x2"]:not([disabled])');
    await pl(phB, 'jkAsk', { j: 'x2' }); await pl(phB, 'jkYes');
    await waitG(admin, () => !S.game.intro && C.isRunning(S.game), null, 9000);
    await phB.waitForSelector('[data-pl="pick-opt"]:not([disabled])');
    await pl(phB, 'pick-opt', { v: 'C' }); await pl(phB, 'send'); await sleep(900);
    await shot(phB, 'telefon-cifte-puan-390');
    await act(admin, 'revealAsk'); await act(admin, 'revealYes'); await act(admin, 'showScores');
    gA = await G(admin);
    check('Final: Çifte Puan doğru +20', gA.last.delta[iB] === 20, JSON.stringify(gA.last.delta));
    await shot(phB, 'telefon-sonuc-390');
    await act(admin, 'next'); await act(admin, 'showQ'); await act(admin, 'revealAsk'); await act(admin, 'revealYes'); await act(admin, 'showScores'); await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    await act(admin, 'advance');
    await waitG(admin, () => S.game.view === 'champion');
    await sleep(800);
    await shot(stage2, 'sahne-sampiyon-1920');
    check('şampiyonluk sahnede', (await textOf(stage2)).includes('ŞAMPİYON'));
    await shot(phB, 'telefon-sampiyon-390');

    /* ---------- karşılamaya dönüş (ara) ---------- */
    await act(admin, 'welcome');
    await sleep(800);
    await shot(stage2, 'sahne-karsilama-1920');
    for (const [w, h] of [[1366, 768], [1024, 768]]) await shot(stage2, `sahne-karsilama-${w}x${h}`, w, h);
    const fit = await stage2.evaluate(() => { const c = document.querySelector('.sg-credits'); const r = c.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth && [...c.querySelectorAll('li')].every(li => li.scrollWidth <= li.clientWidth + 1); });
    check('künye 1024×768 (4:3) projeksiyonda kırpılmıyor', fit);
    await stage2.setViewport({ width: 1920, height: 1080 });

    /* ---------- eski kayıt göçü, yedek, 13 sınıf ve uzun adlar ---------- */
    const ctxM = await browser.createBrowserContext();
    const old = await ctxM.newPage(); watch(old, 'eski-kayit');
    await old.goto(BASE + '/index.html');
    await old.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('kaplan-arena-v1', JSON.stringify({ settings:{ title:'Eski Yarışma', seconds:30, sound:true, classes:['9-A Fen', '9-B Sosyal', '10-A', '10-B', '11-Fen Bilimleri Lisesi Hazırlık A', '11-B', '12-A', '12-B', '12-C', '9-C', '9-D', '10-C', '10-D'], lanIp:'' },
        questions:{ s1:[{ id:'q1', type:'ders', subject:'Türkçe', text:'Eski soru', options:['a','b','c','d'], answer:'A' }], s2:[], final:[], tie:[] },
        game:{ started:true, finished:false, pin:'123456', view:'question', stage:0, shown:true, revealed:false, qIndex:0, teams:{ s1:[{ name:'9-A Fen', score:30 }], s2:[], final:[] }, history:[], draw:null, qualified:{ s1:[], s2:[] } } }));
    });
    await old.reload(); await old.waitForSelector('[data-act="begin"]');
    const mig = await old.evaluate(() => ({ schema:S.schema, title:S.settings.title, q:S.questions.s1[0].text, score:S.game.teams.s1[0].score, phase:S.game.phase, reasons:S.game.clock.reasons, em:Object.keys(S.settings.emblems).length, backup:!!localStorage.getItem('kaplan-arena-v1-yedek-sema1') }));
    check('eski kayıt göçü: veri korunur, şema 2, yedek kopya', mig.schema === 2 && mig.title === 'Eski Yarışma' && mig.q === 'Eski soru' && mig.score === 30 && mig.phase === 'open' && mig.reasons.includes('admin') && mig.em === 13 && mig.backup, JSON.stringify(mig));
    const exp = await old.evaluate(() => { ACT.exportData(); const o = JSON.parse(ui.backup); return { v:o.version, em:Object.keys(o.settings.emblems).length }; });
    check('yedek dışa aktarma arma eşleşmesini içerir', exp.v === 2 && exp.em === 13);
    const imp = await old.evaluate(() => { const before = JSON.stringify(S.settings.emblems); ui.importText = ui.backup; ACT.importYes(); return before === JSON.stringify(S.settings.emblems) && S.questions.s1[0].text === 'Eski soru'; });
    check('yedek içe aktarma arma eşleşmelerini değiştirmez', imp);
    await old.evaluate(async () => { S.game.finished = true; save(); try{ await lockReq('release'); }catch(e){} });
    await old.close();
    const ctxL = await browser.createBrowserContext();
    const lng = await ctxL.newPage(); watch(lng, 'uzun-adlar');
    await lng.setViewport({ width: 1366, height: 900 });
    await lng.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await lng.goto(BASE + '/');
    await lng.evaluate(() => { S.settings.classes = ['9-A Fen', '9-B Sosyal', '10-A', '10-B', '11-Fen Bilimleri Lisesi Hazırlık A', '11-B', '12-A', '12-B', '12-C', '9-C', '9-D', '10-C', '10-D']; syncEmblems(); save(); });
    await act(lng, 'begin');
    const popL = new Promise(r => lng.once('popup', r));
    await act(lng, 'openStage');
    const stL = await popL; await clickSel(stL, '#snd-off');
    for (const [w, h] of [[1920, 1080], [1366, 768], [1024, 768]]) await shot(stL, `sahne-harita-13-sinif-${w}x${h}`, w, h);
    const emb = await lng.evaluate(() => { const a = JSON.stringify(S.settings.emblems); S.settings.classes.push('Yeni Sınıf'); syncEmblems(); const b = S.settings.emblems; return Object.keys(JSON.parse(a)).every(k => JSON.parse(a)[k] === b[k]) && b['Yeni Sınıf'] === 13; });
    check('yeni sınıf eklemek mevcut armaları değiştirmez; 14. sınıf arma alır', emb);
    await act(lng, 'newGameYes').catch(() => {});
    await sleep(500);
    const blockedLong = await lng.evaluate(() => LOCK.state);
    if (blockedLong !== 'other'){
      await act(lng, 'drawGo'); await waitG(lng, () => S.game.draw && ui.drawShown == null); await act(lng, 'drawOk');
      await sleep(600);
      for (const [w, h] of [[1920, 1080], [1024, 768]]) await shot(stL, `sahne-katilim-uzun-ad-${w}x${h}`, w, h);
      await act(lng, 'startStage'); await act(lng, 'showQ'); await sleep(500);
      for (const [w, h] of [[1366, 768], [1024, 768]]) await shot(stL, `sahne-soru-7-sinif-${w}x${h}`, w, h);
      await act(lng, 'revealAsk'); await act(lng, 'revealYes');
      await lng.evaluate(() => { ui.guesses[0] = '1300'; ui.guesses[4] = '1400'; render(); });
      await act(lng, 'showScores'); await sleep(500);
      for (const [w, h] of [[1366, 768], [1024, 768]]) await shot(stL, `sahne-puan-tablosu-${w}x${h}`, w, h);
      await shot(lng, 'admin-puan-ekrani-1366', 1366, 900);
      await act(lng, 'manage'); await shot(lng, 'admin-soru-yonetimi-1366', 1366, 900);
      await act(lng, 'settings'); await shot(lng, 'admin-ayarlar-1366', 1366, 900);
      await act(lng, 'menu'); await act(lng, 'endAsk'); await act(lng, 'endYes');
      await sleep(600); await shot(stL, 'sahne-erken-bitis-1920', 1920, 1080);
      check('erken bitiş sahnede', (await textOf(stL)).includes('Yarışma Sona Erdi'));
      const overflow = await stL.evaluate(() => document.querySelector('.sg-frame').scrollHeight <= innerHeight + 2 && document.documentElement.scrollWidth <= innerWidth);
      check('uzun adlı sınıflarla 4:3 sahnede kaydırma/taşma yok', overflow);
    } else check('uzun ad testi: tek yarışma kilidi beklendiği gibi ikinci yarışmayı engelledi', true);
    check('tarayıcı sayfa hatası yok', errors.length === 0, errors.slice(0, 6).join(' | '));
  }catch(e){
    check('senaryo istisnasız tamamlandı', false, e.stack || e.message);
  }finally{
    fs.writeFileSync(path.join(__dirname, 'son-rapor.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
    const fail = results.filter(r => !r.ok).length;
    console.log(`\n${results.length - fail}/${results.length} kontrol geçti`);
    await browser.close(); srv.close();
    process.exit(fail ? 1 : 0);
  }
})();
