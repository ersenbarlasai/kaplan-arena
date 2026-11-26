/* Kaplan Arena — sahne penceresi (projeksiyon). Salt görüntüleyicidir: ağa bağlanmaz, kilit almaz,
   süre/puan hesaplamaz. Admin'in gönderdiği modeli çizer, sayacı yerel saatle geri sayar ve
   yalnız etkin ses sahnesiyse ses çalar. */
const StageClock = {
  /* Hem sahnede hem admin önizlemesinde [data-clock] öğelerini günceller. */
  paint(root, m, onTick){
    if (!m || !m.clock) return;
    const left = m.clock.running ? Math.max(0, m.clock.endsAt - Date.now()) : m.clock.left;
    const sec = Math.ceil(left / 1000);
    root.querySelectorAll('[data-clock]').forEach(el => {
      const b = el.querySelector('b'); if (b && b.textContent !== String(sec)) b.textContent = sec;
      const pg = el.querySelector('.pg'); if (pg) pg.style.strokeDashoffset = String(100 - Math.max(0, Math.min(100, left / m.clock.total * 100)));
      el.classList.toggle('warn', sec <= 10 && m.clock.total > 0);
      el.classList.toggle('zero', sec === 0);
    });
    if (onTick && m.clock.running) onTick(sec);
  }
};

/* Sinematik katmanı: #sg dışındaki tek, kalıcı <video>. Model her güncellendiğinde yeniden kurulmaz; yalnız oturum
   kimliği değişince yeni oynatma başlar. Açılış filmi de ara döngüsü gibi döngüde oynar; ekran değişene ya da admin
   Atla/Durdur diyene kadar sürer. Sesi yalnız etkin ses sahnesi açar (MP4 içindeki miks; Web Audio'dan ikinci kez
   çalınmaz). Yükleme bitene kadar ya da hata/eksik dosyada altta sabit karşılama görünür. Sahne yenilenir ya da
   yeniden bağlanırsa film baştan değil, admin oturumunun süresine göre kaldığı yerden sürer. Hareketleri azaltma
   açıksa açılış oynatılmaz.
   Karşılama müziği: karşılama ekranında film oynamıyorken ara döngüsünün müziği (aynı MP4'ün sesi) ayrı bir <audio>
   ile döngüde çalar; film başlayınca durur, film kapanınca kaldığı yerden sürer. Yalnız etkin ses sahnesi, merkezi
   ses açık ve seviye > 0 iken. */
function StageCine(box, bgm){
  const vid = box.querySelector('video');
  let cur = null;                        // { id, mode }
  let lastM = null, lastSnd = false;
  const seen = new Set();                // bu pencerede başlatılmış/atlanmış oturumlar
  function music(){
    const m = lastM, s = (m && m.sound) || {}, vol = Math.max(0, Math.min(1, (s.volume || 0) / 100));
    const want = !!(bgm && m && m.screen === 'welcome' && m.bgm && !cur && lastSnd && s.on && vol > 0);
    if (!bgm) return;
    if (!want){ if (!bgm.paused){ try{ bgm.pause(); }catch(e){} } return; }
    if (bgm.getAttribute('src') !== m.bgm) bgm.setAttribute('src', m.bgm);
    bgm.loop = true; bgm.volume = vol; bgm.muted = false;
    if (bgm.paused){ const p = bgm.play(); if (p && p.catch) p.catch(() => {}); }
  }
  function hide(){
    cur = null; box.classList.remove('on'); box.hidden = true;
    try{ vid.pause(); }catch(e){}
    if (vid.getAttribute('src')){ vid.removeAttribute('src'); vid.removeAttribute('poster'); try{ vid.load(); }catch(e){} }
    music();
  }
  function level(m, soundStage){
    const s = (m && m.sound) || {}, vol = Math.max(0, Math.min(1, (s.volume || 0) / 100));
    vid.volume = vol;
    vid.muted = !(soundStage && s.on && vol > 0);
  }
  vid.addEventListener('playing', () => { if (cur) box.classList.add('on'); });
  vid.addEventListener('error', () => { if (cur){ console.warn('Sinematik yüklenemedi; sabit karşılama gösteriliyor.'); hide(); } });
  function apply(m, soundStage){
      const c = m && m.screen === 'welcome' ? m.cine : null;
      if (!c){ if (cur) hide(); return; }
      if (cur && cur.id === c.id){ level(m, soundStage); return; }
      if (cur) hide();
      if (seen.has(c.id)) return;
      seen.add(c.id);
      if (c.mode === 'opening' && m.motion) return;   // hareketleri azaltma → sabit karşılama
      cur = { id:c.id, mode:c.mode };
      box.hidden = false;
      vid.loop = true;                                // açılış da döngüde: ekran değişene ya da Atla/Durdur'a kadar
      // Yenileme/yeniden bağlanma: oturum sürmekteyse baştan değil, admin saatine göre kaldığı yerden
      const off = c.elapsed > 2500 && c.dur ? (c.elapsed / 1000) % c.dur : 0;
      if (off > 0) vid.addEventListener('loadedmetadata', () => { if (cur && cur.id === c.id){ try{ vid.currentTime = off; }catch(e){} } }, { once:true });
      if (c.poster) vid.setAttribute('poster', c.poster); else vid.removeAttribute('poster');
      vid.src = c.src;
      level(m, soundStage);
      const p = vid.play();
      if (p && p.catch) p.catch(() => {
        // Tarayıcı sesli oynatmaya izin vermediyse sessiz dene; o da olmazsa sabit karşılama.
        if (!cur || cur.id !== c.id) return;
        vid.muted = true;
        vid.play().catch(() => { if (cur && cur.id === c.id) hide(); });
      });
  }
  return {
    apply(m, soundStage){ lastM = m; lastSnd = !!soundStage; apply(m, soundStage); music(); },
    playing: () => !!cur
  };
}

/* Şampiyonluk katmanı (yalnız sahne penceresi): tek kalıcı <canvas> ve tek kalıcı <audio>.
   - Konfeti: gösteri kimliği başına bir kez; ad açılırken iki yandan patlama, ardından ~8 sn hafif düşüş. Yeniden
     çizimde canvas yeni DOM'a taşınır (yeniden başlamaz); geç bağlanan sahne yalnız kalan hafif düşüşü görür.
     Hareketleri azaltma açıksa çizilmez. Canvas ad katmanının altındadır; flaş yok.
   - Müzik: yalnız etkin ses sahnesi, merkezi ses açık ve seviye > 0 iken; düşük seviye (CHAMP.level), yumuşak giriş,
     ekrandan çıkınca yumuşak çıkış ve durma. Karşılama/ara/video müziğiyle aynı anda çalmaz (yalnız şampiyonluk ekranı). */
function StageChamp(cv, au){
  let id = null, raf = 0, parts = [], t0 = 0, burstDone = false, ramp = 0, target = 0, lastM = null, lastSnd = false;
  const COLS = ['#e7c46a', '#f3d98b', '#d9772b', '#fff3d1', '#5f9f7a', '#b8913f'];
  const BURST_AT = 1100, END = 9500;
  function clear(){ if (raf) cancelAnimationFrame(raf); raf = 0; parts = []; const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); }
  function size(){ const r = cv.getBoundingClientRect(); const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height)); if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; } }
  const P = (x, y, vx, vy, big) => ({ x, y, vx, vy, r:Math.random() * 6.28, vr:(Math.random() - .5) * .3, w:(big ? 8 : 5) + Math.random() * 7, c:COLS[(Math.random() * COLS.length) | 0], a:1 });
  function burst(){
    const W = cv.width, H = cv.height;
    for (let k = 0; k < 90; k++){
      const s = 7 + Math.random() * 9, ang = (-70 + Math.random() * 45) * Math.PI / 180;
      parts.push(P(0, H * .82, Math.cos(ang) * s, Math.sin(ang) * s, true));
      parts.push(P(W, H * .82, -Math.cos(ang) * s, Math.sin(ang) * s, true));
    }
  }
  function frame(){
    raf = 0; if (!cv.isConnected){ clear(); return; }
    const now = Date.now() - t0, c = cv.getContext('2d'), W = cv.width, H = cv.height;
    if (!burstDone && now >= BURST_AT){ burstDone = true; if (now < BURST_AT + 1500) burst(); }
    if (now > BURST_AT && now < END - 1500 && Math.random() < .5) parts.push(P(Math.random() * W, -10, (Math.random() - .5) * 1.2, 1 + Math.random() * 1.6, false));
    c.clearRect(0, 0, W, H);
    parts = parts.filter(p => p.y < H + 30 && p.a > .02);
    for (const p of parts){
      p.vy += .16; p.vx *= .99; if (p.vy > 4.2) p.vy = 4.2;
      p.x += p.vx; p.y += p.vy; p.r += p.vr; if (now > END - 1800) p.a *= .97;
      c.save(); c.globalAlpha = p.a; c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); c.restore();
    }
    if (now < END || parts.length) raf = requestAnimationFrame(frame); else clear();
  }
  function start(sh){
    clear(); size();
    (window.KA_DIAG || (window.KA_DIAG = { champStarts:0 })).champStarts++;   // tanı sayacı (test/inceleme)
    t0 = Date.now() - (sh.elapsed || 0); burstDone = false;
    if ((sh.elapsed || 0) < END && !sh.skip) raf = requestAnimationFrame(frame);
  }
  // ---- müzik: tek <audio>, ses rampası ----
  function level(){
    const m = lastM, s = (m && m.sound) || {}, vol = Math.max(0, Math.min(1, (s.volume || 0) / 100));
    return m && m.screen === 'champion' && m.music && lastSnd && s.on && vol > 0 ? vol * (CHAMP.level || .5) : 0;
  }
  function music(){
    const m = lastM; target = level();
    if (target > 0){
      if (au.getAttribute('src') !== m.music){ au.setAttribute('src', m.music); au.volume = 0; }
      au.loop = true; au.muted = false;
      if (au.paused){ au.volume = 0; const p = au.play(); if (p && p.catch) p.catch(() => {}); }
    }
    if (!ramp) ramp = setInterval(() => {
      const v = au.volume, step = target > v ? .03 : .05;
      const nv = Math.abs(target - v) <= step ? target : v + (target > v ? step : -step);
      try{ au.volume = Math.max(0, Math.min(1, nv)); }catch(e){}
      if (nv === target){
        clearInterval(ramp); ramp = 0;
        if (target === 0 && !au.paused){ try{ au.pause(); au.currentTime = 0; }catch(e){} }
      }
    }, 60);
  }
  return {
    apply(m, soundStage){
      lastM = m; lastSnd = !!soundStage;
      const sh = m && m.screen === 'champion' && m.elim ? m.show : null;
      if (!sh || m.motion){ if (id){ id = null; clear(); } }
      else if (sh.id !== id){ id = sh.id; start(sh); }
      music();
    },
    /* Yeniden çizimden sonra kalıcı canvas'ı yeni yuvaya taşır (konfeti durmaz, baştan başlamaz). */
    mount(root){ const slot = root.querySelector('[data-fxslot]'); if (slot && cv.parentNode !== slot){ slot.appendChild(cv); size(); } },
    playing: () => !!(au && !au.paused)
  };
}

function stageInit(){
  document.body.classList.add('mode-stage');
  document.title = 'Kaplan Arena · Sahne';
  const app = document.getElementById('app');
  app.innerHTML = `<div class="stage-root" id="sg"></div>
    <div class="stage-cine" id="cine" hidden aria-hidden="true"><video playsinline preload="auto" disablepictureinpicture></video></div>
    <audio id="bgm" preload="auto" loop hidden></audio>
    <audio id="champ" preload="auto" loop hidden></audio>
    <canvas class="sg-fx" id="fx" aria-hidden="true"></canvas>
    <div class="stage-setup" id="setup" role="dialog" aria-modal="true" aria-labelledby="setup-h">
      <div class="setup-card">
        <h2 id="setup-h">Sahne Ekranı</h2>
        <ol>
          <li>Windows'ta <b>Win + P → Genişlet</b> seçin.</li>
          <li>Bu pencereyi projeksiyon ekranına sürükleyin.</li>
          <li>Tam ekran için aşağıdaki düğmeyi ya da <b>F11</b> tuşunu kullanın.</li>
        </ol>
        <p>Joker, süre ve kutlama sesleri yalnız bu pencereden çalar. Tarayıcı sesi bir kez onay ister.</p>
        <div class="setup-btns">
          <button class="btn primary" id="snd-on">Sesi Etkinleştir ve Test Et</button>
          <button class="btn" id="snd-off">Sessiz Devam Et</button>
          <button class="btn" id="fs">Tam Ekran</button>
        </div>
        <p class="setup-st" id="setup-st" role="status"></p>
      </div>
    </div>
    <div class="stage-conn" id="conn" hidden>Yönetim penceresiyle bağlantı bekleniyor…</div>`;
  const sg = document.getElementById('sg'), setup = document.getElementById('setup'), st = document.getElementById('setup-st');
  let model = null, html = '', played = null, lastTick = null, soundOn = false;
  const isSoundStage = () => soundOn && model && model.sound && model.sound.stage === StageClient.id;

  function closeSetup(){ setup.hidden = true; }
  document.getElementById('snd-on').onclick = () => {
    const ok = StageAudio.enable();
    soundOn = ok; StageClient.setSound(ok);
    if (model && model.sound) StageAudio.set((model.sound.volume || 0) / 100, !model.sound.on);
    if (ok && StageAudio.play('test')) st.textContent = 'Ses etkin. Test sesi çalındı.';
    else st.textContent = ok ? 'Ses etkin, fakat yönetim panelinde ses kapalı ya da seviyesi sıfır.' : 'Ses başlatılamadı; sahne sessiz çalışır.';
    setTimeout(closeSetup, 1400);
  };
  document.getElementById('snd-off').onclick = () => { soundOn = false; StageClient.setSound(false); closeSetup(); };
  document.getElementById('fs').onclick = () => { try{ document.documentElement.requestFullscreen().catch(()=>{}); }catch(e){} };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !setup.hidden) closeSetup(); });

  const cine = StageCine(document.getElementById('cine'), document.getElementById('bgm'));
  const champ = StageChamp(document.getElementById('fx'), document.getElementById('champ'));
  function draw(){
    cine.apply(model, isSoundStage());
    const h = StageView.html(model);
    if (h !== html){
      html = h; sg.innerHTML = h;
      paintQR(sg);
      champ.mount(sg);
      const cf = sg.querySelector('[data-confetti]');
      if (cf && !(model && model.motion)) runConfetti(cf);
    }
    ShowFX.apply(sg, model);
    champ.apply(model, isSoundStage());
    StageClock.paint(sg, model);
    RevealFX.apply(sg, model, () => { if (isSoundStage()) StageAudio.play('entry'); });
  }
  StageClient.init(m => {
    model = m;
    if (m.sound) StageAudio.set((m.sound.volume || 0) / 100, !m.sound.on);
    // Ses olayları: bağlantı anındaki olay numarası taban alınır, eski olaylar çalınmaz.
    if (played == null) played = m.evId || 0;
    for (const ev of (m.events || [])){
      if (ev.id <= played) continue;
      played = ev.id;
      if (isSoundStage()) StageAudio.play(ev.kind);
    }
    document.body.classList.toggle('reduce-motion', !!m.motion);
    draw();
  });
  setInterval(() => {
    if (model) StageClock.paint(sg, model, sec => {
      if (sec > 0 && sec <= 5 && lastTick !== model.qk + ':' + sec){ lastTick = model.qk + ':' + sec; if (isSoundStage()) StageAudio.play('tick'); }
    });
    const lost = Date.now() - StageClient.lastAt() > 4000;
    document.getElementById('conn').hidden = !lost || !model;
    if (!model && !StageClient.hasOpener()) document.getElementById('conn').hidden = false;
  }, 200);
  draw();
}
