/* Kaplan Arena — öğrenci telefonu. Komut istemcisidir: cevap ve joker isteğini yazar, kabul/ret kararını
   admin'in yayımladığı durumdan okur. Telefon ses çalmaz. */
const P = { pin:'', team:null, dev:'', st:null, view:'pin', err:'', players:{}, node:null, nodeRef:null, nodeKey:null,
  stateRef:null, plRef:null, plStage:null, claimedFor:null, confirmPick:null,
  draft:{ qk:null, picks:[], num:'' }, sent:null, jk:null, jkFx:{}, lastQk:null, locked:null };
function plLoad(){
  try{ const o = JSON.parse(localStorage.getItem('ka-player') || 'null'); if (o){ P.pin = o.pin || ''; P.team = o.team || null; } }catch(e){}
  try{ P.dev = localStorage.getItem('ka-dev') || ''; if (!P.dev){ P.dev = uid() + uid(); localStorage.setItem('ka-dev', P.dev); } }catch(e){ P.dev = uid() + uid(); }
}
function plSave(){ try{ localStorage.setItem('ka-player', JSON.stringify({ pin:P.pin, team:P.team })); }catch(e){} }
function myIdx(){ return P.st && P.team ? (P.st.teams || []).indexOf(P.team) : -1; }
function plJoin(pin){
  pin = String(pin || '').replace(/\D/g, '');
  if (pin.length !== 6){ P.err = '6 haneli yarışma kodunu girin.'; P.view = 'pin'; return plRender(); }
  P.err = ''; P.view = 'loading'; plRender();
  NET.db.ref('games/' + pin + '/state').once('value').then(s => {
    if (!s.exists()){ P.err = 'Bu kodla açık bir yarışma bulunamadı. Kodu kontrol edin.'; P.view = 'pin'; return plRender(); }
    if (P.pin !== pin) P.team = null;
    P.pin = pin; plSave(); P.view = 'game';
    if (P.stateRef) P.stateRef.off();
    P.stateRef = NET.db.ref('games/' + pin + '/state');
    P.stateRef.on('value', snap => { P.st = snap.val(); plOnState(); });
  }).catch(() => { P.err = NET.mode === 'web' ? 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.' : 'Bağlantı kurulamadı. Aynı Wi-Fi ağında olduğunuzu kontrol edin.'; P.view = 'pin'; plRender(); });
}
function plOnState(){
  const st = P.st; if (!st) return plRender();
  if (P.plStage !== st.stage){
    if (P.plRef) P.plRef.off();
    P.plStage = st.stage; P.players = {};
    P.plRef = NET.db.ref(`games/${P.pin}/players/${st.stage}`);
    P.plRef.on('value', s => { P.players = s.val() || {}; plRender(); });
  }
  const i = myIdx();
  if (i >= 0 && P.claimedFor !== st.stage + ':' + i){
    P.claimedFor = st.stage + ':' + i;
    NET.db.ref(`games/${P.pin}/players/${st.stage}/${i}`).set({ dev:P.dev, t:TS() }).catch(() => {});
  }
  const qk = st.qk || null, key = qk && i >= 0 ? qk + '/' + i : null;
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
  if (!st || i < 0 || st.phase !== 'open' || !st.open || !st.q) return false;
  if (st.eligible && !st.eligible.includes(i)) return false;
  return (plLeft() || 0) > 0;
}
const plJk = () => { const st = P.st, i = myIdx(); return st && st.jk && i >= 0 ? (st.jk[i] || [0, 0]) : [0, 0]; };
const plMyJoker = () => { const st = P.st; if (!st || st.view !== 'question') return null; const k = plJk(); return k[0] === 2 ? 'double' : k[1] === 2 ? 'x2' : null; };
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
  NET.db.ref(`games/${P.pin}/answers/${st.qk}/${i}/${sid}`).set({ v, t, dev:P.dev })
    .then(() => { if (P.sent && P.sent.t === t){ P.sent.state = 'ok'; plRender(); } })
    .catch(() => { if (P.sent && P.sent.t === t){ P.sent.state = 'fail'; plRender(); } });
}
function plJokerReq(j){
  if (!plCan()) return;
  const st = P.st, i = myIdx(), t = Math.round(nowS());
  P.jk = { qk:st.qk, j, t, state:'pending' }; plRender();
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
  return `<div class="ph-jleft">${['double', 'x2'].map((j, n) => `<span class="${k[n] === 1 ? 'used' : k[n] === 2 ? 'on' : ''}"><img src="${k[n] === 1 ? JK_LOCK : JK[j].icon}" alt="">${JK[j].name}${k[n] === 1 ? ' · kullanıldı' : k[n] === 2 ? ' · bu soruda' : ' · 1 hak'}</span>`).join('')}</div>`;
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
  const failTxt = P.jk && P.jk.state === 'fail' ? '<div class="ph-msg bad">Joker isteği gönderilemedi. Bağlantınızı kontrol edin.</div>' : '';
  return `<div class="ph-jbar">${btn('double', 0)}${btn('x2', 1)}</div><p class="ph-rule">Her joker yalnız bir kez · ${esc(PENALTY_TXT)}</p>${rejTxt}${failTxt}`;
}
function plQuestion(){
  const st = P.st, q = st.q, i = myIdx(), can = plCan(), jk = plMyJoker(), l = plLeft();
  const paused = st.phase === 'open' && !st.open;
  const reasons = (st.paused || []);
  const head = `<div class="ph-timer ${paused ? 'paused' : ''} ${l != null && l <= 10000 && !paused ? 'warn' : ''}"><b id="ph-time">${l == null ? '' : Math.ceil(l / 1000)}</b>${paused ? '<small>durdu</small>' : ''}</div>`;
  const jkBanner = jk ? `<div class="ph-jkon ${jk} ${P.jkFx[st.qk] ? '' : 'fx'}"><img src="${JK[jk].icon}" alt="">${JK[jk].name.toLocaleUpperCase('tr-TR')} ETKİN</div>` : '';
  if (jk) P.jkFx[st.qk] = true;
  const pausedTxt = paused ? `<div class="ph-msg warn">${reasons.includes('joker') ? 'Joker tanıtımı: süre ve cevaplar kısa bir süre durdu.' : reasons.includes('stage') ? 'Sahne bağlantısı bekleniyor; süre durdu.' : reasons.includes('break') ? 'Ara verildi; süre durdu.' : 'Süre durduruldu.'}${st.intro && st.intro.length ? ' · ' + st.intro.map(it => `${esc(st.teams[it.i])}: ${JK[it.j].name}`).join(', ') : ''}</div>` : '';
  let pad = '';
  const sentTxt = (() => {
    const acc = myAccepted(), s = P.sent;
    if (s && s.state === 'sending') return '<div class="ph-msg">Gönderiliyor…</div>';
    if (s && s.state === 'fail') return '<div class="ph-msg bad">Gönderilemedi. Bağlantınızı kontrol edip yeniden gönderin.' + (acc ? ` Geçerli cevabınız: <b>${esc(fmtV(acc.v))}</b>` : '') + '</div>';
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
  return `<div class="ph-sheet-bg" data-pl="jkNo"><div class="ph-sheet" role="dialog" aria-modal="true" aria-labelledby="jsh">
    <img src="${JK[j].icon}" alt=""><h3 id="jsh">${JK[j].name}</h3>
    <p>${esc(JK[j].desc)}</p><p><b>${esc(PENALTY_TXT)}</b></p><p>Bu joker yarışma boyunca yalnız bir kez kullanılır ve onaylandıktan sonra geri alınamaz. Kullanınca süre bütün sınıflar için kısa bir tanıtım boyunca durur.</p>
    <div class="row"><button class="btn" data-pl="jkNo">Vazgeç</button><button class="btn primary" data-pl="jkYes" data-j="${j}">Jokeri Kullan</button></div></div></div>`;
}
function plPick(){
  const st = P.st, joinedBy = i => P.players && P.players[i];
  return `<div class="ph-card"><h2>Sınıfını seç</h2><p>${esc(st.place || st.stageName)} şu an bu sınıflarla oynanıyor. Sınıfının kaptanıysan sınıfını seç.</p>
    <div class="ph-plist">${(st.teams || []).map((n, i) => { const j = joinedBy(i), taken = j && j.dev !== P.dev;
      return `<button class="${taken ? 'taken' : ''}" data-pl="pick" data-i="${i}">${armaHTML(st.arma ? st.arma[i] : 0, 'sm', '')}<b>${esc(n)}</b><small>${taken ? 'Başka telefon bağlı' : 'Seçmek için dokun'}</small></button>`; }).join('')}</div>
    ${P.confirmPick != null ? `<div class="ph-msg warn"><b>${esc(st.teams[P.confirmPick])}</b> sınıfına başka bir telefon bağlı. Kaptan sizseniz bu telefonla devam edin; diğer telefonun komutları geçersiz olur.<div class="row"><button class="btn" data-pl="pickNo">Vazgeç</button><button class="btn primary" data-pl="pickYes">Bu Telefonla Devam Et</button></div></div>` : ''}
    ${P.team ? `<p>${esc(P.team)} bu etapta yarışmıyor. İzlemeye devam edebilirsiniz.</p>` : ''}</div>`;
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
  if (i < 0) return plPick();
  const change = `<button class="linkbtn" data-pl="change">Sınıfı değiştir</button>`;
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
    const foot = `<p>Toplam <b>${st.scores[i]}</b> puan · Sıralama <b>${rank}.</b> / ${st.teams.length}</p>`;
    const resCard = (cls, sh, title, pts, note) => `<div class="ph-card ${cls}">${sh}<h2>${title}</h2>${pts}${note || ''}${foot}</div>`;
    let res;
    if (d > 0) res = resCard('good', shield(d > 10 ? 'gold' : 'good', '✓'), d > 10 ? 'ÇİFTE PUAN!' : 'DOĞRU CEVAP', `<div class="ph-pts up">+${d} PUAN</div>`, j === 'double' ? '<p>İki seçiminden biri doğru!</p>' : '');
    else if (j) res = resCard('bad', shield('bad', '!'), 'JOKER CEZASI', `<div class="ph-pts down">${d < 0 ? '−' + (-d) : '0'} PUAN</div>`, d === 0 ? '<p>Puanınız zaten 0 olduğu için düşüş olmadı.</p>' : '');
    else res = resCard('', shield('wait', '–'), 'Bu soruda puan yok', '');
    return res + jokersLeft() + '<div class="ph-wait">⌛ Sonraki soruyu bekle</div>';
  }
  if (st.view === 'stageEnd'){
    const q = (st.qualified || []).includes(i), tie = (st.eligible || []).includes(i);
    if (st.stage === 'final') return card('', tie ? 'Eşitlik var!' : 'Final bitti', tie ? 'Ek tahmin sorusu geliyor, hazır olun!' : 'Şampiyon birazdan açıklanacak.');
    if (q) return card('good', 'FİNALDESİNİZ!', `${esc(P.team)} Kaplan Arenası’na çıktı. Tebrikler!`, shield('gold', '★'));
    if (tie) return card('', 'Eşitlik var!', 'Finale çıkmak için ek tahmin sorusu geliyor, hazır olun!');
    if (st.tiePending) return card('', `${esc(st.place)} bitti`, 'Eşitlik sorusu bekleniyor.');
    return card('', `${esc(st.place)} bitti`, `Yolculuk burada tamamlandı. Katıldığınız için teşekkürler, ${esc(P.team)}!`);
  }
  return card('', 'Bekleniyor…');
}
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
    h = `<div class="ph">${plTop()}<main class="ph-main">${plBody()}</main>${P.err ? `<div class="ph-msg bad">${esc(P.err)}</div>` : ''}</div>`;
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
function playerInit(){
  document.body.classList.add('mode-phone');
  plLoad();
  const qp = new URLSearchParams(location.search), urlPin = (qp.get('pin') || '').replace(/\D/g, '');
  if (urlPin && urlPin !== P.pin){ P.pin = urlPin; P.team = null; }
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
    else if (a === 'jkAsk'){ P.jkConfirm = b.dataset.j; plRender(); }
    else if (a === 'jkNo'){ P.jkConfirm = null; plRender(); }
    else if (a === 'jkYes'){ const j = b.dataset.j; P.jkConfirm = null; plJokerReq(j); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'pl-num'){ P.draft.num = e.target.value; const s = document.querySelector('[data-pl="send"]'); if (s) s.disabled = !(plCan() && e.target.value.trim()); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'pl-pin') plJoin(e.target.value);
    if (e.target.id === 'pl-num') plSend();
  });
  setInterval(() => {
    plTick();
    const key = [plCan(), (P.st && P.st.paused || []).join()].join('|');
    if (key !== P.locked){ P.locked = key; if (P.view === 'game') plRender(); }
  }, 250);
}
