/* Kaplan Arena — admin ↔ sahne pencere iletişimi.
   Birincil yol window.postMessage: sahne kullanıcı tıklamasıyla admin'den açılır; sahne her saniye
   window.opener'a ping atar, admin event.source'u sahne penceresi olarak tutar (admin yenilense de
   sahnenin opener'ı aynı sekmeyi gösterir). file:// dahil her kökende çalışır.
   Yedek yol BroadcastChannel: HTTP altında elle açılmış sahne için (file:// altında opak köken
   nedeniyle güvenilir değildir; orada sahne "Sahne Ekranını Aç" ile açılmalıdır). */
const LINK_APP = 'kaplan-sahne';
const LINK_LOST_MS = 3000;

const StageHost = (() => {
  const stages = new Map();            // id -> { id, src, last, soundOn, soundAt }
  const sid = Math.random().toString(36).slice(2, 10);   // admin oturum kimliği (yenilemede değişir)
  let bc = null, seq = 0, lastModel = null, onChange = () => {};
  function post(msg, only){
    msg.app = LINK_APP; msg.from = 'admin'; msg.sid = sid;
    const list = only ? [only] : [...stages.values()];
    for (const s of list){ try{ if (s.src && !s.src.closed) s.src.postMessage(msg, '*'); }catch(e){} }
    if (!only){ try{ if (bc) bc.postMessage(msg); }catch(e){} }
  }
  function onMsg(d, source){
    if (!d || d.app !== LINK_APP || d.from !== 'stage' || !d.id) return;
    if (d.type === 'bye'){ if (stages.delete(d.id)) onChange('lost', d.id); return; }
    let s = stages.get(d.id); const isNew = !s;
    if (!s){ s = { id:d.id }; stages.set(d.id, s); }
    if (source) s.src = source;
    s.last = Date.now(); s.soundOn = !!d.soundOn; s.soundAt = d.soundAt || 0;
    if (isNew || d.type === 'hello'){
      if (lastModel) post({ type:'model', seq:++seq, model:lastModel }, s.src ? s : null);
      onChange(isNew ? 'join' : 'hello', d.id);
    } else onChange('ping', d.id);
  }
  function check(){
    const now = Date.now();
    for (const [id, s] of stages){
      let closed = false; try{ closed = !!(s.src && s.src.closed); }catch(e){}
      if (closed || now - s.last > LINK_LOST_MS){ stages.delete(id); onChange('lost', id); }
    }
  }
  return {
    init(cb){
      onChange = cb || onChange;
      window.addEventListener('message', e => onMsg(e.data, e.source));
      try{ bc = new BroadcastChannel(LINK_APP); bc.onmessage = e => onMsg(e.data, null); }catch(e){ bc = null; }
      setInterval(check, 700);
    },
    send(model){ lastModel = model; if (stages.size || bc) post({ type:'model', seq:++seq, model }); },
    open(){
      const url = location.href.split('#')[0].split('?')[0] + '?sahne';
      let w = null;
      try{ w = window.open(url, 'kaplanSahne', 'popup=yes,width=1280,height=760'); }catch(e){}
      if (w){ try{ w.focus(); }catch(e){} }
      return !!w;
    },
    count(){ return stages.size; },
    soundStage(){ let best = null; for (const s of stages.values()) if (s.soundOn && (!best || s.soundAt > best.soundAt)) best = s; return best ? best.id : null; },
    list(){ return [...stages.values()].map(s => ({ id:s.id, soundOn:s.soundOn })); }
  };
})();

const StageClient = (() => {
  const id = 'st' + Math.random().toString(36).slice(2, 10);
  let bc = null, onModel = () => {}, lastSeq = 0, lastSid = null, lastAt = 0, soundOn = false, soundAt = 0;
  function send(type){
    const m = { app:LINK_APP, from:'stage', type, id, soundOn, soundAt };
    try{ if (window.opener && !window.opener.closed) window.opener.postMessage(m, '*'); }catch(e){}
    try{ if (bc) bc.postMessage(m); }catch(e){}
  }
  function onMsg(d){
    if (!d || d.app !== LINK_APP || d.from !== 'admin' || d.type !== 'model') return;
    if (d.sid !== lastSid){ lastSid = d.sid; lastSeq = 0; }
    if (d.seq <= lastSeq) return;           // eski/yinelenen ileti
    lastSeq = d.seq; lastAt = Date.now();
    onModel(d.model);
  }
  return {
    id,
    init(cb){
      onModel = cb;
      window.addEventListener('message', e => onMsg(e.data));
      try{ bc = new BroadcastChannel(LINK_APP); bc.onmessage = e => onMsg(e.data); }catch(e){ bc = null; }
      send('hello');
      setInterval(() => send('ping'), 1000);
      window.addEventListener('pagehide', () => send('bye'));
    },
    setSound(on){ soundOn = !!on; soundAt = Date.now(); send('hello'); },
    lastAt: () => lastAt,
    hasOpener: () => { try{ return !!(window.opener && !window.opener.closed); }catch(e){ return false; } }
  };
})();
