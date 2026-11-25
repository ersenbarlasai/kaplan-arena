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

function stageInit(){
  document.body.classList.add('mode-stage');
  document.title = 'Kaplan Arena · Sahne';
  const app = document.getElementById('app');
  app.innerHTML = `<div class="stage-root" id="sg"></div>
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

  function draw(){
    const h = StageView.html(model);
    if (h !== html){
      html = h; sg.innerHTML = h;
      paintQR(sg);
      const cf = sg.querySelector('[data-confetti]');
      if (cf && !(model && model.motion)) runConfetti(cf);
    }
    StageClock.paint(sg, model);
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
