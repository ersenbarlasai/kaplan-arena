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
// (Eski sabit görsel kurgusundaki 1672 px ölçek sabitleri kaldırıldı; kaynaklar artık video klipleri.)
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

// ---- AÇILIŞ (OpenArt hareketli video klipleri) ----------------------------------
// Kaynaklar: ../videolar-openart/secilen/*.mp4 — 1920×1072, 24 fps, sessiz (yapay zekâ üretimi).
// Sekans 1920×1080 / 30 fps. Uyarlama: %100,75 ölçek (1072 → 1080; yanlardan ~7 px kırpılır), kare
// örnekleme (frame sampling; ara kare üretilmez). Bu dönüşüm kaliteyi artırmaz, yalnız kadrajı uyarlar.
// src = kaynak giriş noktası (24 fps kare ızgarasında), speed = hız yüzdesi (yalnız 03'te %85).
const CLIPS = 'videolar-openart/secilen/';
const FIT = 100.75;
const SHOTS = [
  { id: '01', f: '01-dunya-kesfi.mp4', s: 0, e: 6, src: 0.5 },
  { id: '02', f: '02-kaplan-yolculuk.mp4', s: 6, e: 12, src: 0.5 },
  { id: '03', f: '03-kale-kapisi.mp4', s: 12, e: 18, src: 0.0, speed: 85 },   // kapı yalnız aralanır; kapanmadan (kaynak 5,1 s) kesilir
  { id: '04', f: '04-turnuva-karsilasma.mp4', s: 18, e: 24, src: 0.5 },
  { id: '05', f: '05-kilic-temasi.mp4', s: 24, e: 27, src: 0.25 },             // v02; temas halinde basınç/kıvılcım, kesme temas anında
  { id: '06', f: '06-kalkan-temasi.mp4', s: 27, e: 31, src: 1.0 },
  { id: '07', f: '07-arenaya-giris.mp4', s: 31, e: 38, src: 0.5 },
  { id: '08', f: '08-arena-ihtisam.mp4', s: 38, e: 44, src: 0.5 },
  { id: '09', f: '09-kaplan-kukreme.mp4', s: 44, e: 48, src: 0.875 },
  { id: '10', f: '10-final-kunye.mp4', s: 48, e: 60, src: 0.5 },
];
// Kare kare incelemeyle bulunan kaynak olay zamanları (24 fps kare / 24) → final zaman
const srcToFinal = (id, srcSec) => { const sh = SHOTS.find(x => x.id === id); return sh.s + (srcSec - sh.src) / ((sh.speed || 100) / 100); };
const EV = {
  kapiAralanir: srcToFinal('03', 1.5),        // ışık çizgisi genişlemeye başlar
  kapiEnGenis: srcToFinal('03', 4.25),        // en geniş aralık
  turnuvaTemas: srcToFinal('04', 65 / 24),    // kılıçlar kesişir (kare 65)
  kilicTemas: 24.0,                           // 05: kesme temas anında; parlama kaynak 1,90 s'de tepe
  kilicParlama: srcToFinal('05', 1.90),
  kalkanTemas: srcToFinal('06', 48 / 24),     // kılıç kalkana değer (kare 48)
  kilicCarpisma2: srcToFinal('06', 114 / 24), // kılıçlar kesişir, kıvılcım (kare 114)
  kukreme: 44.0 + 1 / FPS,                    // 09: çene açık başlar; kükreme kesmeden bir kare sonra
  cenekapanir: srcToFinal('09', 3.75),        // çene kapanmaya başlar
};

async function placeShot(item, sh) {
  const sp = (sh.speed || 100) / 100;
  const srcDurFrames = Math.round((sh.e - sh.s) * FPS * sp);
  const cl = (await run('timeline.place', { item, track: 'V1', time: tk(sh.s), sourceIn: { seconds: sh.src }, duration: { frame: srcDurFrames }, insert: false, audio: false })).clips[0];
  if (sh.speed) await run('clip.speedDuration', { clips: [cl], speed: sh.speed, ripple: false });
  await setp(cl, 'motion', 'scale', FIT);
  return cl;
}

async function buildOpening(outPath) {
  await open();
  await run('file.newProject', { name: 'kaplan-arena-acilis' });
  const seqId = (await run('file.newSequence', { name: 'Acilis 60sn', width: 1920, height: 1080, fps: 30, sampleRate: 48000, video: 6, audio: 7 })).sequence;
  await run('sequence.settings', { maxRenderQuality: true });
  const bin = async name => { const r = await run('file.newBin', { name }); return r ? (r.bin ?? r.item ?? r.id ?? null) : null; };
  const bins = { vid: await bin('OpenArt klipleri'), kat: await bin('Grafik'), muz: await bin('Muzik'), sfx: await bin('SFX') };
  const imp = async (paths, b) => (await run('file.import', { paths: paths.map(p => SIN + '/' + p), ...(b != null ? { bin: b } : {}) })).items;
  const shotItems = await imp(SHOTS.map(s => CLIPS + s.f), bins.vid);
  const [logo] = await imp(['filmcraft/katmanlar-png/logo-dark.png'], bins.kat);
  const [music] = await imp(['girdiler/acilis-muzik.wav'], bins.muz);
  const SFX = {};
  const sfxNames = ['kilic-temas-kayit-foley', 'kalkan-vurus-kayit-foley', 'savurma-gercek', 'kilic-suruntu-gercek', 'zincir-gercek', 'kapi-acilis-kayit-foley', 'kapi-gicirti-gercek', 'kukreme-kullanici'];
  const sfxIds = await imp(sfxNames.map(n => 'ses-gercek/hazir/' + n + '.wav'), bins.sfx);
  sfxNames.forEach((n, i) => SFX[n] = sfxIds[i]);
  [SFX['baslik-vurgusu']] = await imp(['ses-taslaklari/baslik-vurgusu-01.wav'], bins.sfx);

  const VN = ['OpenArt planlar', 'Vinyet', 'Baslik zemini', 'Baslik', 'Kunye', 'Logo'];
  for (let i = 0; i < VN.length; i++) await run('timeline.setTrack', { track: 'V' + (i + 1), name: VN[i] });
  const AN = ['Muzik', 'SFX Temas', 'SFX Savurma', 'SFX Surtunme-Zincir', 'SFX Kapi', 'SFX Kapi gicirti', 'SFX Kukreme-Baslik'];
  for (let i = 0; i < AN.length; i++) await run('timeline.setTrack', { track: 'A' + (i + 1), name: AN[i] });

  // --- V1: gerçek hareketli planlar
  const shotClip = {};
  for (let i = 0; i < SHOTS.length; i++) shotClip[SHOTS[i].id] = await placeShot(shotItems[i], SHOTS[i]);
  // siyahtan açılış
  await kf(shotClip['01'], 'opacity', 'opacity', 0, 0);
  await kf(shotClip['01'], 'opacity', 'opacity', 100, 0.9);
  // Geçişler: çapraz geçiş yalnız sakin planlar arasında; temas planları (04→05→06) ve kükreme kesmeyle.
  // Hizalama, klip tutamağına göre: 'center' iki yanda, 'start' çıkan klipte, 'end' giren klipte tutamak ister.
  const dissolve = (inShot, frames, align) => run('sequence.applyVideoTransition', { clip: shotClip[inShot], effect: 'cross_dissolve', frames, edge: 'in', align });
  await dissolve('02', 20, 'center');
  await dissolve('03', 16, 'start');   // 03 kaynağı 0'dan başlar (ön tutamak yok)
  // 06 → 07 kesme: ikinci kılıç çarpışması (30,75 s) geçiş altında kalmasın; kesmede savurma sesi
  await dissolve('08', 24, 'center');
  await dissolve('10', 14, 'end');     // 09'un son tutamağı yok; 10'un ön tutamağı 15 kare

  // --- V2: hafif vinyet (metnin altında)
  const adjItem = (await run('file.newAdjustmentLayer', { seconds: 60, ...(bins.kat != null ? { bin: bins.kat } : {}) })).item;
  const adj = await place(adjItem, 'V2', 0, 60);
  await addFx(adj, 'vignette', { amount: -24, midpoint: 60, roundness: 0, feather: 80 });

  // --- V3/V4: başlık (10'un gökyüzünde, üst-orta güvenli alan)
  const back = await run('graphics.newEllipse', { position: [960, 268], size: [1500, 330], seconds: 60 - 47.6, track: 2, time: tk(47.6) });
  await run('graphics.set', { clip: back.clip, layer: 0, props: { fill_color: '#03141a' } });
  await addFx(back.clip, 'gaussian_blur', { blurriness: 90 });
  await kf(back.clip, 'opacity', 'opacity', 0, 47.6); await kf(back.clip, 'opacity', 'opacity', 66, 48.5);
  const title = await run('graphics.newText', { text: 'KAPLAN ARENA', position: [960, 250], size: 124, font: 'Cinzel', fontStyle: 'Black', seconds: 60 - 47.9, track: 3, time: tk(47.9) });
  await run('graphics.set', { clip: title.clip, layer: 0, props: { align: 'center', tracking: 40, fill_kind: 'Linear Gradient', gradient_start: '#fbe7b0', gradient_end: '#c8933c', gradient_angle: 90, shadow: true, shadow_color: '#06191b', shadow_opacity: 85, shadow_distance: 6, shadow_blur: 24, stroke: true, stroke_color: '#2b1a06', stroke_width: 3, stroke_type: 'Outer' } });
  await run('graphics.newText', { clip: title.clip, text: 'Efsaneye Yolculuk', position: [960, 336], size: 62, font: 'Marcellus SC', fontStyle: 'Regular' });
  await run('graphics.set', { clip: title.clip, layer: 1, props: { align: 'center', tracking: 60, fill_color: '#f4e8c8', shadow: true, shadow_color: '#06191b', shadow_opacity: 85, shadow_distance: 4, shadow_blur: 18, stroke: true, stroke_color: '#10282a', stroke_width: 2, stroke_type: 'Outer' } });
  await kf(title.clip, 'opacity', 'opacity', 0, 47.9); await kf(title.clip, 'opacity', 'opacity', 100, 48.6);
  await kf(title.clip, 'motion', 'scale', 92, 47.9); await kf(title.clip, 'motion', 'scale', 100, 48.9);

  // --- V5: künye paneli (49,4 s'den 60 s'ye kadar tam okunur: 10,6 s)
  const cr = await run('graphics.newRectangle', { position: [960, 752], size: [1560, 404], seconds: 60 - 48.3, track: 4, time: tk(48.3) });
  await run('graphics.set', { clip: cr.clip, layer: 0, props: { fill_color: '#0a2a2d', opacity: 88, corner_radius: 22, stroke: true, stroke_color: '#c9a45a', stroke_width: 2, stroke_type: 'Inner' } });
  const line = async (text, y, size, font, style, color, extra = {}) => {
    const r = await run('graphics.newText', { clip: cr.clip, text, position: [960, y], size, font, fontStyle: style });
    await run('graphics.set', { clip: cr.clip, layer: r.layer, props: { align: 'center', fill_color: color, ...extra } });
  };
  await line('Düzenleyen: Kaplan Okulları Yapayzeka Kulübü', 628, 46, 'Segoe UI', 'Semibold', '#f6ecd2');
  await line('MENTÖRLER', 702, 30, 'Marcellus SC', 'Regular', '#e2bd6c', { tracking: 220 });
  await line('Ersen BARLAS    ·    Alp Han KOÇDEMİR', 754, 42, 'Segoe UI', 'Semibold', '#f6ecd2');
  await line('KULÜP ÖĞRENCİLERİ', 824, 30, 'Marcellus SC', 'Regular', '#e2bd6c', { tracking: 200 });
  await line('Emre Burak Tölegen   ·   Burak Yoğurtçu   ·   Halil Mert ACAR   ·   Yekta Efe Konuk', 876, 36, 'Segoe UI', 'Regular', '#f6ecd2');
  await line('Çınar Arda   ·   Yusuf Emir Kuş   ·   Ömer Araf Boncuk   ·   Emir Karatay', 926, 36, 'Segoe UI', 'Regular', '#f6ecd2');
  await kf(cr.clip, 'opacity', 'opacity', 0, 48.3); await kf(cr.clip, 'opacity', 'opacity', 100, 49.4);
  await kf(cr.clip, 'motion', 'position', [960, 556], 48.3); await kf(cr.clip, 'motion', 'position', [960, 540], 49.4);

  // --- V6: resmî Kaplan Okulları logosu (app/logo.js 'dark' sürümü; koyu zemin için açık yazılı)
  const lg = await place(logo, 'V6', 48.6, 60 - 48.6);
  await setp(lg, 'motion', 'position', [960, 456]);
  await setp(lg, 'motion', 'scale', 40);
  await kf(lg, 'opacity', 'opacity', 0, 48.6); await kf(lg, 'opacity', 'opacity', 100, 49.5);

  // --- SES: A1 müzik, A2–A7 kayıt temelli efektler (zamanlar gerçek video karelerinden)
  const mus = await place(music, 'A1', 0, null);
  await gain(mus, -2);
  const sfx = async (name, track, eventSec, sourceIn, db) => {
    // FilmCraft sesi sekans karesinin başına (1/30 s) yerleştirir. Kare sınırına göre fark (d) kaynak girişinden
    // düşülerek telafi edilir; böylece transient olay zamanına oturur (kaynak girişi yeterliyse).
    let t = eventSec, si = sourceIn || 0;
    const f0 = Math.floor(eventSec * FPS + 1e-6) / FPS, d = eventSec - f0;
    if (d > 1e-6 && si >= d) { t = f0; si -= d; }
    const extra = si > 0 ? { sourceIn: { seconds: si } } : {};
    const cl = (await run('timeline.place', { item: SFX[name], track, time: tks(t), insert: false, ...extra })).clips[0];
    if (db) await gain(cl, db);
    return cl;
  };
  // Kapı: zincir gerilmesi aralanmadan önce; gıcırtı aralanmayla; ahşap/metal foley tepesi (3,26 s) en geniş aralığa
  await sfx('zincir-gercek', 'A4', EV.kapiAralanir - 2.28 + 0.1, 0, -2);
  await sfx('kapi-gicirti-gercek', 'A6', EV.kapiAralanir + 0.1 - 0.045, 0, 2);
  await sfx('kapi-acilis-kayit-foley', 'A5', EV.kapiEnGenis - 3.26, 0, 5);
  // Temaslar (kayıt transient'i 46 ms; 40 ms kırpılınca darbe olay karesine oturur). Savurma tepesi (155 ms) temastan 120 ms önce.
  await sfx('savurma-gercek', 'A3', EV.turnuvaTemas - 0.12 - 0.155, 0, 3);
  await sfx('kilic-temas-kayit-foley', 'A2', EV.turnuvaTemas, 0.040, 6);
  await sfx('savurma-gercek', 'A3', EV.kilicTemas - 0.12 - 0.155, 0, 6);
  await sfx('kilic-temas-kayit-foley', 'A2', EV.kilicTemas, 0.040, 8);
  await sfx('kilic-suruntu-gercek', 'A4', EV.kilicTemas + 0.12 - 0.158, 0, 3);
  await sfx('kilic-suruntu-gercek', 'A4', EV.kilicParlama - 0.30 - 0.158, 0, 4);   // parlama büyürken basınç sürtünmesi
  await sfx('savurma-gercek', 'A3', EV.kalkanTemas - 0.12 - 0.155, 0, 6);
  await sfx('kalkan-vurus-kayit-foley', 'A2', EV.kalkanTemas, 0.040, 11);
  await sfx('savurma-gercek', 'A3', EV.kilicCarpisma2 - 0.12 - 0.155, 0, 4);
  await sfx('kilic-temas-kayit-foley', 'A2', EV.kilicCarpisma2, 0.040, 7);
  await sfx('savurma-gercek', 'A3', 31.0 - 0.155, 0, 2);                      // 06 → 07 kesmesi
  // Kükreme (kullanıcı kaydı kukreme-kullanici.wav): transient 161 ms; yüksek bölüm 0,26–1,94 s, kayıt 2,46 s →
  // çene açıkken (44,0–46,9 s) biter; kuyruk arena yankısıyla. Başlık vurgusu 48,0 s.
  await sfx('kukreme-kullanici', 'A7', EV.kukreme - 0.161, 0, 4);
  await sfx('baslik-vurgusu', 'A7', 48.0 - 0.008, 0, 1);

  // Müzik ducking (A1 hacim otomasyonu; yumuşak rampalar, 3–6 dB)
  const k = EV.kapiAralanir, tt = EV.turnuvaTemas, ka = EV.kalkanTemas, k2 = EV.kilicCarpisma2;
  const duck = [[0, 0],
    [k - 2.2, 0], [k - 1.8, -3], [k - 0.2, -3], [k + 0.1, -5], [EV.kapiEnGenis + 0.6, -5], [18.4, 0],
    [tt - 0.45, 0], [tt - 0.2, -4], [tt + 0.6, -4], [tt + 1.1, 0],
    [23.55, 0], [23.8, -6], [EV.kilicParlama + 0.3, -6], [26.6, -2],
    [ka - 0.45, -2], [ka - 0.2, -6], [ka + 0.8, -6], [ka + 1.4, -1],
    [k2 - 0.45, -1], [k2 - 0.2, -5], [31.3, -5], [31.9, 0],
    [43.4, 0], [43.85, -6], [EV.cenekapanir - 0.6, -6], [EV.cenekapanir + 0.3, -1.5],
    [47.7, -1.5], [47.95, -4], [48.7, -4], [49.4, 0], [60, 0]];
  await run('mixer.writeAutomation', { strip: 'A1', lane: 'volume', points: duck.map(([t, v]) => [tks(t), v]) });
  // Arena yankısı (ambiyans) submix: efektlerden ve müzikten küçük gönderim
  const s1 = await run('mixer.addSubmix', { name: 'Arena yankisi (ambiyans)', channels: 'Stereo' });
  await run('mixer.addInsert', { strip: s1.ref, effect: 'convolution_reverb' });
  await run('mixer.setInsert', { strip: s1.ref, slot: 0, params: { impulse: 2, mix: 100, predelay: 18, damping_hf: 7000, damping_lf: 120 } });
  await run('mixer.addSend', { strip: 'A1', target: s1.ref, levelDb: -20 });
  for (const a of ['A2', 'A3', 'A4', 'A5', 'A6']) await run('mixer.addSend', { strip: a, target: s1.ref, levelDb: -13 });
  await run('mixer.addSend', { strip: 'A7', target: s1.ref, levelDb: -11 });
  await run('mixer.addInsert', { strip: 'Mix', effect: 'hard_limiter' });
  await run('mixer.setInsert', { strip: 'Mix', slot: 0, params: { max: -2.0, lookahead: 7, release: 120 } });

  await run('project.setNotes', { text: 'Kaplan Arena açılış filmi (60 s, 1920x1080, 30 fps). FilmCraft ile kurgulandı (kur.js). V1: OpenArt video klipleri (1920x1072/24 fps kaynak; %100,75 ölçek, kare örnekleme; 03 %85 hız). V2 vinyet; V3/V4 başlık; V5 künye; V6 resmi logo. A1 müzik (ducking), A2–A7 kayıt temelli SFX (gerçek temas karelerine), S1 arena yankısı, Mix hard limiter. Dışa aktarım: loudness -16 LUFS, true peak -1,5 dBTP.' });
  const seq = await seqInspect();
  const sum = summarize(seq); sum.olaylar = EV; sum.planlar = SHOTS;
  fs.writeFileSync(path.join(HERE, 'acilis-zaman-cizelgesi.json'), JSON.stringify(sum, null, 1));
  if (PREVIEW_DIR) for (const s of [0.5, 3, 9, 13.8, 17.0, 20.2, 24.0, 25.6, 28.0, 30.75, 34, 41, 44.5, 46.2, 47.2, 48.2, 49.5, 55, 59.96]) await frame(s, path.join(PREVIEW_DIR, 'acilis-' + s.toFixed(3) + '.png'));
  await run('file.saveAs', { path: outPath });
  c.close();
  console.log('açılış kaydedildi', outPath, 'sekans', seqId, JSON.stringify(EV));
}

// ---- ARA (30 s kesintisiz döngü) ------------------------------------------
// ara-arena-sakin.mp4 (15,04 s) %90 hızda: kaynak 1,5–15,0 s → 15,000 s ekran (450 kare), iki tur = 30 s.
// Her turun son 50 karesinde (1,667 s) V2'de kaynak 0–1,5 s, opaklık 0→100 ile üstten açılır; tur sınırında
// görüntü kaynak 1,5 s'den kesintisiz sürer (sınırdaki iki kare arasında kaynak adımı 0,03 s, normal oynatımla aynı).
// Geri oynatma (reverse) kullanılmaz.
async function buildIntermission(outPath) {
  await open();
  await run('file.newProject', { name: 'kaplan-arena-ara' });
  await run('file.newSequence', { name: 'Ara 30sn dongu', width: 1920, height: 1080, fps: 30, sampleRate: 48000, video: 4, audio: 2 });
  await run('sequence.settings', { maxRenderQuality: true });
  const imp = async paths => (await run('file.import', { paths: paths.map(p => SIN + '/' + p) })).items;
  const [vid, music] = await imp([CLIPS + 'ara-arena-sakin.mp4', 'girdiler/ara-muzik.wav']);
  const VN = ['Arena', 'Arena dongu gecisi', 'Yazilar', 'Vinyet'];
  for (let i = 0; i < VN.length; i++) await run('timeline.setTrack', { track: 'V' + (i + 1), name: VN[i] });
  await run('timeline.setTrack', { track: 'A1', name: 'Ara muzik' });
  await run('timeline.setTrack', { track: 'A2', name: 'Ara muzik sarma' });
  const L = 30, SPEED = 90, D = 1.5, CYC = 15;
  const sp = SPEED / 100;
  for (let k = 0; k < 2; k++) {
    const t0 = k * CYC;
    const a = (await run('timeline.place', { item: vid, track: 'V1', time: tk(t0), sourceIn: { seconds: D }, duration: { frame: Math.round(CYC * FPS * sp) }, insert: false, audio: false })).clips[0];
    await run('clip.speedDuration', { clips: [a], speed: SPEED, ripple: false });
    await setp(a, 'motion', 'scale', FIT);
    const xs = t0 + CYC - D / sp;   // 13,333 s / 28,333 s
    const b = (await run('timeline.place', { item: vid, track: 'V2', time: tk(xs), sourceIn: { seconds: 0 }, duration: { frame: Math.round(D * FPS) }, insert: false, audio: false })).clips[0];
    await run('clip.speedDuration', { clips: [b], speed: SPEED, ripple: false });
    await setp(b, 'motion', 'scale', FIT);
    await kf(b, 'opacity', 'opacity', 0, xs); await kf(b, 'opacity', 'opacity', 100, t0 + CYC - 1 / FPS);
  }
  // Yazılar (sabit; döngüde atlama yaratmaz)
  const tx = await run('graphics.newText', { text: 'KAPLAN ARENA', position: [960, 478], size: 132, font: 'Cinzel', fontStyle: 'Black', seconds: L, track: 2, time: 0 });
  await run('graphics.set', { clip: tx.clip, layer: 0, props: { align: 'center', tracking: 40, fill_kind: 'Linear Gradient', gradient_start: '#fbe7b0', gradient_end: '#c8933c', gradient_angle: 90, shadow: true, shadow_color: '#06191b', shadow_opacity: 85, shadow_distance: 6, shadow_blur: 26, stroke: true, stroke_color: '#2b1a06', stroke_width: 3, stroke_type: 'Outer' } });
  await run('graphics.newText', { clip: tx.clip, text: 'Efsaneye Yolculuk', position: [960, 566], size: 64, font: 'Marcellus SC', fontStyle: 'Regular' });
  await run('graphics.set', { clip: tx.clip, layer: 1, props: { align: 'center', tracking: 60, fill_color: '#f4e8c8', shadow: true, shadow_color: '#06191b', shadow_opacity: 85, shadow_distance: 4, shadow_blur: 18 } });
  await run('graphics.newText', { clip: tx.clip, text: 'Birazdan devam ediyoruz', position: [960, 912], size: 42, font: 'Segoe UI', fontStyle: 'Semibold' });
  await run('graphics.set', { clip: tx.clip, layer: 2, props: { align: 'center', fill_color: '#f6ecd2', background: true, background_color: '#0a2a2d', background_opacity: 72, background_size: 22, background_radius: 30 } });
  const adjItem = (await run('file.newAdjustmentLayer', { seconds: L })).item;
  const adj = await place(adjItem, 'V4', 0, L);
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
  await run('project.setNotes', { text: 'Kaplan Arena ara döngüsü (30 s). V1: ara-arena-sakin.mp4 (OpenArt) %90 hızda iki tur (kaynak 1,5–15,0 s); her tur sonunda V2 kaynak 0–1,5 s üstten açılır (kesintisiz sarma, geri oynatma yok). Müzik: ara-muzik.wav 14,9–44,9 s + 2 s eşit güçlü sarma geçişi (A2). Dışa aktarım: loudness -20 LUFS, true peak -1 dBTP, 44,1 kHz.' });
  const seq = await seqInspect();
  fs.writeFileSync(path.join(HERE, 'ara-zaman-cizelgesi.json'), JSON.stringify(summarize(seq), null, 1));
  if (PREVIEW_DIR) for (const s of [0, 7.5, 13.4, 14.967, 15, 22.5, 29.967]) await frame(s, path.join(PREVIEW_DIR, 'ara-' + s.toFixed(3) + '.png'));
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
