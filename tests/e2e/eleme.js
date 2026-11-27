// Kaplan Arena — eleme yarışması uçtan uca testi (format v4, Kaplan Arenası Yarışma Kuralları 27.11.2026): altı takım 6 → 4 → 2 → şampiyon,
// her turda puan sıfırlama ve joker yenileme, Çift Puan cezasız, finale özel Risk Jokeri, ekran değişikliği (kural 08), karışık tekrarsız sorular,
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
const TEAMS = ['Takım A', 'Takım B', 'Takım C', 'Takım D', 'Takım E', 'Takım F'];
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
  // Kurallar 03: önce özel kaptan giriş kodu, sonra takım seçim ekranında kendi takım adı.
  await ph.waitForSelector('#pl-code', { timeout: 15000 });
  await typeIn(ph, 'pl-code', code);
  if (await ph.$('[data-pl="codeYes"]')) await pl(ph, 'codeYes').catch(() => {});
  await ph.waitForSelector(`[data-pl="pickElim"][data-id="${tid}"]`, { timeout: 15000 });
  await pl(ph, 'pickElim', { id: tid });
}
async function reveal(admin){
  await act(admin, 'revealAsk');
  if (await admin.$('[data-act="revealYes"]')) await act(admin, 'revealYes');
  await waitG(admin, () => S.game.phase === 'revealed');
}
async function hideScreen(ph){
  await ph.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable:true, get:() => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(300);
  await ph.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable:true, get:() => false }); document.dispatchEvent(new Event('visibilitychange')); });
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
        s1: [D('Matematik', 'İki artı iki kaç eder?', ['4', '5', '6', '7'], 'A'), D('Fen Bilimleri', 'Suyun formülü nedir?', ['CO2', 'H2O', 'O2', 'NaCl'], 'B'), D('Türkçe', 'Çalıkuşu romanının yazarı kimdir?', ['Ömer Seyfettin', 'Halide Edib', 'Reşat Nuri Güntekin', 'Yakup Kadri'], 'C'), D('Spor', 'Bir futbol takımı sahaya kaç oyuncuyla çıkar?', ['9', '10', '11', '12'], 'C')],
        s2: [D('Matematik', '  iki ARTI  iki kaç eder ', ['7', '6', '5', '4'], 'D'), D('Sosyal Bilimler', 'Cumhuriyet hangi yıl ilan edildi?', ['1920', '1923', '1919', '1938'], 'B'), D('Spor', 'Voleybolda takım en fazla kaç dokunuşla topu karşıya geçirir?', ['2', '4', '3', '6'], 'C'), D('Fen Bilimleri', 'Güneş Sistemi’nin en büyük gezegeni?', ['Mars', 'Jüpiter', 'Venüs', 'Satürn'], 'B')],
        final: [D('Fen Bilimleri', 'Atom numarası 26 olan element?', ['Bakır', 'Demir', 'Çinko', 'Nikel'], 'B'), D('Türkçe', 'Safahat kimin eseridir?', ['Mehmet Akif Ersoy', 'Necip Fazıl', 'Ziya Paşa', 'Namık Kemal'], 'A'), D('Matematik', 'Bir üçgenin iç açıları toplamı?', ['90', '180', '270', '360'], 'B')],
        tie: [T('Everest kaç metredir?', 8849, 'm'), T('Türkiye kaç ilden oluşur?', 81, ''), T('everest KAÇ metredir', 8849, 'm')]
      };
      S.settings.classes = teams; S.settings.seconds = 40; S.settings.perRound = 3; save();   // test: tur başına 3 soru (kural varsayılanı 10)
    }, TEAMS);
    await act(admin, 'begin');
    const menuTxt = await textOf(admin);
    check('menü: kural 6 → 4 → 2 → şampiyon, puan sıfırlama, joker yenileme, Risk ve ekran kuralı başlatmadan önce görünür', /6 → 4 → 2 → şampiyon/.test(menuTxt) && /puanlar sıfırlanır/.test(menuTxt) && /her yeni turda yenilenir/.test(menuTxt) && /Risk Jokeri/.test(menuTxt) && /ekranından ayrılmak yasaktır/.test(menuTxt), menuTxt.slice(0, 900));
    await shot(admin, 'admin-menu-eleme-1366', 1366, 768);
    const setTxt = await (async () => { await act(admin, 'settings'); const t = await textOf(admin); await act(admin, 'menu'); return t; })();
    check('ayarlar: tur başına soru sayısı alanı (kural 10)', /Tur başına soru sayısı/.test(setTxt) && /6 → 4 → 2/.test(setTxt), setTxt.slice(0, 300));

    await act(admin, 'newGameYes');
    await waitG(admin, () => S.game.started && S.game.mode === 'elim');
    let g = await G(admin);
    const pin = g.pin, codes = g.codes;
    check('başlatma: format v4, kontenjan 4/2/1, kurallar (sıfırlama, joker yenileme, Çift Puan cezasız, Risk, 3 soru/tur) kayda sabit', g.format.v === 4 && JSON.stringify(g.format.quotas) === '[4,2,1]' && g.format.rules.reset && g.format.rules.jokersPerRound && !g.format.rules.x2Loss && g.format.rules.risk && g.format.rules.perRound === 3, JSON.stringify(g.format));
    check('başlatma: kura yok; altı takım aynı ilk turda', g.view === 'teams' && !g.draw && g.rounds[0].ids.length === 6);
    const allCids = ['s1', 's2', 'final', 'tie'].flatMap(k => g.plan[k].map(q => q.cid));
    check('soru planı: farklı kimlikli aynı içerik elendi; yarışma çapında benzersiz', g.planDups === 2 && g.plan.s2.length === 3 && new Set(allCids).size === allCids.length, JSON.stringify({ d:g.planDups, s2:g.plan.s2.length }));
    let all = JSON.stringify(await rows(pin));
    check('herkese açık GET: kaptan kodları ve admin anahtarı yok', !Object.values(codes).some(c => all.includes('"' + c + '"')) && !all.includes(g.akey));

    const popupP = new Promise(res => admin.once('popup', res));
    await act(admin, 'openStage');
    const stage = await popupP; watch(stage, 'sahne');
    await stage.setViewport({ width: 1920, height: 1080 });
    await stage.waitForSelector('#snd-on'); await clickSel(stage, '#snd-on'); await sleep(1500);
    await waitG(admin, () => StageHost.count() > 0);
    await hookAudio(stage);

    const IDS = ['t1', 't2', 't3', 't4', 't5', 't6'], ph = {};
    for (const tid of IDS){
      const p = await (await browser.createBrowserContext()).newPage(); watch(p, 'tel-' + tid);
      await p.setViewport({ width: tid === 't5' ? 360 : 390, height: 800, isMobile:true, hasTouch:true });
      await p.goto(`${BASE}/kaplan-arena.html?pin=${pin}`);
      ph[tid] = p;
    }
    // Önce kod, sonra takım: A'nın kodu girilip B'nin adına dokunulursa reddedilir
    await ph.t1.waitForSelector('#pl-code');
    check('telefon: önce özel kaptan giriş kodu istenir (takım listesi sonra)', !(await ph.t1.$('[data-pl="pickElim"]')) && /Kaptan girişi/.test(await textOf(ph.t1)));
    await shot(ph.t1, 'telefon-kaptan-girisi-390');
    await typeIn(ph.t1, 'pl-code', codes.t1); await pl(ph.t1, 'codeYes');
    await ph.t1.waitForSelector('[data-pl="pickElim"][data-id="t2"]');
    await pl(ph.t1, 'pickElim', { id: 't2' });
    await ph.t1.waitForFunction(() => /takıma ait değil/.test(document.body.innerText), { timeout: 8000 });
    check('telefon: kendi kodu başka takımın adına dokununca reddedilir', true);
    await shot(ph.t1, 'telefon-yanlis-takim-390');
    await pl(ph.t1, 'pickElim', { id: 't1' });
    for (const tid of IDS.slice(1)) await joinTeam(ph[tid], tid, codes[tid]);
    await waitG(admin, () => ['t1', 't2', 't3', 't4', 't5', 't6'].every(t => NET.joined && NET.joined[t]));
    check('altı kaptan telefonu kod + takım seçimiyle bağlandı', true);
    check('ilk turlarda Risk Jokeri yok (iki joker)', (await ph.t1.$$('.ph-jleft span')).length === 2);
    await shot(admin, 'admin-katilim-kaptan-kodlari-1366', 1366, 768);

    const active = () => admin.evaluate(() => curTeams().filter(t => t.status !== 'out').map(t => t.id));
    const qs = [];
    async function playQ(correct, opts){
      opts = opts || {};
      await act(admin, 'showQ');
      const ids = await active();
      await Promise.all(ids.map(t => ph[t].waitForSelector('[data-pl="pick-opt"]:not([disabled])', { timeout: 15000 })));
      const q = await admin.evaluate(() => ({ text:curQ().text, ans:curQ().answer, cid:curQ().cid }));
      qs.push(q);
      for (const [t, j, s] of (opts.jokers || [])){
        await pl(ph[t], 'jkAsk', { j });
        if (j === 'risk') await pl(ph[t], 'riskPick', { v: s });
        await pl(ph[t], 'jkYes');
        await waitG(admin, () => !!S.game.intro, null, 8000); await waitG(admin, () => !S.game.intro && C.isRunning(S.game), null, 9000);
      }
      if (opts.during) await opts.during(q);
      const others = ['A', 'B', 'C', 'D'].filter(L => L !== q.ans);
      for (const t of await active()){
        await ph[t].waitForSelector('[data-pl="pick-opt"]:not([disabled])');
        const dbl = await ph[t].evaluate(() => plMyJoker() === 'double');
        const picks = dbl ? (correct.includes(t) ? [q.ans, others[0]] : [others[0], others[1]]) : [correct.includes(t) ? q.ans : others[0]];
        for (const L of picks) await pl(ph[t], 'pick-opt', { v: L });
        await pl(ph[t], 'send');
      }
      await waitG(admin, () => curTeams().every((t, i) => t.status === 'out' || !!liveAccepted(i)), null, 10000);
      await reveal(admin);
      await act(admin, 'showScores');
      await waitG(admin, () => S.game.view === 'scoreboard');
      return q;
    }
    const sc = () => admin.evaluate(() => Object.fromEntries(curTeams().map(t => [t.id, t.score])));

    /* ---------- Orman Geçidi: 6 takım, 3 soru ---------- */
    await act(admin, 'startStage');
    await playQ(['t3', 't4'], { jokers:[['t1', 'x2'], ['t2', 'double']] });
    g = await G(admin);
    check('Çift Puan yanlış → 0 (puan kaybı yok); Çifte Cevap ikisi de yanlış → −10', g.last.delta[0] === 0 && g.last.delta[1] === -10 && g.last.jk[0] === 'x2', JSON.stringify(g.last));
    await ph.t1.waitForFunction(() => /Çift Puan/.test(document.body.innerText), { timeout: 8000 });
    check('telefon: Çift Puan yanlışta “puan kaybettirmez” sonucu', /puan kaybettirmez/.test(await textOf(ph.t1)));
    await shot(ph.t1, 'telefon-cift-puan-sifir-390');
    await act(admin, 'next');
    await playQ(['t1', 't2', 't3', 't4'], { during: async () => {
      const r = await api({ fn:'cmd', pin, tok:await ph.t1.evaluate(() => P.tok), op:'jk', qk:await admin.evaluate(() => currentQk()), j:'x2', t:Date.now() });
      await waitG(admin, () => S.game.jrej && S.game.jrej[0], null, 6000).catch(() => {});
      const jr = (await G(admin)).jrej[0];
      check('aynı turda ikinci Çift Puan reddedilir (“bu turda zaten kullanıldı”)', r.code === 200 && jr && /bu turda zaten/.test(jr.why), JSON.stringify(jr));
    } });
    await act(admin, 'next');
    await playQ(['t1', 't2', 't5']);
    check('Orman puanları: A20 B10 C20 D20 E10 F0', JSON.stringify(await sc()) === JSON.stringify({ t1:20, t2:10, t3:20, t4:20, t5:10, t6:0 }), JSON.stringify(await sc()));
    check('tur sınırı: bankada 4 soru varken tur 3 soruda biter', await admin.evaluate(() => isLastQ()) && (await textOf(admin)).includes('Turu Bitir'));
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    g = await G(admin);
    check('Orman sonu: 4. sırada B/E eşitliği → yedek soru; eleme kesinleşmedi', g.result.tie && JSON.stringify(g.result.tie.candidates) === '[1,4]' && g.result.tie.slots === 1 && !g.rounds[0].done, JSON.stringify(g.result));
    await act(admin, 'startTie'); await act(admin, 'showQ');
    const tieAns = await admin.evaluate(() => curQ().answer);
    await typeIn(ph.t2, 'pl-num', String(tieAns + 900)); await pl(ph.t2, 'send');
    await typeIn(ph.t5, 'pl-num', String(tieAns + 3)); await pl(ph.t5, 'send');
    await waitG(admin, () => [1, 4].every(i => !!liveAccepted(i)), null, 10000);
    await reveal(admin); await act(admin, 'resolveTie');
    await waitG(admin, () => S.game.view === 'stageEnd' && !S.game.result.tie);
    await admin.evaluate(() => { ACT.revealRound(); ACT.revealRound(); });
    await sleep(500);
    g = await G(admin);
    check('Orman sonucu (çift komut tek eleme): A, C, D, E yükseldi; B ve F elendi', JSON.stringify(g.rounds[0].done.up.slice().sort()) === '["t1","t3","t4","t5"]' && g.elimLog.length === 2, JSON.stringify(g.rounds[0].done));
    await stage.waitForSelector('.sg-show[data-show]');
    await sleep(1800);
    await shot(stage, 'sahne-tur-sonu-gosteri-orta-1920');
    let stTxt = await textOf(stage);
    check('sahne gösterisi: turun ortak kazananları, tur puanı, yükselen/elenen', /TURUN ORTAK KAZANANLARI/.test(stTxt) && /TUR PUANI|tur puanı/.test(stTxt) && /Elendi/.test(stTxt) && /Kadim Kale/.test(stTxt), stTxt.slice(0, 500));
    check('tur gösterisi sesi bir kez çaldı', (await played(stage, 'roundEnd')) === 1);
    await stage.reload(); await stage.waitForSelector('#snd-on'); await clickSel(stage, '#snd-on'); await hookAudio(stage);
    await stage.waitForSelector('.sg-show[data-show]'); await sleep(400);
    const t0 = await stage.evaluate(() => { const e = document.querySelector('.sg-show'); return { t0:e.style.getPropertyValue('--t0'), done:e.classList.contains('done') }; });
    check('sahne yenilenince gösteri kaldığı yerden sürer (baştan değil)', t0.done || parseInt(t0.t0, 10) < -2000, JSON.stringify(t0));
    await sleep(3500);
    g = await G(admin);
    check('gösteri otomatik soru açmaz / tura geçmez; yeniden bağlanan sahne sesi tekrar çalmaz', g.view === 'stageEnd' && g.stage === 0 && (await played(stage, 'roundEnd')) === 0);
    await shot(stage, 'sahne-tur-sonu-son-tablo-1920');
    await shot(admin, 'admin-tur-sonu-1366', 1366, 768);
    await act(admin, 'showReplay'); await sleep(400);
    check('tekrar oynatma: yeni olay, eleme değişmez', (await G(admin)).elimLog.length === 2 && (await played(stage, 'roundEnd')) === 1);
    await act(admin, 'showSkip'); await stage.waitForSelector('.sg-show.done');
    await ph.t6.waitForFunction(() => /Bu turda elendiniz/.test(document.body.innerText), { timeout: 10000 });
    await shot(ph.t6, 'telefon-elendiniz-360');
    const tokB = await ph.t2.evaluate(() => P.tok), devB = await ph.t2.evaluate(() => P.dev);
    await act(admin, 'advance'); await admin.evaluate(() => ACT.advance());
    await waitG(admin, () => S.game.view === 'teams' && S.game.stage === 1);
    g = await G(admin);
    check('Kadim Kale: 4 takım, puanlar sıfırlandı; Orman puanları arşivde', JSON.stringify(g.rounds[1].ids) === JSON.stringify(g.rounds[0].done.up) && Object.values(await sc()).every(v => v === 0) && g.rounds[0].done.totals.t1 === 20, JSON.stringify(await sc()));
    check('jokerler yeni turda yenilendi (önceki tur arşivde)', JSON.stringify(g.jokers) === '{}' && g.rounds[0].jokers.t1.x2);
    let r = await api({ fn:'join', pin, tid:'t2', tok:tokB, dev:devB });
    check('API: elenen B oturumla geri katılamaz', r.code === 403 && r.j.out === true, JSON.stringify(r));
    r = await api({ fn:'join', pin, tid:'t3', code:codes.t3, dev:devB });
    check('API: elenen cihaz aktif takımın kodunu kullanarak geçemez', r.code === 409, JSON.stringify(r));

    /* ---------- Kadim Kale: ekran değişikliği → kural ihlali ---------- */
    await act(admin, 'startStage');
    await playQ(['t1', 't3'], { jokers:[['t1', 'x2']], during: async () => {
      await hideScreen(ph.t5);
      await waitG(admin, () => NET.viol && NET.viol.t5, null, 8000);
      await admin.waitForSelector('[data-act="dqAsk"][data-id="t5"]');
      check('ekran değişikliği algılandı ve admine bildirildi (takım henüz elenmedi)', (await G(admin)).teams.all[4].status === 'active');
      check('telefon E: ekrandan ayrıldığı uyarısı', /yönetime bildirildi/.test(await textOf(ph.t5)));
      await shot(admin, 'admin-ekran-ihlali-1366', 1366, 768);
      await act(admin, 'dqAsk', { id:'t5' }); await act(admin, 'dqYes');
      await waitG(admin, () => S.game.teams.all[4].status === 'out');
    } });
    g = await G(admin);
    check('kural ihlali: E elendi, o sorudan puan almadı; A Çift Puan doğru +20 (joker yenilenmişti)', g.teams.all[4].dq && !(g.last.delta[3] > 0) && g.last.delta[0] === 20, JSON.stringify(g.last.delta));
    await ph.t5.waitForFunction(() => /Yarışmadan elendiniz/.test(document.body.innerText), { timeout: 8000 });
    check('telefon E: kural ihlali elenme ekranı', /kural 08/.test(await textOf(ph.t5)));
    await shot(ph.t5, 'telefon-kural-ihlali-360');
    r = await api({ fn:'cmd', pin, tok:await ph.t5.evaluate(() => P.tok), op:'ans', qk:'x', v:'A', t:Date.now() });
    check('API: ihlal nedeniyle elenen takım cevap gönderemez', r.code === 403 || r.code === 401, JSON.stringify(r));
    await act(admin, 'next');
    await playQ(['t3', 't4']);
    await act(admin, 'next');
    await playQ(['t1']);
    check('Kale puanları: A30 C20 D10 (E ihlal)', JSON.stringify(await sc()) === JSON.stringify({ t1:30, t3:20, t4:10, t5:0 }), JSON.stringify(await sc()));
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    await act(admin, 'revealRound'); await waitG(admin, () => S.game.result.revealed);
    g = await G(admin);
    check('Kale sonucu: A ve C finalde; D ve E (ihlal) elendi', JSON.stringify(g.rounds[1].done.up) === '["t1","t3"]' && g.elimLog.find(e => e.id === 't5').reason === 'dq', JSON.stringify(g.rounds[1].done));
    await act(admin, 'showSkip'); await act(admin, 'advance');
    await waitG(admin, () => S.game.stage === 2 && S.game.view === 'teams');

    /* ---------- Büyük Final: 0 puan, Risk Jokeri ---------- */
    await act(admin, 'startStage');
    await ph.t1.waitForFunction(() => document.querySelectorAll('.ph-jleft span').length === 3, { timeout: 15000 });
    check('finalde üç joker (Risk dahil); puanlar 0 ve jokerler yenilenmiş', JSON.stringify(await sc()) === '{"t1":0,"t3":0}' && !(await textOf(ph.t1)).includes('kullanıldı'), (await textOf(ph.t1)).slice(0, 300));
    await playQ(['t1'], { jokers:[['t1', 'risk', 15], ['t3', 'risk', 10]] });
    g = await G(admin);
    check('Risk Jokeri: A 15 doğru +15, C 10 yanlış −10 (puan eksiye iner)', g.last.delta[0] === 15 && g.last.delta[1] === -10 && JSON.stringify(await sc()) === '{"t1":15,"t3":-10}', JSON.stringify({ d:g.last.delta, s:await sc() }));
    await ph.t1.waitForFunction(() => /RİSK KAZANDI/.test(document.body.innerText), { timeout: 8000 });
    await shot(ph.t1, 'telefon-risk-kazandi-390');
    await act(admin, 'next');
    await playQ(['t3'], { during: async () => {
      check('Risk Jokeri finalde bir kez: ikinci soruda “kullanıldı”', await ph.t1.evaluate(() => { const b = document.querySelector('[data-pl="jkAsk"][data-j="risk"]'); return !!b && b.disabled && /KULLANILDI/.test(b.textContent); }));
      await shot(ph.t1, 'telefon-final-jokerler-390');
    } });
    await act(admin, 'next');
    await playQ([]);
    await act(admin, 'next');
    await waitG(admin, () => S.game.view === 'stageEnd');
    g = await G(admin);
    check('final: A 15, C 0 → A galip (eşitlik yok)', !g.result.tie && JSON.stringify(await sc()) === '{"t1":15,"t3":0}', JSON.stringify(await sc()));
    await act(admin, 'revealRound');
    await waitG(admin, () => S.game.view === 'champion');
    await stage.waitForSelector('.sg-champ.ce'); await sleep(2600);
    await shot(stage, 'sahne-sampiyon-konfeti-1920');
    const ch = await stage.evaluate(() => {
      const a = document.getElementById('champ'), cv = document.querySelector('[data-fxslot] canvas');
      let px = 0; if (cv){ const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) px++; }
      return { src:a.currentSrc || a.getAttribute('src'), paused:a.paused, vol:a.volume, loop:a.loop, t:a.currentTime, px, starts:(window.KA_DIAG || {}).champStarts || 0, text:document.body.innerText, pods:[...document.querySelectorAll('.sg-pod:not(.empty)')].length };
    });
    check('şampiyon A; podyum şampiyon + finalist (Kale’de iki takım elendiği için üçüncü uydurulmadı)', /Takım A/.test(ch.text) && /ŞAMPİYON/.test(ch.text) && ch.pods === 2, ch.text.slice(0, 300));
    check('şampiyonluk müziği gerçek dosyadan, döngüde, düşük seviyede', /sampiyon-muzik\.m4a/.test(ch.src) && !ch.paused && ch.loop && ch.t > 0.5 && ch.vol > 0.05 && ch.vol <= 0.8 * 0.55 + 0.01, JSON.stringify(ch));
    check('konfeti çiziliyor ve bir kez başladı', ch.px > 5 && ch.starts === 1, JSON.stringify({ px:ch.px, s:ch.starts }));
    await admin.evaluate(() => { S.settings.title = 'Kaplan Arena Final'; save(); render(); }); await sleep(800);
    check('yeniden çizim konfetiyi yeniden başlatmaz', await stage.evaluate(() => KA_DIAG.champStarts) === 1);
    await admin.evaluate(() => { S.settings.sound = false; save(); render(); });
    await stage.waitForFunction(() => document.getElementById('champ').paused, { timeout: 5000 }).catch(() => {});
    check('ses kapalıyken müzik durur', await stage.evaluate(() => document.getElementById('champ').paused));
    await admin.evaluate(() => { S.settings.sound = true; save(); render(); });
    await ph.t1.waitForFunction(() => /ŞAMPİYONSUNUZ/.test(document.body.innerText), { timeout: 8000 });
    await shot(ph.t1, 'telefon-sampiyon-390');
    await shot(admin, 'admin-sampiyon-1366', 1366, 768);
    await act(admin, 'welcome');
    await stage.waitForFunction(() => document.getElementById('champ').paused, { timeout: 6000 }).catch(() => {});
    check('şampiyonluk ekranından çıkınca müzik durur', await stage.evaluate(() => document.getElementById('champ').paused));

    /* ---------- eski kurallı (v3) devam eden kayıt dönüştürülmez ---------- */
    const old = await (await browser.createBrowserContext()).newPage(); watch(old, 'eski');
    await old.setViewport({ width:1366, height:768 });
    await old.goto(BASE + '/'); await old.waitForSelector('[data-act="begin"]');
    await old.evaluate(() => {
      const s = JSON.parse(localStorage.getItem(KEY)); s.schema = 2;
      s.game = Object.assign(newGame(), { started:true, pin:'565656', mode:'shared', roster:['K1', 'K2', 'K3'], view:'teams', stage:1, teams:{ s1:[], s2:[], final:[], all:[{ name:'K1', score:30 }, { name:'K2', score:20 }, { name:'K3', score:10 }] } });
      localStorage.setItem(KEY, JSON.stringify(s));
    });
    await old.reload(); await old.waitForSelector('[data-act="begin"]'); await act(old, 'begin'); await act(old, 'menu');
    const og = await G(old), otx = await textOf(old);
    check('eski kayıt: kural/puan korunur, açıkça bildirilir, yedek alındı', og.mode === 'shared' && og.teams.all[0].score === 30 && /Eski kurallarla süren yarışma/.test(otx) && await old.evaluate(() => !!localStorage.getItem(KEY + '-yedek-sema2')));

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
