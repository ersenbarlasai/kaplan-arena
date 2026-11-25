// Kaplan Arena — çalışma kipleri: dosyadan açma (file://, internetsiz) ve PowerShell yerel ağ sunucusu.
// Çalıştırma: NODE_PATH=<puppeteer-core node_modules> node tests/e2e/modes.js
// Canlı Vercel/Redis'e istek gönderilmez: file:// testinde vercel.app istekleri engellenir.
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'tasarim', 'ekran-goruntuleri');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const results = [];
function check(name, ok, detail){ results.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail != null && !ok ? ' :: ' + detail : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function clickSel(page, sel){ await page.waitForSelector(sel, { timeout: 15000 }); for (let k = 0; k < 20; k++){ if (await page.evaluate(q => { const el = document.querySelector(q); if (!el) return false; el.click(); return true; }, sel)){ await sleep(250); return; } await sleep(100); } throw new Error('tıklanamadı ' + sel); }
const act = (p, n) => clickSel(p, `[data-act="${n}"]:not([disabled])`);
async function openStage(admin){ const pp = new Promise(r => admin.once('popup', r)); const s = '[data-act="openStage"]'; await admin.waitForSelector(s); await admin.click(s); return pp; }

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  let ps = null;
  try{
    /* ---------- 1) file:// internetsiz ---------- */
    const ctx = await browser.createBrowserContext();
    const admin = await ctx.newPage();
    await admin.setRequestInterception(true);
    admin.on('request', r => { if (/vercel\.app/.test(r.url())) r.abort('internetdisconnected'); else r.continue(); });
    await admin.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await admin.setViewport({ width: 1366, height: 860 });
    const fileUrl = 'file:///' + path.join(ROOT, 'kaplan-arena.html').replace(/\\/g, '/');
    await admin.goto(fileUrl);
    await admin.waitForSelector('[data-act="begin"]');
    await sleep(2500);
    const fonts = await admin.evaluate(async () => { await document.fonts.ready; return ['700 20px Cinzel', '800 20px Alegreya', '700 16px "Alegreya Sans"'].map(f => document.fonts.check(f, 'ğşİıçöü')); });
    check('file://: yerel fontlar (Türkçe glifler) yüklendi', fonts.every(Boolean), JSON.stringify(fonts));
    const imgs = await admin.evaluate(() => [...document.images].filter(i => i.src.includes('assets/')).map(i => i.complete && i.naturalWidth > 0));
    check('file://: görsel varlıklar yüklendi', imgs.length > 0 && imgs.every(Boolean), JSON.stringify(imgs));
    const bgOk = await admin.evaluate(() => new Promise(r => { const im = new Image(); im.onload = () => r(im.naturalWidth > 0); im.onerror = () => r(false); im.src = 'assets/img/karsilama.webp'; }));
    check('file://: sahne arka planı yüklenebilir', bgOk);
    await act(admin, 'begin');
    const off = await admin.evaluate(() => ({ ok: NET.ok, txt: document.body.innerText }));
    check('file:// internetsiz: telefon katılımı varmış gibi gösterilmez', off.ok === false && /Telefon bağlantısı yok/.test(off.txt) && !/Kod \d{3} \d{3}/.test(off.txt));
    const stage = await openStage(admin);
    await stage.setViewport({ width: 1366, height: 768 });
    await clickSel(stage, '#snd-off');
    await stage.waitForFunction(() => document.querySelector('.sgs-map'), { timeout: 8000 });
    check('file://: ayrı sahne penceresi postMessage ile bağlandı', await admin.evaluate(() => StageHost.count() === 1));
    await act(admin, 'newGameYes');
    await act(admin, 'drawGo'); await admin.waitForFunction(() => S.game.draw && ui.drawShown == null);
    await act(admin, 'drawOk'); await act(admin, 'startStage'); await act(admin, 'showQ');
    await stage.waitForFunction(() => document.querySelector('.sgs-question'), { timeout: 8000 });
    check('file://: sahne soruyu gösterdi (telefonsuz yarışma)', true);
    await sleep(400); await stage.screenshot({ path: path.join(SHOTS, 'dosyadan-acma-sahne-1366x768.png') });
    await act(admin, 'revealAsk'); await act(admin, 'revealYes');
    await admin.evaluate(() => { ui.guesses[0] = '1350'; ui.guesses[1] = '1200'; render(); });
    await act(admin, 'showScores');
    check('file://: telefonsuz puanlama (admin girişi)', await admin.evaluate(() => S.game.teams.s1[0].score === 10));
    await admin.screenshot({ path: path.join(SHOTS, 'admin-telefonsuz-puan-1366.png') });
    await ctx.close();

    /* ---------- 2) PowerShell yerel ağ sunucusu ---------- */
    ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'kaplan-sunucu.ps1')], { env: Object.assign({}, process.env, { KAPLAN_NO_BROWSER: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; ps.stdout.on('data', d => out += d);
    let port = null;
    for (let k = 0; k < 60 && !port; k++){ await sleep(500); const m = out.match(/localhost:(\d+)\//); if (m) port = m[1]; }
    check('yerel sunucu başladı', !!port, out.slice(-300));
    const B = `http://localhost:${port}`;
    const mt = async (p) => { const r = await fetch(B + p); return [r.status, r.headers.get('content-type') || '']; };
    const want = { '/app/core.js': 'text/javascript', '/app/style.css': 'text/css', '/assets/fonts/fonts.css': 'text/css', '/assets/img/orman.webp': 'image/webp', '/assets/arma/arma-ay.svg': 'image/svg+xml', '/assets/fonts/cinzel-latin-wght-normal.woff2': 'font/woff2', '/assets/fonts/OFL-Cinzel.txt': 'text/plain', '/': 'text/html' };
    for (const [p, ct] of Object.entries(want)){ const [st, c] = await mt(p); check(`yerel sunucu ${p} → 200 ${ct}`, st === 200 && c.startsWith(ct), st + ' ' + c); }
    for (const p of ['/.env.local', '/.git/config', '/app/../.env.local', '/assets/../kaplan-sunucu.ps1', '/%2e%2e/%2e%2e/Windows/win.ini', '/assets/..%2f..%2f.env.local', '/tasarim/oneri.html', '/api/ka.js', '/kaplan-sunucu.ps1', '/app/.hidden.js']){
      const [st] = await mt(p); check(`yerel sunucu reddeder: ${p}`, [400, 403, 404].includes(st), st);
    }
    // kısa yarışma: admin (localhost) + sahne + telefon (?pin)
    const ctx2 = await browser.createBrowserContext();
    const a2 = await ctx2.newPage(); await a2.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await a2.goto(B + '/'); await a2.waitForSelector('[data-act="begin"]');
    await sleep(1200);
    check('yerel sunucu: admin yerel ağ kipinde', await a2.evaluate(() => NET.ok && NET.mode === 'lan'));
    await act(a2, 'begin'); await act(a2, 'newGameYes');
    const st2 = await openStage(a2); await clickSel(st2, '#snd-off');
    await act(a2, 'drawGo'); await a2.waitForFunction(() => S.game.draw && ui.drawShown == null); await act(a2, 'drawOk');
    const pin = await a2.evaluate(() => S.game.pin);
    const ctx3 = await browser.createBrowserContext(); const ph = await ctx3.newPage();
    await ph.setViewport({ width: 360, height: 800, isMobile: true });
    await ph.goto(`${B}/kaplan-arena.html?pin=${pin}`);
    await clickSel(ph, '[data-pl="pick"][data-i="0"]');
    await act(a2, 'startStage'); await act(a2, 'showQ');
    await ph.waitForSelector('#pl-num:not([disabled])', { timeout: 10000 });
    await ph.evaluate(() => { const el = document.getElementById('pl-num'); el.value = '1355'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await clickSel(ph, '[data-pl="send"]:not([disabled])');
    await a2.waitForFunction(() => liveAccepted(0) != null, { timeout: 10000 });
    check('yerel sunucu: telefon cevabı yetkili olarak kabul edildi', true);
    await act(a2, 'revealAsk'); await act(a2, 'revealYes'); await act(a2, 'showScores');
    check('yerel sunucu: puan uygulandı', await a2.evaluate(() => S.game.teams.s1[0].score === 10));
    await st2.waitForFunction(() => document.querySelector('.sgs-scores'), { timeout: 8000 });
    check('yerel sunucu: sahne puan tablosunu gösterdi', true);
    await ctx2.close(); await ctx3.close();
  }catch(e){ check('kip senaryosu istisnasız tamamlandı', false, e.stack || e.message); }
  finally{
    if (ps){ try{ spawn('taskkill', ['/pid', String(ps.pid), '/T', '/F']); }catch(e){} }
    fs.writeFileSync(path.join(__dirname, 'son-rapor-kipler.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
    const fail = results.filter(r => !r.ok).length;
    console.log(`\n${results.length - fail}/${results.length} kontrol geçti`);
    await browser.close(); process.exit(fail ? 1 : 0);
  }
})();
