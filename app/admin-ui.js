/* Kaplan Arena — admin arayüzü. Yönetim düzeni sade; sahnenin canlı önizlemesi aynı çizimle gösterilir. */
const $app = document.getElementById('app');

function modal(key, title, body, yes, label, extra){
  if (ui.confirm !== key) return '';
  return `<div class="adm-modal-bg" data-act="cancel"><div class="adm-modal" role="dialog" aria-modal="true" aria-labelledby="mh">
    <h3 id="mh">${title}</h3><div class="mb">${body}</div>
    <div class="row end"><button class="btn" data-act="cancel">Vazgeç</button><button class="btn primary" data-act="${yes}" ${extra || ''}>${label}</button></div></div></div>`;
}
function confirmBox(key, msg, yesAct, yesLabel){
  if (ui.confirm !== key) return '';
  return `<div class="confirm"><p>${msg}</p><button class="btn danger" data-act="${yesAct}">${yesLabel || 'Evet'}</button><button class="btn" data-act="cancel">Vazgeç</button></div>`;
}
const qLabel = q => q.type === 'tahmin' ? 'Tahmin Sorusu' : esc(q.subject);
function stageChip(){
  const n = StageHost.count(), snd = StageHost.soundStage();
  if (n) return `<span class="chip ok" title="Sahne penceresi bağlı">Sahne bağlı${n > 1 ? ` (${n})` : ''} · ${snd ? 'ses etkin' : 'ses kapalı'}</span>`;
  return `<span class="chip ${ui.stageLost ? 'bad' : ''}">${ui.stageLost ? 'Sahne bağlantısı yok' : 'Sahne açık değil'}</span>`;
}
function topBar(){
  const g = G(), active = g.started && !g.finished;
  return `<header class="adm-top">
    ${logoImg('head', 'logo-head', '')}<div class="adm-ttl"><b>${esc(S.settings.title)}</b><small>Yönetim paneli</small></div>
    <div class="adm-chips">${active && NET.ok ? `<span class="chip pin" title="Katılım kodu">Kod ${esc(pinTxt(g.pin))}</span>` : ''}${netPill()}${stageChip()}</div>
    <nav class="adm-nav">
      <button class="btn small gold" data-act="openStage">Sahne Ekranını Aç</button>
      <button class="btn small" data-act="toggleSound" aria-pressed="${S.settings.sound}">${S.settings.sound ? 'Ses açık' : 'Ses kapalı'}</button>
      <button class="btn small" data-act="welcome">Karşılama</button>
      <button class="btn small" data-act="cineLoop" title="Sahnede sakin ara döngüsü; aktif soru duraklatılır">Ara Döngüsü</button>
      ${ui.screen !== 'menu' ? '<button class="btn small" data-act="menu">Ana Menü</button>' : ''}
      ${ui.screen === 'game' ? '' : (active ? '<button class="btn small" data-act="start">Yarışma</button>' : '')}
      <button class="btn small" data-act="manage">Soru Yönetimi</button>
      <button class="btn small" data-act="settings">Ayarlar</button>
    </nav></header>`;
}
function preview(cls){ return `<div class="adm-preview ${cls || ''}" aria-label="Sahne önizlemesi"><div class="stage-root" id="pv"></div><span class="pv-tag">Sahne önizlemesi</span></div>`; }
function paintPreview(){
  const el = document.getElementById('pv'); if (!el || !ui.model) return;
  const h = StageView.html(ui.model);
  if (el.dataset.h !== h){ el.dataset.h = h; el.innerHTML = h; paintQR(el); }
  StageClock.paint(el, ui.model);
  RevealFX.apply(el, ui.model, null);   // önizleme sessizdir
}
function paintClocks(){
  const el = document.getElementById('adm-clock');
  if (el){ const g = G(); const ms = clockLeftMs(); el.textContent = Math.ceil(ms / 1000); el.classList.toggle('warn', ms <= 10000 && g.phase === 'open'); }
  const pv = document.getElementById('pv'); if (pv && ui.model) StageClock.paint(pv, ui.model);
}

/* ---------- karşılama ---------- */
function vWelcome(){
  const g = G(), active = g.started && !g.finished;
  const m = { screen:'welcome', credits:CREDITS, resume:active, motion:reducedMotion() };
  const c = cineState(), playing = c && !c.ended;
  return `<div class="adm-welcome"><div class="stage-root">${StageView.html(m)}</div>
    ${playing ? `<span class="adm-cine-tag" aria-hidden="true">${c.mode === 'loop' ? 'Ara döngüsü' : 'Açılış filmi'} · yalnız sahnede, önizleme sessiz</span>` : ''}
    <div class="adm-welcome-ctl">
      <button class="btn primary big" data-act="begin">${active ? 'Yarışmaya Devam Et' : 'Yolculuğa Başla'}</button>
      <button class="btn big" data-act="openStage">Sahne Ekranını Aç</button>
      ${active ? '<span class="adm-note">Yarışma duraklatıldı; kayıtlar korunuyor.</span>' : ''}
    </div>
    <div class="adm-cine" role="group" aria-label="Sinematik kontrolleri">
      <button class="btn gold" data-act="cineOpening" ${playing && c.mode === 'opening' ? 'aria-pressed="true"' : ''}>Açılış Filmini Oynat</button>
      <button class="btn" data-act="cineLoop" ${playing && c.mode === 'loop' ? 'aria-pressed="true"' : ''}>Ara Döngüsü</button>
      ${playing && c.mode === 'opening' ? '<button class="btn" data-act="cineSkip">Atla</button>' : ''}
      <button class="btn" data-act="cineStop" ${c ? '' : 'disabled'}>Durdur / Karşılamaya Dön</button>
      <span class="adm-note" id="cine-st" role="status">${esc(cineStatus())}</span>
    </div></div>`;
}

/* ---------- ana menü ---------- */
function vMenu(){
  const g = G(), inProgress = g.started && !g.finished, blocked = LOCK.state === 'other';
  const c = k => S.questions[k].length, nc = S.settings.classes.length;
  let status = '';
  if (inProgress){
    const st = STAGES[g.stage];
    const where = { draw:'kura', teams:'katılım', question:`Soru ${g.qIndex + 1}`, scoreboard:`Soru ${g.qIndex + 1} puanları`, tie:'eşitlik sorusu', stageEnd:'etap sonucu' }[g.view] || '';
    status = `<div class="adm-status">Devam eden yarışma: <b>${g.view === 'draw' ? 'Kura' : esc(st.place)}</b> · ${where}</div>`;
  } else if (g.finished) status = `<div class="adm-status">Son yarışma ${g.view === 'ended' ? 'erken bitirildi' : 'tamamlandı'}.</div>`;
  return `${topBar()}<main class="adm-main adm-menu">
    <section class="adm-col wide">${preview()}</section>
    <section class="adm-col">
      <div class="panel">
        <h2>Ana Menü</h2>${status}
        ${blocked ? lockCard() : ''}
        ${!NET.ok ? `<div class="notice">Telefon bağlantısı yok (internet ya da yerel sunucu bulunamadı). Telefonsuz yarışma yapılabilir: cevapları ve puanları siz girersiniz.</div>` : ''}
        <div class="adm-actions">
          ${blocked ? '' : inProgress ? `<button class="btn primary big" data-act="start">Yarışmaya Devam Et</button><button class="btn" data-act="newGameAsk">Yeni Yarışma</button><button class="btn danger" data-act="endAsk">Yarışmayı Bitir</button>`
                                    : `<button class="btn primary big" data-act="newGameYes">Yarışmayı Başlat</button>`}
          <button class="btn" data-act="manage">Soru Yönetimi</button>
          <button class="btn" data-act="settings">Ayarlar</button>
        </div>
      </div>
      <div class="panel rules">
        <h3>Yolculuk</h3>
        <ol class="adm-route">${STAGES.map((s, i) => `<li><b>${esc(s.place)}</b> <span>${s.key === 's1' ? Math.ceil(nc / 2) + ' sınıf' : s.key === 's2' ? Math.floor(nc / 2) + ' sınıf' : '4 sınıf'} · ${c(s.key)} soru${s.key === 'final' ? ' · puanlar sıfırdan' : ' · ilk 2 finale'}</span></li>`).join('')}</ol>
        <p>${S.settings.seconds} sn süre · her soru 10 puan · 2 joker (Çift Cevap, Çifte Puan) tüm yarışmada birer kez · ${esc(PENALTY_TXT)}</p>
        <p class="muted">Akış tamamen sizin kontrolünüzde: Soruyu Göster → Cevabı Açıkla → Puanları Göster → Sonraki Soru.</p>
      </div>
    </section>
    ${modal('end', 'Yarışmayı bitir', 'Yarışma şimdi sona erecek ve telefonlara "Yarışma sona erdi" mesajı gidecek. Bitirilsin mi?', 'endYes', 'Yarışmayı Bitir')}
    ${modal('newgame', 'Yeni yarışma', 'Devam eden yarışmanın kurası, puanları ve jokerleri silinecek; yeni bir kod oluşturulacak. Sorular olduğu gibi kalır.', 'newGameYes', 'Yeni Yarışma Başlat')}
  </main>`;
}

/* ---------- yarışma ---------- */
function joinCard(){
  const j = joinInfo(), ips = NET.ips || [];
  if (!NET.ok) return `<div class="notice">Telefon bağlantısı kapalı; telefonsuz yarışma. Cevapları ve puanları siz girersiniz.</div>`;
  if (!j) return `<div class="notice">Bilgisayarın ağ adresi bulunamadı. Wi-Fi'ye bağlanın ya da bir telefondan kişisel erişim noktası açın, sonra sayfayı yenileyin.</div>`;
  return `<div class="adm-join"><div class="qr" data-url="${esc(j.url)}" data-size="150"></div><div><small>Telefonla katılım</small><b>${esc(j.addr)}</b><small>Kod</small><b class="pin">${esc(pinTxt(j.pin))}</b></div></div>
    ${ips.length > 1 ? `<div class="fld"><label for="ip-sel">Ağ adresi (telefonlar bağlanamazsa diğerini deneyin)</label><select class="field" id="ip-sel">${ips.map(ip => `<option ${ip === lanIp() ? 'selected' : ''}>${ip}</option>`).join('')}</select></div>` : ''}`;
}
function lanIp(){ const ips = NET.ips || []; return ips.includes(S.settings.lanIp) ? S.settings.lanIp : (ips[0] || null); }
function joinBase(){
  if (!NET.ok) return null;
  if (NET.mode === 'web') return WEB_URL;
  const ip = lanIp(), port = NET.port && NET.port !== '80' ? ':' + NET.port : '';
  if (ip) return `http://${ip}${port}/`;
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return location.origin + '/';
  return null;
}
const PHASE_TXT = { ready:'Hazırlık: soru henüz gösterilmedi', open:'Soru açık', locked:'Süre doldu · cevaplar kilitli', revealed:'Cevap açıklandı · puanlar gizli', cancelled:'Soru iptal edildi' };
function controlBar(){
  const g = G(), v = g.view;
  const b = (act, label, cls, extra) => `<button class="btn ${cls || ''}" data-act="${act}" ${extra || ''}>${label}</button>`;
  let title = '', acts = '', info = '';
  if (v === 'draw'){
    title = 'Kura';
    if (!g.draw) acts = b('drawGo', 'Kurayı Çek', 'primary big', S.settings.classes.length < 4 ? 'disabled' : '');
    else if (ui.drawShown != null) info = 'Kura çekiliyor…';
    else acts = b('drawOk', 'Onayla ve Orman Geçidi’ne Geç', 'primary big') + b('redrawAsk', 'Kurayı Yeniden Çek');
  } else if (v === 'teams'){
    const n = S.questions[stageKey()].length;
    title = `${STAGES[g.stage].place}: Katılım`;
    acts = b('startStage', stageKey() === 'final' ? 'Finali Başlat' : 'Etabı Başlat', 'primary big', n ? '' : 'disabled');
    if (!n) info = 'Bu etapta soru yok. Soru Yönetimi ekranından soru ekleyin.';
  } else if (inQ()){
    const tie = isTie(), ph = g.phase, running = C.isRunning(g);
    title = tie ? 'Eşitlik sorusu' : `Soru ${g.qIndex + 1} / ${S.questions[stageKey()].length}`;
    info = PHASE_TXT[ph] || '';
    if (ph === 'open' && !running && g.clock && g.clock.reasons.length) info = 'Süre durdu: ' + g.clock.reasons.map(r => REASON_TXT[r] || r).join(', ');
    if (ph === 'ready') acts = b('showQ', 'Soruyu Göster', 'primary big');
    if (ph === 'open') acts = (running ? b('pause', 'Duraklat') : b('resume', 'Devam Et', 'primary', g.clock && g.clock.reasons.some(r => r === 'joker') ? 'disabled' : '')) + b('revealAsk', 'Cevabı Açıkla', running ? '' : 'gold');
    if (ph === 'locked') acts = b('revealAsk', 'Cevabı Açıkla', 'primary big');
    if (ph === 'revealed') acts = tie ? b('resolveTie', 'Sonucu Hesapla', 'primary big') : b('showScores', 'Puanları Göster', 'primary big');
    if (ph === 'cancelled') acts = b('next', 'Sonraki Soru', 'primary big');
    if (!tie && ph !== 'cancelled') acts += b('cancelAsk', 'Soruyu İptal Et', 'danger ghost');
  } else if (v === 'scoreboard'){
    const isLast = g.qIndex + 1 >= S.questions[stageKey()].length;
    title = `Soru ${g.qIndex + 1} puanları`;
    acts = b('next', isLast ? 'Etap Sonucunu Göster' : 'Sonraki Soru', 'primary big') + b('scoreEdit', ui.scoreEdit ? 'Düzeltmeyi Bitir' : 'Puanları Düzelt') + b('undo', 'Geri Al', '', g.history.length ? '' : 'disabled') + b('cancelAsk', 'Soruyu İptal Et', 'danger ghost');
  } else if (v === 'stageEnd'){
    const r = g.result, isFinal = stageKey() === 'final';
    title = isFinal ? 'Final sonucu' : `${STAGES[g.stage].place} tamamlandı`;
    acts = r && r.tie ? b('startTie', 'Eşitlik Sorusuna Geç', 'primary big') : b('advance', isFinal ? 'Şampiyonu Göster' : g.stage === 0 ? 'Kadim Kale’ye Geç' : 'Finale Geç', 'primary big');
    acts += b('undo', 'Geri Al', '', g.history.length ? '' : 'disabled');
  } else if (v === 'champion'){ title = 'Şampiyonluk'; acts = b('confetti', 'Kutlamayı Tekrarla') + b('menu', 'Ana Menü'); }
  else if (v === 'ended'){ title = 'Yarışma sona erdi'; acts = b('menu', 'Ana Menü', 'primary') + b('newGameAsk', 'Yeni Yarışma'); }
  const clk = inQ() && g.phase !== 'ready' && g.phase !== 'cancelled' ? `<div class="adm-clock ${C.isRunning(g) ? 'run' : ''}"><b id="adm-clock">${Math.ceil(clockLeftMs() / 1000)}</b><small>sn</small></div>` : '';
  return `<div class="adm-ctl"><div class="t"><b>${title}</b><span>${esc(info)}</span></div>${clk}<div class="a">${acts}</div></div>`;
}
function stageAlert(){
  const g = G();
  if (!(inQ() && g.clock && g.clock.reasons.includes('stage'))) return '';
  return `<div class="notice">Sahne penceresiyle bağlantı koptu; süre ve cevap kabulü durduruldu. Sahneyi yeniden açın ya da sahne olmadan sürdürün. Devamı siz başlatırsınız.
    <div class="row"><button class="btn small gold" data-act="openStage">Sahne Ekranını Aç</button><button class="btn small" data-act="noStage">Sahnesiz Devam</button></div></div>`;
}
function questionPanel(){
  const g = G(); if (!inQ()) return '';
  const q = curQ(), tie = isTie();
  if (!q && !tie) return '';
  const showKey = ui.showKey || g.phase === 'revealed';
  if (tie && !q) return `<div class="panel"><h3>Eşitlik sorusu</h3><div class="notice">Yedek eşitlik sorusu kalmadı. Sözlü bir tahmin sorusu sorun; cevabı açıkladıktan sonra doğru cevabı aşağıya yazın.</div></div>`;
  const body = q.type === 'ders'
    ? `<ol class="adm-opts">${q.options.map((o, i) => `<li class="${showKey && LETTERS[i] === q.answer ? 'ok' : ''}"><b>${LETTERS[i]}</b> ${esc(o)}</li>`).join('')}</ol>`
    : `<p class="adm-ans">Doğru cevap: ${showKey ? `<b>${fmt(q.answer)} ${esc(q.unit || '')}</b>` : '<i>gizli</i>'}</p>`;
  return `<div class="panel adm-q"><div class="row"><span class="tag ${q.type === 'tahmin' || tie ? 'tahmin' : ''}">${tie ? 'Eşitlik' : qLabel(q)}</span><span class="spacer"></span>
    ${g.phase !== 'revealed' ? `<button class="btn small ghost" data-act="keyToggle">${ui.showKey ? 'Cevap anahtarını gizle' : 'Cevap anahtarını göster'}</button>` : ''}</div>
    <p class="adm-qt">${esc(q.text)}</p>${body}
    ${g.phase === 'ready' ? '<p class="muted">Bu aşamada soru sahneye ve telefonlara gönderilmez.</p>' : ''}</div>`;
}
function jkCell(i){
  const g = G(), t = curTeams()[i], r = (g.jokers || {})[t.name] || {}, qk = currentQk(), q = curQ();
  return ['double', 'x2'].map(j => {
    const used = r[j] != null, here = used && r[j] === qk;
    if (here) return `<span class="jkc on" title="${JK[j].name} bu soruda etkin"><img src="${JK[j].icon}" alt="">${JK[j].short}</span>`;
    if (used) return `<span class="jkc used" title="${JK[j].name} kullanıldı"><img src="${JK_LOCK}" alt="">${JK[j].short}</span>`;
    const can = g.view === 'question' && g.phase === 'open' && C.isRunning(g) && !activeJk(i) && !(j === 'double' && q && q.type !== 'ders');
    return `<button class="jkc" data-act="jkAsk" data-i="${i}" data-j="${j}" ${can ? '' : 'disabled'} title="${JK[j].name} kullan"><img src="${JK[j].icon}" alt="">${JK[j].short}</button>`;
  }).join('');
}
function teamsPanel(){
  const g = G(), teams = curTeams(); if (!teams.length) return '';
  const showJk = g.view === 'question' || g.view === 'scoreboard' || g.view === 'teams';
  const rows = teams.map((t, i) => {
    const a = inQ() ? liveAccepted(i) : null, rej = (g.jrej || {})[i];
    let st = '';
    if (inQ() && g.phase !== 'ready'){
      if (g.phase === 'revealed'){ const f = (g.frozen[currentQk()] || {})[i]; st = f ? `<span class="ans">${esc(typeof f.v === 'number' ? fmt(f.v) : f.v)}</span>` : '<span class="muted">—</span>'; }
      else st = a ? '<span class="ans ok">✓ cevap</span>' : '<span class="muted">bekleniyor</span>';
    } else if (g.view === 'teams') st = NET.joined && NET.joined[i] ? '<span class="ans ok">bağlandı</span>' : '<span class="muted">bekleniyor</span>';
    return `<div class="adm-team">${armaHTML(emblem(t.name), 'sm', '')}<span class="nm">${esc(t.name)}${t.from ? `<small>${esc(t.from)}</small>` : ''}</span>
      <span class="st">${st}${rej ? `<em class="rej" title="${esc(rej.why)}">joker reddedildi</em>` : ''}</span>
      ${showJk ? `<span class="jks">${jkCell(i)}</span>` : ''}
      ${g.view === 'scoreboard' && ui.scoreEdit ? `<button class="btn small" data-act="adj" data-i="${i}" data-v="-10">−10</button>` : ''}<b class="sc">${t.score}</b>${g.view === 'scoreboard' && ui.scoreEdit ? `<button class="btn small" data-act="adj" data-i="${i}" data-v="10">+10</button>` : ''}</div>`;
  }).join('');
  return `<div class="panel"><h3>Sınıflar <small>${NET.ok ? `${teams.filter((t, i) => NET.joined && NET.joined[i]).length}/${teams.length} telefon bağlı` : 'telefonsuz'}</small></h3><div class="adm-teams">${rows}</div>
    ${g.view === 'question' && g.phase === 'open' ? '<p class="muted">Telefonu olmayan sınıf için jokeri buradan, süre işlerken kullanabilirsiniz. Kabul edilen joker geri alınamaz.</p>' : ''}</div>`;
}
function correctionPanel(){
  const g = G(); if (!inQ() || g.phase !== 'revealed') return '';
  const teams = curTeams(), q = curQ(), tie = isTie();
  const idxs = tie ? g.tie.candidates : teams.map((t, i) => i);
  if (!tie && q.type === 'ders'){
    return `<div class="panel"><h3>Doğru bilen sınıflar</h3><div class="pick">${teams.map((t, i) => { const j = activeJk(i), on = ui.sel.includes(i);
        const d = on ? (j === 'x2' ? '+20' : '+10') : (j ? (t.score > 0 ? '−' + Math.min(10, t.score) : '0') : '');
        return `<button class="${on ? 'on' : ''}" data-act="toggleTeam" data-i="${i}">${armaHTML(emblem(t.name), 'xs', '')}<span>${esc(t.name)}</span>${j ? `<em>${JK[j].short}</em>` : ''}<b>${d}</b></button>`; }).join('')}</div>
      <p class="muted">Telefondan gelen cevaplara göre işaretlendi; gerekirse düzeltin. Puanlar "Puanları Göster" ile bir kez uygulanır.</p></div>`;
  }
  return `<div class="panel"><h3>Tahminler</h3><div class="guesses">${idxs.map(i => `<div class="guess">${armaHTML(emblem(teams[i].name), 'xs', '')}<label for="g-${i}">${esc(teams[i].name)}${activeJk(i) ? ` <em>${JK[activeJk(i)].short}</em>` : ''}</label>
      <input class="field" id="g-${i}" data-guess="${i}" inputmode="decimal" autocomplete="off" value="${esc(ui.guesses[i] || '')}" placeholder="Tahmin"></div>`).join('')}</div>
    ${tie && !curQ() ? `<div class="fld"><label for="tie-ans">Doğru cevap</label><input class="field" id="tie-ans" inputmode="decimal" value="${esc(ui.tieAns || '')}" placeholder="Örneğin 1453"></div>` : ''}
    <p class="muted">Ondalık için virgül (42,195). Boş bırakılan sınıf cevap vermemiş sayılır.</p></div>`;
}
function stagePanel(){
  const g = G();
  if (g.view === 'draw' || g.view === 'teams') return `<div class="panel">${joinCard()}</div>`;
  if (g.view === 'scoreboard' && g.last && g.last.detail){
    const L = g.last, teams = curTeams();
    return `<div class="panel"><h3>Tahminler · doğru cevap ${fmt(L.answer)} ${esc(L.unit || '')}</h3><div class="tscroll"><table class="gtable"><thead><tr><th>Sınıf</th><th>Tahmin</th><th>Fark</th></tr></thead><tbody>
      ${teams.map((t, i) => `<tr class="${L.winners.includes(i) ? 'win' : ''}"><td>${esc(t.name)}</td><td>${L.detail.guesses[i] == null ? '—' : fmt(L.detail.guesses[i])}</td><td>${L.detail.dists[i] == null ? '—' : fmt(L.detail.dists[i])}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  return '';
}
function vGame(){
  const g = G();
  const jkKey = (ui.confirm || '').startsWith('jk:') ? ui.confirm.split(':') : null;
  const jkModal = jkKey ? (() => { const t = curTeams()[+jkKey[1]], j = jkKey[2];
    return modal(ui.confirm, `${esc(t ? t.name : '')} · ${JK[j].name}`, `<p>${esc(JK[j].desc)}</p><p><b>${esc(PENALTY_TXT)}</b></p><p>Joker tüm yarışmada bir kez kullanılır ve onaylandıktan sonra geri alınamaz. Bütün sınıflar için süre kısa bir tanıtım boyunca durur.</p>`, 'jkYes', 'Jokeri Kullan', `data-i="${jkKey[1]}" data-j="${j}"`); })() : '';
  return `${topBar()}<main class="adm-main adm-game">
    <section class="adm-col wide">${preview()}${controlBar()}${stageAlert()}${questionPanel()}</section>
    <section class="adm-col">${correctionPanel()}${teamsPanel()}${stagePanel()}</section>
    ${modal('reveal', 'Cevabı şimdi açıkla', 'Süre henüz dolmadı. Açıklarsanız süre durur ve bütün sınıfların cevapları kilitlenir.', 'revealYes', 'Cevabı Açıkla')}
    ${modal('cancelq', 'Soruyu iptal et', 'Bu sorudan hiçbir sınıf puan ya da ceza almaz; uygulanmış puan etkisi geri alınır ve bu soruda kullanılan jokerler iade edilir. Önceki sorular etkilenmez.', 'cancelYes', 'Soruyu İptal Et')}
    ${modal('redraw', 'Kurayı yeniden çek', 'Kura sonucu silinip yeniden çekilecek.', 'redrawYes', 'Yeniden Çek')}
    ${modal('newgame', 'Yeni yarışma', 'Devam eden yarışmanın kurası, puanları ve jokerleri silinecek.', 'newGameYes', 'Yeni Yarışma Başlat')}
    ${jkModal}
  </main>`;
}

/* ---------- ayarlar ---------- */
function vSettings(){
  return `${topBar()}<div class="page">
    <div class="page-h"><h2>Ayarlar</h2></div>
    <div class="section">
      <div class="fld"><label for="set-title">Yarışmanın adı</label><input class="field" id="set-title" maxlength="60" value="${esc(S.settings.title)}"></div>
      <div class="fld"><label for="set-classes">Sınıflar (her satıra bir sınıf)</label><textarea class="field" id="set-classes" style="min-height:140px">${esc(S.settings.classes.join('\n'))}</textarea><span class="hint">Kura bu listeden çekilir. Değişiklik bir sonraki yeni yarışmada geçerli olur. Her sınıfın arması kalıcıdır; yeni sınıf boş bir arma alır.</span></div>
      <div class="arma-list">${S.settings.classes.map(n => `<span>${armaHTML(emblem(n), 'xs', '')}${esc(n)}</span>`).join('')}</div>
      <div class="fld"><label for="set-sec">Soru süresi (saniye)</label><input class="field" id="set-sec" type="number" min="5" max="600" value="${S.settings.seconds}" style="max-width:160px"></div>
    </div>
    <div class="section">
      <h3>Ses ve hareket</h3>
      <p>Joker, son saniyeler, süre sonu ve kutlama sesleri yalnız sahne penceresinden çalar. Admin paneli ve telefonlar sessizdir.</p>
      <label class="check"><input type="checkbox" id="set-sound" ${S.settings.sound ? 'checked' : ''}> Sahne sesleri açık</label>
      <div class="fld"><label for="set-vol">Ses seviyesi: <output id="vol-out">${S.settings.volume}</output></label><input type="range" id="set-vol" min="0" max="100" step="5" value="${S.settings.volume}" oninput="document.getElementById('vol-out').textContent=this.value"></div>
      <label class="check"><input type="checkbox" id="set-motion" ${S.settings.reduceMotion ? 'checked' : ''}> Hareketleri azalt (işletim sistemi tercihi ayrıca dikkate alınır)</label>
      <div class="row"><button class="btn primary" data-act="saveSettings">Ayarları Kaydet</button><button class="btn" data-act="soundTest">Sahnede Ses Testi</button></div>
    </div>
    <div class="section">
      <h3>Telefon bağlantısı</h3>
      <p>${!NET.ok ? 'Telefon bağlantısı yok: internet ya da yerel sunucu bulunamadı. Telefonsuz modda çalışıyor.'
        : NET.mode === 'web' ? `İnternet üzerinden bağlı. Telefonlar herhangi bir ağdan QR kod veya kodla katılabilir. Adres: <b>${esc(WEB_URL.replace(/^https?:\/\//, '') + 'katil')}</b>`
        : `Yerel sunucu çalışıyor. Telefonlar aynı Wi-Fi ağından QR kod veya kodla katılabilir.${joinBase() ? ` Adres: <b>${esc(joinBase())}</b>` : ''}`}</p>
    </div>
    <div class="section">
      <h3>Sıfırlama</h3>
      <p>Örnek soruları geri yüklemek mevcut tüm soruları siler. Tüm verileri sıfırlamak sorular, ayarlar ve yarışma durumu dahil her şeyi siler.</p>
      <div class="row"><button class="btn danger" data-act="samplesAsk">Örnek Soruları Geri Yükle</button><button class="btn danger" data-act="resetAllAsk">Tüm Verileri Sıfırla</button></div>
      ${confirmBox('samples', 'Mevcut tüm sorular silinip örnek sorular yüklenecek. Emin misiniz?', 'samplesYes', 'Örnekleri Yükle')}
      ${confirmBox('resetall', 'Sorular, ayarlar ve yarışma durumu tamamen silinecek. Emin misiniz?', 'resetAllYes', 'Her Şeyi Sıfırla')}
    </div>
  </div>`;
}

/* ---------- soru yönetimi (mevcut görünüm) ---------- */
function vManage(){
  const list = S.questions[ui.tab];
  const nT = list.filter(q=>q.type==='tahmin').length, nD = list.length - nT;
  const isTie = ui.tab === 'tie';
  const sumWarn = !isTie && (nT !== 5 || nD !== 5);
  const rows = list.length ? list.map((q,i)=>{
    const ans = q.type === 'ders' ? `Doğru: ${q.answer}) ${esc(q.options[LETTERS.indexOf(q.answer)])}` : `Cevap: ${fmt(q.answer)} ${esc(q.unit)}`;
    const acts = ui.confirm === 'del:'+q.id
      ? `<span>Silinsin mi?</span><button class="btn small danger" data-act="delYes" data-id="${q.id}">Sil</button><button class="btn small" data-act="cancel">Vazgeç</button>`
      : `<button class="btn small" data-act="move" data-id="${q.id}" data-d="-1" ${i===0?'disabled':''} aria-label="Yukarı taşı">↑</button>
         <button class="btn small" data-act="move" data-id="${q.id}" data-d="1" ${i===list.length-1?'disabled':''} aria-label="Aşağı taşı">↓</button>
         <button class="btn small" data-act="editQ" data-id="${q.id}">Düzenle</button>
         <button class="btn small danger" data-act="delAsk" data-id="${q.id}">Sil</button>`;
    return `<div class="qrow"><div class="n">${i+1}</div><span class="tag ${q.type==='tahmin'?'tahmin':''}">${qLabel(q)}</span>
      <div class="tx"><div>${esc(q.text)}</div><small>${ans}</small></div><div class="acts">${acts}</div></div>`;
  }).join('') : `<div class="empty">Bu bölümde soru yok. Aşağıdaki düğmelerle soru ekleyin.</div>`;
  return `<div class="page">
    <div class="page-h"><h2>Soru Yönetimi</h2></div>
    <div class="tabs" role="tablist">${TABS.map(t=>`<button role="tab" class="${ui.tab===t.key?'on':''}" data-act="tab" data-k="${t.key}">${t.name}<span class="ct">${S.questions[t.key].length}</span></button>`).join('')}</div>
    <div class="summary ${sumWarn?'warn':''}">${isTie ? `Eşitlik durumunda sırayla kullanılan yedek tahmin soruları. Şu an ${list.length} soru var.`
      : `${nT} tahmin + ${nD} ders = ${list.length} soru${sumWarn?' · Önerilen: 5 tahmin + 5 ders':''}. Sorular bu sırayla sorulur.`}</div>
    <div class="qlist">${rows}</div>
    <div class="row">
      ${isTie ? '' : `<button class="btn primary" data-act="addQ" data-t="ders">+ Ders Sorusu</button>`}
      <button class="btn ${isTie?'primary':''}" data-act="addQ" data-t="tahmin">+ Tahmin Sorusu</button>
    </div>
    <div class="section">
      <h3>Yedekleme ve Aktarma</h3>
      <p>Tüm soruları ve ayarları yedek metni olarak alın. Bu metni bir dosyaya kaydedip başka bilgisayarda "İçe Aktar" ile yükleyebilirsiniz.</p>
      <div class="row"><button class="btn" data-act="exportData">Yedek Oluştur</button>
        ${ui.backup ? `<button class="btn" data-act="copyBackup">Kopyala</button><button class="btn" data-act="downloadBackup">Dosya Olarak İndir</button>` : ''}</div>
      ${ui.backup ? `<textarea class="field" id="backup-text" readonly>${esc(ui.backup)}</textarea><p>İndirme çalışmazsa metni kopyalayıp bir metin dosyasına (.json veya .txt) yapıştırarak saklayın.</p>` : ''}
      <h3>İçe Aktar</h3>
      <p>Yedek dosyasını seçin ya da yedek metnini aşağıya yapıştırın. Mevcut soruların yerine geçer.</p>
      <input type="file" id="imp-file" accept=".json,.txt,application/json,text/plain" class="field">
      <textarea class="field" id="imp-text" placeholder="Yedek metnini buraya yapıştırın">${esc(ui.importText)}</textarea>
      <div class="row"><button class="btn" data-act="importAsk">İçe Aktar</button></div>
      ${confirmBox('import','Mevcut tüm sorular silinip yedekteki sorular yüklenecek. Devam edilsin mi?','importYes','İçe Aktar')}
    </div>
    ${ui.edit ? vEditor() : ''}
  </div>`;
}
function vEditor(){
  const e = ui.edit, ders = e.type === 'ders';
  return `<div class="overlay" data-act="overlayClose"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="ed-h">
    <h3 id="ed-h">${e.id?'Soruyu Düzenle':'Yeni Soru'} · ${ders?'Ders Sorusu':'Tahmin Sorusu'}</h3>
    ${ders ? `<div class="fld"><label for="e-subject">Ders</label><select class="field" id="e-subject">${SUBJECTS.map(s=>`<option ${s===e.subject?'selected':''}>${s}</option>`).join('')}</select></div>` : ''}
    <div class="fld"><label for="e-text">Soru metni</label><textarea class="field" id="e-text" style="min-height:90px;font-family:var(--font-body);font-size:1rem">${esc(e.text)}</textarea></div>
    ${ders ? `<div class="fld"><label>Şıklar ve doğru cevap</label><span class="hint">Doğru şıkkın yanındaki yuvarlağı işaretleyin.</span>
      ${LETTERS.map((L,i)=>`<div class="optedit"><input type="radio" name="e-ans" id="e-ans-${i}" value="${L}" ${e.answer===L?'checked':''} aria-label="${L} doğru cevap"><b>${L}</b>
        <input class="field" id="e-opt-${i}" value="${esc(e.options[i]||'')}" placeholder="${L} şıkkı"></div>`).join('')}</div>`
    : `<div class="two"><div class="fld"><label for="e-num">Doğru cevap (sayı)</label><input class="field" id="e-num" inputmode="decimal" value="${e.answer===''||e.answer==null?'':esc(numStr(e.answer))}" placeholder="Örneğin 5137 veya 42,195"><span class="hint">Ondalık için virgül kullanın.</span></div>
       <div class="fld"><label for="e-unit">Birim (isteğe bağlı)</label><input class="field" id="e-unit" value="${esc(e.unit||'')}" placeholder="m, km, yıl…"></div></div>`}
    <div class="row end"><button class="btn" data-act="closeEdit">Vazgeç</button><button class="btn primary" data-act="saveQ">Kaydet</button></div>
  </div></div>`;
}

/* ---------- çizim ---------- */
function render(){
  if (ui.screen === 'game' && LOCK.state === 'other') ui.screen = 'menu';
  const s = ui.screen;
  const focus = document.activeElement && document.activeElement.id, caret = focus && document.activeElement.selectionStart;
  $app.innerHTML = (s === 'welcome' ? vWelcome() : s === 'menu' ? vMenu() : s === 'manage' ? `${topBar()}${vManage()}` : s === 'settings' ? vSettings() : vGame())
    + (ui.msg ? `<div class="toast" role="status">${esc(ui.msg)}</div>` : '');
  if (focus){ const el = document.getElementById(focus); if (el && el.tagName !== 'BUTTON'){ el.focus(); try{ if (caret != null) el.setSelectionRange(caret, caret); }catch(e){} } }
  document.body.classList.toggle('reduce-motion', reducedMotion());
  paintQR($app);
  if (s === 'game') netWatch();
  pushStage();
}

function hostInit(){
  document.body.classList.add('mode-admin');
  S = loadState() || defaultState();
  ui = { screen:'welcome', present:'welcome', tab:'s1', edit:null, confirm:null, backup:'', importText:'', msg:'', sel:[], guesses:{}, scoreEdit:false, tieAns:'', drawShown:null, showKey:false };
  const g = G();
  if (g.started && !g.finished){ g.brk = true; if (inQ() && g.phase === 'open'){ C.pause(g, 'break', nowS()); C.pause(g, 'admin', nowS()); } }
  if (inQ() && g.phase === 'revealed'){
    // Yenilemede açıklama görünümü (elle düzeltmeler dahil) geri gelir; giriş animasyonu ve sesleri tekrar çalmaz.
    if (g.rv && g.rv.qk === currentQk()){ ui.sel = [...(g.rv.sel || [])]; ui.guesses = Object.assign({}, g.rv.guesses || {}); ui.touched = true; }
    else { const f = g.frozen[currentQk()]; if (f) prefillFrom(f); }
  }
  StageHost.init(onStageLink);
  netInit().then(async ok => { if (!ok) return render(); await lockSync(true); render(); sync(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    if (b.classList.contains('adm-modal-bg') && e.target !== b) return;
    const fn = ACT[b.dataset.act]; if (!fn) return;
    fn(b.dataset, b, e);
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset && t.dataset.guess != null){ ui.guesses[t.dataset.guess] = t.value; ui.touched = true; rvSync(); clearTimeout(ui.guessT); ui.guessT = setTimeout(() => { save(); }, 400); }
    if (t.id === 'imp-text') ui.importText = t.value;
    if (t.id === 'tie-ans') ui.tieAns = t.value;
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'ip-sel'){ S.settings.lanIp = e.target.value; save(); render(); return; }
    if (e.target.id !== 'imp-file') return;
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { ui.importText = String(rd.result || ''); render(); toast('Dosya okundu. "İçe Aktar" ile yükleyin.'); };
    rd.onerror = () => toast('Dosya okunamadı.');
    rd.readAsText(f);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && (ui.edit || ui.confirm || ui.joinOpen)){ ui.edit = null; ui.confirm = null; ui.joinOpen = false; render(); }
  });
  setInterval(adminTick, 200);
  setInterval(() => { const g = G(); if (g.started && g.clock && g.clock.runAt != null){ g.clock.savedAt = nowS(); try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} } pushStage(); }, 1000);
  save(); render();
}
