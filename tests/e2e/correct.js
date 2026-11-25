// Kaplan Arena — "Doğru Bilenler" gösterimi senaryosu (admin + sahne + iki telefon; bellek kipi API).
// Çalıştırma: NODE_PATH=<puppeteer-core node_modules> node tests/e2e/correct.js
const path = require('path'), fs = require('fs');
const puppeteer = require('puppeteer-core');
const { start } = require('./server.js');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'tasarim', 'ekran-goruntuleri');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 3090, BASE = `http://localhost:${PORT}`;
const results = [];
function check(name, ok, detail){ results.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail != null && !ok ? ' :: ' + detail : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(body){ const r = await fetch(BASE + '/api/ka', { method:'POST', body:JSON.stringify(body) }); return r.json(); }
async function kv(pin){ const j = await api({ fn:'get', pins:[pin], since:0 }); const row = j.rows.find(r => r.p === 'state'); return { st: row ? row.v : null, t: j.t }; }
async function clickSel(page, sel){ await page.waitForSelector(sel, { timeout: 15000 }); for (let k = 0; k < 20; k++){ if (await page.evaluate(q => { const el = document.querySelector(q); if (!el) return false; el.click(); return true; }, sel)){ await sleep(200); return; } await sleep(100); } throw new Error('tıklanamadı ' + sel); }
const sel = (a, n, d) => `[data-${a}="${n}"]${d ? Object.entries(d).map(([k, v]) => `[data-${k}="${v}"]`).join('') : ''}:not([disabled])`;
const act = (p, n, d) => clickSel(p, sel('act', n, d));
const pl = (p, n, d) => clickSel(p, sel('pl', n, d));
const G = p => p.evaluate(() => JSON.parse(JSON.stringify(S.game)));
const waitG = (p, fn, ms) => p.waitForFunction(fn, { timeout: ms || 20000, polling: 100 });
const shot = async (p, n, w, h) => { if (w) await p.setViewport({ width: w, height: h }); await sleep(350); await p.screenshot({ path: path.join(SHOTS, n + '.png') }); };
const scores = p => p.evaluate(() => S.game.teams.s1.map(t => t.score));
const played = (st, k) => st.evaluate(kind => window.__snd.filter(x => x.k === kind && x.ok).length, k);
const inCount = st => st.evaluate(() => document.querySelectorAll('.sg-cor-item.in').length);
const corNames = st => st.evaluate(() => [...document.querySelectorAll('.sg-cor-item')].map(e => e.dataset.cor));
async function hookAudio(st){ await st.evaluate(() => { window.__snd = []; const p = StageAudio.play; StageAudio.play = k => { const ok = p(k); window.__snd.push({ k, ok, t: Date.now() }); return ok; }; }); }

(async () => {
  const srv = await start(PORT);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  const watch = (p, tag) => { p.on('pageerror', e => errors.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(tag + ': ' + m.text()); }); };
  try{
    const ctxA = await browser.createBrowserContext(), admin = await ctxA.newPage(); watch(admin, 'admin');
    await admin.setViewport({ width: 1366, height: 900 });
    await admin.goto(BASE + '/'); await admin.waitForSelector('[data-act="begin"]');
    await admin.evaluate(() => {
      const D = (t, o, a) => ({ id: uid(), type:'ders', subject:'Genel Kültür', text:t, options:o, answer:a });
      const T = (t, a, u) => ({ id: uid(), type:'tahmin', text:t, answer:a, unit:u || '' });
      const o = ['Mars', 'Jüpiter', 'Venüs', 'Satürn'];
      S.questions = { s1: [
        D('Tek doğru: Güneş Sistemi’nin en büyük gezegeni hangisidir?', o, 'B'),
        D('Çoklu doğru ve jokerler: Halkalarıyla ünlü gezegen hangisidir?', o, 'D'),
        T('Eşit uzaklıkta en yakın tahminler: 100 sayısı?', 100, 'puan'),
        D('Hiç doğru yok: Kızıl gezegen hangisidir?', o, 'A'),
        D('İptal: Sabah yıldızı olarak bilinen gezegen?', o, 'C'),
        D('Yeniden bağlantı: En büyük gezegen?', o, 'B'),
        D('Azaltılmış hareket: Halkalı gezegen?', o, 'D'),
        D('Ses kapalı: Kızıl gezegen?', o, 'A'),
        D('On bir sınıf doğru: En büyük gezegen?', o, 'B') ], s2: [D('x', o, 'A')], final: [D('y', o, 'A')], tie: [T('z', 1)] };
      S.settings.classes = ['9-A', '9-B', '9-C', '9-D', '10-A', '10-B', '10-C', '10-D', '11-A Fen Bilimleri', '11-B', '11-C', '12-A', '12-B', '12-C', '12-D', '9-E', '9-F', '10-E', '10-F', '11-D', '11-E', '12-E'];
      S.settings.seconds = 60; S.settings.reduceMotion = true; syncEmblems(); save();
    });
    await act(admin, 'begin'); await act(admin, 'newGameYes');
    const pp = new Promise(r => admin.once('popup', r)); await admin.click('[data-act="openStage"]');
    let stage = await pp; watch(stage, 'sahne'); await stage.setViewport({ width: 1920, height: 1080 });
    await hookAudio(stage); await clickSel(stage, '#snd-on'); await sleep(1500);
    await act(admin, 'drawGo'); await waitG(admin, () => S.game.draw && ui.drawShown == null); await act(admin, 'drawOk');
    await admin.evaluate(() => { S.settings.reduceMotion = false; save(); });
    const pin = await admin.evaluate(() => S.game.pin);
    const teams = (await G(admin)).teams.s1.map(t => t.name);
    check('1. etapta 11 sınıf', teams.length === 11, teams.length);
    const ctxB = await browser.createBrowserContext(), ctxC = await browser.createBrowserContext();
    const phB = await ctxB.newPage(), phC = await ctxC.newPage(); watch(phB, 'telB'); watch(phC, 'telC');
    for (const p of [phB, phC]) await p.setViewport({ width: 390, height: 844, isMobile: true });
    await phB.goto(`${BASE}/kaplan-arena.html?pin=${pin}`); await phC.goto(`${BASE}/kaplan-arena.html?pin=${pin}`);
    await pl(phB, 'pick', { i: 0 }); await pl(phC, 'pick', { i: 1 });
    await waitG(admin, () => NET.joined && NET.joined[0] && NET.joined[1]);
    await hookAudio(admin).catch(() => {});
    const answerApi = async (i, v) => { const k = await kv(pin); await api({ fn:'set', pin, path:`answers/${k.st.qk}/${i}/s${i}x`, value:{ v, t: k.t, dev:'tel' + i } }); };
    const phoneAns = async (p, letters) => { for (const L of letters) await pl(p, 'pick-opt', { v: L }); await pl(p, 'send'); };
    const openQ = async () => { await act(admin, 'showQ'); await waitG(admin, () => S.game.phase === 'open' && C.isRunning(S.game)); await sleep(900); };
    const reveal = async () => { await act(admin, 'revealAsk'); await act(admin, 'revealYes'); return Date.now(); };
    const useJoker = async (p, j) => { await pl(p, 'jkAsk', { j }); await pl(p, 'jkYes'); await waitG(admin, () => S.game.intro, 8000); await waitG(admin, () => !S.game.intro && C.isRunning(S.game), 9000); await sleep(900); };

    /* ---- S1: tek doğru, zamanlama, puan yalnız Puanları Göster'de ---- */
    await act(admin, 'startStage'); await openQ();
    await phoneAns(phB, ['B']); await phoneAns(phC, ['A']); await sleep(1000);
    const sc0 = await scores(admin), snd0 = await played(stage, 'entry');
    const t0 = await reveal();
    const samples = [];
    while (Date.now() - t0 < 3500){ samples.push([Date.now() - t0, await inCount(stage), await stage.evaluate(() => !!document.querySelector('.sg-opt.correct'))]); await sleep(120); }
    const first = samples.find(s => s[1] >= 1);
    check('S1: doğru şık önce altınla belirginleşir, arma ~1,3 sn sonra girer', samples[0][2] && first && first[0] >= 900 && first[0] <= 2400, JSON.stringify(first));
    check('S1: tek doğru bilen gösterildi', JSON.stringify(await corNames(stage)) === JSON.stringify([teams[0]]));
    check('S1: giriş sesi bir kez (yalnız sahne)', (await played(stage, 'entry')) - snd0 === 1);
    check('S1: gösterim sırasında puan değişmedi', JSON.stringify(await scores(admin)) === JSON.stringify(sc0));
    let k = await kv(pin);
    check('S1: telefona doğru bilenler gitti, puan değişimi gitmedi', JSON.stringify(k.st.correct) === '[0]' && k.st.lastDelta === null);
    await phB.waitForFunction(() => document.body.innerText.includes('DOĞRU BİLDİNİZ'), { timeout: 6000 });
    check('S1: telefonda puan açıklanmadı', !(await phB.evaluate(() => /\+10|\+20/.test(document.body.innerText))));
    check('S1: sahnede +10/toplam açıklanmadı', !(await stage.evaluate(() => /Puan Durumu|\+10/.test(document.body.innerText))));
    await shot(stage, 'dogru-bilenler-tek-1920');
    await act(admin, 'showScores'); await sleep(250);
    const mid = await stage.evaluate(() => { const el = document.querySelector('.sg-row-b .sc[data-from]'); return el ? [+el.dataset.from, +el.dataset.to, +el.textContent] : null; });
    await sleep(1700);
    const fin = await stage.evaluate(() => { const el = document.querySelector('.sg-row-b .sc[data-from]'); return el ? +el.textContent : null; });
    check('S1: Puanları Göster ile toplam sayılarak güncellendi', mid && mid[0] === 0 && mid[1] === 10 && mid[2] < 10 && fin === 10, JSON.stringify([mid, fin]));
    await admin.evaluate(() => { S.game.view = 'question'; S.game.phase = 'revealed'; ACT.showScores(); ACT.showScores(); });
    check('S1: puan yalnız bir kez uygulandı', JSON.stringify((await scores(admin)).slice(0, 2)) === '[10,0]');
    await shot(stage, 'dogru-bilenler-puan-1920');

    /* ---- S2: çoklu doğru, kararlı sıra, Çift Cevap ve ×2 mührü ---- */
    await act(admin, 'next'); await openQ();
    await answerApi(3, 'D'); await sleep(400);            // 3. sınıf ilk cevaplayan
    await useJoker(phB, 'x2'); await phoneAns(phB, ['D']);
    await useJoker(phC, 'double'); await phoneAns(phC, ['A', 'D']);
    await answerApi(2, 'D'); await answerApi(4, 'B'); await sleep(1100);
    const snd1 = await played(stage, 'entry');
    const t1 = await reveal();
    const seen = [];
    while (Date.now() - t1 < 5500){ const c = await inCount(stage); if (seen[seen.length - 1] !== c) seen.push(c); await sleep(100); }
    check('S2: armalar tek tek girdi (artan sayım)', JSON.stringify(seen.filter(x => x > 0)) === '[1,2,3,4]', JSON.stringify(seen));
    check('S2: sıra sınıf sırası, cevap hızı değil', JSON.stringify(await corNames(stage)) === JSON.stringify([teams[0], teams[1], teams[2], teams[3]]));
    check('S2: Çift Cevap ile doğru sınıf gösterildi (2 Şık)', await stage.evaluate(n => { const e = document.querySelector(`.sg-cor-item[data-cor="${n}"]`); return !!e && !!e.querySelector('.tag'); }, teams[1]));
    check('S2: Çifte Puan ile doğru sınıfta ×2 mührü', await stage.evaluate(n => { const e = document.querySelector(`.sg-cor-item[data-cor="${n}"]`); return !!e && e.classList.contains('x2') && !!e.querySelector('.seal'); }, teams[0]));
    check('S2: her giriş için bir ses', (await played(stage, 'entry')) - snd1 === 4);
    await shot(stage, 'dogru-bilenler-coklu-jokerler-1920');
    await shot(phB, 'telefon-dogru-bildiniz-x2-390');
    const sc2 = await scores(admin);
    await act(admin, 'showScores');
    const g2 = await G(admin);
    check('S2: puanlar ×2 (+20), çift cevap +10, normal +10', g2.last.delta[0] === 20 && g2.last.delta[1] === 10 && g2.last.delta[2] === 10 && g2.last.delta[3] === 10 && (await scores(admin))[0] === sc2[0] + 20, JSON.stringify(g2.last.delta));

    /* ---- S3: tahmin, eşit uzaklıkta en yakınlar; gösterim sırasında admin ilerler ---- */
    await act(admin, 'next'); await openQ();
    await answerApi(2, 90); await answerApi(3, 110); await answerApi(5, 150);
    await phB.waitForSelector('#pl-num:not([disabled])'); await phB.evaluate(() => { const el = document.getElementById('pl-num'); el.value = '200'; el.dispatchEvent(new Event('input', { bubbles: true })); }); await pl(phB, 'send');
    await sleep(1100);
    const snd3 = await played(stage, 'entry');
    await reveal(); await sleep(400);
    check('S3: doğru sayısal cevap altınla vurgulandı', await stage.evaluate(() => !!document.querySelector('.sg-reveal.gold')));
    await sleep(1300);
    check('S3: en yakın eşit uzaklıktaki iki sınıf (tahminleriyle)', JSON.stringify(await corNames(stage)) === JSON.stringify([teams[2], teams[3]]) && await stage.evaluate(() => [...document.querySelectorAll('.sg-cor-item .gs')].map(e => e.textContent).join() === '90,110'));
    await shot(stage, 'dogru-bilenler-tahmin-1920');
    await act(admin, 'showScores');                       // animasyon sürerken ilerle
    const afterAdvance = await played(stage, 'entry');
    await sleep(3000);
    check('S3: ilerleyince kalan giriş sesleri ekrana taşmadı', (await played(stage, 'entry')) === afterAdvance && afterAdvance - snd3 <= 2, afterAdvance - snd3);
    check('S3: animasyon kendiliğinden soru geçişi yapmadı', (await G(admin)).view === 'scoreboard');

    /* ---- S4: hiç doğru yok ---- */
    await act(admin, 'next'); await openQ();
    await phoneAns(phB, ['B']); await answerApi(4, 'C'); await sleep(1000);
    const snd4 = await played(stage, 'entry'), sc4 = await scores(admin);
    await reveal(); await sleep(2500);
    check('S4: "Bu soruda doğru cevap gelmedi" ve kutlama yok', await stage.evaluate(() => document.body.innerText.includes('Bu soruda doğru cevap gelmedi') && !document.querySelector('.sg-cor-item')) && (await played(stage, 'entry')) === snd4);
    await phB.waitForFunction(() => /doğru cevap gelmedi|Bu kez olmadı/.test(document.body.innerText), { timeout: 6000 }).catch(() => {});
    await shot(stage, 'dogru-bilenler-yok-1920');
    check('S4: puan değişmedi (gösterimde)', JSON.stringify(await scores(admin)) === JSON.stringify(sc4));
    await act(admin, 'showScores'); await act(admin, 'next');

    /* ---- S5: gösterim sırasında iptal ---- */
    await openQ(); await answerApi(2, 'C'); await answerApi(3, 'C'); await answerApi(4, 'C'); await sleep(1100);
    const sc5 = await scores(admin);
    await reveal(); await sleep(1500);
    const snd5 = await played(stage, 'entry');
    await act(admin, 'cancelAsk'); await act(admin, 'cancelYes');
    await sleep(3000);
    check('S5: iptal gösterimi durdurdu, ses taşmadı, puan yok', (await played(stage, 'entry')) === snd5 && await stage.evaluate(() => document.body.innerText.includes('Soru iptal edildi')) && JSON.stringify(await scores(admin)) === JSON.stringify(sc5));
    await act(admin, 'next');

    /* ---- S6: sahne yeniden bağlanır ve admin sayfası yenilenir ---- */
    await openQ(); await answerApi(2, 'B'); await answerApi(5, 'B'); await answerApi(6, 'B'); await sleep(1100);
    await reveal(); await sleep(5000);
    const listBefore = await corNames(stage);
    await stage.close();
    await sleep(1500);
    const pp2 = new Promise(r => admin.once('popup', r)); await admin.click('[data-act="openStage"]');
    stage = await pp2; watch(stage, 'sahne2'); await stage.setViewport({ width: 1920, height: 1080 });
    await hookAudio(stage); await clickSel(stage, '#snd-on'); await sleep(2500);
    check('S6: yeniden açılan sahnede güncel sonuç geri geldi', JSON.stringify(await corNames(stage)) === JSON.stringify(listBefore) && (await inCount(stage)) === listBefore.length);
    check('S6: yeniden bağlanınca giriş/açıklama sesleri tekrar çalmadı', (await played(stage, 'entry')) === 0 && (await played(stage, 'reveal')) === 0);
    check('S6: yeniden bağlanınca giriş animasyonu tekrar oynamadı', await stage.evaluate(() => !document.querySelector('.sg-cor-item.fx') && !document.querySelector('.sg.rv-anim')));
    const sc6 = await scores(admin);
    await admin.reload(); await admin.waitForSelector('[data-act="begin"]'); await act(admin, 'begin');
    await waitG(admin, () => StageHost.count() > 0, 8000); await sleep(2000);
    check('S6: admin yenilenince açıklama görünümü korundu, puan uygulanmadı', (await G(admin)).phase === 'revealed' && JSON.stringify(await corNames(stage)) === JSON.stringify(listBefore) && JSON.stringify(await scores(admin)) === JSON.stringify(sc6));
    check('S6: admin yenilemesi sahnede ses tetiklemedi', (await played(stage, 'entry')) === 0);
    await act(admin, 'showScores');
    check('S6: puan bir kez uygulandı', JSON.stringify(await scores(admin)) !== JSON.stringify(sc6) && (await G(admin)).last.delta[2] === 10);
    await act(admin, 'next');

    /* ---- S7: azaltılmış hareket ---- */
    await admin.evaluate(() => { S.settings.reduceMotion = true; save(); });
    await openQ(); await answerApi(2, 'D'); await answerApi(3, 'D'); await answerApi(5, 'D'); await sleep(1100);
    const snd7 = await played(stage, 'entry');
    await reveal(); await sleep(500);
    check('S7: azaltılmış harekette hepsi birlikte, animasyonsuz', (await inCount(stage)) === 3 && await stage.evaluate(() => !document.querySelector('.sg-cor-item.fx')));
    await sleep(2500);
    check('S7: azaltılmış harekette giriş sesi yok', (await played(stage, 'entry')) === snd7);
    await shot(stage, 'dogru-bilenler-azaltilmis-hareket-1920');
    await act(admin, 'showScores'); await act(admin, 'next');
    await admin.evaluate(() => { S.settings.reduceMotion = false; save(); });

    /* ---- S8: ses kapalı ---- */
    await admin.evaluate(() => { S.settings.sound = false; save(); });
    await openQ(); await answerApi(2, 'A'); await answerApi(3, 'A'); await sleep(1100);
    const att8 = await stage.evaluate(() => window.__snd.length);
    await reveal(); await sleep(4500);
    const s8 = await stage.evaluate(n => window.__snd.slice(n), att8);
    check('S8: ses kapalıyken hiçbir ses çalmadı', s8.length > 0 && s8.every(x => !x.ok), JSON.stringify(s8));
    check('S8: ses kapalıyken gösterim yine çalıştı', (await inCount(stage)) === 2);
    await admin.evaluate(() => { S.settings.sound = true; save(); });
    await act(admin, 'showScores'); await act(admin, 'next');

    /* ---- S9: on bir sınıf doğru, okunaklı yerleşim ---- */
    await openQ();
    for (let i = 2; i < 11; i++) await answerApi(i, 'B');
    await phoneAns(phB, ['B']); await phoneAns(phC, ['B']); await sleep(1100);
    await reveal(); await sleep(5200);
    check('S9: 11 doğru bilenin hepsi göründü', (await inCount(stage)) === 11);
    for (const [w, h] of [[1920, 1080], [1366, 768], [1024, 768]]){
      await shot(stage, `dogru-bilenler-11-sinif-${w}x${h}`, w, h);
      const fit = await stage.evaluate(() => {
        const items = [...document.querySelectorAll('.sg-cor-item')];
        const inView = items.every(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; });
        const notClipped = items.every(e => { const n = e.querySelector('.nm'); return n.scrollWidth <= n.clientWidth + 1; });
        const card = document.querySelector('.sg-card').getBoundingClientRect(), panel = document.querySelector('.sg-cor').getBoundingClientRect();
        return inView && notClipped && card.bottom <= panel.top + 2;
      });
      check(`S9: ${w}×${h} armalar/adlar ekranda, kırpılmadan, soru kartıyla çakışmadan`, fit);
    }
    await stage.setViewport({ width: 1920, height: 1080 });
    await act(admin, 'showScores');
    await shot(stage, 'dogru-bilenler-11-sinif-puan-1920');
    await shot(admin, 'admin-dogru-bilenler-1366', 1366, 900);
    check('admin ve telefon ses üretmedi', await phB.evaluate(() => typeof window.__snd === 'undefined') && await admin.evaluate(() => typeof window.__snd === 'undefined'));
    check('tarayıcı sayfa hatası yok', errors.length === 0, errors.slice(0, 5).join(' | '));
  }catch(e){ check('senaryo istisnasız tamamlandı', false, e.stack || e.message); }
  finally{
    fs.writeFileSync(path.join(__dirname, 'son-rapor-dogru-bilenler.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
    const fail = results.filter(r => !r.ok).length;
    console.log(`\n${results.length - fail}/${results.length} kontrol geçti`);
    await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
  }
})();
