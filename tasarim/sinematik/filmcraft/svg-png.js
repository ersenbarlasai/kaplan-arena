// SVG katmanlarını şeffaf PNG'ye çevirir (FilmCraft 0.20.1 SVG içe aktarmıyor: probe → "unrecognised format").
// Çizim aynıdır; yalnız raster biçime geçirilir. Gerekli: puppeteer-core + Google Chrome (CHROME ortam değişkeni ile değiştirilebilir).
// Kullanım: NODE_PATH=<puppeteer-core node_modules> node svg-png.js
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'katmanlar');
const out = path.join(__dirname, 'katmanlar-png');
const jobs = [
  // [ad, svg dosyası veya inline svg, genişlik, yükseklik]
  ['sis-seridi', fs.readFileSync(src + '/sis-seridi.svg', 'utf8'), 1920, 1080],
  ['isik-huzmeleri', fs.readFileSync(src + '/isik-huzmeleri.svg', 'utf8'), 1920, 1080],
  ['altin-toz', fs.readFileSync(src + '/altin-toz.svg', 'utf8'), 1920, 1080],
  ['temas-kivilcim', fs.readFileSync(src + '/temas-kivilcim.svg', 'utf8'), 1280, 720],
  ['baslik-cerceve', fs.readFileSync(src + '/baslik-cerceve.svg', 'utf8'), 1920, 1080],
];
// Ara döngüsü için yatayda 1920 px periyotla kendini tekrarlayan, sis-seridi.svg ile aynı biçimde sis bandı
const ell = [[120,860,500,85],[840,950,630,95],[1660,815,540,80]];
let e2 = '';
for (const k of [-1,0,1,2]) for (const [cx,cy,rx,ry] of ell) e2 += `<ellipse cx="${cx+k*1920}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
jobs.push(['sis-dongu-3840', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3840 1080"><defs><filter id="b" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="40"/></filter></defs><g fill="#bdcfc0" opacity=".14" filter="url(#b)">${e2}</g></svg>`, 3840, 1080]);
(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const p = await b.newPage();
  for (const [name, svg, w, h] of jobs) {
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    const s = svg.replace('<svg ', `<svg width="${w}" height="${h}" `);
    await p.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`);
    await p.screenshot({ path: path.join(out, name + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    console.log('ok', name, w, h);
  }
  await b.close();
})();
