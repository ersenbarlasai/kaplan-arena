// Senkron kanıtı: açılış projesini açar, yalnız temas izini (A2 "SFX Temas") solo yapıp yankı göndermelerini
// kapatarak WAV dışa aktarır (proje KAYDEDİLMEZ), ardından her temas transient'inin olay karesine göre
// sapmasını ölçer. Kullanım: node sfx-senkron.js   (python + numpy/scipy gerekir)
const { FCClient } = require('./fcmcp');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const T = 254016000000;
const OUT = path.join(require('os').tmpdir(), 'kaplan-sfx-temas.wav').replace(/\\/g, '/');
(async () => {
  const ev = JSON.parse(fs.readFileSync(path.join(__dirname, 'acilis-zaman-cizelgesi.json'), 'utf8')).olaylar;
  const c = new FCClient(); await c.init();
  const run = async (id, params) => { const r = (await c.req('tools/call', { name: 'command_run', arguments: { id, params } })).result; const t = (r.content || []).map(x => x.text || '').join(''); if (r.isError) throw new Error(id + ' ' + t); try { return JSON.parse(t); } catch { return t; } };
  await run('file.open', { path: path.join(__dirname, 'kaplan-arena-acilis.fcproj').replace(/\\/g, '/') });
  await run('mixer.setStrip', { strip: 'A2', solo: true });
  for (const s of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']) { try { await run('mixer.setSend', { strip: s, send: 0, muted: true }); } catch (e) {} }
  const r = await run('file.exportMedia', { path: OUT, format: 'wav', range: 'entire', wait: true });
  c.close();
  const events = { turnuvaTemas: ev.turnuvaTemas, kilicTemas: ev.kilicTemas, kalkanTemas: ev.kalkanTemas, kilicCarpisma2: ev.kilicCarpisma2 };
  const py = `
import sys, json, numpy as np, scipy.io.wavfile as w
sr, x = w.read(sys.argv[1]); x = x.astype(float); x = x.mean(1) if x.ndim > 1 else x
ev = json.loads(sys.argv[2]); h = max(1, sr // 1000); out = {}
for k, t in ev.items():
    s0 = int((t - 0.15) * sr); e = np.array([(x[i:i+h]**2).mean() for i in range(s0, int((t + 0.15) * sr), h)])
    hit = np.where(e > 0.1 * e.max())[0]   # darbe: yerel tepe enerjisinin %10'unu ilk aştığı ms
    out[k] = {'olay_s': round(t, 4), 'transient_s': None if not len(hit) else round((s0 + hit[0]*h)/sr, 4), 'sapma_ms': None if not len(hit) else round(1000*((s0 + hit[0]*h)/sr - t), 1)}
print(json.dumps(out, ensure_ascii=False))`;
  const res = JSON.parse(execFileSync('python', ['-c', py, OUT, JSON.stringify(events)], { encoding: 'utf8' }));
  console.log(JSON.stringify(res, null, 1));
  fs.writeFileSync(path.join(__dirname, 'sfx-senkron-sonucu.json'), JSON.stringify({ tarih: new Date().toISOString(), not: 'Yalnız A2 temas izi (müzik/yankı kapalı); kare = 33,3 ms', sonuc: res }, null, 1));
  const bad = Object.values(res).filter(v => v.sapma_ms == null || Math.abs(v.sapma_ms) > 15);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
