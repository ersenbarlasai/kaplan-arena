// Kaplan Arena — "Üç Kampüs — Ortak Yarışma" uçtan uca testi: gerçek admin akışı + ayrı sahne + üç öğrenci telefonu.
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
const noTournamentWords = t => !/[İi]lk 2|4 finalist|finale çık|Finale çıkan|puanlar sıfırdan|iki etaba ayrılacak|Finaldesiniz|FİNALDESİNİZ/i.test(t);

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
    check('ayarlar: üç takımda Üç Kampüs modu ve puan biriktirme kuralı anlatılır', /Üç Kampüs — Ortak Yarışma/.test(setTxt) && /birikir/.test(setTxt), setTxt.slice(0, 400));
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
    check('menü: "Üç Kampüs — Ortak Yarışma" modu ve puan biriktirme kuralı başlatmadan önce görünür', /Üç Kampüs — Ortak Yarışma/.test(menuTxt) && /birikir/.test(menuTxt) && /eleme (yok|olmaz)/i.test(menuTxt), menuTxt.slice(0, 600));
    check('menü: turnuva ifadeleri (ilk 2 finale, 4 finalist, puanlar sıfırdan) görünmez', noTournamentWords(menuTxt), menuTxt.slice(0, 600));
    await shot(admin, 'admin-menu-uc-kampus-1366', 1366, 768);

    /* ---------- 4) Gerçek başlatma: 2+1 gruba ayrılmaz ---------- */
    await act(admin, 'newGameYes');
    await waitG(admin, () => S.game.started);
    let g = await G(admin);
    const pin = g.pin;
    check('başlatma: mod yarışma kaydına "shared" olarak sabitlendi', g.mode === 'shared', g.mode);
    check('başlatma: üç takım tek ortak listede; 2+1 gruba ayrılmadı', g.teams.all && g.teams.all.map(t => t.name).join('|') === TEAMS.join('|') && !(g.teams.s1 || []).length && !(g.teams.s2 || []).length && !g.draw, JSON.stringify(g.teams));
    check('başlatma: doğrudan ortak katılım ekranı, puanlar sıfır', g.view === 'teams' && g.teams.all.every(t => t.score === 0));

    const popupP = new Promise(res => admin.once('popup', res));
    await act(admin, 'openStage');
    const stage = await popupP; watch(stage, 'sahne');
    await stage.setViewport({ width: 1920, height: 1080 });
    await stage.waitForSelector('#snd-on'); await clickSel(stage, '#snd-on'); await sleep(1600);
    await waitG(admin, () => StageHost.count() > 0);
    await sleep(600);
    const lobbyTxt = await textOf(stage);
    check('sahne: ortak katılım; üç takım ve birikimli puan kuralı', TEAMS.every(n => lobbyTxt.includes(n)) && /birikir/.test(lobbyTxt), lobbyTxt.slice(0, 400));
    check('sahne katılım: turnuva ifadeleri yok', noTournamentWords(lobbyTxt), lobbyTxt.slice(0, 400));
    await shot(stage, 'sahne-katilim-1920');

    /* ---------- 5) Üç telefon aynı kodla ayrı takım ---------- */
    const phones = [];
    const vps = [{ width: 390, height: 844 }, { width: 360, height: 800 }, { width: 412, height: 915 }];
    for (let i = 0; i < 3; i++){
      const ctx = await browser.createBrowserContext(), p = await ctx.newPage(); watch(p, 'telefon' + 'ABC'[i]);
      await p.setViewport(Object.assign({ isMobile: true, hasTouch: true }, vps[i]));
      await p.goto(`${BASE}/kaplan-arena.html?pin=${pin}`);
      await p.waitForSelector('[data-pl="pick"]');
      phones.push(p);
    }
    const [phA, phB, phC] = phones;
    const pickTxt = await textOf(phA);
    check('telefon: takım seçiminde üç takım ve kapsayıcı ifade', TEAMS.every(n => pickTxt.includes(n)) && /[Tt]akım/.test(pickTxt), pickTxt.slice(0, 300));
    await shot(phA, 'telefon-takim-secimi-390');
    await shot(phB, 'telefon-takim-secimi-360');
    for (let i = 0; i < 3; i++) await pl(phones[i], 'pick', { i });
    await waitG(admin, () => NET.joined && NET.joined[0] && NET.joined[1] && NET.joined[2]);
    check('üç telefon ayrı takımlarını aldı', true);
    let kv = await kvState(pin);
    check('ağ yükü: telefon durumunda üç takım ve mod', kv.st.teams.length === 3 && kv.st.mode === 'shared', JSON.stringify({ teams: kv.st.teams, mode: kv.st.mode }));
    const devs = await Promise.all(phones.map(p => p.evaluate(() => P.dev)));

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
    await api({ fn:'set', pin, path:`answers/${kv.st.qk}/2/sINTRUDER`, value:{ v:'C', t: kv.t, dev:'yabanci-cihaz' } });
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
    check('1. etap soru 1: 20/10/0 (Çifte Puan +20, normal +10)', JSON.stringify(await scores(admin)) === '[20,10,0]', JSON.stringify(await scores(admin)));
    await sleep(1800);
    await shot(stage, 'sahne-puan-tablosu-1920');
    await shot(admin, 'admin-puan-1366', 1366, 768);
    check('telefon A: ÇİFTE PUAN sonucu', (await textOf(phA)).includes('ÇİFTE PUAN'));

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
    check('1. etap sonu: eleme yok, eşitlik sorusu yok, üç takım devam', !g.result.tie && g.result.qualified.length === 3, JSON.stringify(g.result));
    await sleep(500);
    const end1 = await textOf(stage);
    check('sahne 1. etap sonu: üç takımın toplam puanı ve devam mesajı; turnuva ifadeleri yok', /Orman Geçidi Tamamlandı/i.test(end1) && /devam/i.test(end1) && noTournamentWords(end1), end1.slice(0, 500));
    await shot(stage, 'sahne-etap1-sonu-1920');
    const ph1 = await textOf(phC);
    check('telefon 1. etap sonu: toplam ve devam', /Toplam/.test(ph1) && /devam/i.test(ph1) && noTournamentWords(ph1), ph1.slice(0, 300));
    await shot(phC, 'telefon-etap-sonu-412');

    /* ---------- 8) yeniden yükleme: mod, katılımcılar, puanlar korunur ---------- */
    await admin.reload();
    await admin.waitForSelector('[data-act="begin"]');
    await act(admin, 'begin');
    await waitG(admin, () => ui.screen === 'game');
    g = await G(admin);
    check('admin yenileme: mod/katılımcı/puan/aşama korunur', g.mode === 'shared' && g.view === 'stageEnd' && g.teams.all.map(t => t.score).join() === '20,10,0', JSON.stringify({ mode: g.mode, view: g.view, t: g.teams.all }));
    await waitG(admin, () => StageHost.count() > 0, null, 8000);
    check('admin yenileme: sahne yeniden bağlandı', true);
    await act(admin, 'advance');
    await waitG(admin, () => S.game.view === 'teams' && S.game.stage === 1);
    await sleep(900);
    check('2. etap katılım: puanlar sıfırlanmadı (20/10/0)', JSON.stringify(await scores(admin)) === '[20,10,0]', JSON.stringify(await scores(admin)));
    check('2. etap: telefonlar yeniden seçim yapmadan bağlı kaldı', await admin.evaluate(() => !!(NET.joined && NET.joined[0] && NET.joined[1] && NET.joined[2])));
    await shot(stage, 'sahne-etap2-katilim-1920');

    /* ---------- 9) açık yarışmada ayar değişikliği yarışmayı dönüştürmez ---------- */
    r = await setClasses(admin, '9A\n9B\n9C\n10A\n10B');
    const setOpenTxt = await textOf(admin);
    check('ayarlar (açık yarışma): değişikliğin açık yarışmayı etkilemediği belirtilir', /açık yarışmayı etkilemez/i.test(setOpenTxt), setOpenTxt.slice(0, 500));
    await act(admin, 'start');
    await waitG(admin, () => ui.screen === 'game');
    g = await G(admin);
    check('açık yarışmada ayar değişikliği modu ve katılımcıları değiştirmez', /kaydedildi/.test(r.msg) && g.mode === 'shared' && g.teams.all.map(t => t.name).join('|') === TEAMS.join('|'), JSON.stringify({ r, mode: g.mode }));
    await setClasses(admin, TEAMS.join('\n'));
    await act(admin, 'start');

    /* ---------- 10) 2. etap: jokerler yarışma boyunca birer kez ---------- */
    await act(admin, 'startStage');
    await waitG(admin, () => S.game.view === 'question' && S.game.phase === 'ready');
    check('2. etap başlangıcı: puanlar sıfırlanmadı', JSON.stringify(await scores(admin)) === '[20,10,0]', JSON.stringify(await scores(admin)));
    await act(admin, 'showQ');
    await Promise.all(phones.map(p => p.waitForSelector('[data-pl="pick-opt"]')));
    await sleep(500);
    check('telefon A: 1. etapta kullanılan Çifte Puan 2. etapta "kullanıldı"', await phA.evaluate(() => { const b = document.querySelector('[data-pl="jkAsk"][data-j="x2"]'); return !!b && b.disabled && /KULLANILDI/.test(b.textContent); }));
    kv = await kvState(pin);
    await api({ fn:'set', pin, path:`jreq/${kv.st.qk}/0`, value:{ j:'x2', t: kv.t, dev: devs[0] } });
    await waitG(admin, () => S.game.jrej && S.game.jrej[0], null, 6000);
    g = await G(admin);
    check('arena geçişi joker hakkını yenilemez (doğrudan istek reddedildi)', /daha önce kullanıldı/.test(g.jrej[0].why) && g.jokers['Kampüs A'].x2.startsWith('s1_'), JSON.stringify(g.jrej[0]));
    await useJoker(admin, phB, 'double');
    await useJoker(admin, phC, 'x2');
    await pickSend(phB, ['A', 'B']); await pickSend(phC, ['B']); await pickSend(phA, ['D']);
    await sleep(600);
    await phB.reload();
    await phB.waitForFunction(() => /Geçerli cevabınız/.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
    check('telefon B yeniden bağlandı: aynı takım ve gönderilmiş cevap korunur', /Geçerli cevabınız/.test(await textOf(phB)) && (await phB.evaluate(() => P.team)) === 'Kampüs B');
    await reveal(admin);
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    check('2. etap toplamları korunur: 20/20/20 (Çift Cevap +10, Çifte Puan +20)', JSON.stringify(await scores(admin)) === '[20,20,20]', JSON.stringify(await scores(admin)));
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    g = await G(admin);
    check('2. etap eşitliğinde gereksiz eleme/eşitlik sorusu çıkmaz', !g.result.tie && g.result.qualified.length === 3 && !(await admin.$('[data-act="startTie"]')), JSON.stringify(g.result));
    await act(admin, 'advance');
    await waitG(admin, () => S.game.view === 'teams' && S.game.stage === 2);

    /* ---------- 11) final: sıfırlanmaz, lider eşitliği yalnız liderlerle çözülür ---------- */
    await act(admin, 'startStage');
    await waitG(admin, () => S.game.view === 'question');
    check('final öncesi puanlar sıfırlanmaz (20/20/20)', JSON.stringify(await scores(admin)) === '[20,20,20]', JSON.stringify(await scores(admin)));
    const finTxt = await textOf(stage);
    check('sahne final: "puanlar sıfırdan" yazmaz', noTournamentWords(finTxt), finTxt.slice(0, 300));
    await act(admin, 'showQ');
    await Promise.all(phones.map(p => p.waitForSelector('[data-pl="pick-opt"]')));
    await pickSend(phA, ['C']); await pickSend(phB, ['C']); await pickSend(phC, ['A']);
    await sleep(800);
    await reveal(admin);
    await act(admin, 'showScores');
    await waitG(admin, () => S.game.view === 'scoreboard');
    check('final: 30/30/20', JSON.stringify(await scores(admin)) === '[30,30,20]', JSON.stringify(await scores(admin)));
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
    check('eşitlik sorusu: lider olmayan takım cevaplamaz', /yalnız/.test(await textOf(phC)), (await textOf(phC)).slice(0, 200));
    await typeNum(phA, '8800'); await pl(phA, 'send');
    await typeNum(phB, '8000'); await pl(phB, 'send');
    await sleep(900);
    await reveal(admin);
    await act(admin, 'resolveTie');
    await waitG(admin, () => S.game.view === 'stageEnd' && !S.game.result.tie);
    g = await G(admin);
    check('eşitlik çözüldü: A birinci; normal toplamlar değişmedi (30/30/20)', g.result.qualified[0] === 0 && JSON.stringify(await scores(admin)) === '[30,30,20]', JSON.stringify({ q: g.result.qualified, s: await scores(admin) }));
    const order = await admin.evaluate(() => ui.model.board.map(b => b.name));
    check('final sonuç tablosu: eşitliği kazanan önce sıralanır', order[0] === 'Kampüs A' && order[2] === 'Kampüs C', JSON.stringify(order));
    await act(admin, 'advance');
    await waitG(admin, () => S.game.view === 'champion');
    await sleep(800);
    const champTxt = await textOf(stage);
    check('şampiyon: Kampüs A (toplam puan + eşitlik)', /ŞAMPİYON/.test(champTxt) && champTxt.includes('Kampüs A'), champTxt.slice(0, 300));
    await shot(stage, 'sahne-sampiyon-1920');
    await sleep(800);
    check('telefon A: ŞAMPİYONSUNUZ; telefon B: Şampiyon: Kampüs A', /ŞAMPİYONSUNUZ/.test(await textOf(phA)) && /Şampiyon: Kampüs A/.test(await textOf(phB)));
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
    check('4 takım: yeni yarışma iki gruplu turnuva modunda kura ile açılır', tg.mode === 'tournament' && tg.view === 'draw', JSON.stringify({ mode: tg.mode, view: tg.view }));
    if (tg.mode === 'tournament'){
      await act(old, 'drawGo'); await waitG(old, () => S.game.draw && ui.drawShown == null);
      const dg = await G(old);
      check('4 takım: kura 2+2 gruba ayırır', dg.draw.s1.length === 2 && dg.draw.s2.length === 2, JSON.stringify(dg.draw));
      await act(old, 'drawOk');
      const tTxt = await old.evaluate(() => StageView.html(ui.model));
      check('4 takım: sahnede mevcut "İlk 2 sınıf finale çıkar" kuralı korunur', /İlk 2 sınıf finale çıkar/.test(tTxt));
      await old.evaluate(() => ACT.endYes());
    }

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
    check('file:// telefonsuz: üç takım ortak yarışma, admin puanı girer', fg.mode === 'shared' && fg.teams.all[1].score === 10, JSON.stringify(fg.teams.all));
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
