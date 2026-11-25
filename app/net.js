/* Kaplan Arena — ağ katmanı: yerel sunucu (BASLAT), internet (Vercel /api/ka) ve tek yarışma kilidi.
   Sahne penceresi bu katmanı kullanmaz; yalnız admin ve telefon. */
const NET = { ok:false, db:null, offset:0, connected:false, ips:[], port:'', live:{qk:null, ans:{}, ref:null, fn:null}, joined:{}, plRef:null, plFn:null, plKey:null };
const LDB = (()=>{
  let rev = -1, sid = null, tree = {}, loaded = false, pollT = null;
  const waiters = [], listeners = [];
  const parts = p => String(p).split('/').filter(Boolean);
  function get(path){ let c = tree; for (const k of parts(path)){ if (c == null || typeof c !== 'object') return null; c = c[k]; } return c === undefined ? null : c; }
  function setp(obj, path, v){
    const ks = parts(path); let c = obj;
    for (let i=0;i<ks.length-1;i++){ if (c[ks[i]] == null || typeof c[ks[i]] !== 'object') c[ks[i]] = {}; c = c[ks[i]]; }
    const last = ks[ks.length-1];
    if (v == null) delete c[last]; else c[last] = v;
  }
  function resolveTS(v){
    if (v && typeof v === 'object' && !Array.isArray(v)){
      if (v['.sv'] === 'timestamp') return Math.round(Date.now() + NET.offset);
      const o = {}; for (const k in v) o[k] = resolveTS(v[k]); return o;
    }
    return v;
  }
  const snap = v => ({ val:() => v == null ? null : JSON.parse(JSON.stringify(v)), exists:() => v != null });
  function fire(){
    listeners.slice().forEach(l=>{ const v = get(l.path), js = JSON.stringify(v);
      if (js !== l.last){ l.last = js; try{ l.fn(snap(v)); }catch(e){ console.error(e); } } });
  }
  function build(d){ const t = {}; Object.keys(d).sort((a,b)=>parts(a).length - parts(b).length).forEach(p=>setp(t, p, d[p])); return t; }
  function setConn(c){ if (NET.connected !== c){ NET.connected = c; const p = document.getElementById('netpill'); if (p) p.outerHTML = netPill(); } }
  async function poll(){
    clearTimeout(pollT);
    const t0 = Date.now();
    try{
      const r = await fetch('/api/db?rev=' + rev + '&sid=' + (sid||''), {cache:'no-store'});
      const j = await r.json(); const t1 = Date.now();
      NET.offset = j.t - (t0 + t1)/2;
      setConn(true);
      if (j.d && (j.sid !== sid || j.rev >= rev)){ sid = j.sid; rev = j.rev; tree = build(j.d); fire(); }
      if (!loaded){ loaded = true; waiters.splice(0).forEach(f=>f()); }
    }catch(e){ setConn(false); }
    pollT = setTimeout(poll, 400);
  }
  const ready = () => loaded ? Promise.resolve() : new Promise(r=>waiters.push(r));
  function ref(path){ return {
    set(v){
      v = resolveTS(v); setp(tree, path, v); fire();
      return fetch('/api/set?path=' + encodeURIComponent(path), {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(v === undefined ? null : v)})
        .then(r=>{ if (!r.ok) throw new Error('kaydedilemedi'); poll(); });
    },
    once(){ return ready().then(()=>snap(get(path))); },
    on(ev, fn){ const l = {path, fn, last:undefined}; listeners.push(l);
      if (loaded){ const v = get(path); l.last = JSON.stringify(v); setTimeout(()=>fn(snap(v)), 0); } return fn; },
    off(ev, fn){ for (let i=listeners.length-1;i>=0;i--) if (listeners[i].path === path && (!fn || listeners[i].fn === fn)) listeners.splice(i,1); }
  }; }
  return { ref, start:poll };
})();

/* ---------- online (Vercel, internet üzerinden) ----------
   VERCEL_URL: projenin Vercel adresi. Sayfa bilgisayardan dosya olarak açıldığında
   telefon bağlantısı ve QR kod bu adres üzerinden çalışır. Sayfa Vercel'den (ya da
   kendi alan adınızdan) açıldığında o adres kullanılır. */
const VERCEL_URL = 'https://kaplan-arena.vercel.app/';
const IS_LAN_HOST = /^\d+\.\d+\.\d+\.\d+$/.test(location.hostname) && !location.hostname.startsWith('127.');
const WEB_URL = location.protocol.startsWith('http') && !/\.github\.io$/i.test(location.hostname) ? location.origin + '/' : VERCEL_URL;
const API_URL = WEB_URL + 'api/ka';
const SDB = (()=>{
  const pins = new Map();            // pin -> Promise (ilk tam yükleme)
  const rows = {};                   // 'pin/yol' -> {r, v}
  const pend = {};                   // 'pin/yol' -> {id, v}  (henüz kaydedilmemiş yerel yazımlar)
  const listeners = [];
  let since = 0, tree = {}, pollT = null, seq = 0;
  const parts = p => String(p).split('/').filter(Boolean);
  function get(path){ let c = tree; for (const k of parts(path)){ if (c == null || typeof c !== 'object') return null; c = c[k]; } return c === undefined ? null : c; }
  function setp(obj, path, v){
    const ks = parts(path); let c = obj;
    for (let i=0;i<ks.length-1;i++){ if (c[ks[i]] == null || typeof c[ks[i]] !== 'object') c[ks[i]] = {}; c = c[ks[i]]; }
    const last = ks[ks.length-1];
    if (v == null) delete c[last]; else c[last] = v;
  }
  function resolveTS(v){
    if (v && typeof v === 'object' && !Array.isArray(v)){
      if (v['.sv'] === 'timestamp') return Math.round(Date.now() + NET.offset);
      const o = {}; for (const k in v) o[k] = resolveTS(v[k]); return o;
    }
    return v;
  }
  const snap = v => ({ val:() => v == null ? null : JSON.parse(JSON.stringify(v)), exists:() => v != null });
  function fire(){
    listeners.slice().forEach(l=>{ const v = get(l.path), js = JSON.stringify(v);
      if (js !== l.last){ l.last = js; try{ l.fn(snap(v)); }catch(e){ console.error(e); } } });
  }
  function rebuild(){
    const all = {};
    for (const k in rows) all[k] = rows[k].v;
    for (const k in pend){ all[k] = pend[k].v; for (const d in all) if (d.startsWith(k + '/')) all[d] = null; }
    const t = {};
    Object.keys(all).sort((a,b)=>parts(a).length - parts(b).length).forEach(k=>{ if (all[k] != null) setp(t, 'games/' + k, all[k]); });
    tree = t; fire();
  }
  function apply(list){
    let ch = false;
    for (const x of list || []){
      const k = x.pin + '/' + x.p, old = rows[k];
      if (x.r > since) since = x.r;
      if (old && old.r >= x.r) continue;
      rows[k] = {r:x.r, v:x.v}; ch = true;
    }
    if (ch) rebuild();
  }
  function setConn(c){ if (NET.connected !== c){ NET.connected = c; const p = document.getElementById('netpill'); if (p) p.outerHTML = netPill(); } }
  // text/plain: dosyadan (file://) açıldığında tarayıcı ön kontrol (OPTIONS) isteği atmasın.
  async function rpc(body){
    const r = await fetch(API_URL, {method:'POST', headers:{'Content-Type':'text/plain'}, body:JSON.stringify(body), cache:'no-store'});
    if (!r.ok) throw new Error(body.fn + ' ' + r.status);
    return r.json();
  }
  async function fetchRows(pinList, from){
    const t0 = Date.now();
    const j = await rpc({fn:'get', pins:pinList, since:from});
    NET.offset = j.t - (t0 + Date.now())/2;
    setConn(true);
    apply(j.rows);
  }
  function watch(pin){
    if (!/^\d{6}$/.test(pin)) return Promise.resolve();
    if (!pins.has(pin)){
      const p = fetchRows([pin], 0).catch(e=>{ pins.delete(pin); setConn(false); throw e; });
      pins.set(pin, p);
    }
    return pins.get(pin);
  }
  let busy = false;
  async function poll(){
    clearTimeout(pollT);
    if (busy){ pollT = setTimeout(poll, 120); return; }    // aynı anda tek yoklama (ek tetiklemeler döngüyü çoğaltmaz)
    busy = true;
    if (pins.size){
      // Sunucu yazımları atomik ve sıralı işler; yalnızca son görülen sürümden yenileri istenir.
      try{ await fetchRows([...pins.keys()], since); }catch(e){ setConn(false); }
    }
    busy = false;
    pollT = setTimeout(poll, document.hidden ? 3000 : 700);
  }
  function split(path){ const ks = parts(path); return ks[0] === 'games' && ks.length > 2 ? {pin:ks[1], rel:ks.slice(2).join('/')} : null; }
  function ref(path){
    const sp = split(path);
    if (sp) watch(sp.pin).catch(()=>{});
    return {
      set(v){
        if (!sp) return Promise.reject(new Error('gecersiz yol'));
        v = resolveTS(v); if (v === undefined) v = null;
        const k = sp.pin + '/' + sp.rel, id = ++seq;
        pend[k] = {id, v}; rebuild();
        const done = () => { if (pend[k] && pend[k].id === id) delete pend[k]; };
        return rpc({fn:'set', pin:sp.pin, path:sp.rel, value:v}).then(j=>{ const r = j.r;
          for (const d in rows) if (d.startsWith(k + '/') && rows[d].r < r) rows[d] = {r, v:null};
          if (!rows[k] || rows[k].r < r) rows[k] = {r, v};
          done(); rebuild(); setConn(true);
        }, e=>{ done(); rebuild(); setConn(false); throw e; });
      },
      once(){ return (sp ? watch(sp.pin) : Promise.resolve()).then(()=>snap(get(path))); },
      on(ev, fn){ const l = {path, fn, last:undefined}; listeners.push(l);
        l.last = JSON.stringify(get(path));
        // İlk bildirim o anki güncel değerle yapılır (arada gelen değişiklik eski değerle ezilmesin).
        setTimeout(()=>{ if (!listeners.includes(l)) return; const v = get(path); l.last = JSON.stringify(v); try{ fn(snap(v)); }catch(e){ console.error(e); } }, 0);
        return fn; },
      off(ev, fn){ for (let i=listeners.length-1;i>=0;i--) if (listeners[i].path === path && (!fn || listeners[i].fn === fn)) listeners.splice(i,1); }
    };
  }
  async function ping(){ const t0 = Date.now(); const j = await rpc({fn:'get', pins:[], since:0}); NET.offset = j.t - (t0 + Date.now())/2; }
  return { ref, start:poll, ping };
})();

async function netInit(){
  if (NET.ok) return true;
  // 1) BASLAT ile açıldıysa: yerel sunucu (aynı Wi-Fi, internet gerekmez)
  if (location.protocol.startsWith('http') && (IS_LAN_HOST || ['localhost','127.0.0.1','[::1]','::1'].includes(location.hostname))){
    try{
      const r = await fetch('/api/info', {cache:'no-store'});
      const j = r.ok ? await r.json() : null;
      if (j && j.app === 'kaplan-arena'){
        NET.ips = j.ips || []; NET.port = String(j.port || location.port || '');
        NET.db = LDB; NET.mode = 'lan'; NET.ok = true; NET.connected = true; LDB.start();
        return true;
      }
    }catch(e){}
  }
  // 2) Aksi halde: internet üzerinden Vercel (bilgisayardan dosya olarak açılınca da)
  try{
    await SDB.ping();
    NET.db = SDB; NET.mode = 'web'; NET.ok = true; NET.connected = true; SDB.start();
    return true;
  }catch(e){ console.warn('İnternet bağlantısı kurulamadı', e); }
  return false;
}
const nowS = () => Date.now() + NET.offset;
const TS = () => ({'.sv':'timestamp'});
function netPill(){
  if (!NET.ok) return `<span class="netpill" id="netpill"><i></i>Telefonsuz mod</span>`;
  return `<span class="netpill ${NET.connected?'on':''}" id="netpill"><i></i>${NET.connected?'Telefon bağlantısı açık':'Bağlanıyor…'}</span>`;
}

/* ---------- tek yarışma kuralı (internet modu) ----------
   Aynı anda yalnızca bir yarışma ekranı yarışma yürütebilir. Aktif ekran sunucudaki kilidi
   20 sn'de bir yeniler; 5 dk haber alınmazsa kilit düşer. Başka bir ekran (Vercel adresi ya da
   bilgisayardaki dosya, başka cihaz) girmeye çalışırsa engellenir, aktif ekrana uyarı gider. */
const HOST_ID = (()=>{
  const ok = h => /^[A-Za-z0-9]{8,40}$/.test(h || '');
  try{
    let h = localStorage.getItem('ka-host-id');
    if (!ok(h)){ h = Array.from(crypto.getRandomValues(new Uint8Array(12)), b=>b.toString(36).padStart(2,'0')).join('').slice(0,20); localStorage.setItem('ka-host-id', h); }
    return h;
  }catch(e){ return 'h' + Math.random().toString(36).slice(2,14).padEnd(10,'0'); }
})();
const WHERE = location.protocol === 'file:' ? 'bilgisayardaki dosya' : location.host;
const LOCK = { state:'unknown', info:null, timer:null, busy:false, alertSeen:0, alertPin:null, alertRef:null, alertFn:null };
const lockOn = () => NET.ok && NET.mode === 'web';
const gameActive = () => !!(S && S.game.started && !S.game.finished);
async function lockReq(op, notify, g){
  g = g || S.game;
  if (!g.since) g.since = Math.round(nowS());
  const r = await fetch(API_URL, {method:'POST', headers:{'Content-Type':'text/plain'}, cache:'no-store',
    body:JSON.stringify({fn:'lock', op, host:HOST_ID, pin:g.pin, title:S.settings.title, where:WHERE, since:g.since || Math.round(nowS()), notify:!!notify})});
  if (!r.ok) throw new Error('lock ' + r.status);
  return r.json();
}
async function lockSync(notify){
  if (!lockOn()) return true;
  clearTimeout(LOCK.timer); LOCK.timer = setTimeout(()=>lockSync(false), 20000);
  if (LOCK.busy) return LOCK.state !== 'other';
  LOCK.busy = true;
  const prev = LOCK.state;
  try{
    if (gameActive()){
      const j = await lockReq('acquire', notify);
      LOCK.state = j.state === 'mine' ? 'mine' : 'other'; LOCK.info = j.info || null;
    } else {
      const j = await lockReq('check', notify);
      if (j.state === 'mine'){ await lockReq('release'); LOCK.state = 'free'; }
      else { LOCK.state = j.state; LOCK.info = j.info || null; }
    }
  }catch(e){ /* bağlantı yoksa durum değişmez, sonraki denemede yenilenir */ }
  LOCK.busy = false;
  alertWatch();
  if (LOCK.state !== prev && (ui.screen === 'menu' || ui.screen === 'game')) render();
  return LOCK.state !== 'other';
}
function alertWatch(){
  const pin = LOCK.state === 'mine' && gameActive() ? S.game.pin : null;
  if (LOCK.alertPin === pin) return;
  if (LOCK.alertRef) LOCK.alertRef.off('value', LOCK.alertFn);
  LOCK.alertPin = pin; LOCK.alertRef = null;
  if (!pin) return;
  const t0 = nowS();
  LOCK.alertRef = NET.db.ref(`games/${pin}/alert`);
  LOCK.alertFn = s=>{
    const v = s.val(); if (!v || !(v.t > Math.max(t0, LOCK.alertSeen))) return;
    LOCK.alertSeen = v.t;
    toast(`Uyarı: ${v.where || 'başka bir cihaz'} üzerinden yarışma ekranı açılmaya çalışıldı ve engellendi.`, 9000);
  };
  LOCK.alertRef.on('value', LOCK.alertFn);
}
function lockAgo(ms){ const s = Math.max(0, Math.round(ms/1000)); return s < 60 ? `${s} sn önce` : `${Math.round(s/60)} dk önce`; }
function lockCard(){
  const i = LOCK.info || {};
  const t = i.since ? new Date(i.since).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : '';
  return `<div class="notice" role="alert" style="max-width:680px;text-align:left">
    <b style="font-size:1.15rem">Şu anda başka bir yerde açık bir yarışma var.</b><br>
    Aynı anda yalnızca bir yarışma yapılabilir; bu ekrandan yarışma başlatılamaz ve açık ekrana uyarı gönderildi.<br>
    Açık yarışma: <b>${esc(i.title || 'Kaplan Arena')}</b>${i.where ? ` · ${esc(i.where)}` : ''}${t ? ` · başlama ${t}` : ''}${i.seen ? ` · son bağlantı ${lockAgo(nowS() - i.seen)}` : ''}<br>
    O yarışma bitirildiğinde ya da o ekran 5 dakika boyunca kapalı kaldığında buradan başlatabilirsiniz.
    <div class="row" style="margin-top:10px"><button class="btn" data-act="lockRetry">Tekrar Kontrol Et</button>
    ${gameActive() ? `<button class="btn danger" data-act="localEndAsk">Bu cihazdaki eski yarışmayı kapat</button>` : ''}</div>
    ${confirmBox('localend','Bu cihazda yarım kalmış eski yarışma kapatılacak (puanları silinmez, yarışma bitti olarak işaretlenir). Açık olan diğer yarışma etkilenmez.','localEndYes','Eski Yarışmayı Kapat')}
  </div>`;
}
