// Kaplan Arena — yerel (LAN) PowerShell sunucusu yetki kabul testi: /api/ctl, /api/join, /api/cmd ve /api/set kapısı.
// Tarayıcı gerekmez. Çalıştırma: node tests/e2e/lan-yetki.js   (kaplan-sunucu.ps1'i KAPLAN_NO_BROWSER=1 ile başlatır)
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const results = [];
function check(name, ok, detail){ results.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail != null && !ok ? ' :: ' + detail : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'kaplan-sunucu.ps1')], { env: Object.assign({}, process.env, { KAPLAN_NO_BROWSER: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; ps.stdout.on('data', d => out += d);
  let port = null;
  try{
    for (let k = 0; k < 60 && !port; k++){ await sleep(500); const m = out.match(/localhost:(\d+)\//); if (m) port = m[1]; }
    check('PS yerel sunucu başladı', !!port, out.slice(-300));
    const B = `http://localhost:${port}`;
    const post = async (p, body, headers) => { const r = await fetch(B + p, { method:'POST', headers:Object.assign({ 'Content-Type':'application/json' }, headers || {}), body:JSON.stringify(body) }); let j = null; try{ j = await r.json(); }catch(e){} return { code:r.status, j }; };
    const db = async () => (await (await fetch(B + '/api/db?rev=-1&sid=x')).json()).d || {};
    const PIN = '616161', KEY = 'lanAdminAnahtari12345678';
    const ctl = extra => Object.assign({ teams:{ t1:{ code:'1111', act:true }, t2:{ code:'2222', act:true }, t3:{ code:'3333', act:false } }, qk:'s1_0_q1', acc:true, jk:true, elig:null }, extra || {});
    let r = await post('/api/ctl', { pin:PIN, key:KEY, ctl:ctl() });
    check('LAN ctl: admin denetim kaydı kuruldu', r.code === 200 && r.j.ok, JSON.stringify(r));
    r = await post('/api/ctl', { pin:PIN, key:'baskaAnahtar123456789', ctl:ctl({ acc:false }) });
    check('LAN ctl: başka anahtar reddedilir', r.code === 403, r.code);
    r = await post('/api/set?path=' + encodeURIComponent(`games/${PIN}/answers/s1_0_q1/t1/sX`), { v:'A', t:Date.now(), dev:'devX' });
    check('LAN set: anahtarsız doğrudan cevap yazımı reddedilir', r.code === 403, r.code);
    r = await post('/api/set?path=' + encodeURIComponent(`games/${PIN}/state`), { hack:1 });
    check('LAN set: anahtarsız state yazımı reddedilir', r.code === 403, r.code);
    r = await post('/api/set?path=' + encodeURIComponent(`games/${PIN}/state`), { ok:1 }, { 'X-Ka-Key':KEY });
    check('LAN set: admin anahtarıyla state yazılır', r.code === 200, r.code);
    r = await post('/api/join', { pin:PIN, tid:'t1', code:'9999', dev:'devA1234' });
    check('LAN join: yanlış kaptan kodu reddedilir', r.code === 403 && /yanlış/.test(r.j.why), JSON.stringify(r));
    r = await post('/api/join', { pin:PIN, tid:'t3', code:'3333', dev:'devX9999' });
    check('LAN join: elenen takım katılamaz', r.code === 403 && r.j.out === true, JSON.stringify(r));
    r = await post('/api/join', { pin:PIN, tid:'t1', code:'1111', dev:'devA1234' });
    const tokA = r.j && r.j.tok;
    check('LAN join: doğru kodla kaptan bağlanır', r.code === 200 && !!tokA, JSON.stringify(r));
    r = await post('/api/join', { pin:PIN, tid:'t1', code:'1111', dev:'devB1234' });
    check('LAN join: başka cihaz bağlı kaptanı düşüremez', r.code === 409, JSON.stringify(r));
    r = await post('/api/join', { pin:PIN, tid:'t2', code:'2222', dev:'devA1234' });
    check('LAN join: aynı cihaz başka takımın adını seçerek geçemez', r.code === 409, JSON.stringify(r));
    r = await post('/api/join', { pin:PIN, tid:'t1', tok:tokA, dev:'devA1234' });
    check('LAN join: meşru kaptan oturumuyla yeniden bağlanır', r.code === 200 && r.j.tok === tokA, JSON.stringify(r));
    r = await post('/api/cmd', { pin:PIN, tok:tokA, op:'ans', qk:'s1_0_q1', v:'C', t:Date.now() });
    check('LAN cmd: geçerli cevap kabul edilir', r.code === 200, JSON.stringify(r));
    r = await post('/api/cmd', { pin:PIN, tok:tokA, op:'ans', qk:'s1_0_q1', v:1355.5, t:Date.now() });
    check('LAN cmd: sayısal tahmin kabul edilir', r.code === 200, JSON.stringify(r));
    r = await post('/api/cmd', { pin:PIN, tok:tokA, op:'ans', qk:'s1_9_eski', v:'C', t:Date.now() });
    check('LAN cmd: eski soru anahtarı reddedilir', r.code === 409, JSON.stringify(r));
    r = await post('/api/cmd', { pin:PIN, tok:'sahte', op:'ans', qk:'s1_0_q1', v:'C', t:Date.now() });
    check('LAN cmd: sahte oturum reddedilir', r.code === 401, JSON.stringify(r));
    r = await post('/api/cmd', { pin:PIN, tok:tokA, op:'jk', qk:'s1_0_q1', j:'x2', t:Date.now() });
    check('LAN cmd: joker isteği kabul edilir', r.code === 200, JSON.stringify(r));
    let d = await db();
    const ans = Object.keys(d).filter(k => k.startsWith(`games/${PIN}/answers/s1_0_q1/t1/`));
    check('LAN: sunucu cevabı doğru yola ve bağlı cihazla yazdı', ans.length === 2 && ans.every(k => JSON.parse(JSON.stringify(d[k])).dev === 'devA1234'), JSON.stringify(ans.map(k => d[k])));
    check('LAN: kaptan kodları ve oturumlar /api/db yanıtında yok', !JSON.stringify(d).includes('1111') && !JSON.stringify(d).includes(tokA), '');
    await post('/api/ctl', { pin:PIN, key:KEY, ctl:ctl({ teams:{ t1:{ code:'1111', act:false }, t2:{ code:'2222', act:true }, t3:{ code:'3333', act:false } } }) });
    r = await post('/api/cmd', { pin:PIN, tok:tokA, op:'ans', qk:'s1_0_q1', v:'A', t:Date.now() });
    check('LAN cmd: elenen takımın eski oturumu cevap gönderemez', r.code === 403 && r.j.out === true, JSON.stringify(r));
    r = await post('/api/join', { pin:PIN, tid:'t1', tok:tokA, dev:'devA1234' });
    check('LAN join: elenen takım oturumla da geri dönemez', r.code === 403, JSON.stringify(r));
    r = await post('/api/join', { pin:PIN, tid:'t2', code:'2222', dev:'devB1234' });
    const tokB = r.j && r.j.tok;
    await post('/api/ctl', { pin:PIN, key:KEY, ctl:ctl({ qk:'tie_s1_1', jk:false, elig:['t1'] }) });
    r = await post('/api/cmd', { pin:PIN, tok:tokB, op:'ans', qk:'tie_s1_1', v:5, t:Date.now() });
    check('LAN cmd: eşitlikte aday olmayan takım reddedilir', r.code === 403, JSON.stringify(r));
    r = await post('/api/ctl', { pin:PIN, key:KEY, ctl:ctl(), reset:['t2'] });
    r = await post('/api/join', { pin:PIN, tid:'t2', code:'2222', dev:'devC1234' });
    check('LAN: admin cihaz sıfırlamasından sonra yeni cihaz bağlanır', r.code === 200, JSON.stringify(r));
    // Kurallar 27.11: Risk Jokeri yalnız finalde (ctl.risk), ekran değişikliği bildirimi (leave)
    const PIN2 = '626262';
    await post('/api/ctl', { pin:PIN2, key:KEY, ctl:ctl({ risk:false }) });
    const tokR = (await post('/api/join', { pin:PIN2, tid:'t1', code:'1111', dev:'devR1234' })).j.tok;
    r = await post('/api/cmd', { pin:PIN2, tok:tokR, op:'jk', qk:'s1_0_q1', j:'risk', s:10, t:Date.now() });
    check('LAN cmd: finalde değilken Risk Jokeri reddedilir', r.code === 409, JSON.stringify(r));
    await post('/api/ctl', { pin:PIN2, key:KEY, ctl:ctl({ risk:true }) });
    r = await post('/api/cmd', { pin:PIN2, tok:tokR, op:'jk', qk:'s1_0_q1', j:'risk', s:15, t:Date.now() });
    check('LAN cmd: finalde Risk Jokeri (15) kabul edilir', r.code === 200, JSON.stringify(r));
    r = await post('/api/cmd', { pin:PIN2, tok:tokR, op:'jk', qk:'s1_0_q1', j:'risk', s:7, t:Date.now() });
    check('LAN cmd: geçersiz risk puanı reddedilir', r.code === 409, JSON.stringify(r));
    const tl = Date.now() - 30000;
    r = await post('/api/cmd', { pin:PIN2, tok:tokR, op:'leave', qk:'-', t:tl, open:true });
    await post('/api/cmd', { pin:PIN2, tok:tokR, op:'leave', qk:'-', t:tl, open:true });
    d = await db();
    const vk = Object.keys(d).filter(k => k.startsWith(`games/${PIN2}/viol/t1/`));
    check('LAN cmd: ekran değişikliği bildirimi kaydedildi (tekrar gönderim tek kayıt)', r.code === 200 && vk.length === 1 && d[vk[0]].open === true, JSON.stringify(vk.map(k => d[k])));
    check('LAN: risk isteği puanıyla yazıldı', d[`games/${PIN2}/jreq/s1_0_q1/t1`] && d[`games/${PIN2}/jreq/s1_0_q1/t1`].s === 15, JSON.stringify(d[`games/${PIN2}/jreq/s1_0_q1/t1`]));
    r = await post('/api/set?path=' + encodeURIComponent('games/717171/state'), { eski:true });
    check('LAN set: denetim kaydı olmayan eski yarışma eskisi gibi yazılır', r.code === 200, r.code);
  }catch(e){ check('senaryo istisnasız tamamlandı', false, e.stack || e.message); }
  finally{ try{ spawn('taskkill', ['/pid', String(ps.pid), '/T', '/F']); }catch(e){} }
  const failed = results.filter(r => !r.ok);
  fs.writeFileSync(path.join(__dirname, 'son-rapor-lan-yetki.json'), JSON.stringify({ when:new Date().toISOString(), total:results.length, failed:failed.length, results }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} kontrol geçti`);
  process.exit(failed.length ? 1 : 0);
})();
