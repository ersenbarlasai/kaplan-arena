/* Kaplan Arena — sahne (projeksiyon) görünümü.
   StageView.html(model) yalnız admin'in gönderdiği temizlenmiş modeli çizer; yönetim verisi içermez.
   Sahne penceresi ve admin panelindeki canlı önizleme aynı çizimi kullanır (kapsayıcı birimleri: cq*). */
const StageView = (() => {
  const LET = ['A','B','C','D'];
  const bg = (name) => `<div class="sg-bg" style="background-image:url('assets/img/${name}.webp')"></div>`;
  const team = (t, opt) => `<div class="sg-team ${opt && opt.cls || ''} ${t.ans ? 'ans' : ''} ${t.jk ? 'jk' : ''}">
      ${armaHTML(t.arma, 'sg-arma', '')}<span class="nm">${esc(t.name)}</span>
      ${t.jk ? `<span class="sg-jkb" title="${esc(JK[t.jk].name)}">${esc(JK[t.jk].short)}</span>` : ''}
      ${opt && opt.noScore ? '' : `<b class="sc">${t.score}</b>`}
      ${t.ans ? '<i class="tick" aria-label="cevap verdi">✓</i>' : ''}</div>`;
  const teamsRow = (m) => m.teams && m.teams.length ? `<div class="sg-teams n${Math.min(m.teams.length, 12)}">${m.teams.map(t => team(t)).join('')}</div>` : '';
  const stageBadge = (m) => m.stage ? `<div class="sg-place"><span class="sg-place-ic" aria-hidden="true"></span>${esc(m.stage.place)}<small>${esc(m.stage.name)}</small></div>` : '';
  const progress = (m) => {
    if (!m.q || !m.q.total) return '';
    const dots = Array.from({ length: m.q.total }, (_, i) => `<i class="${i < m.q.n - 1 ? 'done' : i === m.q.n - 1 ? 'now' : ''}"></i>`).join('');
    return `<div class="sg-prog"><span>SORU ${m.q.n} / ${m.q.total}</span><div class="dots">${dots}</div></div>`;
  };
  const clock = (m) => `<div class="sg-clock ${m.clock && m.clock.running ? 'run' : ''}" data-clock><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="tr" cx="60" cy="60" r="52"/><circle class="pg" cx="60" cy="60" r="52" pathLength="100"/></svg><b>${m.clock ? Math.ceil(m.clock.left / 1000) : ''}</b></div>`;
  const pausedBand = (m) => {
    const r = (m.paused || []).filter(x => x !== 'joker' || !m.intro);
    if (m.phase !== 'open' || !r.length) return '';
    const txt = r.includes('stage') ? 'Sahne yeniden bağlanıyor' : r.includes('break') ? 'Ara verildi' : r.includes('joker') ? 'Joker tanıtımı' : 'Süre durduruldu';
    return `<div class="sg-band pause"><span class="ic" aria-hidden="true">❚❚</span> ${txt} · kalan süre korunuyor</div>`;
  };
  function join(j, big){
    if (!j) return '';
    return `<div class="sg-join ${big ? 'big' : ''}"><div class="qr" data-url="${esc(j.url)}" data-size="${big ? 260 : 170}"></div>
      <div class="jtx"><small>Telefonla katıl</small><div class="addr">${esc(j.addr)}</div><small>Yarışma kodu</small><div class="pin">${esc(pinTxt(j.pin))}</div></div></div>`;
  }
  // Kapsayıcı adlandırma: ortak yarışmada "takım", turnuvada mevcut "sınıf".
  const N = (m) => m && m.mode === 'shared' ? { one:'takım', dat:'takımlara' } : { one:'sınıf', dat:'sınıflara' };
  function lobbyNote(m){
    const n = (m.teams || []).length;
    if (m.mode !== 'shared') return m.stage.key === 'final' ? 'Şampiyon belirlenecek · puanlar sıfırdan' : 'İlk 2 sınıf finale çıkar';
    if (m.stage.key === 's1') return `${n} takım birlikte yarışıyor · eleme yok · puanlar üç etap boyunca birikir`;
    if (m.stage.key === 'final') return 'Son etap · puanlar birikir · toplam puan şampiyonu belirler';
    return `Puanlar korunuyor · ${n} takım birlikte devam ediyor · puanlar birikir`;
  }
  const S = {};

  S.idle = () => `${bg('karsilama')}<div class="sg-center"><div class="sg-plaque"><h2>Sahne hazırlanıyor</h2><p>Yönetim penceresi bekleniyor…</p></div></div>`;

  S.welcome = (m) => {
    const c = m.credits || CREDITS;
    return `${bg('karsilama')}<div class="sg-fog"></div>
      <img class="sg-guide" src="assets/img/kaplan-rehber.webp" alt="" draggable="false">
      <div class="sg-wtext">
        <div class="sg-presents">${esc(c.org).toLocaleUpperCase('tr-TR')} SUNAR</div>
        <h1 class="sg-title">KAPLAN ARENA</h1>
        <div class="sg-ribbon">Efsaneye Yolculuk</div>
        ${m.resume ? '<div class="sg-sub">Yarışma kaldığı yerden sürecek</div>' : ''}
      </div>
      <div class="sg-credits">
        <div class="cr-org">Düzenleyen: <b>${esc(c.org)}</b></div>
        <div class="cr-cols">
          <section><h4>Mentörler</h4><ul class="men">${c.mentors.map(n => `<li>${esc(n)}</li>`).join('')}</ul></section>
          <section><h4>Kulüp Öğrencileri</h4><ul class="stu">${c.students.map(n => `<li>${esc(n)}</li>`).join('')}</ul></section>
        </div>
      </div>`;
  };

  S.map = (m) => {
    const st = m.mapStages || [];
    const node = (k, i) => { const s = st[i] || {}; return `<div class="sg-node n${i} ${s.state || ''}"><span class="pin"></span><span class="lbl">${esc(STAGES[i].place)}</span><small>${s.state === 'done' ? 'Tamamlandı' : s.state === 'now' ? 'Şimdi' : STAGES[i].name}</small></div>`; };
    return `${bg('karsilama')}<div class="sg-dim"></div>
      <svg class="sg-path" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true"><path d="M18 40 C30 46 40 30 52 33 S72 38 84 30"/></svg>
      ${STAGES.map((s, i) => node(s.key, i)).join('')}
      <div class="sg-maptop"><h1 class="sg-title sm">KAPLAN ARENA</h1><div class="sg-ribbon sm">Efsaneye Yolculuk</div></div>
      ${m.join ? `<div class="sg-mapjoin">${join(m.join, false)}</div>` : ''}
      <div class="sg-banners n${Math.min((m.classes || []).length, 14)}">${(m.classes || []).map(c => `<div class="sg-banner">${armaHTML(c.arma, 'sg-arma', '')}<span>${esc(c.name)}</span></div>`).join('')}</div>`;
  };

  S.draw = (m) => {
    const d = m.draw || {};
    const col = (k, title) => `<div class="sg-dcol"><h3>${title}</h3>${(d[k] || []).map((c, i) => c ? `<div class="sg-dt ${d.last === k + ':' + i ? 'new' : ''}">${armaHTML(c.arma, 'sg-arma', '')}<span>${esc(c.name)}</span></div>` : `<div class="sg-dt wait">?</div>`).join('')}</div>`;
    return `${bg('karsilama')}<div class="sg-dim"></div><div class="sg-frame">
      <header class="sg-head"><h2 class="sg-h">Kura</h2><span>${d.started ? (d.done ? 'Kura tamamlandı' : 'Kura çekiliyor…') : `${(d.pool || []).length} sınıf iki etaba ayrılacak`}</span></header>
      ${d.started ? `${d.done ? '' : `<div class="sg-drum">${esc(d.drum || '?')}</div>`}<div class="sg-dcols">${col('s1', STAGES[0].place)}${col('s2', STAGES[1].place)}</div>`
        : `<div class="sg-pool">${(d.pool || []).map(c => `<div class="sg-banner sm">${armaHTML(c.arma, 'sg-arma', '')}<span>${esc(c.name)}</span></div>`).join('')}</div>${m.join ? `<div class="sg-row c">${join(m.join, true)}</div>` : ''}`}
    </div>`;
  };

  S.lobby = (m) => `${bg(m.stage.img)}<div class="sg-dim"></div><div class="sg-frame">
      <header class="sg-head">${stageBadge(m)}<h2 class="sg-h">${m.mode === 'shared' ? 'Ortak Katılım' : 'Katılım'}</h2><span>${esc(lobbyNote(m))}</span></header>
      <div class="sg-lobby">${m.join ? join(m.join, true) : '<div class="sg-plaque"><p>Telefonsuz yarışma: puanları yönetici girer.</p></div>'}
        <div class="sg-jlist n${Math.min((m.teams || []).length, 12)}">${(m.teams || []).map(t => `<div class="sg-jl ${t.joined ? 'on' : ''}">${armaHTML(t.arma, 'sg-arma', '')}<span>${esc(t.name)}</span>${m.showScores ? `<b class="sc" title="Toplam puan">${t.score}</b>` : ''}<em>${t.joined ? 'Hazır ✓' : 'Bekleniyor'}</em></div>`).join('')}</div>
      </div></div>`;

  S.ready = (m) => `${bg(m.stage.img)}<div class="sg-dim soft"></div><div class="sg-frame">
      <header class="sg-head">${stageBadge(m)}${progress(m)}</header>
      <div class="sg-center"><div class="sg-plaque big"><div class="kick">${m.q.type === 'tahmin' ? 'Tahmin Sorusu' : 'Şıklı Soru'}</div><h2>Hazır mısınız?</h2><p>Soru ekrana gelince süre başlayacak.</p></div></div>
      ${teamsRow(m)}</div>`;

  function questionBody(m){
    const q = m.q, rev = m.phase === 'revealed';
    if (q.type === 'ders'){
      return `<div class="sg-opts">${q.options.map((o, i) => { const L = LET[i];
        const cls = rev ? (L === m.answer ? 'correct' : 'dim') : '';
        return `<div class="sg-opt ${cls}"><b class="L">${L}</b><span>${esc(o)}</span>${rev && L === m.answer ? '<i class="ok">✓</i>' : ''}</div>`; }).join('')}</div>`;
    }
    return rev ? `<div class="sg-reveal gold"><small>Doğru cevap</small><b>${esc(fmt(m.answer))}</b><i>${esc(q.unit || '')}</i></div>`
               : `<div class="sg-hint">Tahmininizi telefondan gönderin. Gerçek cevaba en yakın ${N(m).one} kazanır.${q.unit ? ` <b>Birim: ${esc(q.unit)}</b>` : ''}</div>`;
  }
  S.question = (m) => {
    const q = m.q, lockTxt = m.phase === 'locked' ? '<div class="sg-band lock">Süre doldu · cevaplar kilitlendi</div>' : '';
    return `${bg(m.stage.img)}<div class="sg-dim soft"></div><div class="sg-frame q">
      <header class="sg-head">${stageBadge(m)}${progress(m)}${clock(m)}</header>
      <div class="sg-card ${m.phase}">
        ${q.subject ? `<div class="sg-subj">${esc(q.type === 'tahmin' ? 'Tahmin Sorusu' : q.subject)}</div>` : ''}
        <h2 class="sg-qt ${q.text.length > 140 ? 'long' : ''}">${esc(q.text)}</h2>
        ${questionBody(m)}
      </div>
      ${lockTxt}${pausedBand(m)}${m.correct ? correctPanel(m.correct) : teamsRow(m)}</div>`;
  };
  /* Doğru Bilenler: kararlı sınıf sırası (cevap hızı değil). Girişleri RevealFX zamanlar. */
  function correctPanel(c){
    if (c.none) return `<div class="sg-cor none" data-cor-panel><div class="sg-cor-h">Bu soruda doğru cevap gelmedi</div></div>`;
    const n = c.list.length;
    return `<div class="sg-cor n${Math.min(n, 14)}" data-cor-panel>
      <div class="sg-cor-h">${c.tahmin ? 'En yakın tahmin' : 'Doğru bilenler'}</div>
      <div class="sg-cor-list">${c.list.map(t => `<div class="sg-cor-item ${t.x2 ? 'x2' : ''}" data-cor="${esc(t.name)}">
        <span class="trail" aria-hidden="true"></span>
        <span class="crest">${armaHTML(t.arma, 'sg-arma', '')}${t.x2 ? '<b class="seal" aria-label="Çifte Puan">×2</b>' : ''}</span>
        <span class="nm">${esc(t.name)}</span>
        ${t.dbl ? '<em class="tag">2 Şık</em>' : ''}${t.guess != null ? `<em class="gs">${esc(t.guess)}</em>` : ''}</div>`).join('')}</div></div>`;
  }
  S.tie = (m) => {
    const rev = m.phase === 'revealed';
    return `${bg(m.stage.img)}<div class="sg-dim soft"></div><div class="sg-frame q">
      <header class="sg-head">${stageBadge(m)}<div class="sg-prog"><span>EŞİTLİK SORUSU</span></div>${m.phase === 'ready' ? '' : clock(m)}</header>
      <div class="sg-card ${m.phase}">
        <div class="sg-subj">Eşitlik · ${esc((m.teams || []).map(t => t.name).join(' · '))}</div>
        ${m.phase === 'ready' ? '<h2 class="sg-qt">Eşitlik sorusu geliyor. Hazır olun!</h2>'
          : `<h2 class="sg-qt">${esc(m.q ? m.q.text : 'Sunucunun sorduğu eşitlik sorusunu dinleyin.')}</h2>
             ${rev && m.answer != null ? `<div class="sg-reveal"><small>Doğru cevap</small><b>${esc(fmt(m.answer))}</b><i>${esc(m.q && m.q.unit || '')}</i></div>` : `<div class="sg-hint">Tahmininizi telefondan gönderin. En yakın ${N(m).one} kazanır.</div>`}`}
      </div>
      ${m.phase === 'locked' ? '<div class="sg-band lock">Süre doldu · cevaplar kilitlendi</div>' : ''}${pausedBand(m)}${teamsRow(m)}</div>`;
  };
  S.cancelled = (m) => `${bg(m.stage.img)}<div class="sg-dim"></div><div class="sg-frame"><header class="sg-head">${stageBadge(m)}${progress(m)}</header>
      <div class="sg-center"><div class="sg-plaque big"><div class="kick">Soru ${m.q ? m.q.n : ''}</div><h2>Soru iptal edildi</h2><p>Bu sorudan puan ya da ceza verilmez; kullanılan jokerler iade edildi.</p></div></div>${teamsRow(m)}</div>`;

  const delta = (t) => {
    const d = t.delta, j = t.jk ? `<span class="sg-jkb">${esc(JK[t.jk].short)}</span>` : '';
    if (d == null) return j;
    return j + `<span class="sg-delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'zero'}">${d > 0 ? '+' + d : d < 0 ? '−' + (-d) : '0'}</span>`;
  };
  function board(rows, opt){
    const max = Math.max(10, ...rows.map(r => r.score));
    return `<div class="sg-board">${rows.map((t, k) => `<div class="sg-row-b ${t.out ? 'out' : ''} ${t.win ? 'win' : ''}">
        <span class="rk r${k + 1}">${k + 1}</span>${armaHTML(t.arma, 'sg-arma', '')}<span class="nm">${esc(t.name)}${t.badge ? `<em>${esc(t.badge)}</em>` : ''}</span>
        <span class="dl">${opt && opt.delta ? delta(t) : ''}</span><span class="bar"><i style="width:${Math.round(t.score / max * 100)}%"></i></span><b class="sc" ${opt && opt.delta && t.from != null ? `data-from="${t.from}" data-to="${t.score}"` : ''}>${t.score}</b></div>`).join('')}</div>`;
  }
  S.scores = (m) => `${bg(m.stage.img)}<div class="sg-dim"></div><div class="sg-frame">
      <header class="sg-head">${stageBadge(m)}<h2 class="sg-h">Puan Durumu</h2><span>Soru ${m.q ? m.q.n : ''} / ${m.q ? m.q.total : ''}${m.answerText ? ` · doğru cevap: ${esc(m.answerText)}` : ''}</span></header>
      ${board(m.board || [], { delta: true })}</div>`;
  S.stageEnd = (m) => `${bg(m.stage.img)}<div class="sg-dim"></div><div class="sg-frame">
      <header class="sg-head">${stageBadge(m)}<h2 class="sg-h">${esc(m.stage.key === 'final' ? 'Final Sonuçları' : m.stage.place + ' Tamamlandı')}</h2>${m.totals ? '<span>Toplam puanlar · eleme yok</span>' : ''}</header>
      ${board(m.board || [])}
      ${m.note ? `<div class="sg-band ${m.tie ? 'lock' : 'ok'}">${esc(m.note)}</div>` : ''}</div>`;
  S.champion = (m) => {
    const p = m.podium || [];
    const col = (t, cls) => t ? `<div class="sg-pod ${cls}">${armaHTML(t.arma, 'sg-arma', '')}<b>${esc(t.name)}</b><span>${t.score} puan</span></div>` : '<div class="sg-pod empty"></div>';
    return `${bg('arena')}<div class="sg-dim light"></div><div class="sg-rays"></div><div class="sg-champ">
      ${armaHTML(m.champ.arma, 'sg-arma xl', '')}
      <div class="sg-plate">ŞAMPİYON</div>
      <h1 class="sg-champ-name">${esc(m.champ.name)}</h1>
      <div class="sg-ribbon">Bilgiyle ilerlediniz, birlikte kazandınız.</div>
      <div class="sg-podium">${col(p[1], 'p2')}${col(p[0], 'p1')}${col(p[2], 'p3')}</div></div>
      <canvas class="sg-confetti" data-confetti></canvas>`;
  };
  S.ended = (m) => `${bg(m.stage ? m.stage.img : 'arena')}<div class="sg-dim"></div><div class="sg-frame">
      <header class="sg-head"><h2 class="sg-h">Yarışma Sona Erdi</h2><span>Katılan tüm ${N(m).dat} teşekkürler!</span></header>
      ${(m.board || []).length ? board(m.board) : ''}</div>`;

  function intro(m){
    if (!m.intro || !m.intro.items || !m.intro.items.length) return '';
    return `<div class="sg-intro" data-intro="${m.intro.id}"><div class="sg-intro-rays"></div>${m.intro.items.map(it => `
      <div class="sg-intro-row ${it.j}">${armaHTML(it.arma, 'sg-arma lg', '')}
        <div class="txt"><small>JOKER</small><b>${esc(it.name)} · ${esc(JK[it.j].name).toLocaleUpperCase('tr-TR')}!</b><span>${esc(JK[it.j].desc)}</span></div>
        <div class="medal"><img src="${JK[it.j].icon}" alt=""></div></div>`).join('')}
      <div class="sg-intro-note">Süre ve cevaplar kısa bir süre durdu</div></div>`;
  }

  return {
    html(m){
      if (!m || !m.screen) return S.idle();
      const f = S[m.screen] || S.idle;
      return `<div class="sg sgs-${m.screen} ${m.motion ? 'calm' : ''}">${f(m)}${intro(m)}</div>`;
    }
  };
})();

/* QR çizimi (sahne, admin önizleme ve admin katılım kartı). */
function paintQR(root){
  (root || document).querySelectorAll('.qr[data-url]').forEach(qr => {
    if (qr.dataset.done === qr.dataset.url) return;
    qr.dataset.done = qr.dataset.url; qr.innerHTML = '';
    try{
      const size = +qr.dataset.size || 240;
      const q = new QRLIB.QRCode(-1, QRLIB.ECL.M); q.addData(qr.dataset.url); q.make();
      const n = q.getModuleCount(), m = 3, cell = Math.max(2, Math.floor(size / (n + 2 * m)));
      const cv = document.createElement('canvas'); cv.width = cv.height = cell * (n + 2 * m);
      const cx = cv.getContext('2d'); cx.fillStyle = '#fbf3dd'; cx.fillRect(0, 0, cv.width, cv.height); cx.fillStyle = '#10221f';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) cx.fillRect((c + m) * cell, (r + m) * cell, cell, cell);
      cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Katılım QR kodu'); cv.style.imageRendering = 'pixelated';
      qr.appendChild(cv);
    }catch(e){ qr.innerHTML = '<small>QR kod oluşturulamadı; kodla girin.</small>'; }
  });
}

/* Konfeti (yalnız sahne; hareket azaltılmışsa çizilmez). */
function runConfetti(cv){
  if (!cv || cv.dataset.run) return;
  cv.dataset.run = '1';
  const ctx = cv.getContext('2d'), W = cv.width = cv.clientWidth, H = cv.height = cv.clientHeight;
  const cols = ['#e7c46a', '#f3d98b', '#d9772b', '#fff3d1', '#5f9f7a', '#b8913f'];
  const P = Array.from({ length: 160 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .6, vx: (Math.random() - .5) * 2.4, vy: 1.6 + Math.random() * 3.2, r: Math.random() * 6.28, vr: (Math.random() - .5) * .25, w: 6 + Math.random() * 8, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  (function frame(t){
    if (!cv.isConnected) return;
    ctx.clearRect(0, 0, W, H);
    P.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); ctx.restore(); });
    if (t - t0 < 7000) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
  })(t0);
}

/* ---------- RevealFX: Doğru Bilenler girişleri ve puan sayımı ----------
   Zamanlama gösterimin başlangıç anına göredir (model.correct.elapsed). Canlı izlenen girişler animasyonlu ve
   (yalnız sahnede) sesli; bağlantı/yenileme sonrası geçmiş girişler doğrudan görünür, ses ve animasyon tekrar
   oynamaz. Ekran ya da gösterim değişince bütün zamanlayıcılar iptal edilir; hiçbir zaman akışı ilerletmez. */
const RevealFX = (() => {
  const S = new WeakMap();
  const OPT_MS = 1300;                 // önce doğru şık altınla belirginleşir
  const gap = n => Math.max(260, Math.min(700, Math.round(3200 / Math.max(1, n))));   // toplam giriş ~3,2 sn ile sınırlı
  function state(root){ let s = S.get(root); if (!s){ s = { cid:null, t0:0, done:new Set(), sched:new Set(), timers:[], sid:null, raf:0 }; S.set(root, s); } return s; }
  function reset(s){ s.timers.forEach(clearTimeout); s.timers = []; s.sched = new Set(); s.done = new Set(); if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; }
  function apply(root, m, sound){
    const s = state(root), sg = root.querySelector('.sg');
    const c = m && m.screen === 'question' && m.phase === 'revealed' && m.correct ? m.correct : null;
    if (!c || c.id !== s.cid){
      s.timers.forEach(clearTimeout); s.timers = []; s.sched = new Set(); s.done = new Set();
      s.cid = c ? c.id : null;
      if (c){ s.t0 = Date.now() - c.elapsed; s.live = c.elapsed < 700 && !m.motion; if (s.live && sg) sg.classList.add('rv-anim'); }
    }
    if (c && sg){
      const items = [...sg.querySelectorAll('[data-cor]')], g = gap(items.length), now = Date.now();
      items.forEach((el, k) => {
        const key = el.dataset.cor, at = s.t0 + OPT_MS + k * g;
        if (s.done.has(key) || m.motion || now >= at){ s.done.add(key); el.classList.add('in'); return; }
        if (s.sched.has(key)) return;
        s.sched.add(key);
        s.timers.push(setTimeout(() => {
          if (s.cid !== c.id) return;
          s.done.add(key);
          const cur = root.querySelector(`.sg [data-cor="${CSS.escape(key)}"]`);
          if (cur){ cur.classList.add('in', 'fx'); if (sound) sound(); }
        }, at - now));
      });
      const panel = sg.querySelector('[data-cor-panel]');
      if (panel){ const showAt = s.t0 + OPT_MS - 300; if (m.motion || now >= showAt) panel.classList.add('on'); else s.timers.push(setTimeout(() => { const p = root.querySelector('.sg [data-cor-panel]'); if (p) p.classList.add('on'); }, showAt - now)); }
    }
    // puan ekranı: toplamlar önceki değerden yeni değere sayılır (bir kez)
    const sc = m && m.screen === 'scores' && m.scoreAnim ? m.scoreAnim : null;
    if (!sc || sc.id !== s.sid){
      if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0;
      s.sid = sc ? sc.id : null;
      if (sc && sg){
        const live = sc.elapsed < 900 && !m.motion;
        const nums = [...sg.querySelectorAll('[data-from]')];
        if (live){
          sg.classList.add('sc-anim');
          const t0 = performance.now(), dur = 1400;
          nums.forEach(el => el.textContent = el.dataset.from);
          const step = t => {
            const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
            root.querySelectorAll('.sg [data-from]').forEach(el => { const a = +el.dataset.from, b = +el.dataset.to; el.textContent = Math.round(a + (b - a) * e); });
            if (p < 1 && s.sid === sc.id) s.raf = requestAnimationFrame(step); else s.raf = 0;
          };
          s.raf = requestAnimationFrame(step);
        }
      }
    }
  }
  return { apply };
})();
