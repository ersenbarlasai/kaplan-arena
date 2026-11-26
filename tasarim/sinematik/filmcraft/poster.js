// Ara döngüsünün 0 s karesini FilmCraft'tan 1920 px olarak alır → assets/sinematik/ara-poster.webp (python Pillow ile).
const { FCClient } = require('./fcmcp');
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
(async () => {
  const c = new FCClient(); await c.init();
  const call = async (name, args) => (await c.req('tools/call', { name, arguments: args })).result;
  await call('command_run', { id: 'file.open', params: { path: path.join(__dirname, 'kaplan-arena-ara.fcproj').replace(/\\/g, '/') } });
  const r = await call('render_frame', { seconds: 0, max_side: 1920 });
  c.close();
  const img = (r.content || []).find(x => x.type === 'image');
  if (!img) throw new Error('kare alınamadı');
  const tmp = path.join(os.tmpdir(), 'kaplan-ara-poster.png');
  fs.writeFileSync(tmp, Buffer.from(img.data, 'base64'));
  const out = path.resolve(__dirname, '..', '..', '..', 'assets', 'sinematik', 'ara-poster.webp');
  execFileSync('python', ['-c', 'import sys;from PIL import Image;im=Image.open(sys.argv[1]).convert("RGB");print(im.size);im.save(sys.argv[2],quality=82,method=6)', tmp, out], { stdio: 'inherit' });
  console.log('poster', out);
})().catch(e => { console.error('HATA', e.message); process.exit(1); });
