// Ara döngüsünü Chrome'da <video loop> ile gerçek hızda en az 3 tur oynatır ve sarma anlarını ölçer.
// Ölçülen: tur sayısı, sarmada mediaTime sırası (29,967 → 0,000 → 0,033), bekleme/takılma olayları, atlanan kare.
// Not: Bu otomatik ölçümdür; salonda gözle izlemenin yerine geçmez.
// Kullanım: NODE_PATH=<puppeteer-core node_modules> node dongu-oynat.js
const path = require('path'), fs = require('fs');
const puppeteer = require('puppeteer-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const VID = path.resolve(__dirname, '..', 'ciktilar', 'ara-30sn-loop.mp4').replace(/\\/g, '/');
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 720 });
  await p.goto('file:///' + VID);
  await p.evaluate(() => new Promise(r => { const v = document.querySelector('video'); if (v.readyState >= 2) r(); else v.addEventListener('loadeddata', r, { once: true }); }));
  const res = await p.evaluate(() => new Promise(resolve => {
    const v = document.querySelector('video');
    v.loop = true; v.muted = true; v.currentTime = 0;
    const ev = { waiting: 0, stalled: 0 }; v.addEventListener('waiting', () => ev.waiting++); v.addEventListener('stalled', () => ev.stalled++);
    const wraps = [], gaps = []; let last = null, lastPF = null, lastNow = null, dropped = 0, frames = 0;
    const tick = (now, md) => {
      frames++;
      if (lastPF != null && md.presentedFrames - lastPF > 1) dropped += md.presentedFrames - lastPF - 1;
      const gap = lastNow == null ? null : now - lastNow;
      if (last != null && md.mediaTime < last - 1) wraps.push({ before: +last.toFixed(4), after: +md.mediaTime.toFixed(4), gapMs: +gap.toFixed(1) });
      else if (gap != null) gaps.push(gap);
      last = md.mediaTime; lastPF = md.presentedFrames; lastNow = now;
      if (wraps.length >= 3) { v.pause(); gaps.sort((a, b) => a - b); return resolve({ wraps, ev, dropped, frames, duration: v.duration, normalGapMs: { median: +gaps[gaps.length >> 1].toFixed(1), p99: +gaps[Math.floor(gaps.length * 0.99)].toFixed(1), max: +gaps[gaps.length - 1].toFixed(1) } }); }
      v.requestVideoFrameCallback(tick);
    };
    v.requestVideoFrameCallback(tick);
    v.play();
    setTimeout(() => resolve({ wraps, ev, dropped, frames, duration: v.duration, timeout: true }), 130000);
  }));
  await b.close();
  // Chrome döngü başında 0'a arama yapar ve 'waiting' olayı verebilir; ölçüt görünür sonuçtur: sarma anındaki kare aralığı
  // normal oynatımın en büyük aralığını aşmamalı ve atlanan kare olmamalı.
  res.ok = !res.timeout && res.wraps.length >= 3 && res.wraps.every(w => w.before > 29.9 && w.after < 0.05 && w.gapMs <= Math.max(res.normalGapMs.max, 50)) && res.dropped === 0;
  console.log(JSON.stringify(res, null, 1));
  fs.writeFileSync(path.join(__dirname, 'dongu-oynatim-sonucu.json'), JSON.stringify(Object.assign({ tarih: new Date().toISOString() }, res), null, 1));
  process.exit(res.ok ? 0 : 1);
})();
