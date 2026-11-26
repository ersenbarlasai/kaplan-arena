// Kaplan Arena — eleme yarışması uçtan uca testi (format v3): dört takım 4 → 3 → 2 → şampiyon, karışık tekrarsız sorular,
// kaptan kodlu katılım, elenen takımın geri dönememesi (UI + doğrudan API), tur sonu gösterisi ve şampiyonluk müziği/konfetisi.
// Gerçek admin + ayrı sahne penceresi + dört telefon. Canlı Redis/Vercel kullanılmaz (tests/e2e/server.js bellek kipi).
// Çalıştırma: NODE_PATH=<puppeteer-core node_modules> node tests/e2e/eleme.js
const path = require('path'), fs = require('fs');
const puppeteer = require('puppeteer-core');
const { start } = require('./server.js');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'tasarim', 'ekran-goruntuleri', 'eleme');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 3094, BASE = `http://localhost:${PORT}`;
const TEAMS = ['Takım A', 'Takım B', 'Takım C', 'Takım D'];
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail){ results.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail != null && !ok ? ' :: ' + detail : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(body){ const r = await fetch(BASE + '/api/ka', { method:'POST', body:JSON.stringify(body) }); let j = null; try{ j = await r.json(); }catch(e){} return { code:r.status, j }; }
async function rows(pin){ return (await api({ fn:'get', pins:[pin], since:0 })).j.rows; }
async function kvState(pin){ const rs = await rows(pin), row = rs.find(r => r.p === 'state'); return row ? row.v : null; }
async function clickSel(page, sel){
  await page.waitForSelector(sel, { timeout: 15000 });
  for (let k = 0; k < 20; k++){
    const ok = await page.evaluate(q => { const el = document.querySelector(q); if (!el) return false; el.click(); return true; }, sel);
    if (ok){ await sleep(220); return; }
    await sleep(100);
  }
  throw new Error('tıklanamadı: ' + sel);
}
const selOf = (attr, name, data) => `[data-${attr}="${name}"]${data ? Object.entries(data).map(([k, v]) => `[data-${k}="${v}"]`).join('') : ''}:not([disabled])`;
async function act(page, name, data){
  if (name === 'openStage'){ const s = selOf('act', name, data); await page.waitForSelector(s); await page.click(s); return sleep(300); }
  return clickSel(page, selOf('act', name, data));
}
const pl = (page, name, data) => clickSel(page, selOf('pl', name, data));
const G = page => page.evaluate(() => JSON.parse(JSON.stringify(S.game)));
const scores = page => page.evaluate(() => curTeams().map(t => t.score));
const waitG = (page, fn, arg, timeout) => page.waitForFunction(fn, { timeout: timeout || 20000, polling: 100 }, arg);
async function shot(page, name, w, h){ if (w) await page.setViewport({ width:w, height:h }); await sleep(450); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }
const textOf = page => page.evaluate(() => document.body.innerText);
async function hookAudio(st){ await st.evaluate(() => { window.__snd = []; const p = StageAudio.play; StageAudio.play = k => { const ok = p(k); window.__snd.push({ k, ok }); return ok; }; }); }
const played = (st, k) => st.evaluate(kind => (window.__snd || []).filter(x => x.k === kind && x.ok).length, k);
async function typeIn(page, id, val){ await page.waitForSelector('#' + id); await page.evaluate((i, v) => { const el = document.getElementById(i); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, id, val); await sleep(80); }
async function joinTeam(ph, tid, code){
  await ph.waitForSelector(`[data-pl="pickElim"][data-id="${tid}"]`, { timeout: 15000 });
  await pl(ph, 'pickElim', { id: tid });
  await typeIn(ph, 'pl-code', code);
  await pl(ph, 'codeYes');
}
async function reveal(admin){
  await act(admin, 'revealAsk');
  if (await admin.$('[data-act="revealYes"]')) await act(admin, 'revealYes');
  await waitG(admin, () => S.game.phase === 'revealed');
}

(async () => {
  const srv = await start(PORT);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--disable-features=Translate'] });
  const errors = [];
  const watch = (p, tag) => { p.on('pageerror', e => errors.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource|40[139]|429/.test(m.text())) errors.push(tag + ': ' + m.text()); }); };
  try{
    const admin = await (await browser.createBrowserContext()).newPage(); watch(admin, 'admin');
    await admin.setViewport({ width: 1366, height: 768 });
    await admin.goto(BASE + '/');
    await admin.waitForSelector('[data-act="begin"]');
    // Test soru seti (gerçek okul verisi değil). s2'nin ilk sorusu s1'deki bir sorunun farklı kimlikli/biçimli kopyası.
    await admin.evaluate(teams => {
      const D = (s, t, o, a) => ({ id: uid(), type:'ders', subject:s, text:t, options:o, answer:a });
      const T = (t, a, u) => ({ id: uid(), type:'tahmin', text:t, answer:a, unit:u || '' });
      S.questions = {
        s1: [D('Matematik', 'İki artı iki kaç eder?', ['4', '5', '6', '7'], 'A'), D('Fen Bilimleri', 'Suyun formülü nedir?', ['CO2', 'H2O', 'O2', 'NaCl'], 'B'), D('Türkçe', 'Çalıkuşu romanının yazarı kimdir?', ['Ömer Seyfettin', 'Halide Edib', 'Reşat Nuri Güntekin', 'Yakup Kadri'], 'C')],
        s2: [D('Matematik', '  iki ARTI  iki kaç eder ', ['7', '6', '5', '4'], 'D'), D('Sosyal Bilimler', 'Cumhuriyet hangi yıl ilan edildi?', ['1920', '1923', '1919', '1938'], 'B'), D('Spor', 'Voleybolda takım en fazla kaç dokunuşla topu karşıya geçirir?', ['2', '4', '3', '6'], 'C')],
        final: [D('Fen Bilimleri', 'Atom numarası 26 olan element?', ['Bakır', 'Demir', 'Çinko', 'Nikel'], 'B'), D('Türkçe', 'Safahat kimin eseridir?', ['Mehmet Akif Ersoy', 'Necip Fazıl', 'Ziya Paşa', 'Namık Kemal'], 'A')],
        tie: [T('Everest kaç metredir?', 8849, 'm'), T('Türkiye kaç ilden oluşur?', 81, ''), T('everest KAÇ metredir', 8849, 'm')]
      };
      S.settings.classes = teams; S.settings.seconds = 40; save();
    }, TEAMS);
    await act(admin, 'begin');
    const menuTxt = await textOf(admin);
    check('menü: yeni yarışma kuralı 4 → 3 → 2 → şampiyon ve kontenjanlar başlatmadan önce görünür', /4 → 3 → 2 → şampiyon/.test(menuTxt) && /ilk 3/.test(menuTxt) && /ilk 2/.test(menuTxt), menuTxt.slice(0, 700));
    check('menü: eski iki grup / dört finalist ifadesi yok', !/İki Gruplu|4 sınıf · |kura ile iki/.test(menuTxt), menuTxt.slice(0, 500));
    await shot(admin, 'admin-menu-eleme-1366', 1366, 768);

    await act(admin, 'newGameYes');
    await waitG(admin, () => S.game.started && S.game.mode === 'elim');
    let g = await G(admin);
    const pin = g.pin;
    check('başlatma: format v3 kayda sabitlendi (kontenjan 3/2/1), kararlı teamId', g.format.v === 3 && JSON.stringify(g.format.quotas) === '[3,2,1]' && g.teams.all.map(t => t.id).join() === 't1,t2,t3,t4', JSON.stringify({ f:g.format, ids:g.teams.all.map(t => t.id) }));
    check('başlatma: iki grup/kura yok; dört takım aynı ilk turda', g.view === 'teams' && !g.draw && g.rounds[0].ids.length === 4 && !(g.teams.s1 || []).length, JSON.stringify(g.rounds));
    const allCids = ['s1', 's2', 'final', 'tie'].flatMap(k => g.plan[k].map(q => q.cid));
    check('soru planı: farklı kimlikli aynı içerik (s1↔s2, tie↔tie) elendi; yarışma çapında benzersiz', g.planDups === 2 && g.plan.s2.length === 2 && g.plan.tie.length === 2 && new Set(allCids).size === allCids.length, JSON.stringify({ d:g.planDups, s2:g.plan.s2.length, tie:g.plan.tie.length }));
    check('soru planı: asked kaydı yeni yarışmada boş başlar', Object.keys(g.asked).length === 0);
    // Ayar değişikliği açık yarışmayı etkilemez
    await admin.evaluate(() => { S.settings.classes = ['X', 'Y', 'Z']; S.questions.s1.push({ id: uid(), type:'ders', subject:'Spor', text:'Yeni soru', options:['a', 'b', 'c', 'd'], answer:'A' }); save(); });
    g = await G(admin);
    check('ayar/soru bankası değişikliği açık yarışmanın kadrosunu ve sırasını değiştirmez', g.teams.all.length === 4 && g.plan.s1.length === 3, JSON.stringify({ n:g.teams.all.length, s1:g.plan.s1.length }));
    await admin.evaluate(t => { S.settings.classes = t; save(); }, TEAMS);
    const codes = g.codes;

    // Sunucuda gizli alanlar herkese açık değil
    let all = JSON.stringify(await rows(pin));
    check('herkese açık GET: kaptan kodları ve admin anahtarı yok', !Object.values(codes).some(c => all.includes('"' + c + '"')) && !all.includes(g.akey), '');

    const popupP = new Promise(res => admin.once('popup', res));
    await act(admin, 'openStage');
    const stage = await popupP; watch(stage, 'sahne');
    await stage.setViewport({ width: 1920, height: 1080 });
    await stage.waitForSelector('#snd-on'); await clickSel(stage, '#snd-on'); await sleep(1500);
    await waitG(admin, () => StageHost.count() > 0);
    await hookAudio(stage);

    // Telefonlar: dört takım, kaptan koduyla
    const ph = {}, ctxs = {};
    const vps = { t1:{ width:390, height:844 }, t2:{ width:360, height:780 }, t3:{ width:412, height:915 }, t4:{ width:360, height:780 } };
    for (const tid of ['t1', 't2', 't3', 't4']){
      ctxs[tid] = await browser.createBrowserContext(); const p = await ctxs[tid].newPage(); watch(p, 'tel-' + tid);
      await p.setViewport(Object.assign({ isMobile:true, hasTouch:true }, vps[tid]));
      await p.goto(`${BASE}/kaplan-arena.html?pin=${pin}`);
      ph[tid] = p;
    }
    await joinTeam(ph.t1, 't1', '0000');
    await ph.t1.waitForFunction(() => /yanlış/.test(document.body.innerText), { timeout: 8000 });
    check('telefon: yanlış kaptan kodu reddedilir', true);
    await shot(ph.t1, 'telefon-kaptan-kodu-yanlis-390');
    await typeIn(ph.t1, 'pl-code', codes.t1); await pl(ph.t1, 'codeYes');
    for (const tid of ['t2', 't3', 't4']) await joinTeam(ph[tid], tid, codes[tid]);
    await waitG(admin, () => ['t1', 't2', 't3', 't4'].every(t => NET.joined && NET.joined[t]));
    check('dört kaptan telefonu kendi kodlarıyla bağlandı', true);
    // Aynı cihaz başka takımı seçip o takımın kodunu girse de geçemez (ele geçirme)
    let r = await api({ fn:'join', pin, tid:'t2', code:codes.t2, dev:await ph.t1.evaluate(() => P.dev) });
    check('API: bağlı cihaz başka takımın adını seçerek geçemez', r.code === 409, JSON.stringify(r));
    await shot(admin, 'admin-katilim-kaptan-kodlari-1366', 1366, 768);

    /* ---------- Orman Geçidi: dört takım aynı sorularla ---------- */
    await act(admin, 'startStage');
    const active = () => admin.evaluate(() => curTeams().map(t => t.id));
    const qTexts = [];
    async function playQ(correct, opts){
      opts = opts || {};
      await act(admin, 'showQ');
      const ids = await active();
      await Promise.all(ids.map(t => ph[t].waitForSelector('[data-pl="pick-opt"]:not([disabled])', { timeout: 15000 })));
      const q = await admin.evaluate(() => ({ text:curQ().text, ans:curQ().answer, cid:curQ().cid }));
      qTexts.push(q);
      const tx = await Promise.all(ids.map(t => textOf(ph[t])));
      if (opts.sameCheck) check('aktif takımların hepsi aynı soruyu aynı anda görür', tx.every(x => x.includes(q.text.trim())), q.text);
      if (opts.joker){ await pl(ph[opts.joker], 'jkAsk', { j:'x2' }); await pl(ph[opts.joker], 'jkYes'); await waitG(admin, () => !!S.game.intro, null, 8000); await waitG(admin, () => !S.game.intro && C.isRunning(S.game), null, 9000); }
      const wrong = q.ans === 'A' ? 'B' : 'A';
      for (const t of ids){ await ph[t].waitForSelector('[data-pl="pick-opt"]:not([disabled])'); await pl(ph[t], 'pick-opt', { v: correct.includes(t) ? q.ans : wrong }); await pl(ph[t], 'send'); }
      await waitG(admin, () => curTeams().every((t, i) => !!liveAccepted(i)), null, 10000);
      await reveal(admin);
      await act(admin, 'showScores');
      await waitG(admin, () => S.game.view === 'scoreboard');
      return q;
    }
    await playQ(['t1', 't2'], { sameCheck:true, joker:'t1' });
    g = await G(admin);
    check('soru gösterilince tüketildi (asked)', Object.keys(g.asked).length === 1 && g.asked[qTexts[0].cid]);
    await act(admin, 'next');
    await playQ(['t1', 't2', 't3']);
    await act(admin, 'next');
    await playQ(['t2', 't3']);
    check('Orman toplamları: A 30, B 30, C 20, D 0', JSON.stringify(await scores(admin)) === '[30,30,20,0]', JSON.stringify(await scores(admin)));
    // Undo: puan düzeltmesi geri alınabilir; sorulmuş kayıt geri gitmez, tekrar puanlama tek kez
    const askedBefore = Object.keys((await G(admin)).asked).length;
    await act(admin, 'undo');
    g = await G(admin);
    check('geri al: son puan geri alındı, asked geri gitmedi', g.phase === 'revealed' && Object.keys(g.asked).length === askedBefore && JSON.stringify(await scores(admin)) === '[30,20,10,0]', JSON.stringify({ ph:g.phase, a:Object.keys(g.asked).length, sc:await scores(admin) }));
    await act(admin, 'showScores'); await waitG(admin, () => S.game.view === 'scoreboard');
    await act(admin, 'showScores').catch(() => {});
    check('aynı soru ikinci kez puanlanmaz', JSON.stringify(await scores(admin)) === '[30,30,20,0]', JSON.stringify(await scores(admin)));
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    g = await G(admin);
    check('Orman sonu: sonuç kesin (eşitlik yok) ama açıklanmadı; eleme henüz yazılmadı', g.result && !g.result.tie && !g.result.revealed && !g.rounds[0].done, JSON.stringify(g.result));
    await sleep(600);
    let stTxt = await textOf(stage);
    check('sahne: açıklamadan önce elenen/yükselen ilan edilmez', /Tur tamamlandı/.test(stTxt) && !/Elendi|TURUN KAZANANI|ORTAK KAZANAN/i.test(stTxt), stTxt.slice(0, 300));
    let kv = await kvState(pin);
    check('telefon durumu: açıklamadan önce yükselen listesi gönderilmez', kv.view === 'stageEnd' && !kv.qualified && !(kv.rnd && kv.rnd.up), JSON.stringify(kv.rnd));
    // Çift tıklama: iki açıklama komutu tek eleme
    await admin.evaluate(() => { ACT.revealRound(); ACT.revealRound(); });
    await sleep(500);
    g = await G(admin);
    check('tur sonucu idempotent: çift komut tek eleme (D), elenme kalıcı', g.elimLog.length === 1 && g.elimLog[0].id === 't4' && g.teams.all[3].status === 'out' && g.result.revealed, JSON.stringify(g.elimLog));
    check('tur kazananı net kazançtan: A ve B ortak kazanan', JSON.stringify(g.rounds[0].done.winners) === '["t1","t2"]', JSON.stringify(g.rounds[0].done));
    await stage.waitForSelector('.sg-show[data-show]');
    const showId = g.show.id;
    await sleep(1800);
    await shot(stage, 'sahne-tur-sonu-gosteri-orta-1920');
    stTxt = await textOf(stage);
    check('sahne gösterisi: “Turun ortak kazananları”, puan özeti, yükselen/elenen satırları', /TURUN ORTAK KAZANANLARI/.test(stTxt) && /Takım A/.test(stTxt) && /toplam/i.test(stTxt) && /Elendi/.test(stTxt) && /Kadim Kale/.test(stTxt), stTxt.slice(0, 500));
    check('tur gösterisi sesi bir kez çaldı', (await played(stage, 'roundEnd')) === 1, await played(stage, 'roundEnd'));
    // Sahne yenilenir: gösteri baştan başlamaz, ses tekrar çalmaz
    await stage.reload(); await stage.waitForSelector('#snd-on'); await clickSel(stage, '#snd-on'); await hookAudio(stage);
    await stage.waitForSelector('.sg-show[data-show]');
    await sleep(400);
    const t0 = await stage.evaluate(() => { const e = document.querySelector('.sg-show'); return { t0:e.style.getPropertyValue('--t0'), done:e.classList.contains('done') }; });
    check('sahne yenilenince gösteri kaldığı yerden (negatif zaman kayması) ya da son görünümden sürer', t0.done || parseInt(t0.t0, 10) < -2000, JSON.stringify(t0));
    await sleep(1500);
    check('yeniden bağlanan sahne tur gösterisi sesini tekrar çalmaz', (await played(stage, 'roundEnd')) === 0);
    // Gösteri bittikten sonra ekran bekler; soru açılmaz, tur geçmez
    await sleep(3000);   // gösteri süresi (7 sn) kesin dolsun
    g = await G(admin);
    check('gösteri otomatik soru açmaz / tura geçmez', g.view === 'stageEnd' && g.stage === 0 && !C_isRunning(g), JSON.stringify({ v:g.view, s:g.stage }));
    await shot(stage, 'sahne-tur-sonu-son-tablo-1920');
    await shot(admin, 'admin-tur-sonu-1366', 1366, 768);
    // Tekrar oynat: yeni olay, puan/eleme değişmez
    await act(admin, 'showReplay');
    g = await G(admin);
    check('gösteriyi tekrar oynat: yeni olay kimliği, eleme/puan aynı', g.show.id !== showId && g.elimLog.length === 1 && JSON.stringify(await scores(admin)) === '[30,30,20,0]');
    await sleep(500);
    check('tekrar oynatma sesi bir kez', (await played(stage, 'roundEnd')) === 1);
    await act(admin, 'showSkip');
    await stage.waitForSelector('.sg-show.done');
    check('Atla: son sonuç doğrudan görünür', true);

    /* ---------- elenen takım: telefon, yeniden giriş, başka takım, doğrudan API ---------- */
    await ph.t4.waitForFunction(() => /Bu turda elendiniz/.test(document.body.innerText), { timeout: 10000 });
    check('elenen telefon “Bu turda elendiniz; yarışmaya devam edemezsiniz” görür', /devam edemezsiniz/.test(await textOf(ph.t4)));
    await shot(ph.t4, 'telefon-elendiniz-360');
    await ph.t1.waitForFunction(() => /YÜKSELDİNİZ|Yola devam/.test(document.body.innerText), { timeout: 10000 });
    check('yükselen telefon sonucu ve tur kazananını görür', /Turun ortak kazananları/.test(await textOf(ph.t1)));
    await shot(ph.t1, 'telefon-tur-sonucu-390');
    const tokD = await ph.t4.evaluate(() => JSON.parse(localStorage.getItem('ka-player')).tok);
    const devD = await ph.t4.evaluate(() => P.dev);
    await act(admin, 'advance'); await admin.evaluate(() => ACT.advance());   // çift tıklama
    await waitG(admin, () => S.game.view === 'teams' && S.game.stage === 1);
    g = await G(admin);
    check('sonraki tura geçiş idempotent: Kadim Kale kadrosu A, B, C (D yok)', g.rounds.length === 2 && JSON.stringify(g.rounds[1].ids) === '["t1","t2","t3"]', JSON.stringify(g.rounds[1]));
    kv = await kvState(pin);
    check('telefon durumu: aktif kadroda elenen yok', kv.ids.join() === 't1,t2,t3' && kv.out.t4, JSON.stringify({ ids:kv.ids, out:kv.out }));
    await ph.t4.reload(); await sleep(1500);
    check('elenen telefon sayfayı yenileyince de elenmiş kalır', /Bu turda elendiniz/.test(await textOf(ph.t4)));
    r = await api({ fn:'join', pin, tid:'t4', tok:tokD, dev:devD });
    check('API: elenen takım kayıtlı oturumla geri katılamaz', r.code === 403 && r.j.out === true, JSON.stringify(r));
    r = await api({ fn:'join', pin, tid:'t4', code:codes.t4, dev:'yeniCihaz123' });
    check('API: elenen takım yeni cihazla kodu girse de katılamaz', r.code === 403, JSON.stringify(r));
    r = await api({ fn:'join', pin, tid:'t2', code:codes.t2, dev:devD });
    check('API: elenen cihaz aktif takımın adını/kodunu kullanarak kaptanlığı ele geçiremez', r.code === 409, JSON.stringify(r));
    r = await api({ fn:'join', pin, tid:'t2', code:'1234', dev:'yeniCihaz999' });
    check('API: yeni cihaz aktif takıma yanlış kodla giremez', r.code === 403 || r.code === 409, JSON.stringify(r));
    const newD = await (await browser.createBrowserContext()).newPage(); watch(newD, 'yeni-cihaz');
    await newD.setViewport({ width:360, height:780, isMobile:true, hasTouch:true });
    await newD.goto(`${BASE}/kaplan-arena.html?pin=${pin}`);
    await newD.waitForSelector('[data-pl="pickElim"]');
    const listIds = await newD.$$eval('[data-pl="pickElim"]', b => b.map(x => x.dataset.id));
    check('yeni cihazın takım listesinde elenen takım yok', listIds.join() === 't1,t2,t3', listIds.join());

    /* ---------- Kadim Kale: sınır eşitliği ---------- */
    await act(admin, 'startStage');
    // eski turdan kalan sorunun (s1) anahtarıyla gecikmiş yazım reddedilir
    const tokA = await ph.t1.evaluate(() => P.tok);
    await playQ(['t1', 't3']);
    r = await api({ fn:'cmd', pin, tok:tokD, op:'ans', qk:(await G(admin)).last.qk, v:'A', t:Date.now() });
    check('API: elenen takımın eski oturumu cevap gönderemez', r.code === 403 && r.j.out === true, JSON.stringify(r));
    r = await api({ fn:'cmd', pin, tok:tokA, op:'ans', qk:qTexts[0].cid ? 's1_0_eski' : 'x', v:'A', t:Date.now() });
    check('API: önceki turdan gecikmiş/yanlış soru anahtarlı yazım reddedilir', r.code === 409, JSON.stringify(r));
    r = await api({ fn:'set', pin, path:`answers/${(await G(admin)).last.qk}/t4/sHACK`, value:{ v:'A', t:Date.now(), dev:devD } });
    check('API: genel set yoluyla doğrudan cevap yazımı reddedilir', r.code === 403, JSON.stringify(r));
    await act(admin, 'next');
    await playQ([]);
    check('Kale toplamları: A 40, B 30, C 30 (toplamlar sıfırlanmadı)', JSON.stringify(await scores(admin)) === '[40,30,30]', JSON.stringify(await scores(admin)));
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    g = await G(admin);
    check('Kale sonu: 2. sırada B/C eşitliği → eleme kesinleşmedi', g.result.tie && JSON.stringify(g.result.tie.candidates) === '[1,2]' && !g.rounds[1].done, JSON.stringify(g.result));
    check('eşitlik çözülmeden “Tur Sonucunu Açıkla” yok', !(await admin.$('[data-act="revealRound"]')) && !!(await admin.$('[data-act="startTie"]')));
    await admin.evaluate(() => ACT.revealRound()); g = await G(admin);
    check('doğrudan komutla da eşitlik çözülmeden sonuç açıklanmaz', !g.result.revealed && !g.rounds[1].done);
    await act(admin, 'startTie');
    await act(admin, 'showQ');
    const tieQ1 = await admin.evaluate(() => curQ() && curQ().cid);
    await ph.t2.waitForSelector('#pl-num:not([disabled])'); await ph.t3.waitForSelector('#pl-num:not([disabled])');
    check('eşitlikte aday olmayan A cevap ekranı görmez', !(await ph.t1.$('#pl-num')));
    const tieAns = await admin.evaluate(() => curQ().answer);
    await typeIn(ph.t2, 'pl-num', String(tieAns + 1)); await pl(ph.t2, 'send');
    await typeIn(ph.t3, 'pl-num', String(tieAns + 500)); await pl(ph.t3, 'send');
    r = await api({ fn:'cmd', pin, tok:tokA, op:'ans', qk:(await admin.evaluate(() => currentQk())), v:tieAns, t:Date.now() });
    check('API: eşitlikte aday olmayan takımın cevabı reddedilir', r.code === 403, JSON.stringify(r));
    await waitG(admin, () => [1, 2].every(i => !!liveAccepted(i)), null, 10000);
    await reveal(admin);
    await act(admin, 'resolveTie');
    await waitG(admin, () => S.game.view === 'stageEnd' && !S.game.result.tie);
    g = await G(admin);
    check('eşitlik çözüldü: A ve B finalde; eşitlik sorusu tüketildi', JSON.stringify(g.result.qualified.slice().sort()) === '[0,1]' && g.asked[tieQ1], JSON.stringify(g.result));
    await act(admin, 'revealRound');
    await waitG(admin, () => S.game.result.revealed);
    await sleep(500);
    await act(admin, 'showSkip');
    await act(admin, 'advance');
    await waitG(admin, () => S.game.stage === 2 && S.game.view === 'teams');
    g = await G(admin);
    check('final kadrosu iki takım (A, B); C elendi; üçüncü takım uydurulmadı', JSON.stringify(g.rounds[2].ids) === '["t1","t2"]' && g.teams.all[2].status === 'out', JSON.stringify(g.rounds[2]));
    await ph.t3.waitForFunction(() => /Bu turda elendiniz/.test(document.body.innerText), { timeout: 10000 });
    check('Kale’de elenen C telefonu elendi görünümünde', true);

    /* ---------- Final: birincilik eşitliği, ikinci eşitlik sorusu benzersiz ---------- */
    await act(admin, 'startStage');
    await playQ(['t2']);
    await act(admin, 'next');
    await playQ([]);
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    g = await G(admin);
    check('final: 40-40 birincilik eşitliği; şampiyon ilan edilmedi', g.result.tie && !g.finished && JSON.stringify(await scores(admin)) === '[40,40]', JSON.stringify(g.result));
    stTxt = await textOf(stage);
    check('sahne: eşitlik çözülmeden şampiyon gösterilmez', !/ŞAMPİYON/.test(stTxt), stTxt.slice(0, 300));
    await act(admin, 'startTie');
    const tieQ2 = await admin.evaluate(() => curQ() && curQ().cid);
    check('ikinci eşitlik sorusu ilkinden farklı (tekrar yok)', tieQ2 && tieQ2 !== tieQ1, `${tieQ1} ${tieQ2}`);
    await act(admin, 'showQ');
    const tieAns2 = await admin.evaluate(() => curQ().answer);
    await ph.t1.waitForSelector('#pl-num:not([disabled])'); await ph.t2.waitForSelector('#pl-num:not([disabled])');
    await typeIn(ph.t1, 'pl-num', String(tieAns2)); await pl(ph.t1, 'send');
    await typeIn(ph.t2, 'pl-num', String(tieAns2 + 30)); await pl(ph.t2, 'send');
    await waitG(admin, () => [0, 1].every(i => !!liveAccepted(i)), null, 10000);
    await reveal(admin);
    await act(admin, 'resolveTie');
    await waitG(admin, () => S.game.view === 'stageEnd' && !S.game.result.tie);
    g = await G(admin);
    check('eşitlik havuzu tükendi: sonraki eşitlikte eski soru dönmez (sözlü soru)', await admin.evaluate(() => C.nextUnasked(S.game, 'tie', 0)) === -1);
    check('soru tekrarı yok: sorulan her içerik bir kez', Object.keys(g.asked).length === qTexts.length + 2 && new Set(qTexts.map(q => q.cid)).size === qTexts.length, JSON.stringify({ a:Object.keys(g.asked).length, q:qTexts.length }));
    await act(admin, 'revealRound');
    await waitG(admin, () => S.game.view === 'champion');
    await stage.waitForSelector('.sg-champ.ce');
    await sleep(2600);
    await shot(stage, 'sahne-sampiyon-konfeti-1920');
    const ch = await stage.evaluate(() => {
      const a = document.getElementById('champ'), cv = document.querySelector('[data-fxslot] canvas');
      let px = 0; if (cv){ const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) px++; }
      return { src:a.currentSrc || a.getAttribute('src'), paused:a.paused, vol:a.volume, loop:a.loop, t:a.currentTime, cv:!!cv, px, starts:(window.KA_DIAG || {}).champStarts || 0,
        text:document.body.innerText, pods:[...document.querySelectorAll('.sg-pod:not(.empty)')].length, bgm:document.getElementById('bgm').paused };
    });
    check('şampiyon: A (eşitlik sorusuyla), podyum 1-2 + kesinleşmiş Kale elenmesinden 3.', /Takım A/.test(ch.text) && /ŞAMPİYON/.test(ch.text) && ch.pods === 3 && /Kadim Kale’de tamamladı/.test(ch.text), ch.text.slice(0, 400));
    check('şampiyonluk müziği gerçek dosyadan çalıyor (döngü, düşük seviye), karşılama müziği kapalı', /sampiyon-muzik\.m4a/.test(ch.src) && !ch.paused && ch.loop && ch.t > 0.5 && ch.vol > 0.05 && ch.vol <= 0.8 * 0.55 + 0.01 && ch.bgm, JSON.stringify({ src:ch.src, p:ch.paused, v:ch.vol, t:ch.t }));
    check('konfeti canvas’ı ad katmanının altında görünür parçacık çiziyor', ch.cv && ch.px > 5, JSON.stringify({ cv:ch.cv, px:ch.px }));
    const r0 = await (await fetch(BASE + '/assets/sinematik/sampiyon-muzik.m4a')).arrayBuffer();
    check('müzik dosyası sunuluyor (audio/mp4)', r0.byteLength > 100000);
    // Yeniden çizim: konfeti baştan patlamaz
    await admin.evaluate(() => { S.settings.title = 'Kaplan Arena Final'; save(); render(); });
    await sleep(800);
    const starts2 = await stage.evaluate(() => (window.KA_DIAG || {}).champStarts || 0);
    check('model/çizim güncellemesi konfetiyi yeniden başlatmaz', starts2 === ch.starts && ch.starts === 1, `${ch.starts} → ${starts2}`);
    // Ses seviyesi ve mute
    await admin.evaluate(() => { S.settings.volume = 40; save(); render(); });
    await sleep(1600);
    let v = await stage.evaluate(() => document.getElementById('champ').volume);
    check('merkezi ses seviyesi müziği izler', Math.abs(v - 0.4 * 0.55) < 0.03, v);
    await admin.evaluate(() => { S.settings.sound = false; save(); render(); });
    await stage.waitForFunction(() => document.getElementById('champ').paused, { timeout: 5000 }).catch(() => {});
    check('ses kapalıyken müzik yumuşak çıkışla durur', await stage.evaluate(() => document.getElementById('champ').paused));
    await admin.evaluate(() => { S.settings.sound = true; S.settings.volume = 80; save(); render(); });
    await stage.waitForFunction(() => !document.getElementById('champ').paused, { timeout: 5000 }).catch(() => {});
    check('ses yeniden açılınca müzik tek öğeden sürer', !(await stage.evaluate(() => document.getElementById('champ').paused)) && (await stage.$$('audio')).length === 2);
    // Admin ve telefonlarda ses öğesi yok
    check('admin ve telefon sayfalarında ses/video öğesi yok', (await admin.$$('audio,video')).length === 0 && (await ph.t1.$$('audio,video')).length === 0);
    // Tekrar oynat: yeni olay → bir kez yeni konfeti
    await act(admin, 'confetti'); await sleep(600);
    check('“Gösteriyi Tekrar Oynat” yeni olayla bir kez konfeti başlatır', await stage.evaluate(() => KA_DIAG.champStarts) === 2);
    // Hareketleri azalt
    await admin.evaluate(() => { S.settings.reduceMotion = true; save(); render(); });
    await sleep(700);
    const rm = await stage.evaluate(() => ({ done:document.querySelector('.sg-champ.ce').classList.contains('done') || document.querySelector('.sg').classList.contains('calm'), music:!document.getElementById('champ').paused }));
    check('hareketleri azaltma: sakin görünüm, müzik ses ayarına bağlı sürer', rm.done && rm.music, JSON.stringify(rm));
    await shot(stage, 'sahne-sampiyon-sakin-1920');
    await admin.evaluate(() => { S.settings.reduceMotion = false; save(); render(); });
    await ph.t1.waitForFunction(() => /ŞAMPİYONSUNUZ/.test(document.body.innerText), { timeout: 8000 });
    await shot(ph.t1, 'telefon-sampiyon-390');
    await shot(ph.t4, 'telefon-elenen-sampiyon-ekrani-360');
    await shot(admin, 'admin-sampiyon-1366', 1366, 768);
    // Ekrandan çıkış: müzik durur, karşılama müziğiyle çakışmaz
    await act(admin, 'welcome');
    await stage.waitForFunction(() => document.getElementById('champ').paused, { timeout: 6000 }).catch(() => {});
    await sleep(800);
    const out = await stage.evaluate(() => ({ champ:document.getElementById('champ').paused, bgm:!document.getElementById('bgm').paused }));
    check('şampiyonluk ekranından çıkınca müzik durur; tek müzik (karşılama) çalar', out.champ && out.bgm, JSON.stringify(out));

    /* ---------- eski kayıt: sessiz dönüşüm yok ---------- */
    const old = await (await browser.createBrowserContext()).newPage(); watch(old, 'eski');
    await old.setViewport({ width:1366, height:768 });
    await old.goto(BASE + '/');
    await old.waitForSelector('[data-act="begin"]');
    await old.evaluate(() => {
      const s = JSON.parse(localStorage.getItem(KEY));
      s.schema = 2;
      s.game = Object.assign(newGame(), { started:true, pin:'565656', mode:'shared', roster:['K1', 'K2', 'K3'], view:'teams', stage:1, teams:{ s1:[], s2:[], final:[], all:[{ name:'K1', score:30 }, { name:'K2', score:20 }, { name:'K3', score:10 }] } });
      localStorage.setItem(KEY, JSON.stringify(s));
    });
    await old.reload(); await old.waitForSelector('[data-act="begin"]'); await act(old, 'begin'); await act(old, 'menu');
    const og = await G(old), otx = await textOf(old);
    check('eski devam eden kayıt: kural/puan korunur, yeni kurala sessizce dönüştürülmez', og.mode === 'shared' && og.teams.all[0].score === 30 && !og.plan, JSON.stringify({ m:og.mode }));
    check('eski kayıt: admin açıkça bilgilendirilir; yedek kopya alındı', /Eski kurallarla süren yarışma/.test(otx) && await old.evaluate(() => !!localStorage.getItem(KEY + '-yedek-sema2')), otx.slice(0, 300));

    check('tarayıcı sayfa hatası yok', errors.length === 0, errors.slice(0, 6).join(' | '));
  }catch(e){
    check('senaryo istisnasız tamamlandı', false, e.stack || e.message);
  }finally{
    fs.writeFileSync(path.join(__dirname, 'son-rapor-eleme.json'), JSON.stringify({ at:new Date().toISOString(), results }, null, 2));
    const fail = results.filter(x => !x.ok).length;
    console.log(`\n${results.length - fail}/${results.length} kontrol geçti`);
    await browser.close(); srv.close();
    process.exit(fail ? 1 : 0);
  }
})();
function C_isRunning(g){ return !!(g.clock && g.clock.runAt != null); }
