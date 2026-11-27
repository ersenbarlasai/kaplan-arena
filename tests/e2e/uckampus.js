// Kaplan Arena — üç kampüs pilotu uçtan uca testi (eleme yarışması 3 → 3 → 2 → şampiyon): gerçek admin akışı + ayrı sahne +
// üç kaptan telefonu (kaptan koduyla). Orman Geçidi'nde eleme yok ama tur kazananı açıklanır; Kadim Kale'den ilk 2 finale.
// Çalıştırma: NODE_PATH=<puppeteer-core node_modules> node tests/e2e/uckampus.js
// Canlı Redis/Vercel kullanılmaz: tests/e2e/server.js bellek kipindeki /api/ka ile çalışır. Bu test yerel taklit
// sunucusudur; gerçek kampüsler arası internet bağlantısının yerine geçmez.
const path = require('path'), fs = require('fs');
const puppeteer = require('puppeteer-core');
const { start } = require('./server.js');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'tasarim', 'ekran-goruntuleri', 'uc-kampus');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 3092, BASE = `http://localhost:${PORT}`;
const TEAMS = ['Kampüs A', 'Kampüs B', 'Kampüs C'];
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail){ results.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail != null && !ok ? ' :: ' + detail : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(body){ const r = await fetch(BASE + '/api/ka', { method:'POST', body:JSON.stringify(body) }); return r.json(); }
async function kvState(pin){ const j = await api({ fn:'get', pins:[pin], since:0 }); const row = j.rows.find(r => r.p === 'state'); return { st: row ? row.v : null, t: j.t, rows: j.rows }; }
async function waitKv(pin, pred, ms){ const end = Date.now() + (ms || 8000); let k; while (Date.now() < end){ k = await kvState(pin); if (k.st && pred(k.st)) return k; await sleep(150); } return k; }
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
  if (name === 'openStage'){ const s = selOf('act', name, data); await page.waitForSelector(s); await page.click(s); return sleep(300); }
  return clickSel(page, selOf('act', name, data));
}
async function pl(page, name, data){ return clickSel(page, selOf('pl', name, data)); }
async function typeNum(page, val){
  await page.waitForSelector('#pl-num:not([disabled])', { timeout: 15000 });
  await page.evaluate(v => { const el = document.getElementById('pl-num'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, val);
  await sleep(100);
}
const G = page => page.evaluate(() => JSON.parse(JSON.stringify(S.game)));
const scores = page => page.evaluate(() => curTeams().map(t => t.score));
async function waitG(page, fn, arg, timeout){ await page.waitForFunction(fn, { timeout: timeout || 20000, polling: 100 }, arg); }
async function shot(page, name, w, h){ if (w) await page.setViewport({ width:w, height:h }); await sleep(500); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }
const textOf = page => page.evaluate(() => document.body.innerText);
// Eski iki gruplu turnuva ifadeleri (yeni yarışmada “ilk 2 finale” doğru kuraldır; iki grup/4 finalist/sıfırlama değildir).
const noTournamentWords = t => !/4 finalist|Finale çıkanlar|iki etaba ayrılacak|İki Gruplu|kura ile/i.test(t);

async function setClasses(admin, txt){
  await act(admin, 'settings');
  await admin.waitForSelector('#set-classes');
  await admin.evaluate(v => { document.getElementById('set-classes').value = v; }, txt);
  await clickSel(admin, '[data-act="saveSettings"]');
  return admin.evaluate(() => ({ msg: ui.msg, classes: S.settings.classes.slice() }));
}
async function importText(admin, txt){
  await act(admin, 'manage');
  await admin.waitForSelector('#imp-text');
  await admin.evaluate(v => { const el = document.getElementById('imp-text'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, txt);
  await clickSel(admin, '[data-act="importAsk"]');
  const asked = await admin.evaluate(() => ui.confirm === 'import');
  if (asked) await clickSel(admin, '[data-act="importYes"]');
  return admin.evaluate(() => ({ msg: ui.msg, classes: S.settings.classes.slice(), nq: S.questions.s1.length }));
}
async function joinTeam(ph, tid, code){
  // Kurallar 03: önce özel kaptan giriş kodu, sonra takım seçim ekranında kendi takım adı.
  await ph.waitForSelector('#pl-code', { timeout: 15000 });
  await ph.evaluate(c => { const el = document.getElementById('pl-code'); el.value = c; el.dispatchEvent(new Event('input', { bubbles: true })); }, code);
  await pl(ph, 'codeYes');
  await ph.waitForSelector(`[data-pl="pickElim"][data-id="${tid}"]`, { timeout: 15000 });
  await pl(ph, 'pickElim', { id: tid });
}
async function pickSend(page, letters){ await page.waitForSelector('[data-pl="pick-opt"]:not([disabled])'); for (const L of letters) await pl(page, 'pick-opt', { v: L }); await pl(page, 'send'); }
async function useJoker(admin, page, j){
  await pl(page, 'jkAsk', { j }); await pl(page, 'jkYes');
  await waitG(admin, () => !!S.game.intro, null, 8000);
  await waitG(admin, () => !S.game.intro && C.isRunning(S.game), null, 9000);
}
async function reveal(admin){
  await act(admin, 'revealAsk');
  if (await admin.$('[data-act="revealYes"]')) await act(admin, 'revealYes');
  await waitG(admin, () => S.game.phase === 'revealed');
}

(async () => {
  const srv = await start(PORT);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--disable-features=Translate', '--allow-file-access-from-files'] });
  const errors = [];
  const watch = (p, tag) => { p.on('pageerror', e => errors.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(tag + ': ' + m.text()); }); };
  try{
    const ctxA = await browser.createBrowserContext();
    const admin = await ctxA.newPage(); watch(admin, 'admin');
    await admin.setViewport({ width: 1366, height: 900 });
    await admin.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await admin.goto(BASE + '/');
    await admin.waitForSelector('[data-act="begin"]');
    // Test soru seti (gerçek okul verisi değil)
    await admin.evaluate(() => {
      const D = (s, t, o, a) => ({ id: uid(), type:'ders', subject:s, text:t, options:o, answer:a });
      const T = (t, a, u) => ({ id: uid(), type:'tahmin', text:t, answer:a, unit:u || '' });
      S.questions = {
        s1: [D('Matematik', 'İki artı iki kaç eder?', ['3', '5', '4', '6'], 'C'), T('Kızılırmak kaç kilometredir?', 1355, 'km')],
        s2: [D('Fen Bilimleri', 'Atom numarası 26 olan element hangisidir?', ['Bakır', 'Demir', 'Çinko', 'Nikel'], 'B')],
        final: [D('Sosyal Bilimler', 'Kanun-i Esasi hangi padişah döneminde ilan edildi?', ['Abdülaziz', 'V. Murat', 'II. Abdülhamit', 'Mehmed Reşad'], 'C')],
        tie: [T('Everest Dağı kaç metredir?', 8849, 'm'), T('Türkiye kaç ilden oluşur?', 81, '')]
      };
      S.settings.seconds = 40; save();
      window.KA_RNG = () => 0.9999999;   // test: soru sırası bankadaki sırayla
    });
    await act(admin, 'begin');

    /* ---------- 1) Ayarlar: üç takım kabul, iki/boş/tekrar ret ---------- */
    let r = await setClasses(admin, 'Kampüs A\n  Kampüs   B ,Kampüs C\n');
    check('ayarlar: üç takım (boşluk/virgül/satır temizliğiyle) kaydedilir', JSON.stringify(r.classes) === JSON.stringify(TEAMS) && /kaydedildi/.test(r.msg), JSON.stringify(r));
    r = await setClasses(admin, 'Kampüs A\nKampüs B');
    check('ayarlar: iki takım reddedilir, liste değişmez', JSON.stringify(r.classes) === JSON.stringify(TEAMS) && /En az 3/.test(r.msg), JSON.stringify(r));
    r = await setClasses(admin, 'Kampüs A\n\n , \nKampüs B');
    check('ayarlar: boş satır/virgül takım sayılmaz (2 takım) → ret', JSON.stringify(r.classes) === JSON.stringify(TEAMS) && /En az 3/.test(r.msg), JSON.stringify(r));
    r = await setClasses(admin, 'Kampüs A\nKampüs B\nkampüs  a');
    check('ayarlar: tekrar eden ad (büyük/küçük harf, boşluk farkı) reddedilir', JSON.stringify(r.classes) === JSON.stringify(TEAMS) && /iki kez/.test(r.msg), JSON.stringify(r));
    const setTxt = await textOf(admin);
    check('ayarlar: üç takımda 3 → 3 → 2 → şampiyon ve her turda puan sıfırlama anlatılır', /3 → 3 → 2 → şampiyon/.test(setTxt) && /puanlar sıfırlanır/.test(setTxt), setTxt.slice(0, 400));
    await shot(admin, 'admin-ayarlar-uc-takim-1366', 1366, 900);

    /* ---------- 2) Yedek: dışa/içe aktarma ---------- */
    await act(admin, 'manage'); await act(admin, 'exportData');
    const backup = JSON.parse(await admin.evaluate(() => ui.backup));
    check('yedek: dışa aktarılan yedekte üç takım var', JSON.stringify(backup.settings.classes) === JSON.stringify(TEAMS));
    const b3 = JSON.parse(JSON.stringify(backup)); b3.settings.classes = ['Kampüs X', 'Kampüs Y', 'Kampüs Z'];
    r = await importText(admin, JSON.stringify(b3));
    check('yedek: üç takımlı yedek içe aktarılır (liste sessizce atlanmaz)', JSON.stringify(r.classes) === JSON.stringify(b3.settings.classes), JSON.stringify(r));
    const b2 = JSON.parse(JSON.stringify(backup)); b2.settings.classes = ['Kampüs X', 'Kampüs Y']; b2.questions.s1 = b2.questions.s1.slice(0, 1);
    r = await importText(admin, JSON.stringify(b2));
    check('yedek: iki takımlı yedek hata verir; eski liste ve sorular olduğu gibi kalır', /okunamadı/.test(r.msg) && JSON.stringify(r.classes) === JSON.stringify(b3.settings.classes) && r.nq === 2, JSON.stringify(r));
    const bd = JSON.parse(JSON.stringify(backup)); bd.settings.classes = ['Kampüs X', 'Kampüs Y', ' kampüs x '];
    r = await importText(admin, JSON.stringify(bd));
    check('yedek: tekrar eden adlı yedek hata verir', /okunamadı/.test(r.msg) && JSON.stringify(r.classes) === JSON.stringify(b3.settings.classes), JSON.stringify(r));
    r = await importText(admin, JSON.stringify(backup));
    check('yedek: özgün üç takımlı yedek geri yüklendi', JSON.stringify(r.classes) === JSON.stringify(TEAMS), JSON.stringify(r));

    /* ---------- 3) Ana menü: mod ve kural yeni yarışmadan önce görünür ---------- */
    await act(admin, 'menu');
    const menuTxt = await textOf(admin);
    check('menü: 3 → 3 → 2 → şampiyon, Orman’da eleme yok, her turda sıfırlama kuralı başlatmadan önce görünür', /3 → 3 → 2 → şampiyon/.test(menuTxt) && /puanlar sıfırlanır/.test(menuTxt) && /eleme yok/i.test(menuTxt) && /ilk 2/.test(menuTxt), menuTxt.slice(0, 700));
    check('menü: eski turnuva ifadeleri (iki grup, 4 finalist, puanlar sıfırdan) görünmez', noTournamentWords(menuTxt), menuTxt.slice(0, 600));
    await shot(admin, 'admin-menu-uc-kampus-1366', 1366, 768);

    /* ---------- 4) Gerçek başlatma: 2+1 gruba ayrılmaz ---------- */
    await act(admin, 'newGameYes');
    await waitG(admin, () => S.game.started);
    let g = await G(admin);
    const pin = g.pin;
    check('başlatma: eleme formatı kayda sabitlendi (3 → 3 → 2 → 1)', g.mode === 'elim' && JSON.stringify(g.format.quotas) === '[3,2,1]', JSON.stringify(g.format));
    check('başlatma: üç takım tek ortak listede; 2+1 gruba ayrılmadı', g.teams.all && g.teams.all.map(t => t.name).join('|') === TEAMS.join('|') && !(g.teams.s1 || []).length && !(g.teams.s2 || []).length && !g.draw && g.rounds[0].ids.length === 3, JSON.stringify(g.teams));
    check('başlatma: doğrudan ortak katılım ekranı, puanlar sıfır', g.view === 'teams' && g.teams.all.every(t => t.score === 0));

    const popupP = new Promise(res => admin.once('popup', res));
    await act(admin, 'openStage');
    const stage = await popupP; watch(stage, 'sahne');
    await stage.setViewport({ width: 1920, height: 1080 });
    await stage.waitForSelector('#snd-on'); await clickSel(stage, '#snd-on'); await sleep(1600);
    await waitG(admin, () => StageHost.count() > 0);
    await sleep(600);
    const lobbyTxt = await textOf(stage);
    check('sahne: ortak katılım; üç takım ve bu turda eleme olmadığı', TEAMS.every(n => lobbyTxt.includes(n)) && /eleme yok/.test(lobbyTxt), lobbyTxt.slice(0, 400));
    check('sahne katılım: turnuva ifadeleri yok', noTournamentWords(lobbyTxt), lobbyTxt.slice(0, 400));
    await shot(stage, 'sahne-katilim-1920');

    /* ---------- 5) Üç telefon aynı kodla ayrı takım ---------- */
    const phones = [];
    const vps = [{ width: 390, height: 844 }, { width: 360, height: 800 }, { width: 412, height: 915 }];
    for (let i = 0; i < 3; i++){
      const ctx = await browser.createBrowserContext(), p = await ctx.newPage(); watch(p, 'telefon' + 'ABC'[i]);
      await p.setViewport(Object.assign({ isMobile: true, hasTouch: true }, vps[i]));
      await p.goto(`${BASE}/kaplan-arena.html?pin=${pin}`);
      await p.waitForSelector('#pl-code');
      phones.push(p);
    }
    const [phA, phB, phC] = phones;
    const pickTxt = await textOf(phA);
    check('telefon: önce kaptan giriş kodu, sonra kendi takım adına dokunma (kural 03)', /Kaptan girişi/.test(pickTxt) && /kendi takım adınıza/.test(pickTxt), pickTxt.slice(0, 300));
    await shot(phA, 'telefon-takim-secimi-390');
    await shot(phB, 'telefon-takim-secimi-360');
    for (let i = 0; i < 3; i++) await joinTeam(phones[i], 't' + (i + 1), g.codes['t' + (i + 1)]);
    await waitG(admin, () => NET.joined && NET.joined.t1 && NET.joined.t2 && NET.joined.t3);
    check('üç telefon ayrı takımlarını aldı', true);
    let kv = await kvState(pin);
    check('ağ yükü: telefon durumunda üç takım, kararlı kimlikler ve mod', kv.st.teams.length === 3 && kv.st.mode === 'elim' && kv.st.ids.join() === 't1,t2,t3', JSON.stringify({ teams: kv.st.teams, mode: kv.st.mode }));
    const toks = await Promise.all(phones.map(p => p.evaluate(() => P.tok)));

    /* ---------- 6) 1. etap, soru 1 (şıklı): Çifte Puan, ortak süre, yanlış cihaz reddi ---------- */
    await act(admin, 'startStage');
    await waitG(admin, () => S.game.view === 'question' && S.game.phase === 'ready');
    await act(admin, 'showQ');
    await Promise.all(phones.map(p => p.waitForSelector('[data-pl="pick-opt"]')));
    const qTxt = await Promise.all(phones.map(textOf));
    check('üç telefon aynı aktif soruyu görür', qTxt.every(t => t.includes('İki artı iki')));
    await useJoker(admin, phA, 'x2');
    await sleep(400);
    const lefts = await Promise.all([admin.evaluate(() => clockLeftMs()), ...phones.map(p => p.evaluate(() => plLeft()))]);
    check('ortak süre: admin ve üç telefon aynı kalan süreyi görür (±1,5 sn)', Math.max(...lefts) - Math.min(...lefts) < 1500 && lefts[0] > 10000, JSON.stringify(lefts));
    kv = await kvState(pin);
    // telefonlar durumu yoklama ile alır; joker tanıtımından sonra en geç birkaç yüz ms içinde güncellenir
    for (const p of phones) await p.waitForFunction(d => P.st && P.st.deadline === d, { timeout: 5000, polling: 100 }, kv.st.deadline).catch(() => {});
    const dls = await Promise.all(phones.map(p => p.evaluate(() => P.st.deadline)));
    check('ortak süre: üç telefon aynı sunucu bitiş anını alır', dls.every(d => d === kv.st.deadline && d > 0), JSON.stringify(dls));
    await shot(phB, 'telefon-soru-360');
    await pickSend(phA, ['C']); await pickSend(phB, ['C']); await pickSend(phC, ['A']);
    await sleep(700);
    kv = await kvState(pin);
    const intr = [await api({ fn:'set', pin, path:`answers/${kv.st.qk}/t3/sINTRUDER`, value:{ v:'C', t: kv.t, dev:'yabanci-cihaz' } }),
      await api({ fn:'join', pin, tid:'t3', code:'0000', dev:'yabanciCihaz' }), await api({ fn:'cmd', pin, tok:'sahte', op:'ans', qk:kv.st.qk, v:'C', t:kv.t })];
    check('yabancı cihaz: doğrudan yazım, yanlış kod ve sahte oturum sunucuda reddedildi', intr.every(x => x.ok !== true && !x.r), JSON.stringify(intr));
    await sleep(900);
    await reveal(admin);
    g = await G(admin);
    const fz = g.frozen[Object.keys(g.frozen).find(k => k.startsWith('s1_0'))];
    check('cevaplar doğru kampüse bağlı; yanlış cihazdan gelen cevap reddedildi', fz[0].v === 'C' && fz[1].v === 'C' && fz[2].v === 'A', JSON.stringify(fz));
    await sleep(2600);
    const corTxt = await textOf(stage);
    check('sahne: Doğru Bilenler gösterimi (A ve B)', /DOĞRU BİLENLER|Doğru bilenler/.test(corTxt) && corTxt.includes('Kampüs A') && corTxt.includes('Kampüs B'), corTxt.slice(0, 500));
    await shot(stage, 'sahne-dogru-bilenler-1920');
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    check('1. etap soru 1: 20/10/0 (Çift Puan +20, normal +10)', JSON.stringify(await scores(admin)) === '[20,10,0]', JSON.stringify(await scores(admin)));
    await sleep(1800);
    await shot(stage, 'sahne-puan-tablosu-1920');
    await shot(admin, 'admin-puan-1366', 1366, 768);
    check('telefon A: ÇİFT PUAN sonucu', (await textOf(phA)).includes('ÇİFT PUAN'));

    /* ---------- 7) soru 2 (tahmin): geri al, tekrar puanlama, iptal ---------- */
    await act(admin, 'next');
    await waitG(admin, () => S.game.phase === 'ready' && S.game.qIndex === 1);
    await act(admin, 'showQ');
    await typeNum(phA, '1000'); await pl(phA, 'send');
    await typeNum(phB, '1300'); await pl(phB, 'send');
    await typeNum(phC, '1350'); await pl(phC, 'send');
    await sleep(900);
    await reveal(admin);
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    check('soru 2: en yakın tahmin (C) +10 → 20/10/10', JSON.stringify(await scores(admin)) === '[20,10,10]', JSON.stringify(await scores(admin)));
    await act(admin, 'undo');
    await waitG(admin, () => S.game.view === 'question' && S.game.phase === 'revealed');
    check('geri al: puan yalnız bir kez geri alındı → 20/10/0', JSON.stringify(await scores(admin)) === '[20,10,0]', JSON.stringify(await scores(admin)));
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    await admin.evaluate(() => { S.game.view = 'question'; S.game.phase = 'revealed'; ACT.showScores(); });
    check('tekrar puanlama çift uygulanmaz → 20/10/10', JSON.stringify(await scores(admin)) === '[20,10,10]', JSON.stringify(await scores(admin)));
    await act(admin, 'cancelAsk'); await act(admin, 'cancelYes');
    await waitG(admin, () => S.game.phase === 'cancelled');
    check('soru iptali: uygulanmış +10 bir kez geri alındı → 20/10/0', JSON.stringify(await scores(admin)) === '[20,10,0]', JSON.stringify(await scores(admin)));
    await admin.evaluate(() => ACT.cancelYes());
    check('ikinci iptal toplamı değiştirmez', JSON.stringify(await scores(admin)) === '[20,10,0]');
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    g = await G(admin);
    check('1. tur sonu: eleme yok (3 → 3), eşitlik sorusu yok', !g.result.tie && g.result.all && g.result.qualified.length === 3, JSON.stringify(g.result));
    await act(admin, 'revealRound');
    await waitG(admin, () => S.game.result.revealed);
    g = await G(admin);
    check('1. tur: elemesiz turda da tur kazananı açıklanır (A, +20)', JSON.stringify(g.rounds[0].done.winners) === '["t1"]' && g.rounds[0].done.out.length === 0, JSON.stringify(g.rounds[0].done));
    await act(admin, 'showSkip');
    await sleep(700);
    const end1 = await textOf(stage);
    check('sahne 1. tur sonu: tur kazananı, tur puanları ve “Üç takım da Kadim Kale’ye ilerliyor”', /Orman Geçidi Tamamlandı/i.test(end1) && /TURUN KAZANANI/.test(end1) && /Üç takım da Kadim Kale’ye ilerliyor/.test(end1) && !/Elendi/.test(end1), end1.slice(0, 500));
    await shot(stage, 'sahne-etap1-sonu-1920');
    const ph1 = await textOf(phC);
    check('telefon 1. tur sonu: tur puanı, tur kazananı, yeni turda sıfırlama/joker yenileme', /Tur puanı/.test(ph1) && /devam/i.test(ph1) && /Turun kazananı/.test(ph1) && /0’dan başlar/.test(ph1), ph1.slice(0, 300));
    await shot(phC, 'telefon-etap-sonu-412');

    /* ---------- 8) yeniden yükleme: mod, katılımcılar, puanlar korunur ---------- */
    await admin.reload();
    await admin.waitForSelector('[data-act="begin"]');
    await act(admin, 'begin');
    await waitG(admin, () => ui.screen === 'game');
    g = await G(admin);
    check('admin yenileme: mod/katılımcı/puan/aşama korunur', g.mode === 'elim' && g.view === 'stageEnd' && g.result.revealed && g.teams.all.map(t => t.score).join() === '20,10,0', JSON.stringify({ mode: g.mode, view: g.view, t: g.teams.all }));
    await waitG(admin, () => StageHost.count() > 0, null, 8000);
    check('admin yenileme: sahne yeniden bağlandı', true);
    await act(admin, 'advance');
    await waitG(admin, () => S.game.view === 'teams' && S.game.stage === 1);
    await sleep(900);
    check('2. tur katılım (kural 01): puanlar sıfırlandı (0/0/0); Orman puanları arşivde', JSON.stringify(await scores(admin)) === '[0,0,0]' && (await G(admin)).rounds[0].done.totals.t1 === 20, JSON.stringify(await scores(admin)));
    check('2. tur: telefonlar yeniden seçim yapmadan bağlı kaldı', await admin.evaluate(() => !!(NET.joined && NET.joined.t1 && NET.joined.t2 && NET.joined.t3)));
    await shot(stage, 'sahne-etap2-katilim-1920');

    /* ---------- 9) açık yarışmada ayar değişikliği yarışmayı dönüştürmez ---------- */
    r = await setClasses(admin, '9A\n9B\n9C\n10A\n10B');
    const setOpenTxt = await textOf(admin);
    check('ayarlar (açık yarışma): değişikliğin açık yarışmayı etkilemediği belirtilir', /açık yarışmayı etkilemez/i.test(setOpenTxt), setOpenTxt.slice(0, 500));
    await act(admin, 'start');
    await waitG(admin, () => ui.screen === 'game');
    g = await G(admin);
    check('açık yarışmada ayar değişikliği modu ve katılımcıları değiştirmez', /kaydedildi/.test(r.msg) && g.mode === 'elim' && g.teams.all.map(t => t.name).join('|') === TEAMS.join('|'), JSON.stringify({ r, mode: g.mode }));
    await setClasses(admin, TEAMS.join('\n'));
    await act(admin, 'start');

    /* ---------- 10) 2. tur: jokerler her yeni turda yenilenir (kural 05) ---------- */
    await act(admin, 'startStage');
    await waitG(admin, () => S.game.view === 'question' && S.game.phase === 'ready');
    check('2. tur başlangıcı: puanlar 0', JSON.stringify(await scores(admin)) === '[0,0,0]', JSON.stringify(await scores(admin)));
    await act(admin, 'showQ');
    await Promise.all(phones.map(p => p.waitForSelector('[data-pl="pick-opt"]')));
    await sleep(500);
    check('telefon A: 1. turda kullanılan Çift Puan 2. turda yenilenmiş (kullanılabilir)', await phA.evaluate(() => { const b = document.querySelector('[data-pl="jkAsk"][data-j="x2"]'); return !!b && !b.disabled && !/KULLANILDI/.test(b.textContent); }));
    await useJoker(admin, phA, 'x2');
    await useJoker(admin, phB, 'x2');
    await useJoker(admin, phC, 'x2');
    g = await G(admin);
    check('yeni turda üç takım da Çift Puan kullanabildi', ['t1', 't2', 't3'].every(t => g.jokers[t] && g.jokers[t].x2 && g.jokers[t].x2.startsWith('s2_')), JSON.stringify(g.jokers));
    await pickSend(phB, ['B']); await pickSend(phC, ['B']); await pickSend(phA, ['B']);
    await sleep(600);
    await phB.reload();
    await phB.waitForFunction(() => /Geçerli cevabınız/.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
    check('telefon B yeniden bağlandı: aynı takım ve gönderilmiş cevap korunur', /Geçerli cevabınız/.test(await textOf(phB)) && (await phB.evaluate(() => P.team)) === 'Kampüs B');
    await reveal(admin);
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    check('2. tur puanları: 20/20/20 (üç Çift Puan doğru)', JSON.stringify(await scores(admin)) === '[20,20,20]', JSON.stringify(await scores(admin)));
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    g = await G(admin);
    check('2. tur 20/20/20: iki finalist kontenjanında üçlü sınır eşitliği → eleme kesinleşmeden eşitlik sorusu', g.result.tie && JSON.stringify(g.result.tie.candidates) === '[0,1,2]' && g.result.tie.slots === 2 && !g.rounds[1].done, JSON.stringify(g.result));
    const pend = await textOf(stage);
    check('sahne: eşitlik çözülmeden elenen ilan edilmez', !/Elendi/.test(pend) && /eşitlik/i.test(pend), pend.slice(0, 300));
    await act(admin, 'startTie'); await act(admin, 'showQ');
    await Promise.all(phones.map(p => p.waitForSelector('#pl-num:not([disabled])')));
    await typeNum(phA, '8800'); await pl(phA, 'send');
    await typeNum(phB, '8000'); await pl(phB, 'send');
    await typeNum(phC, '5000'); await pl(phC, 'send');
    await waitG(admin, () => [0, 1, 2].every(i => !!liveAccepted(i)), null, 8000);
    await reveal(admin);
    await act(admin, 'resolveTie');
    await waitG(admin, () => S.game.view === 'stageEnd' && !S.game.result.tie);
    await act(admin, 'revealRound');
    await waitG(admin, () => S.game.result.revealed);
    g = await G(admin);
    check('Kadim Kale sonucu: A ve B finale, C elendi (3 → 2)', JSON.stringify(g.rounds[1].done.up.slice().sort()) === '["t1","t2"]' && g.teams.all[2].status === 'out', JSON.stringify(g.rounds[1].done));
    await phC.waitForFunction(() => /Bu turda elendiniz/.test(document.body.innerText), { timeout: 10000 });
    check('telefon C: “Bu turda elendiniz; yarışmaya devam edemezsiniz”', /devam edemezsiniz/.test(await textOf(phC)));
    await shot(phC, 'telefon-elendi-412');
    await act(admin, 'showSkip');
    await act(admin, 'advance');
    await waitG(admin, () => S.game.view === 'teams' && S.game.stage === 2);

    /* ---------- 11) final: sıfırlanmaz, lider eşitliği yalnız liderlerle çözülür ---------- */
    await act(admin, 'startStage');
    await waitG(admin, () => S.game.view === 'question');
    check('final (kural 01): iki takım 0 puanla başlar', JSON.stringify(await scores(admin)) === '[0,0]', JSON.stringify(await scores(admin)));
    const finTxt = await textOf(stage);
    check('sahne final: eski turnuva ifadeleri yok', noTournamentWords(finTxt), finTxt.slice(0, 300));
    await act(admin, 'showQ');
    await Promise.all([phA, phB].map(p => p.waitForSelector('[data-pl="pick-opt"]')));
    check('elenen C telefonu final sorusunu cevaplayamaz', !(await phC.$('[data-pl="pick-opt"]')) && /elendiniz/.test(await textOf(phC)));
    await pickSend(phA, ['C']); await pickSend(phB, ['C']);
    await sleep(800);
    await reveal(admin);
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    check('final: 10/10', JSON.stringify(await scores(admin)) === '[10,10]', JSON.stringify(await scores(admin)));
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    g = await G(admin);
    check('final lider eşitliği: yalnız eşit liderler (A, B) eşitlik sorusuna', g.result.tie && JSON.stringify(g.result.tie.candidates) === '[0,1]' && g.result.tie.slots === 1, JSON.stringify(g.result));
    await sleep(500);
    await shot(stage, 'sahne-final-esitlik-1920');
    await act(admin, 'startTie');
    await waitG(admin, () => S.game.view === 'tie');
    await act(admin, 'showQ');
    await phA.waitForSelector('#pl-num');
    await sleep(500);
    check('final eşitlik sorusu farklı (Kale’deki eşitlik sorusu tekrar gelmez)', await admin.evaluate(() => curQ().text) === 'Türkiye kaç ilden oluşur?', await admin.evaluate(() => curQ() && curQ().text));
    await typeNum(phA, '80'); await pl(phA, 'send');
    await typeNum(phB, '70'); await pl(phB, 'send');
    await sleep(900);
    await reveal(admin);
    await act(admin, 'resolveTie');
    await waitG(admin, () => S.game.view === 'stageEnd' && !S.game.result.tie);
    g = await G(admin);
    check('eşitlik çözüldü: A birinci; final puanları değişmedi (10/10)', g.result.qualified[0] === 0 && JSON.stringify(await scores(admin)) === '[10,10]', JSON.stringify({ q: g.result.qualified, s: await scores(admin) }));
    await act(admin, 'revealRound');
    await waitG(admin, () => S.game.view === 'champion');
    await sleep(800);
    const champTxt = await textOf(stage);
    check('şampiyon: Kampüs A (toplam puan + eşitlik)', /ŞAMPİYON/.test(champTxt) && champTxt.includes('Kampüs A'), champTxt.slice(0, 300));
    await shot(stage, 'sahne-sampiyon-1920');
    await sleep(800);
    check('telefon A: ŞAMPİYONSUNUZ; telefon B: Şampiyon: Kampüs A', /ŞAMPİYONSUNUZ/.test(await textOf(phA)) && /Şampiyon: Kampüs A/.test(await textOf(phB)));
    const pod = await stage.evaluate(() => [...document.querySelectorAll('.sg-pod:not(.empty) b')].map(b => b.textContent));
    check('podyum: şampiyon A, finalist B, üçüncü kesinleşmiş Kale elenmesinden C', pod.join('|') === 'Kampüs B|Kampüs A|Kampüs C', JSON.stringify(pod));
    await shot(phA, 'telefon-sampiyon-390');
    await shot(admin, 'admin-sampiyon-1366', 1366, 768);

    /* ---------- 12) eski kayıt (modsuz) ve 4 takımlı turnuva korunur ---------- */
    const ctxO = await browser.createBrowserContext(), old = await ctxO.newPage(); watch(old, 'eski-kayit');
    await old.setViewport({ width: 1366, height: 768 });
    await old.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await old.goto(BASE + '/'); await old.waitForSelector('[data-act="begin"]');
    await old.evaluate(() => {
      const s = JSON.parse(localStorage.getItem(KEY));
      s.settings.classes = ['Kampüs A', 'Kampüs B', 'Kampüs C'];   // ayarda artık 3 takım var
      s.game = Object.assign(newGame(), { started:true, finished:false, view:'teams', stage:0,
        teams:{ s1:[{ name:'9A', score:0 }, { name:'9B', score:0 }], s2:[{ name:'9C', score:0 }, { name:'9D', score:0 }], final:[] } });
      delete s.game.mode;
      localStorage.setItem(KEY, JSON.stringify(s));
    });
    await old.reload(); await old.waitForSelector('[data-act="begin"]');
    const oldInfo = await old.evaluate(() => ({ shared: C.isShared(S.game), cur: curTeams().map(t => t.name), mode: S.game.mode }));
    check('eski modsuz kayıt mevcut turnuva davranışıyla açılır (ayardaki 3 takıma bakılmaz)', !oldInfo.shared && oldInfo.cur.join() === '9A,9B', JSON.stringify(oldInfo));
    await old.evaluate(() => { S.game.stage = 0; S.game.teams.s1[0].score = 20; S.game.teams.s1[1].score = 10; S.questions.s1 = [S.questions.s1[0]]; finishStage(); });
    const oldRes = await old.evaluate(() => S.game.result);
    check('eski turnuva kaydı: etap sonu ilk 2 mantığıyla hesaplanır', oldRes.qualified.length === 2 && !oldRes.tie, JSON.stringify(oldRes));
    await old.evaluate(() => { S = defaultState(); S.settings.classes = ['9A', '9B', '9C', '9D']; save(); ACT.menu(); });
    await old.evaluate(() => ACT.newGameYes());
    await waitG(old, () => S.game.started && S.game.mode, null, 8000).catch(() => {});
    const tg = await G(old);
    check('4 takım: yeni yarışma eleme formatında (4 → 3 → 2 → 1), kura/iki grup yok', tg.mode === 'elim' && tg.view === 'teams' && JSON.stringify(tg.format.quotas) === '[3,2,1]' && tg.rounds[0].ids.length === 4 && !tg.draw, JSON.stringify({ mode: tg.mode, view: tg.view }));
    await old.evaluate(() => ACT.endYes());

    /* ---------- 13) file:// telefonsuz: üç takım ortak yarışma ---------- */
    const ctxF = await browser.createBrowserContext(), fp = await ctxF.newPage(); watch(fp, 'file');
    await fp.setRequestInterception(true);
    fp.on('request', q => { if (/vercel\.app/.test(q.url())) q.abort('internetdisconnected'); else q.continue(); });
    await fp.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await fp.setViewport({ width: 1366, height: 768 });
    await fp.goto('file:///' + path.join(ROOT, 'kaplan-arena.html').replace(/\\/g, '/'));
    await fp.waitForSelector('[data-act="begin"]'); await sleep(2000);
    await fp.evaluate(() => { S.settings.classes = ['Kampüs A', 'Kampüs B', 'Kampüs C']; S.questions.s1 = [{ id: uid(), type:'ders', subject:'Matematik', text:'Üç kere üç kaçtır?', options:['6', '9', '12', '3'], answer:'B' }]; save(); });
    await act(fp, 'begin');
    await act(fp, 'newGameYes');
    await waitG(fp, () => S.game.started);
    await act(fp, 'startStage'); await act(fp, 'showQ'); await reveal(fp);
    await act(fp, 'toggleTeam', { i: 1 });
    await act(fp, 'showScores');
    await waitG(fp, () => S.game.view === 'scoreboard', null, 6000).catch(() => {});
    const fg = await G(fp);
    check('file:// telefonsuz: üç takım eleme yarışması, admin puanı girer', fg.mode === 'elim' && fg.teams.all[1].score === 10, JSON.stringify(fg.teams.all));
    await fp.evaluate(() => ACT.endYes());

    check('tarayıcı sayfa hatası yok', errors.length === 0, errors.slice(0, 6).join(' | '));
  }catch(e){
    check('senaryo istisnasız tamamlandı', false, e.stack || e.message);
  }finally{
    fs.writeFileSync(path.join(__dirname, 'son-rapor-uc-kampus.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
    const fail = results.filter(x => !x.ok).length;
    console.log(`\n${results.length - fail}/${results.length} kontrol geçti`);
    await browser.close(); srv.close();
    process.exit(fail ? 1 : 0);
  }
})();
