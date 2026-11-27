/* Kaplan Arena — öğrenci telefonu. Komut istemcisidir: cevap ve joker isteğini yazar, kabul/ret kararını
   admin'in yayımladığı durumdan okur. Telefon ses çalmaz. */
const P = { pin:'', team:null, tid:null, tok:null, codeFor:null, joinMsg:'', joining:false, verified:null, dev:'', st:null, view:'pin', err:'', players:{}, node:null, nodeRef:null, nodeKey:null,
  stateRef:null, plRef:null, plStage:null, claimedFor:null, confirmPick:null,
  draft:{ qk:null, picks:[], num:'' }, sent:null, jk:null, jkFx:{}, lastQk:null, locked:null };
function plLoad(){
  try{ const o = JSON.parse(localStorage.getItem('ka-player') || 'null'); if (o){ P.pin = o.pin || ''; P.team = o.team || null; P.tid = o.tid || null; P.tok = o.tok || null; } }catch(e){}
  try{ P.dev = localStorage.getItem('ka-dev') || ''; if (!/^[A-Za-z0-9]{4,40}$/.test(P.dev)){ P.dev = uid() + uid(); localStorage.setItem('ka-dev', P.dev); } }catch(e){ P.dev = uid() + uid(); }
}
function plSave(){ try{ localStorage.setItem('ka-player', JSON.stringify({ pin:P.pin, team:P.team, tid:P.tid, tok:P.tok })); }catch(e){} }
/* Yeni (eleme) yarışmada kimlik kararlı teamId'dir; ekrandaki sıra/isim kimlik değildir. Yetki sunucudadır:
   kaptan kodu ya da daha önce alınmış oturum (tok) olmadan cevap/joker gönderilemez; elenen takım geri dönemez. */
const elimSt = () => !!(P.st && P.st.mode === 'elim');
const myOut = () => elimSt() && P.tid && P.st.out ? P.st.out[P.tid] || null : null;
function myIdx(){
  const st = P.st; if (!st) return -1;
  if (st.mode === 'elim') return P.tid && P.tok && st.ids ? st.ids.indexOf(P.tid) : -1;
  return P.team ? (st.teams || []).indexOf(P.team) : -1;
}
function plAuthFail(r){
  const j = (r && r.j) || {};
  if (j.out){ P.tok = null; plSave(); P.err = ''; return; }
  if (j.relogin){ P.tok = null; P.tid = null; plSave(); P.joinMsg = j.why || 'Kaptan oturumu sona erdi; kodu yeniden girin.'; }
}
async function plTeamJoin(tid, code){
  if (P.joining) return;
  P.joining = true; P.joinMsg = ''; plRender();
  let r;
  try{ r = await netCall('join', { pin:P.pin, tid, dev:P.dev, code:code || undefined, tok:code ? undefined : (P.tid === tid ? P.tok : undefined) }); }
  catch(e){ r = { code:0, j:{ why:'Bağlantı kurulamadı; tekrar deneyin.' } }; }
  P.joining = false;
  if (r.code === 200 && r.j.tok){
    const i = (P.st.ids || []).indexOf(tid);
    P.tid = tid; P.tok = r.j.tok; P.team = i >= 0 ? P.st.teams[i] : P.team; P.codeEntered = null; P.codeDraft = ''; P.joinMsg = ''; P.verified = P.pin + ':' + tid; plSave(); plOnState(); return;
  }
  if (r.j && r.j.out){ P.tid = tid; P.tok = null; P.codeEntered = null; plSave(); P.verified = P.pin + ':' + tid; plRender(); return; }
  if (!code && r.code !== 0){ P.tok = null; plSave(); }
  const why = (r.j && r.j.why) || 'Katılım reddedildi.';
  P.joinMsg = /yanlış/.test(why) ? 'Kod seçtiğiniz takıma ait değil ya da yanlış. Kendi takım adınıza dokunun; olmazsa kodu kontrol edin.' : why;
  plRender();
}
function plJoin(pin){
  pin = String(pin || '').replace(/\D/g, '');
  if (pin.length !== 6){ P.err = '6 haneli yarışma kodunu girin.'; P.view = 'pin'; return plRender(); }
  P.err = ''; P.view = 'loading'; plRender();
  NET.db.ref('games/' + pin + '/state').once('value').then(s => {
    if (!s.exists()){ P.err = 'Bu kodla açık bir yarışma bulunamadı. Kodu kontrol edin.'; P.view = 'pin'; return plRender(); }
    if (P.pin !== pin){ P.team = null; P.tid = null; P.tok = null; P.verified = null; }
    P.pin = pin; plSave(); P.view = 'game';
    if (P.stateRef) P.stateRef.off();
    P.stateRef = NET.db.ref('games/' + pin + '/state');
    P.stateRef.on('value', snap => { P.st = snap.val(); plOnState(); });
  }).catch(() => { P.err = NET.mode === 'web' ? 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.' : 'Bağlantı kurulamadı. Aynı Wi-Fi ağında olduğunuzu kontrol edin.'; P.view = 'pin'; plRender(); });
}
function plOnState(){
  const st = P.st; if (!st) return plRender();
  // Sahiplik yolu: turnuvada etap başına; ortak yarışmada (pk = 'all') bütün yarışma boyunca tek kayıt.
  const pk = st.pk || st.stage;
  if (P.plStage !== pk){
    if (P.plRef) P.plRef.off();
    P.plStage = pk; P.players = {};
    P.plRef = NET.db.ref(`games/${P.pin}/players/${pk}`);
    P.plRef.on('value', s => { P.players = s.val() || {}; plRender(); });
  }
  // Eleme yarışması: kayıtlı oturum bir kez sunucuda doğrulanır (elendiyse/oturum düştüyse telefon bunu görür).
  if (st.mode === 'elim' && P.tid && P.tok && P.verified !== P.pin + ':' + P.tid && !P.joining){ P.verified = P.pin + ':' + P.tid; plTeamJoin(P.tid, null); }
  const i = myIdx();
  if (st.mode !== 'elim' && i >= 0 && P.claimedFor !== pk + ':' + i){
    P.claimedFor = pk + ':' + i;
    NET.db.ref(`games/${P.pin}/players/${pk}/${i}`).set({ dev:P.dev, t:TS() }).catch(() => {});
  }
  const qk = st.qk || null, key = qk && i >= 0 ? qk + '/' + (st.mode === 'elim' ? P.tid : i) : null;
  if (P.nodeKey !== key){
    if (P.nodeRef) P.nodeRef.off();
    P.node = null; P.nodeKey = key; P.nodeRef = null;
    if (key){ P.nodeRef = NET.db.ref(`games/${P.pin}/answers/${key}`); P.nodeRef.on('value', s => { P.node = s.val(); plRender(); }); }
  }
  if (P.lastQk !== qk){ P.lastQk = qk; P.draft = { qk, picks:[], num:'' }; P.sent = null; P.jk = null; }
  plRender();
}
/* ---- durum yardımcıları ---- */
const plLeft = () => { const st = P.st; if (!st) return null; if (st.open && st.deadline) return Math.max(0, st.deadline - nowS()); return st.left; };
function plCan(){
  const st = P.st, i = myIdx();
  if (!st || i < 0 || st.phase !== 'open' || !st.open || !st.q || myOut()) return false;
  if (st.eligible && !st.eligible.includes(i)) return false;
  return (plLeft() || 0) > 0;
}
const plJkKeys = () => P.st && P.st.risk ? ['double', 'x2', 'risk'] : ['double', 'x2'];
const plJk = () => { const st = P.st, i = myIdx(); return st && st.jk && i >= 0 ? (st.jk[i] || [0, 0, 0]) : [0, 0, 0]; };
const plMyJoker = () => { const st = P.st; if (!st || st.view !== 'question') return null; const k = plJk(); return k[0] === 2 ? 'double' : k[1] === 2 ? 'x2' : k[2] === 2 ? 'risk' : null; };
const plOnce = () => P.st && P.st.jkRound ? 'Her joker bu turda bir kez (yeni turda yenilenir)' : 'Her joker yalnız bir kez';
function mySubs(){ return KaplanCore.submissions(P.node).filter(s => s.dev === P.dev).sort((a, b) => a.t - b.t); }
function myAccepted(){
  const st = P.st, i = myIdx(); if (!st || i < 0 || !st.ack) return null;
  const t = st.ack[i]; if (t == null) return null;
  return KaplanCore.submissions(P.node).find(s => s.t === t) || { v:'?', t };
}
function plSend(){
  if (!plCan()) return;
  const st = P.st, i = myIdx(), q = st.q, jk = plMyJoker();
  let v;
  if (q.type === 'tahmin'){ v = parseNum(P.draft.num); if (v == null){ P.err = 'Lütfen sayı girin (ondalık için virgül).'; return plRender(); } }
  else { v = [...P.draft.picks].sort().join(''); if (!KaplanCore.validAnswer(v, 'ders', jk)){ P.err = jk === 'double' ? 'Çift Cevap için iki farklı şık seçin.' : 'Bir şık seçin.'; return plRender(); } }
  const t = Math.round(nowS()), sid = 's' + t + uid().slice(0, 4);
  P.sent = { qk:st.qk, t, v, state:'sending' }; P.err = ''; plRender();
  if (elimSt()){
    netCall('cmd', { pin:P.pin, tok:P.tok, op:'ans', qk:st.qk, v, t }).then(r => {
      if (!P.sent || P.sent.t !== t) return;
      if (r.code === 200){ P.sent.state = 'ok'; }
      else { P.sent.state = 'fail'; P.sent.why = r.j.why || ''; plAuthFail(r); }
      plRender();
    }, () => { if (P.sent && P.sent.t === t){ P.sent.state = 'fail'; plRender(); } });
    return;
  }
  NET.db.ref(`games/${P.pin}/answers/${st.qk}/${i}/${sid}`).set({ v, t, dev:P.dev })
    .then(() => { if (P.sent && P.sent.t === t){ P.sent.state = 'ok'; plRender(); } })
    .catch(() => { if (P.sent && P.sent.t === t){ P.sent.state = 'fail'; plRender(); } });
}
function plJokerReq(j, stake){
  if (!plCan()) return;
  const st = P.st, i = myIdx(), t = Math.round(nowS());
  P.jk = { qk:st.qk, j, t, state:'pending' }; plRender();
  if (elimSt()){
    netCall('cmd', { pin:P.pin, tok:P.tok, op:'jk', qk:st.qk, j, s:j === 'risk' ? stake : undefined, t }).then(r => {
      if (r.code !== 200 && P.jk && P.jk.t === t){ P.jk.state = 'fail'; P.jk.why = r.j.why || ''; plAuthFail(r); plRender(); }
    }, () => { if (P.jk && P.jk.t === t){ P.jk.state = 'fail'; plRender(); } });
    return;
  }
  NET.db.ref(`games/${P.pin}/jreq/${st.qk}/${i}`).set({ j, t, dev:P.dev })
    .catch(() => { if (P.jk && P.jk.t === t){ P.jk.state = 'fail'; plRender(); } });
}

/* ---- görünüm parçaları ---- */
function plTop(){
  const st = P.st, i = myIdx();
  const stage = st ? `<div class="ph-place">${esc(st.place || '')}</div>` : '';
  let info = '';
  if (st && i >= 0){
    const qtxt = st.view === 'question' || st.view === 'scoreboard' ? `<span class="q"><small>Soru</small>${st.qn || '–'} / ${st.qt || '–'}</span>` : `<span class="q"><small>${esc(st.stageName || '')}</small></span>`;
    info = `<div class="ph-info">${armaHTML(st.arma ? st.arma[i] : 0, 'xs', '')}<b>${esc(P.team)}</b><span class="pts"><small>Puan</small>${st.scores ? st.scores[i] : 0}</span>${qtxt}</div>`;
  }
  return `<header class="ph-top">${logoImg('head', 'ph-logo', '')}<div class="ph-brand">KAPLAN ARENA${stage}</div></header>${info}${NET.connected ? '' : '<div class="ph-net">Bağlantı yok · yeniden bağlanılıyor…</div>'}`;
}
function jokersLeft(){
  const k = plJk();
  return `<div class="ph-jleft">${plJkKeys().map((j, n) => `<span class="${k[n] === 1 ? 'used' : k[n] === 2 ? 'on' : ''}"><img src="${k[n] === 1 ? JK_LOCK : JK[j].icon}" alt="">${JK[j].name}${k[n] === 1 ? ' · kullanıldı' : k[n] === 2 ? ' · bu soruda' : ' · 1 hak'}</span>`).join('')}</div>`;
}
function card(cls, title, body, extra){ return `<div class="ph-card ${cls || ''}">${extra || ''}${title ? `<h2>${title}</h2>` : ''}${body ? `<p>${body}</p>` : ''}</div>`; }
function shield(kind, mark){ return `<div class="ph-shield ${kind}"><span>${mark}</span></div>`; }

function plJokerBar(q, can){
  const k = plJk(), act = plMyJoker(), subs = mySubs().length > 0;
  const btn = (j, n) => {
    const stt = k[n], na = j === 'double' && q.type !== 'ders';
    let label = 'Kullan', cls = '', dis = false;
    if (stt === 2){ label = 'ETKİN'; cls = 'on'; dis = true; }
    else if (stt === 1){ label = 'KULLANILDI'; cls = 'used'; dis = true; }
    else if (na){ label = 'Yalnız şıklı soruda'; cls = 'na'; dis = true; }
    else if (act){ label = 'Bu soruda kullanılamaz'; cls = 'lock'; dis = true; }
    else if (subs){ label = 'Cevap gönderildi'; cls = 'lock'; dis = true; }
    else if (!can){ label = 'Süre işlerken'; cls = 'lock'; dis = true; }
    else if (P.jk && P.jk.state === 'pending'){ label = P.jk.j === j ? 'Onay bekleniyor…' : '—'; dis = true; }
    const icon = stt === 1 || cls === 'lock' ? JK_LOCK : JK[j].icon;
    return `<button class="ph-jk ${cls}" data-pl="jkAsk" data-j="${j}" ${dis ? 'disabled' : ''}><img src="${icon}" alt=""><b>${JK[j].name}</b><small>${label}</small></button>`;
  };
  const rej = P.st.jrej && P.st.jrej[myIdx()];
  const rejTxt = rej && P.jk && rej.t === P.jk.t ? `<div class="ph-msg bad">Joker reddedildi: ${esc(rej.why)}</div>` : '';
  const failTxt = P.jk && P.jk.state === 'fail' ? `<div class="ph-msg bad">${P.jk.why ? 'Joker isteği reddedildi: ' + esc(P.jk.why) : 'Joker isteği gönderilemedi. Bağlantınızı kontrol edin.'}</div>` : '';
  return `<div class="ph-jbar ${P.st.risk ? 'n3' : ''}">${plJkKeys().map((j, n) => btn(j, n)).join('')}</div><p class="ph-rule">${plOnce()} · jokeri cevabı göndermeden önce seçin · ${esc(PENALTY_TXT)}</p>${rejTxt}${failTxt}`;
}
function plQuestion(){
  const st = P.st, q = st.q, i = myIdx(), can = plCan(), jk = plMyJoker(), l = plLeft();
  const paused = st.phase === 'open' && !st.open;
  const reasons = (st.paused || []);
  const head = `<div class="ph-timer ${paused ? 'paused' : ''} ${l != null && l <= 10000 && !paused ? 'warn' : ''}"><b id="ph-time">${l == null ? '' : Math.ceil(l / 1000)}</b>${paused ? '<small>durdu</small>' : ''}</div>`;
  const stk = jk === 'risk' && st.stake ? st.stake[i] : null;
  const jkBanner = jk ? `<div class="ph-jkon ${jk} ${P.jkFx[st.qk] ? '' : 'fx'}"><img src="${JK[jk].icon}" alt="">${JK[jk].name.toLocaleUpperCase('tr-TR')} ETKİN${stk ? ' · ' + stk + ' PUAN' : ''}</div>` : '';
  if (jk) P.jkFx[st.qk] = true;
  const pausedTxt = paused ? `<div class="ph-msg warn">${reasons.includes('joker') ? 'Joker tanıtımı: süre ve cevaplar kısa bir süre durdu.' : reasons.includes('stage') ? 'Sahne bağlantısı bekleniyor; süre durdu.' : reasons.includes('break') ? 'Ara verildi; süre durdu.' : 'Süre durduruldu.'}${st.intro && st.intro.length ? ' · ' + st.intro.map(it => `${esc(st.teams[it.i])}: ${JK[it.j].name}`).join(', ') : ''}</div>` : '';
  let pad = '';
  const sentTxt = (() => {
    const acc = myAccepted(), s = P.sent;
    if (s && s.state === 'sending') return '<div class="ph-msg">Gönderiliyor…</div>';
    if (s && s.state === 'fail') return `<div class="ph-msg bad">${s.why ? 'Gönderilemedi: ' + esc(s.why) : 'Gönderilemedi. Bağlantınızı kontrol edip yeniden gönderin.'}` + (acc ? ` Geçerli cevabınız: <b>${esc(fmtV(acc.v))}</b>` : '') + '</div>';
    if (acc) return `<div class="ph-msg ok">Gönderildi ✓ Geçerli cevabınız: <b>${esc(fmtV(acc.v))}</b>${can ? ' · süre bitene kadar değiştirip yeniden gönderebilirsiniz' : ''}</div>`;
    if (s && s.state === 'ok') return '<div class="ph-msg">Gönderildi; yönetim onayı bekleniyor…</div>';
    return '';
  })();
  if (q.type === 'ders'){
    const picks = P.draft.picks, need = jk === 'double' ? 2 : 1;
    pad = `<div class="ph-opts">${q.options.map((o, k) => { const L = LETTERS[k], on = picks.includes(L);
      return `<button class="ph-opt ${on ? 'on' : ''}" data-pl="pick-opt" data-v="${L}" ${can ? '' : 'disabled'} aria-pressed="${on}"><b class="L">${L}</b><span>${esc(o)}</span>${on ? '<i>✓</i>' : ''}</button>`; }).join('')}</div>
      ${jk === 'double' ? `<div class="ph-count">${picks.length} / 2 cevap seçildi · en az biri doğruysa +10</div>` : ''}
      <button class="btn primary ph-send" data-pl="send" ${can && picks.length === need ? '' : 'disabled'}>${jk === 'double' ? 'İki Cevabı Gönder' : 'Cevabı Gönder'}</button>`;
  } else {
    pad = `<div class="ph-num"><input class="field" id="pl-num" inputmode="decimal" autocomplete="off" value="${esc(P.draft.num)}" placeholder="Tahmininiz${q.unit ? ' (' + esc(q.unit) + ')' : ''}" ${can ? '' : 'disabled'}></div>
      <button class="btn primary ph-send" data-pl="send" ${can && String(P.draft.num).trim() ? '' : 'disabled'}>Tahmini Gönder</button>`;
  }
  return `${head}${jkBanner}<div class="ph-q"><small>${esc(st.view === 'tie' ? 'Eşitlik sorusu' : q.type === 'tahmin' ? 'Tahmin sorusu' : (q.subject || ''))}</small><p>${esc(q.text)}</p>${q.unit ? `<small>Birim: ${esc(q.unit)}</small>` : ''}</div>
    ${pausedTxt}${pad}${sentTxt}${st.view === 'question' ? plJokerBar(q, can) : ''}
    ${P.jkConfirm ? plJokerSheet(P.jkConfirm) : ''}`;
}
const fmtV = v => typeof v === 'number' ? fmt(v) : String(v).split('').join(' ve ');
function plJokerSheet(j){
  const once = P.st && P.st.jkRound ? 'Bu joker bu turda yalnız bir kez kullanılır (yeni turda yenilenir)' : 'Bu joker yarışma boyunca yalnız bir kez kullanılır';
  const stake = P.riskStake || 10;
  const riskPick = j === 'risk' ? `<p><b>Riske atılacak puan:</b></p><div class="row ph-stakes">${[5, 10, 15].map(v => `<button class="btn ${stake === v ? 'primary' : ''}" data-pl="riskPick" data-v="${v}" aria-pressed="${stake === v}">${v}</button>`).join('')}</div>` : '';
  return `<div class="ph-sheet-bg" data-pl="jkNo"><div class="ph-sheet" role="dialog" aria-modal="true" aria-labelledby="jsh">
    <img src="${JK[j].icon}" alt=""><h3 id="jsh">${JK[j].name}</h3>
    <p>${esc(JK[j].desc)}</p>${riskPick}<p>${once} ve onaylandıktan sonra geri alınamaz. Kullanınca süre bütün ${plN().many} için kısa bir tanıtım boyunca durur.</p>
    <div class="row"><button class="btn" data-pl="jkNo">Vazgeç</button><button class="btn primary" data-pl="jkYes" data-j="${j}" data-s="${j === 'risk' ? stake : ''}">${j === 'risk' ? stake + ' Puanı Riske At' : 'Jokeri Kullan'}</button></div></div></div>`;
}
/* Eleme yarışması: takım seçimi + takıma özel kaptan kodu. Listede yalnız bu turun aktif takımları vardır. */
/* Kurallar 03: QR → özel kaptan giriş kodu → takım seçim ekranında kendi takım adına dokunma. Kod takıma özeldir; seçilen
   takımla eşleşmezse sunucu reddeder. */
function plPickElim(){
  const st = P.st, ids = st.ids || [];
  if (!P.codeEntered){
    return `<div class="ph-card"><h2>Kaptan girişi</h2><p>Yönetimden aldığınız <b>özel kaptan giriş kodunu</b> girin. Ardından takım seçim ekranında kendi takım adınıza dokunacaksınız.</p>
      <label for="pl-code">Kaptan giriş kodu</label><input class="ph-pin" id="pl-code" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="••••" value="${esc(P.codeDraft || '')}">
      ${P.joinMsg ? `<div class="ph-msg bad">${esc(P.joinMsg)}</div>` : ''}
      <button class="btn primary big" data-pl="codeYes">Devam</button><p class="muted">Kaptan değilseniz sahneden izleyebilirsiniz.</p></div>`;
  }
  return `<div class="ph-card"><h2>Takımını seç</h2><p>${esc(st.place || '')} şu an bu takımlarla oynanıyor. <b>Mutlaka kendi takım adınıza</b> dokunun.</p>
    <div class="ph-plist">${(st.teams || []).map((n, i) => { const j = P.players && P.players[ids[i]], taken = j && j.dev !== P.dev;
      return `<button class="${taken ? 'taken' : ''}" data-pl="pickElim" data-id="${esc(ids[i])}">${armaHTML(st.arma ? st.arma[i] : 0, 'sm', '')}<b>${esc(n)}</b><small>${taken ? 'Kaptan telefonu bağlı' : 'Seçmek için dokun'}</small></button>`; }).join('')}</div>
    ${P.joining ? '<div class="ph-msg">Doğrulanıyor…</div>' : ''}${P.joinMsg ? `<div class="ph-msg bad">${esc(P.joinMsg)}</div>` : ''}
    <button class="linkbtn" data-pl="codeNo">Kodu değiştir</button></div>`;
}
function plOutCard(){
  const o = myOut();
  if (o.dq) return card('bad', 'Yarışmadan elendiniz', `<b>${esc(o.name)}</b> yarışma ekranından ayrıldığı için (kural 08: başka uygulamaya, sekmeye ya da ekrana geçmek yasaktır) elendi; yarışmaya devam edemezsiniz. Sahneden izleyebilirsiniz.`, shield('bad', '!'));
  return card('wait', 'Bu turda elendiniz', `<b>${esc(o.name)}</b> yolculuğunu ${esc(o.stage)}’nde ${o.total} puanla tamamladı; yarışmaya devam edemezsiniz. Katıldığınız için teşekkürler! Sahneden izlemeye devam edebilirsiniz.`, shield('wait', '★'));
}
function plPick(){
  if (elimSt()) return plPickElim();
  const st = P.st, joinedBy = i => P.players && P.players[i];
  const n = plN();
  const intro = st.mode === 'shared' ? 'Üç takım bütün etaplarda birlikte yarışıyor. Takımının kaptanıysan takımını seç.' : `${esc(st.place || st.stageName)} şu an bu sınıflarla oynanıyor. Sınıfının kaptanıysan sınıfını seç.`;
  return `<div class="ph-card"><h2>${n.ch.replace(/ı$/, 'ını')} seç</h2><p>${intro}</p>
    <div class="ph-plist">${(st.teams || []).map((n, i) => { const j = joinedBy(i), taken = j && j.dev !== P.dev;
      return `<button class="${taken ? 'taken' : ''}" data-pl="pick" data-i="${i}">${armaHTML(st.arma ? st.arma[i] : 0, 'sm', '')}<b>${esc(n)}</b><small>${taken ? 'Başka telefon bağlı' : 'Seçmek için dokun'}</small></button>`; }).join('')}</div>
    ${P.confirmPick != null ? `<div class="ph-msg warn"><b>${esc(st.teams[P.confirmPick])}</b> ${n.dat} başka bir telefon bağlı. Kaptan sizseniz bu telefonla devam edin; diğer telefonun komutları geçersiz olur.<div class="row"><button class="btn" data-pl="pickNo">Vazgeç</button><button class="btn primary" data-pl="pickYes">Bu Telefonla Devam Et</button></div></div>` : ''}
    ${P.team ? `<p>${esc(P.team)} ${st.mode === 'shared' ? 'bu yarışmada yok' : 'bu etapta yarışmıyor'}. İzlemeye devam edebilirsiniz.</p>` : ''}</div>`;
}
function plBody(){
  const st = P.st, i = myIdx();
  if (!st) return card('', 'Bekleniyor…');
  if (st.brk) return card('wait', 'Ara verildi', 'Yarışma birazdan kaldığı yerden devam edecek. Süre ve cevaplar durdu.', shield('wait', '❚❚'));
  if (st.view === 'draw') return card('', 'Kura çekiliyor', 'Sınıflar etaplara dağıtılıyor. Sahneyi takip edin.') + (st.draw ? `<div class="ph-card"><b>Orman Geçidi:</b> ${st.draw.s1.map(esc).join(', ')}<br><b>Kadim Kale:</b> ${st.draw.s2.map(esc).join(', ')}</div>` : '');
  if (st.view === 'ended') return card('', 'Yarışma sona erdi', `${esc(st.title)} bitti. Katıldığınız için teşekkürler!`);
  if (st.view === 'champion'){
    const champ = st.teams[st.champ];
    return i === st.champ ? card('good', 'ŞAMPİYONSUNUZ!', `${esc(st.title)} sona erdi. Tebrikler ${esc(P.team)}!`, shield('gold', '♛'))
                          : card('', 'Şampiyon: ' + esc(champ), `${esc(st.title)} sona erdi. Katıldığınız için teşekkürler!`, shield('wait', '★'));
  }
  if (myOut()) return plOutCard();
  if (i < 0) return plPick();
  const change = elimSt() ? '' : `<button class="linkbtn" data-pl="change">${plN().ch} değiştir</button>`;
  if (st.view === 'teams') return card('good', 'Hazırsınız!', `<b>${esc(P.team)}</b> olarak ${esc(st.place)} için katıldınız. Sorular başlayınca burada görünecek.`, shield('good', '✓')) + jokersLeft() + change;
  if (st.view === 'question' || st.view === 'tie'){
    if (st.eligible && !st.eligible.includes(i)) return card('', 'Eşitlik sorusu', `Bu soruyu yalnız ${st.eligible.map(x => esc(st.teams[x])).join(' ve ')} cevaplıyor.`);
    if (st.phase === 'cancelled') return card('wait', 'Soru iptal edildi', 'Bu sorudan puan ya da ceza verilmez; bu soruda kullanılan jokerler iade edildi. Sonraki soruyu bekleyin.', shield('wait', '✕')) + jokersLeft();
    if (st.phase === 'ready' || !st.q) return card('wait', st.view === 'tie' ? 'Eşitlik sorusu geliyor' : `Soru ${st.qn} geliyor`, `${st.qType === 'tahmin' ? 'Tahmin sorusu' : 'Şıklı soru'} · Hazır olun; soru sahnede açılınca süre başlar.`, shield('wait', '⌛')) + (st.view === 'question' ? jokersLeft() : '');
    if (st.phase === 'locked'){
      const acc = myAccepted();
      return card('wait', 'Süre doldu', `Cevaplar kilitlendi. ${acc ? `Geçerli cevabınız: <b>${esc(fmtV(acc.v))}</b>` : 'Bu soruda cevabınız yok.'} Doğru cevap sahnede açıklanacak.`, shield('wait', '⌛'));
    }
    if (st.phase === 'revealed'){
      const acc = myAccepted(), q = st.q, jk = plMyJoker();
      const ans = q.type === 'ders' ? `${st.answer} · ${esc(q.options[LETTERS.indexOf(st.answer)] || '')}` : `${fmt(st.answer)} ${esc(q.unit || '')}`;
      const mine = acc ? `Sizin cevabınız: <b>${esc(fmtV(acc.v))}</b>` : 'Bu soruda cevap göndermediniz.';
      // Doğruluk gösterimi: puan değişimi "Puanları Göster"e kadar açıklanmaz.
      if (Array.isArray(st.correct)){
        const ok = st.correct.includes(i);
        if (ok) return card('good', q.type === 'tahmin' ? 'EN YAKIN TAHMİN!' : 'DOĞRU BİLDİNİZ!', `Doğru cevap: <b>${ans}</b><br>${mine}${jk === 'double' ? '<br>İki seçiminizden biri doğru.' : ''}${jk === 'x2' ? '<br>Çifte Puan mührünüz parlıyor.' : ''}<br>Puanlar sahnede açıklanacak.`, shield(jk === 'x2' ? 'gold' : 'good', jk === 'x2' ? '×2' : '✓'));
        if (!st.correct.length) return card('', 'Bu soruda doğru cevap gelmedi', `Doğru cevap: <b>${ans}</b><br>${mine}<br>Puanlar sahnede açıklanacak.`, shield('wait', '–'));
        return card('', q.type === 'tahmin' ? 'En yakın tahmin sizden gelmedi' : 'Bu kez olmadı', `Doğru cevap: <b>${ans}</b><br>${mine}<br>Puanlar sahnede açıklanacak.`, shield('wait', '–'));
      }
      return card('', 'Doğru cevap açıklandı', `Doğru cevap: <b>${ans}</b><br>${mine}<br>Puanlar sahnede gösterilecek.`);
    }
    return plQuestion();
  }
  if (st.view === 'scoreboard'){
    const d = st.lastDelta && st.lastDelta[i] != null ? st.lastDelta[i] : ((st.lastWinners || []).includes(i) ? 10 : 0);
    const j = st.lastJk && st.lastJk[i];
    const order = (st.scores || []).map((s, k) => ({ s, k })).sort((a, b) => b.s - a.s), rank = order.findIndex(o => o.k === i) + 1;
    const foot = `<p>${st.reset ? 'Tur puanı' : 'Toplam'} <b>${st.scores[i]}</b> · Sıralama <b>${rank}.</b> / ${st.teams.length}</p>`;
    const resCard = (cls, sh, title, pts, note) => `<div class="ph-card ${cls}">${sh}<h2>${title}</h2>${pts}${note || ''}${foot}</div>`;
    let res;
    if (d > 0) res = resCard('good', shield(j === 'x2' || j === 'risk' ? 'gold' : 'good', '✓'), j === 'x2' ? 'ÇİFT PUAN!' : j === 'risk' ? 'RİSK KAZANDI!' : 'DOĞRU CEVAP', `<div class="ph-pts up">+${d} PUAN</div>`, j === 'double' ? '<p>İki seçiminden biri doğru!</p>' : '');
    else if (j === 'x2' && d === 0) res = resCard('', shield('wait', '–'), 'Çift Puan: bu soruda puan yok', '<div class="ph-pts">0 PUAN</div>', '<p>Çift Puan jokerinde yanlış cevap puan kaybettirmez.</p>');
    else if (j) res = resCard('bad', shield('bad', '!'), j === 'risk' ? 'RİSK KAYBEDİLDİ' : 'JOKER CEZASI', `<div class="ph-pts down">${d < 0 ? '−' + (-d) : '0'} PUAN</div>`, d === 0 ? '<p>Puanınız zaten 0 olduğu için düşüş olmadı.</p>' : '');
    else res = resCard('', shield('wait', '–'), 'Bu soruda puan yok', '');
    return res + jokersLeft() + '<div class="ph-wait">⌛ Sonraki soruyu bekle</div>';
  }
  if (st.view === 'stageEnd' && st.mode === 'elim'){
    const tie = (st.eligible || []).includes(i), rnd = st.rnd || {};
    if (st.tiePending) return card('', tie ? 'Eşitlik var!' : 'Eşitlik sorusu bekleniyor', tie ? 'Sınırda eşitlik: ek tahmin sorusu geliyor, hazır olun! Toplam puanlar değişmez.' : 'Sınırdaki eşitlik çözülünce sonuç sahnede açıklanacak.');
    if (!rnd.revealed) return card('wait', `${esc(st.place)} tamamlandı`, st.stage === 'final' ? 'Şampiyon birazdan sahnede açıklanacak.' : 'Tur sonucu birazdan sahnede açıklanacak.', shield('wait', '⌛'));
    const w = (rnd.winners || []).map(esc).join(' ve '), gain = (rnd.gains || [])[i];
    const wl = w ? `<br>${(rnd.winners || []).length > 1 ? 'Turun ortak kazananları' : 'Turun kazananı'}: <b>${w}</b>` : '';
    const ord = (st.scores || []).map((s, k) => ({ s, k })).sort((a, b) => b.s - a.s), rank = ord.findIndex(o => o.k === i) + 1;
    return card('good', rnd.all ? 'Yola devam!' : (st.next === 'Kaplan Arenası' ? 'FİNALDESİNİZ!' : 'YÜKSELDİNİZ!'), `${esc(P.team)} ${esc(st.next || '')} yolunda.${wl}<br>${st.reset ? `Tur puanı <b>${st.scores[i]}</b> · Sıralama <b>${rank}.</b><br>Yeni turda puanlar 0’dan başlar, jokerler yenilenir.` : `Bu tur ${gain >= 0 ? '+' : ''}${gain} puan · Toplam <b>${st.scores[i]}</b> · Sıralama <b>${rank}.</b>`}`, shield('gold', '★')) + jokersLeft();
  }
  if (st.view === 'stageEnd' && st.mode === 'shared' && st.stage !== 'final'){
    // Ortak yarışma: eleme yok; toplam puan ve sıralama ile devam.
    const order = (st.scores || []).map((s, k) => ({ s, k })).sort((a, b) => b.s - a.s), rank = order.findIndex(o => o.k === i) + 1;
    return card('good', `${esc(st.place)} tamamlandı`, `Toplam <b>${st.scores[i]}</b> puan · Sıralama <b>${rank}.</b> / ${st.teams.length}<br>Eleme yok: üç takım da yola devam ediyor${st.next ? ` · sıradaki durak <b>${esc(st.next)}</b>` : ''}. Puanlar birikerek sürüyor.`, shield('good', '★')) + jokersLeft();
  }
  if (st.view === 'stageEnd'){
    const q = (st.qualified || []).includes(i), tie = (st.eligible || []).includes(i);
    if (st.stage === 'final') return card('', tie ? 'Eşitlik var!' : 'Final bitti', tie ? (st.mode === 'shared' ? 'Birincilikte eşitlik: ek tahmin sorusu geliyor, hazır olun! Toplam puanlar değişmez.' : 'Ek tahmin sorusu geliyor, hazır olun!') : st.tiePending ? 'Liderler arasında eşitlik sorusu bekleniyor.' : 'Şampiyon birazdan açıklanacak.');
    if (q) return card('good', 'FİNALDESİNİZ!', `${esc(P.team)} Kaplan Arenası’na çıktı. Tebrikler!`, shield('gold', '★'));
    if (tie) return card('', 'Eşitlik var!', 'Finale çıkmak için ek tahmin sorusu geliyor, hazır olun!');
    if (st.tiePending) return card('', `${esc(st.place)} bitti`, 'Eşitlik sorusu bekleniyor.');
    return card('', `${esc(st.place)} bitti`, `Yolculuk burada tamamlandı. Katıldığınız için teşekkürler, ${esc(P.team)}!`);
  }
  return card('', 'Bekleniyor…');
}
/* Kapsayıcı adlandırma: ortak yarışmada "takım", turnuvada mevcut "sınıf". */
const plN = () => P.st && (P.st.mode === 'shared' || P.st.mode === 'elim') ? { one:'takım', acc:'takımını', dat:'takımına', many:'takımlar', gen:'takımının', ch:'Takımı' } : { one:'sınıf', acc:'sınıfını', dat:'sınıfına', many:'sınıflar', gen:'sınıfının', ch:'Sınıfı' };
function plRender(){
  const app = document.getElementById('app');
  let h = '';
  if (P.view === 'nonet'){
    h = `<div class="ph">${logoImg('dark', 'ph-hero-logo')}${card('bad', 'Bağlanılamıyor', !IS_LAN_HOST ? 'İnternet bağlantınızı kontrol edip sayfayı yenileyin.' : 'Telefonunuzun yarışma bilgisayarıyla aynı Wi-Fi ağına bağlı olduğundan emin olup sayfayı yenileyin.')}</div>`;
  } else if (P.view === 'pin' || P.view === 'loading'){
    h = `<div class="ph ph-join">${logoImg('dark', 'ph-hero-logo')}<h1>Maceraya Katıl</h1>
      <label for="pl-pin">Yarışma kodu</label><input class="ph-pin" id="pl-pin" inputmode="numeric" autocomplete="off" maxlength="6" value="${esc(P.pin)}" placeholder="••••••">
      ${P.err ? `<div class="ph-msg bad">${esc(P.err)}</div>` : ''}
      <button class="btn primary big" data-pl="join" ${P.view === 'loading' ? 'disabled' : ''}>${P.view === 'loading' ? 'Bağlanıyor…' : 'Katıl'}</button>
      <p class="ph-org">${esc(CREDITS.org)} tarafından düzenlenmektedir.</p></div>`;
  } else {
    const warn = P.left && P.left.warn && !myOut() ? '<div class="ph-msg bad" role="alert">Yarışma ekranından ayrıldınız. Bu durum yönetime bildirildi (kural 08: başka uygulamaya, sekmeye ya da ekrana geçmek yasaktır; takım elenebilir).</div>' : '';
    h = `<div class="ph">${plTop()}${warn}<main class="ph-main">${plBody()}</main>${P.err ? `<div class="ph-msg bad">${esc(P.err)}</div>` : ''}</div>`;
  }
  const active = document.activeElement && document.activeElement.id;
  const caret = active && document.activeElement.selectionStart;
  app.innerHTML = h;
  if (active){ const el = document.getElementById(active); if (el){ el.focus(); try{ if (caret != null) el.setSelectionRange(caret, caret); }catch(e){} } }
  plTick();
}
function plTick(){
  const el = document.getElementById('ph-time'); if (!el) return;
  const l = plLeft(); el.textContent = l == null ? '' : Math.ceil(l / 1000);
}
/* Kural 08: yarışma sırasında başka uygulamaya/sekmeye/ekrana geçmek yasaktır. Telefon görünürlük değişimini algılar ve
   sunucuya bildirir (sayfa kapanırken de gitsin diye sendBeacon; geri dönüşte aynı kayıt yeniden gönderilir, sunucuda
   aynı anahtara yazılır). Takımı elemek admin onayıyladır. */
function plLeaveBody(){
  const st = P.st;
  if (!elimSt() || !P.tok || myIdx() < 0 || myOut() || !st || st.brk || !['question', 'tie', 'scoreboard'].includes(st.view)) return null;
  return { pin:P.pin, tok:P.tok, op:'leave', qk:st.qk || '-', t:Math.round(nowS()), open:st.phase === 'open' };
}
function plLeave(){
  const body = plLeaveBody(); if (!body || (P.left && P.left.hidden)) return;
  P.left = { body, hidden:true };
  try{
    const url = NET.mode === 'lan' ? '/api/cmd' : API_URL, payload = NET.mode === 'lan' ? body : Object.assign({ fn:'cmd' }, body);
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type:'text/plain' }))) return;
  }catch(e){}
  netCall('cmd', body).catch(() => {});
}
function plBack(){
  if (!P.left || !P.left.hidden) return;
  P.left.hidden = false; P.left.warn = true;
  netCall('cmd', P.left.body).catch(() => {});
  plRender();
}
function playerInit(){
  document.body.classList.add('mode-phone');
  plLoad();
  const qp = new URLSearchParams(location.search), urlPin = (qp.get('pin') || '').replace(/\D/g, '');
  if (urlPin && urlPin !== P.pin){ P.pin = urlPin; P.team = null; P.tid = null; P.tok = null; }
  P.view = 'loading'; plRender();
  netInit().then(ok => { if (!ok){ P.view = 'nonet'; return plRender(); } P.view = 'pin'; if (P.pin && (urlPin || P.team)) plJoin(P.pin); else plRender(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pl]'); if (!b || b.disabled) return;
    if (b.classList.contains('ph-sheet-bg') && e.target !== b) return;
    const a = b.dataset.pl; P.err = '';
    if (a === 'join') plJoin(document.getElementById('pl-pin').value);
    else if (a === 'pick'){
      const i = +b.dataset.i, j = P.players && P.players[i];
      if (j && j.dev !== P.dev){ P.confirmPick = i; plRender(); }
      else { P.team = P.st.teams[i]; P.confirmPick = null; P.claimedFor = null; plSave(); plOnState(); }
    }
    else if (a === 'pickElim'){ const tid = b.dataset.id; P.joinMsg = ''; if (P.tid === tid && P.tok) plTeamJoin(tid, null); else if (P.codeEntered) plTeamJoin(tid, P.codeEntered); }
    else if (a === 'codeNo'){ P.codeEntered = null; P.joinMsg = ''; plRender(); setTimeout(() => document.getElementById('pl-code')?.focus(), 30); }
    else if (a === 'codeYes'){ const c = (document.getElementById('pl-code')?.value || '').replace(/\D/g, ''); if (c.length < 4){ P.joinMsg = 'Kaptan giriş kodunu girin.'; return plRender(); } P.codeEntered = c; P.joinMsg = ''; plRender(); }
    else if (a === 'riskPick'){ P.riskStake = +b.dataset.v; plRender(); }
    else if (a === 'pickYes'){ P.team = P.st.teams[P.confirmPick]; P.confirmPick = null; P.claimedFor = null; plSave(); plOnState(); }
    else if (a === 'pickNo'){ P.confirmPick = null; plRender(); }
    else if (a === 'change'){ P.team = null; plSave(); plOnState(); }
    else if (a === 'pick-opt'){
      if (!plCan()) return;
      const L = b.dataset.v, dbl = plMyJoker() === 'double';
      let p = P.draft.picks.includes(L) ? P.draft.picks.filter(x => x !== L) : [...P.draft.picks, L];
      if (!dbl && p.length > 1) p = [L];
      if (dbl && p.length > 2) p = p.slice(-2);
      P.draft.picks = p; plRender();
    }
    else if (a === 'send') plSend();
    else if (a === 'jkAsk'){ P.jkConfirm = b.dataset.j; P.riskStake = 10; plRender(); }
    else if (a === 'jkNo'){ P.jkConfirm = null; plRender(); }
    else if (a === 'jkYes'){ const j = b.dataset.j; P.jkConfirm = null; plJokerReq(j, +b.dataset.s || P.riskStake || 10); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) plLeave(); else plBack(); });
  window.addEventListener('pagehide', plLeave);
  document.addEventListener('input', e => { if (e.target.id === 'pl-code') P.codeDraft = e.target.value; if (e.target.id === 'pl-num'){ P.draft.num = e.target.value; const s = document.querySelector('[data-pl="send"]'); if (s) s.disabled = !(plCan() && e.target.value.trim()); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'pl-pin') plJoin(e.target.value);
    if (e.target.id === 'pl-num') plSend();
    if (e.target.id === 'pl-code'){ const c = e.target.value.replace(/\D/g, ''); if (c.length >= 4){ P.codeEntered = c; P.joinMsg = ''; plRender(); } }
  });
  setInterval(() => {
    plTick();
    const key = [plCan(), (P.st && P.st.paused || []).join()].join('|');
    if (key !== P.locked){ P.locked = key; if (P.view === 'game') plRender(); }
  }, 250);
}
