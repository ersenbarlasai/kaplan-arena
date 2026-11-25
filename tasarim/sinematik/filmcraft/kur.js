// Kaplan Arena — FilmCraft proje kurucusu.
// FilmCraft 0.20.1'i `filmcraft-cli mcp` (stdio) üzerinden sürer; bütün kurgu, katmanlama,
// geçiş, ses otomasyonu ve miks FilmCraft komutlarıyla yapılır. Çıktı: düzenlenebilir .fcproj.
//
// Kullanım:  node kur.js acilis   |   node kur.js ara   |   node kur.js dogrula <proje.fcproj>
// (Gerekli: Node 18+, FilmCraft 0.20.1 kurulu.)
'use strict';
const fs = require('fs');
const path = require('path');
const { FCClient } = require('./fcmcp');

const HERE = __dirname.replace(/\\/g, '/');            // .../tasarim/sinematik/filmcraft
const SIN = path.posix.dirname(HERE);                   // .../tasarim/sinematik
const T = 254016000000;                                 // FilmCraft tick / saniye
const FPS = 30;
const FT = T / FPS;                                     // tick / kare
const F = 1920 / 1672 * 100;                            // 1672 px kaynağı 1920 genişliğe doldurma ölçeği
const SRC_W = 1672, SRC_H = 941;
const fr = s => Math.round(s * FPS);                    // saniye → kare
const tk = s => fr(s) * FT;                             // saniye → kare hizalı tick
const tks = s => Math.round(s * T);                     // saniye → tick (kare hizasız; ses otomasyonu)
const PREVIEW_DIR = process.env.KAPLAN_ONIZLEME || '';

let c, call, run;
async function open() {
  c = new FCClient(); await c.init();
  call = async (name, args) => { const r = await c.req('tools/call', { name, arguments: args }); if (r.error) throw new Error(name + ' ' + JSON.stringify(r.error)); return r.result; };
  run = async (id, params) => {
    const r = await call('command_run', { id, params });
    const t = (r.content || []).map(x => x.text || '').join('');
    if (r.isError) throw new Error(id + ' ' + JSON.stringify(params).slice(0, 300) + ' → ' + t.slice(0, 600));
    if (!t) return null; try { return JSON.parse(t); } catch { return t; }
  };
}
const seqInspect = async () => JSON.parse((await call('sequence_inspect', {})).content[0].text);
async function fxIndex(clip, effectId) {
  const seq = await seqInspect();
  for (const tr of [...seq.video, ...seq.audio]) for (const it of tr.items) if (it.clip === clip) {
    const i = it.effects.findIndex(e => e.effect === effectId); if (i >= 0) return i;
  }
  throw new Error('efekt yok ' + effectId + ' @' + clip);
}
async function frame(sec, out) {
  const r = await call('render_frame', { seconds: sec, max_side: 1280 });
  const img = (r.content || []).find(x => x.type === 'image');
  if (img) fs.writeFileSync(out, Buffer.from(img.data, 'base64'));
}
// ---- yardımcılar -------------------------------------------------------
const lerp = (a, b, u) => a + (b - a) * u;
const place = async (item, track, sec, durSec, extra = {}) => {
  const p = { item, track, time: tk(sec), insert: false, ...extra };
  if (durSec != null) p.duration = { frame: fr(durSec) };
  return (await run('timeline.place', p)).clips[0];
};
const kf = (clip, effect, param, value, sec) => run('effects.setParam', { clip, effect, param, value, time: tk(sec), keyframe: true });
const setp = (clip, effect, param, value) => run('effects.setParam', { clip, effect, param, value });
async function addFx(clip, effectId, params) {
  await run('effects.apply', { clips: [clip], effect: effectId });
  const idx = await fxIndex(clip, effectId);
  for (const [k, v] of Object.entries(params || {})) await setp(clip, idx, k, v);
  return idx;
}
const gain = (clip, db) => run('clip.audioGain', { clips: [clip], mode: 'set', db });

// ---- AÇILIŞ -------------------------------------------------------------
// Her plan: k = doldurma ölçeğine göre çarpan, d = merkezden kaydırma (px). Değerler [start-0.5, end+0.5]
// aralığında doğrusal; geçişlerde hareket donmasın diye anahtar kareler klip sınırının yarım saniye dışına konur.
const SHOTS = [
  { id: '01', img: 'sahneler/01-dunya-kesfi.png', s: 0, e: 6, k: [1.01, 1.06], d0: [0, 0], d1: [0, -10] },
  { id: '02', img: 'sahneler/02-kaplan-yolculuk.png', s: 6, e: 12, k: [1.09, 1.09], d0: [70, 0], d1: [-70, 0] },
  { id: '03', img: 'sahneler/03-kale-kapisi.png', s: 12, e: 18, k: [1.01, 1.075], d0: [0, 0], d1: [0, 0] },
  { id: '04', img: 'sahneler/04-turnuva-karsilasma.png', s: 18, e: 24, k: [1.03, 1.075], d0: [0, 0], d1: [0, 0] },
  { id: '05', img: 'sahneler/05-kilic-temasi.png', s: 24, e: 27, k: [1.04, 1.06], d0: [10, 0], d1: [-10, 0] },
  { id: '06', img: 'sahneler/06-kalkan-temasi.png', s: 27, e: 31, k: [1.08, 1.08], d0: [55, 0], d1: [-55, 0] },
  { id: '07', img: 'sahneler/07-arenaya-giris.png', s: 31, e: 38, k: [1.01, 1.09], d0: [0, 0], d1: [0, 0] },
  { id: '08', img: 'sahneler/08-arena-ihtisam.png', s: 38, e: 44, k: [1.10, 1.10], d0: [0, -50], d1: [0, 50] },
  { id: '09', img: 'sahneler/09-kaplan-kukreme.png', s: 44, e: 48, k: [1.01, 1.04], d0: [0, 0], d1: [0, 0] },
  { id: '10', img: 'sahneler/10-final-kunye.png', s: 48, e: 60, k: [1.03, 1.01], d0: [0, 0], d1: [0, 0] },
];
// Temas anları: plan, zaman (s), kaynak görüntüde temas noktası (oran), darbe büyüklüğü, kıvılcım dönüşü
const CONTACTS = [
  { shot: '04', t: 22.0, u: 0.505, v: 0.43, kick: 0.018, rot: 0 },
  { shot: '05', t: 24.2, u: 0.500, v: 0.405, kick: 0.022, rot: 20 },
  { shot: '06', t: 28.0, u: 0.720, v: 0.47, kick: 0.016, rot: -12 },
];
function base(sh, t) {
  const t0 = sh.s - 0.5, t1 = sh.e + 0.5, u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return { k: lerp(sh.k[0], sh.k[1], u), dx: lerp(sh.d0[0], sh.d1[0], u), dy: lerp(sh.d0[1], sh.d1[1], u) };
}
function mapPoint(sh, t, uu, vv) {
  const b = base(sh, t), S = F * b.k / 100;
  return [960 + b.dx + (uu * SRC_W - SRC_W / 2) * S, 540 + b.dy + (vv * SRC_H - SRC_H / 2) * S];
}

async function buildOpening(outPath) {
  await open();
  await run('file.newProject', { name: 'kaplan-arena-acilis' });
  const seqId = (await run('file.newSequence', { name: 'Acilis 60sn', width: 1920, height: 1080, fps: 30, sampleRate: 48000, video: 7, audio: 7 })).sequence;
  await run('sequence.settings', { maxRenderQuality: true });
  const bin = async name => { const r = await run('file.newBin', { name }); return r ? (r.bin ?? r.item ?? r.id ?? null) : null; };
  const bins = { sah: await bin('Sahneler'), kat: await bin('Katmanlar'), muz: await bin('Muzik'), sfx: await bin('SFX') };
  const imp = async (paths, b) => (await run('file.import', { paths: paths.map(p => SIN + '/' + p), ...(b != null ? { bin: b } : {}) })).items;
  const shotItems = await imp(SHOTS.map(s => s.img), bins.sah);
  const [fog, rays, dust, spark] = await imp(['filmcraft/katmanlar-png/sis-seridi.png', 'filmcraft/katmanlar-png/isik-huzmeleri.png', 'filmcraft/katmanlar-png/altin-toz.png', 'filmcraft/katmanlar-png/temas-kivilcim.png'], bins.kat);
  const [music] = await imp(['girdiler/acilis-muzik.wav'], bins.muz);
  const SFX = {};
  const sfxNames = ['kilic-temas-kayit-foley', 'kalkan-vurus-kayit-foley', 'savurma-gercek', 'kilic-suruntu-gercek', 'zincir-gercek', 'kapi-acilis-kayit-foley', 'kapi-gicirti-gercek', 'kukreme-kullanici'];
  const sfxIds = await imp(sfxNames.map(n => 'ses-gercek/hazir/' + n + '.wav'), bins.sfx);
  sfxNames.forEach((n, i) => SFX[n] = sfxIds[i]);
  [SFX['baslik-vurgusu']] = await imp(['ses-taslaklari/baslik-vurgusu-01.wav'], bins.sfx);

  const VN = ['Sahneler', 'Atmosfer', 'Kivilcim-Isik', 'Kapi isigi', 'Baslik', 'Kunye', 'Vinyet'];
  for (let i = 0; i < VN.length; i++) await run('timeline.setTrack', { track: 'V' + (i + 1), name: VN[i] });
  const AN = ['Muzik', 'SFX Temas', 'SFX Savurma', 'SFX Surtunme-Zincir', 'SFX Kapi', 'SFX Kapi gicirti', 'SFX Kukreme-Baslik'];
  for (let i = 0; i < AN.length; i++) await run('timeline.setTrack', { track: 'A' + (i + 1), name: AN[i] });

  // --- V1: planlar ve 2.5D kamera hareketi
  const shotClip = {};
  for (let i = 0; i < SHOTS.length; i++) {
    const sh = SHOTS[i];
    const cl = await place(shotItems[i], 'V1', sh.s, sh.e - sh.s);
    shotClip[sh.id] = cl;
    const t0 = sh.s - 0.5, t1 = sh.e + 0.5;
    const pts = [t0, t1];
    const pulses = CONTACTS.filter(x => x.shot === sh.id);
    // ölçek ve konum anahtar kareleri (doğrusal taban + temas darbesi)
    const sKeys = new Map(), pKeys = new Map();
    for (const t of pts) { const b = base(sh, t); sKeys.set(fr(t), F * b.k); pKeys.set(fr(t), [960 + b.dx, 540 + b.dy]); }
    for (const p of pulses) {
      const cf = fr(p.t);
      const kick = [[-1, 0], [0, 0], [1, p.kick], [3, p.kick * 0.45], [7, 0]];
      for (const [o, kk] of kick) { const b = base(sh, (cf + o) / FPS); sKeys.set(cf + o, F * b.k * (1 + kk)); }
      const shake = [[-1, 0, 0], [0, 0, 0], [1, 7, -5], [2, -6, 4], [3, 4, -2], [5, -2, 1], [7, 0, 0]];
      for (const [o, sx, sy] of shake) { const b = base(sh, (cf + o) / FPS); pKeys.set(cf + o, [960 + b.dx + sx, 540 + b.dy + sy]); }
    }
    for (const [f, v] of [...sKeys].sort((a, b) => a[0] - b[0])) await kf(cl, 'motion', 'scale', +v.toFixed(3), f / FPS);
    const static_ = sh.d0[0] === sh.d1[0] && sh.d0[1] === sh.d1[1] && !pulses.length;
    if (static_) await setp(cl, 'motion', 'position', [960 + sh.d0[0], 540 + sh.d0[1]]);
    else for (const [f, v] of [...pKeys].sort((a, b) => a[0] - b[0])) await kf(cl, 'motion', 'position', [+v[0].toFixed(2), +v[1].toFixed(2)], f / FPS);
  }
  // siyahtan açılış
  await kf(shotClip['01'], 'opacity', 'opacity', 0, 0);
  await kf(shotClip['01'], 'opacity', 'opacity', 100, 0.9);
  // geçişler (kesmeler bilinçli: 18 kapı → turnuva, 24/27 temas planları, 44 kükreme)
  const dissolve = async (inShot, frames) => run('sequence.applyVideoTransition', { clip: shotClip[inShot], effect: 'cross_dissolve', frames, edge: 'in', align: 'center' });
  await dissolve('02', 20); await dissolve('03', 16); await dissolve('07', 10); await dissolve('08', 24); await dissolve('10', 20);

  // --- V2: atmosfer (sis, ışık huzmeleri) Screen karışımıyla
  const fogA = await place(fog, 'V2', 0, 18);
  await setp(fogA, 'opacity', 'blend', 'Screen');
  await setp(fogA, 'motion', 'scale', 106);
  await kf(fogA, 'motion', 'position', [1010, 548], 0); await kf(fogA, 'motion', 'position', [910, 548], 18);
  await kf(fogA, 'opacity', 'opacity', 0, 0); await kf(fogA, 'opacity', 'opacity', 100, 1.5);
  await kf(fogA, 'opacity', 'opacity', 100, 17.3); await kf(fogA, 'opacity', 'opacity', 0, 18);
  const raysA = await place(rays, 'V2', 31, 13);
  await setp(raysA, 'opacity', 'blend', 'Screen');
  await setp(raysA, 'motion', 'scale', 108);
  await kf(raysA, 'motion', 'position', [940, 540], 31); await kf(raysA, 'motion', 'position', [990, 540], 44);
  for (const [t, o] of [[31, 0], [32, 40], [35.5, 58], [38, 42], [41, 60], [43.4, 50], [44, 0]]) await kf(raysA, 'opacity', 'opacity', o, t);
  await addFx(raysA, 'gaussian_blur', { blurriness: 38 });
  const fogB = await place(fog, 'V2', 48, 12);
  await setp(fogB, 'opacity', 'blend', 'Screen');
  await setp(fogB, 'motion', 'scale', 106);
  await kf(fogB, 'motion', 'position', [1000, 552], 48); await kf(fogB, 'motion', 'position', [930, 552], 60);
  await kf(fogB, 'opacity', 'opacity', 0, 48); await kf(fogB, 'opacity', 'opacity', 85, 49.5);

  // --- V3: temas kıvılcımları ve arena tozu
  for (const p of CONTACTS) {
    const sh = SHOTS.find(s => s.id === p.shot);
    const [x, y] = mapPoint(sh, p.t, p.u, p.v);
    const sc = await place(spark, 'V3', p.t, 14 / FPS);
    await setp(sc, 'opacity', 'blend', 'Linear Dodge (Add)');
    await setp(sc, 'motion', 'position', [+x.toFixed(1), +y.toFixed(1)]);
    await setp(sc, 'motion', 'rotation', p.rot);
    await kf(sc, 'motion', 'scale', 36, p.t); await kf(sc, 'motion', 'scale', 64, p.t + 13 / FPS);
    await kf(sc, 'opacity', 'opacity', 100, p.t); await kf(sc, 'opacity', 'opacity', 85, p.t + 3 / FPS); await kf(sc, 'opacity', 'opacity', 0, p.t + 13 / FPS);
  }
  const dustA = await place(dust, 'V3', 31, 17);
  await setp(dustA, 'opacity', 'blend', 'Screen');
  await setp(dustA, 'motion', 'scale', 110);
  await kf(dustA, 'motion', 'position', [960, 600], 31); await kf(dustA, 'motion', 'position', [975, 470], 48);
  for (const [t, o] of [[31, 0], [32.5, 80], [43.5, 90], [47.4, 70], [48, 0]]) await kf(dustA, 'opacity', 'opacity', o, t);

  // --- V3/V4: kapı aralığından sızan ışık (kapıyı bozmadan "ışık aralığı ve kes")
  const sh03 = SHOTS.find(s => s.id === '03');
  const seam = async (track, w, h, color, blur, opac, widen) => {
    const g = await run('graphics.newRectangle', { position: [960, 529], size: [w, h], seconds: 5.1, track, time: tk(12.9) });
    await run('graphics.set', { clip: g.clip, layer: 0, props: { fill_color: color } });
    await setp(g.clip, 'opacity', 'blend', 'Screen');
    await addFx(g.clip, 'gaussian_blur', { blurriness: blur });
    await setp(g.clip, 'motion', 'uniform_scale', false);
    for (const [t, o, wd] of [[12.9, 0, 1], [13.0, 0, 1], [13.5, opac * 0.55, 1.15], [16.8, opac * 0.8, widen * 0.9], [17.07, opac, widen], [18.0, opac, widen * 1.05]]) {
      const k = base(sh03, t).k / sh03.k[0];
      await kf(g.clip, 'opacity', 'opacity', +o.toFixed(1), t);
      await kf(g.clip, 'motion', 'scale', +(100 * k).toFixed(2), t);
      await kf(g.clip, 'motion', 'scale_width', +(100 * k * wd).toFixed(2), t);
    }
    return g.clip;
  };
  await seam(2, 8, 800, '#ffe4a6', 5, 85, 3.2);     // V3 çekirdek ışık
  await seam(3, 70, 830, '#ffc964', 45, 55, 2.4);   // V4 parıltı

  // --- V5: başlık (09'da sol boşlukta doğar, 48'de üst-orta güvenli alana taşınır)
  const title = await run('graphics.newText', { text: 'KAPLAN ARENA', position: [960, 250], size: 124, font: 'Cinzel', fontStyle: 'Black', seconds: 60 - 44.9, track: 4, time: tk(44.9) });
  await run('graphics.set', { clip: title.clip, layer: 0, props: { align: 'center', tracking: 40, fill_kind: 'Linear Gradient', gradient_start: '#fbe7b0', gradient_end: '#c8933c', gradient_angle: 90, shadow: true, shadow_color: '#06191b', shadow_opacity: 85, shadow_distance: 6, shadow_blur: 24 } });
  await run('graphics.newText', { clip: title.clip, text: 'Efsaneye Yolculuk', position: [960, 336], size: 62, font: 'Marcellus SC', fontStyle: 'Regular' });
  await run('graphics.set', { clip: title.clip, layer: 1, props: { align: 'center', tracking: 60, fill_color: '#f4e8c8', shadow: true, shadow_color: '#06191b', shadow_opacity: 85, shadow_distance: 4, shadow_blur: 18 } });
  await run('graphics.set', { clip: title.clip, layer: 0, props: { stroke: true, stroke_color: '#2b1a06', stroke_width: 3, stroke_type: 'Outer' } });
  await run('graphics.set', { clip: title.clip, layer: 1, props: { stroke: true, stroke_color: '#10282a', stroke_width: 2, stroke_type: 'Outer' } });
  // açık gökyüzünde okunurluk için başlığın arkasına yumuşak koyu zemin (V4)
  const back = await run('graphics.newEllipse', { position: [960, 268], size: [1500, 330], seconds: 12.5, track: 3, time: tk(47.5) });
  await run('graphics.set', { clip: back.clip, layer: 0, props: { fill_color: '#03141a' } });
  await addFx(back.clip, 'gaussian_blur', { blurriness: 90 });
  await kf(back.clip, 'opacity', 'opacity', 0, 47.5); await kf(back.clip, 'opacity', 'opacity', 64, 48.6);
  const tc = title.clip;
  await kf(tc, 'motion', 'position', [560, 687.5], 44.9); await kf(tc, 'motion', 'position', [560, 687.5], 47.5); await kf(tc, 'motion', 'position', [960, 540], 48.6);
  await kf(tc, 'motion', 'scale', 75, 44.9); await kf(tc, 'motion', 'scale', 75, 47.5); await kf(tc, 'motion', 'scale', 100, 48.6);
  await kf(tc, 'opacity', 'opacity', 0, 44.9); await kf(tc, 'opacity', 'opacity', 100, 45.7);
  await run('sequence.applyVideoTransition', { clip: tc, effect: 'light_sweep', frames: 30, edge: 'in', align: 'start' });

  // --- V6: künye paneli (en geç 49,4 s'de tamamen yerleşir; 60 s'ye kadar ~10,6 s okunur)
  const cr = await run('graphics.newRectangle', { position: [960, 752], size: [1560, 404], seconds: 60 - 48.3, track: 5, time: tk(48.3) });
  await run('graphics.set', { clip: cr.clip, layer: 0, props: { fill_color: '#0a2a2d', opacity: 86, corner_radius: 22, stroke: true, stroke_color: '#c9a45a', stroke_width: 2, stroke_type: 'Inner' } });
  const line = async (text, y, size, font, style, color, extra = {}) => {
    const r = await run('graphics.newText', { clip: cr.clip, text, position: [960, y], size, font, fontStyle: style });
    await run('graphics.set', { clip: cr.clip, layer: r.layer, props: { align: 'center', fill_color: color, ...extra } });
  };
  await line('Düzenleyen: Kaplan Okulları Yapayzeka Kulübü', 628, 46, 'Segoe UI', 'Semibold', '#f6ecd2');
  await line('MENTÖRLER', 702, 30, 'Marcellus SC', 'Regular', '#e2bd6c', { tracking: 220 });
  await line('Ersen BARLAS    ·    Alp Han KOÇDEMİR', 754, 42, 'Segoe UI', 'Semibold', '#f6ecd2');
  await line('ÖĞRENCİLER', 824, 30, 'Marcellus SC', 'Regular', '#e2bd6c', { tracking: 220 });
  await line('Emre Burak Tölegen   ·   Burak Yoğurtçu   ·   Halil Mert ACAR   ·   Yekta Efe Konuk', 876, 36, 'Segoe UI', 'Regular', '#f6ecd2');
  await line('Çınar Arda   ·   Yusuf Emir Kuş   ·   Ömer Araf Boncuk   ·   Emir Karatay', 926, 36, 'Segoe UI', 'Regular', '#f6ecd2');
  await kf(cr.clip, 'opacity', 'opacity', 0, 48.3); await kf(cr.clip, 'opacity', 'opacity', 100, 49.4);
  await kf(cr.clip, 'motion', 'position', [960, 556], 48.3); await kf(cr.clip, 'motion', 'position', [960, 540], 49.4);

  // --- V7: vinyet ayar katmanı
  const adjItem = (await run('file.newAdjustmentLayer', { seconds: 60, ...(bins.kat != null ? { bin: bins.kat } : {}) })).item;
  const adj = await place(adjItem, 'V7', 0, 60);
  await addFx(adj, 'vignette', { amount: -32, midpoint: 58, roundness: 0, feather: 75 });

  // --- SES: A1 müzik, A2–A7 kayıt temelli efektler (transient tam temas karesine)
  const mus = await place(music, 'A1', 0, null);
  await gain(mus, -2);
  const sfx = async (name, track, eventSec, sourceIn, db) => {
    const extra = sourceIn ? { sourceIn: { seconds: sourceIn } } : {};
    const cl = (await run('timeline.place', { item: SFX[name], track, time: tks(eventSec), insert: false, ...extra })).clips[0];
    if (db) await gain(cl, db);
    return cl;
  };
  // Temas (transient 46 ms'de; 40 ms kırpılarak darbe 22,000 / 24,200 / 28,000 s karesine oturur)
  await sfx('kilic-temas-kayit-foley', 'A2', 22.0, 0.040, 8);
  await sfx('kilic-temas-kayit-foley', 'A2', 24.2, 0.040, 8);
  await sfx('kalkan-vurus-kayit-foley', 'A2', 28.0, 0.040, 11);
  // Savurma: tepe (155 ms) temastan ~120 ms önce; 31 s geçişinde tepe kesmeye
  await sfx('savurma-gercek', 'A3', 21.88 - 0.155, 0, 6);
  await sfx('savurma-gercek', 'A3', 27.88 - 0.155, 0, 6);
  await sfx('savurma-gercek', 'A3', 31.0 - 0.155, 0, 3);
  // Kılıç sürtünmesi temas sonrası, zincir kapı açılmadan önce
  await sfx('kilic-suruntu-gercek', 'A4', 22.12 - 0.158, 0, 3);
  await sfx('kilic-suruntu-gercek', 'A4', 24.32 - 0.158, 0, 3);
  await sfx('zincir-gercek', 'A4', 11.6, 0, -2);
  // Kapı: hareket 13,0 s'de başlar, ana darbe (4,07 s) 17,07 s'deki ışık parlamasına denk gelir
  await sfx('kapi-acilis-kayit-foley', 'A5', 13.0, 0, 5);
  await sfx('kapi-gicirti-gercek', 'A6', 13.0 - 0.045, 0, 2);
  // Kükreme (kullanıcı seçimi): başlangıç transient'i 44,3 s'de; başlık vurgusu 48,0 s
  await sfx('kukreme-kullanici', 'A7', 44.3 - 0.161, 0, 4);
  await sfx('baslik-vurgusu', 'A7', 48.0 - 0.008, 0, 1);

  // Müzik ducking (A1 hacim otomasyonu; yumuşak rampalar)
  const duck = [[0, 0],
    [12.6, 0], [12.95, -5], [14.4, -5], [15.2, -1.5], [16.8, -1.5], [17.02, -5], [17.6, -5], [18.3, 0],
    [21.5, 0], [21.8, -6], [22.8, -6], [23.3, -3], [23.95, -6], [25.0, -6], [25.6, 0],
    [27.45, 0], [27.75, -6], [28.8, -6], [29.4, 0],
    [30.65, 0], [30.9, -4], [31.5, -4], [32.0, 0],
    [43.3, 0], [44.15, -6], [45.9, -6], [46.9, -1.5],
    [47.7, -1.5], [47.95, -4], [48.7, -4], [49.4, 0], [60, 0]];
  await run('mixer.writeAutomation', { strip: 'A1', lane: 'volume', points: duck.map(([t, v]) => [tks(t), v]) });
  // Arena yankısı (ambiyans) submix: efektlerden ve müzikten küçük gönderim; müzik bittikten sonra doğal kuyruk
  const s1 = await run('mixer.addSubmix', { name: 'Arena yankisi (ambiyans)', channels: 'Stereo' });
  await run('mixer.addInsert', { strip: s1.ref, effect: 'convolution_reverb' });
  await run('mixer.setInsert', { strip: s1.ref, slot: 0, params: { impulse: 2, mix: 100, predelay: 18, damping_hf: 7000, damping_lf: 120 } });
  await run('mixer.addSend', { strip: 'A1', target: s1.ref, levelDb: -20 });
  for (const a of ['A2', 'A3', 'A4', 'A5', 'A6']) await run('mixer.addSend', { strip: a, target: s1.ref, levelDb: -13 });
  await run('mixer.addSend', { strip: 'A7', target: s1.ref, levelDb: -11 });
  await run('mixer.addInsert', { strip: 'Mix', effect: 'hard_limiter' });
  await run('mixer.setInsert', { strip: 'Mix', slot: 0, params: { max: -2.0, lookahead: 7, release: 120 } });

  await run('project.setNotes', { text: 'Kaplan Arena açılış filmi (60 s, 1920x1080, 30 fps). FilmCraft 0.20.1 ile kurgulandı (kur.js). V1 planlar + 2.5D kamera; V2 sis/ışık; V3 kıvılcım/toz/kapı ışığı; V5 başlık; V6 künye; V7 vinyet. A1 müzik (ducking otomasyonu), A2–A7 kayıt temelli SFX, S1 arena yankısı/ambiyans, Mix hard limiter. Dışa aktarım: loudness -16 LUFS, true peak -1 dBTP.' });
  const seq = await seqInspect();
  fs.writeFileSync(path.join(HERE, 'acilis-zaman-cizelgesi.json'), JSON.stringify(summarize(seq), null, 1));
  if (PREVIEW_DIR) for (const s of [0.5, 2, 13.4, 15, 17.1, 21.9, 22.033, 24.233, 25, 28.033, 31.0, 35, 41, 44.5, 46, 47.9, 48.6, 49.5, 55, 59.96]) await frame(s, path.join(PREVIEW_DIR, 'acilis-' + s.toFixed(3) + '.png'));
  await run('file.saveAs', { path: outPath });
  c.close();
  console.log('açılış kaydedildi', outPath, 'sekans', seqId);
}

// ---- ARA (30 s kesintisiz döngü) ------------------------------------------
async function buildIntermission(outPath) {
  await open();
  await run('file.newProject', { name: 'kaplan-arena-ara' });
  await run('file.newSequence', { name: 'Ara 30sn dongu', width: 1920, height: 1080, fps: 30, sampleRate: 48000, video: 6, audio: 2 });
  await run('sequence.settings', { maxRenderQuality: true });
  const imp = async paths => (await run('file.import', { paths: paths.map(p => SIN + '/' + p) })).items;
  const [bg, fogLoop, dust, rays, music] = await imp(['sahneler/ara-arena-sakin.png', 'filmcraft/katmanlar-png/sis-dongu-3840.png', 'filmcraft/katmanlar-png/altin-toz.png', 'filmcraft/katmanlar-png/isik-huzmeleri.png', 'girdiler/ara-muzik.wav']);
  const VN = ['Arena', 'Sis A', 'Sis B', 'Isik tozu', 'Yazilar', 'Vinyet'];
  for (let i = 0; i < VN.length; i++) await run('timeline.setTrack', { track: 'V' + (i + 1), name: VN[i] });
  await run('timeline.setTrack', { track: 'A1', name: 'Ara muzik' });
  await run('timeline.setTrack', { track: 'A2', name: 'Ara muzik sarma' });
  const L = 30;
  // Sabit kamera
  const b = await place(bg, 'V1', 0, L);
  await setp(b, 'motion', 'scale', +F.toFixed(4));
  // Sis A: 3840 px bant, 30 s'de tam 1920 px (bir periyot) sabit hızla sola → konum ve hız döngüde süreklidir
  const fa = await place(fogLoop, 'V2', 0, L);
  await setp(fa, 'opacity', 'blend', 'Screen');
  await kf(fa, 'motion', 'position', [1920, 540], 0); await kf(fa, 'motion', 'position', [0, 540], L);
  // Sis B: aynı bant, ters yönde, biraz yukarıda ve daha saydam
  const fb = await place(fogLoop, 'V3', 0, L);
  await setp(fb, 'opacity', 'blend', 'Screen');
  await setp(fb, 'opacity', 'opacity', 70);
  await kf(fb, 'motion', 'position', [0, 470], 0); await kf(fb, 'motion', 'position', [1920, 470], L);
  // Işık tozu: uçlarda sıfır hızlı periyodik salınım (0 ve 30 s aynı konum/opaklık)
  const d = await place(dust, 'V4', 0, L);
  await setp(d, 'opacity', 'blend', 'Screen');
  await setp(d, 'motion', 'scale', 110);
  for (const [t, x, y, o] of [[0, 960, 540, 55], [15, 978, 512, 80], [L, 960, 540, 55]]) { await kf(d, 'motion', 'position', [x, y], t); await kf(d, 'opacity', 'opacity', o, t); }
  for (const [t, it] of [[0, 'easeOut'], [15, 'bezier'], [L, 'easeIn']]) {
    for (const p of ['position']) await run('effects.setInterpolation', { clip: d, effect: 'motion', param: p, mediaTime: tks(t), interpolation: it }).catch(() => {});
  }
  // Yazılar (sabit; döngüde atlama yaratmaz)
  const tx = await run('graphics.newText', { text: 'KAPLAN ARENA', position: [960, 478], size: 132, font: 'Cinzel', fontStyle: 'Black', seconds: L, track: 4, time: 0 });
  await run('graphics.set', { clip: tx.clip, layer: 0, props: { align: 'center', tracking: 40, fill_kind: 'Linear Gradient', gradient_start: '#fbe7b0', gradient_end: '#c8933c', gradient_angle: 90, shadow: true, shadow_color: '#06191b', shadow_opacity: 85, shadow_distance: 6, shadow_blur: 26 } });
  await run('graphics.newText', { clip: tx.clip, text: 'Efsaneye Yolculuk', position: [960, 566], size: 64, font: 'Marcellus SC', fontStyle: 'Regular' });
  await run('graphics.set', { clip: tx.clip, layer: 1, props: { align: 'center', tracking: 60, fill_color: '#f4e8c8', shadow: true, shadow_color: '#06191b', shadow_opacity: 85, shadow_distance: 4, shadow_blur: 18 } });
  await run('graphics.newText', { clip: tx.clip, text: 'Birazdan devam ediyoruz', position: [960, 912], size: 42, font: 'Segoe UI', fontStyle: 'Semibold' });
  await run('graphics.set', { clip: tx.clip, layer: 2, props: { align: 'center', fill_color: '#f6ecd2', background: true, background_color: '#0a2a2d', background_opacity: 72, background_size: 22, background_radius: 30 } });
  const adjItem = (await run('file.newAdjustmentLayer', { seconds: L })).item;
  const adj = await place(adjItem, 'V6', 0, L);
  await addFx(adj, 'vignette', { amount: -30, midpoint: 58, roundness: 0, feather: 75 });

  // Ses: kaynak 14,9–44,9 s; son 2 s'de kuyruk eşit güçle kısılırken kaynak 12,9–14,9 s açılır → 30 s'de
  // sarma noktası kaynağın 14,9 s'si ile birebir birleşir (döngü başı = A'nın başı).
  const S0 = 14.9, X = 2.0;
  const a = (await run('timeline.place', { item: music, track: 'A1', time: 0, sourceIn: { seconds: S0 }, duration: { frame: fr(L) }, insert: false })).clips[0];
  const w = (await run('timeline.place', { item: music, track: 'A2', time: tk(L - X), sourceIn: { seconds: S0 - X }, duration: { frame: fr(X) }, insert: false })).clips[0];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, t = L - X + u * X;
    const ga = Math.max(-60, 20 * Math.log10(Math.max(1e-3, Math.cos(u * Math.PI / 2))));
    const gb = Math.max(-60, 20 * Math.log10(Math.max(1e-3, Math.sin(u * Math.PI / 2))));
    await run('clipMixer.set', { clip: a, effect: 'volume', param: 'level', value: +ga.toFixed(2), keyframe: true, time: tks(Math.min(t, L - 1 / 48000)) });
    await run('clipMixer.set', { clip: w, effect: 'volume', param: 'level', value: +gb.toFixed(2), keyframe: true, time: tks(Math.min(t, L - 1 / 48000)) });
  }
  await run('mixer.addInsert', { strip: 'Mix', effect: 'hard_limiter' });
  await run('mixer.setInsert', { strip: 'Mix', slot: 0, params: { max: -1.5, lookahead: 7, release: 150 } });
  await run('project.setNotes', { text: 'Kaplan Arena ara döngüsü (30 s). Kamera sabit; sis bantları 30 s\'de tam bir periyot kayar; toz/ışık periyodik. Müzik: ara-muzik.wav 14,9–44,9 s + 2 s eşit güçlü sarma geçişi (A2). Dışa aktarım: loudness -20 LUFS, true peak -1 dBTP.' });
  const seq = await seqInspect();
  fs.writeFileSync(path.join(HERE, 'ara-zaman-cizelgesi.json'), JSON.stringify(summarize(seq), null, 1));
  if (PREVIEW_DIR) for (const s of [0, 7.5, 15, 22.5, 29.967]) await frame(s, path.join(PREVIEW_DIR, 'ara-' + s.toFixed(3) + '.png'));
  await run('file.saveAs', { path: outPath });
  c.close();
  console.log('ara kaydedildi', outPath);
}

function summarize(seq) {
  const tr = t => ({ track: t.name, clips: t.items.map(i => ({ name: i.name, startS: +(i.start / T).toFixed(3), endS: +(i.end / T).toFixed(3), sourceInS: +(i.sourceIn / T).toFixed(3), gainDb: i.gainDb })), transitions: (t.transitions || []).length });
  return { name: seq.name, durationFrames: seq.durationFrames, video: seq.video.map(tr), audio: seq.audio.map(tr) };
}

// ---- Göreli yollar + yeniden açıp çevrimiçi doğrulama ------------------------
function relativize(projPath) {
  const d = JSON.parse(fs.readFileSync(projPath, 'utf8'));
  const dir = path.dirname(projPath);
  let n = 0;
  for (const it of Object.values(d.project.items)) {
    const f = it.kind && it.kind.Media && it.kind.Media.media && it.kind.Media.media.File;
    if (f && /^[A-Za-z]:[\\/]/.test(f.path)) { f.path = path.relative(dir, f.path).replace(/\\/g, '/'); n++; }
  }
  fs.writeFileSync(projPath, JSON.stringify(d));
  return n;
}
async function verify(projPath) {
  await open();
  await run('file.open', { path: projPath.replace(/\\/g, '/') });
  const proj = JSON.parse((await call('project_inspect', {})).content[0].text);
  const items = [];
  const walk = n => { for (const ch of n.children || []) { if (ch.children) walk(ch); else items.push(ch); } };
  walk(proj.project ? proj.project.root : proj.root);
  const out = [];
  for (const it of items) {
    if (!['Still Image', 'Audio', 'Video', 'Movie'].includes(it.type)) continue;
    const st = (await run('media.status', { item: it.item }))[0];
    out.push({ name: it.name, path: st.path, status: st.status });
  }
  const missing = await run('media.findMissing', {});
  c.close();
  return { items: out, missing };
}

(async () => {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'acilis' || cmd === 'ara') {
    const out = path.join(HERE, cmd === 'acilis' ? 'kaplan-arena-acilis.fcproj' : 'kaplan-arena-ara.fcproj').replace(/\\/g, '/');
    if (cmd === 'acilis') await buildOpening(out); else await buildIntermission(out);
    console.log('göreli yapılan medya yolu:', relativize(out));
    const v = await verify(out);
    console.log(JSON.stringify(v, null, 1));
    if (v.items.some(i => i.status !== 'online') || (v.missing.missing || []).length) { console.error('ÇEVRİMDIŞI MEDYA VAR'); process.exit(1); }
  } else if (cmd === 'dogrula') {
    console.log(JSON.stringify(await verify(path.resolve(arg)), null, 1));
  } else { console.error('kullanım: node kur.js acilis|ara|dogrula <fcproj>'); process.exit(2); }
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
