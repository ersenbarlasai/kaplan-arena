// Kaplan Arena kılavuzu: kilavuz.html → ../KAPLAN-ARENA-KILAVUZ.pdf (Chrome ile, A4, sayfa numaralı).
// Kullanım: NODE_PATH=<puppeteer-core node_modules> node tasarim/kilavuz/pdf-uret.js
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SRC = path.join(__dirname, 'kilavuz.html');
const OUT = path.join(__dirname, '..', 'KAPLAN-ARENA-KILAVUZ.pdf');
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  const bad = [];
  p.on('requestfailed', r => bad.push(r.url()));
  await p.goto('file:///' + SRC.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); });
  const broken = await p.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.getAttribute('src')));
  // Boyut: ekran görüntüleri basmadan önce sayfa içinde en çok 1500 px genişliğe küçültülüp JPEG'e çevrilir (logo PNG'si kalır).
  await p.evaluate(() => Promise.all([...document.images].filter(i => !/logo[^/]*\.png$/i.test(i.getAttribute('src'))).map(i => new Promise(res => {
    const w = Math.min(1500, i.naturalWidth), h = Math.round(i.naturalHeight * w / i.naturalWidth);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(i, 0, 0, w, h);
    i.onload = res; i.src = c.toDataURL('image/jpeg', 0.82);
  }))));
  await p.pdf({
    path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font-size:7.5pt;color:#5b6b67;padding:0 16mm;display:flex;justify-content:space-between;font-family:Segoe UI,sans-serif"><span>Kaplan Arena — Kullanım ve Teknik Kılavuz</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await b.close();
  console.log(JSON.stringify({ out: OUT, kirikGorsel: broken, basarisizIstek: bad }));
  process.exit(broken.length ? 1 : 0);
})();
