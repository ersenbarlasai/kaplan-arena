/* Kaplan Arena — admin (yetkili yarışma durumu ve saat sahibi).
   Aşamalar tam manueldir: Hazır mısınız → Soruyu Göster → (süre) → Cevabı Açıkla → Puanları Göster → Sonraki Soru.
   Telefon komutları (cevap, joker) burada doğrulanır; sahneye ve telefonlara yalnız gösterilecek veri gider. */
const C = KaplanCore;
let S, ui;
const G = () => S.game;
const stageKey = () => STAGES[G().stage].key;
const curTeams = () => G().teams[stageKey()] || [];
const inQ = () => { const g = G(); return g.view === 'question' || g.view === 'tie'; };
const isTie = () => G().view === 'tie';

function emblem(name){
  const m = S.settings.emblems || (S.settings.emblems = {});
  if (m[name] == null) C.assignEmblems(m, [name]);
  return m[name];
}
function currentQk(){
  const g = G(); if (!g.started) return null;
  const key = stageKey();
  if (g.view === 'question' || (g.view === 'scoreboard' && g.last)){ const q = S.questions[key][g.qIndex]; return q ? `${key}_${g.qIndex}_${q.id}` : null; }
  if (g.view === 'tie' && g.tie) return `tie_${key}_${g.tieRound}`;
  return null;
}
function curQ(){
  const g = G();
  if (g.view === 'question' || g.view === 'scoreboard') return S.questions[stageKey()][g.qIndex] || null;
  if (g.view === 'tie' && g.tie) return S.questions.tie[g.tie.poolIdx] || null;
  return null;
}
const qType = () => isTie() ? 'tahmin' : ((curQ() || {}).type || 'ders');
function activeJk(i){ const t = curTeams()[i]; return t ? C.activeJoker(G(), t.name, currentQk()) : null; }
function ownerOf(i){ const j = NET.joined && NET.joined[i]; return j && j.dev ? j.dev : null; }
function liveAccepted(i){
  const g = G(); if (!inQ()) return null;
  return C.pickAnswer((NET.live.ans || {})[i], { win:g.win, qtype:qType(), jk:activeJk(i), owner:ownerOf(i) });
}
function addEvent(kind, data){
  const g = G(); g.evId = (g.evId || 0) + 1;
  (g.events || (g.events = [])).push({ id:g.evId, kind, at:Date.now(), data:data || null });
  if (g.events.length > 20) g.events.splice(0, g.events.length - 20);
}

/* ---------- kayıt, yayın ---------- */
let syncTimer = null, stageTimer = null;
function save(){
  const g = S.game;
  if (g && g.clock && g.clock.runAt != null) g.clock.savedAt = nowS();
  try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){}
  sync(); pushStage();
}
function sync(){
  if (!NET.ok || !S.game.started || !S.game.pin || LOCK.state === 'other') return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { try{ NET.db.ref('games/' + S.game.pin + '/state').set(buildState()); }catch(e){ console.error(e); } }, 60);
}
function pushStage(){ clearTimeout(stageTimer); stageTimer = setTimeout(() => { const m = stageModel(); ui.model = m; StageHost.send(m); paintPreview(); }, 30); }
function toast(m, ms){ ui.msg = m; render(); clearTimeout(toast.h); toast.h = setTimeout(() => { ui.msg = ''; render(); }, ms || 3600); }
function pushHistory(){ const g = G(); const snap = Object.assign({}, g, { history:[] }); g.history.push(JSON.stringify(snap)); if (g.history.length > 40) g.history.shift(); }

/* ---------- saat döngüsü ---------- */
function adminTick(){
  const g = G(); if (!g || !g.started) return;
  const now = nowS(); let changed = false;
  if (inQ() && g.phase === 'open'){
    if (g.intro && C.endIntro(g, now)) changed = true;
    if (C.tickClock(g, now) === 'timeup'){ addEvent('timeup'); changed = true; }
  }
  if (changed){ save(); render(); }
  else paintClocks();
}
function clockLeftMs(){ const g = G(); return g.clock ? C.clockLeft(g.clock, nowS()) : (S.settings.seconds * 1000); }

/* ---------- telefon durumu (KV) ---------- */
function jkStates(){
  const qk = currentQk(), g = G();
  return curTeams().map(t => { const r = (g.jokers || {})[t.name] || {}; return ['double', 'x2'].map(j => r[j] == null ? 0 : (r[j] === qk && inQ() ? 2 : 1)); });
}
function buildState(){
  const g = G(), st = STAGES[g.stage], key = st.key, teams = curTeams(), qk = currentQk();
  const s = { v:4, title:S.settings.title, view:g.view, stage:key, stageName:st.name, place:st.place, teams:teams.map(t => t.name), scores:teams.map(t => t.score),
    arma:teams.map(t => emblem(t.name)), qk, phase:inQ() ? g.phase : null, q:null, qType:null, qn:0, qt:S.questions[key].length,
    open:false, deadline:null, left:null, paused:[], intro:null, answer:null, ack:{}, jk:jkStates(), jrej:{}, brk:!!g.brk,
    eligible:null, lastDelta:null, lastJk:null, lastWinners:null, qualified:null, tiePending:false, champ:null, draw:null, ts:TS() };
  if (g.view === 'draw') s.draw = g.draw && ui.drawShown == null ? g.draw : null;
  if (inQ()){
    const q = curQ();
    if (g.view === 'question'){ s.qType = q ? q.type : null; s.qn = g.qIndex + 1; }
    else { s.qType = 'tahmin'; s.eligible = g.tie.candidates; }
    const visible = g.phase !== 'ready';
    if (visible) s.q = q ? (q.type === 'ders' ? { type:'ders', subject:q.subject, text:q.text, options:q.options } : { type:'tahmin', text:q.text, unit:q.unit || '' })
                         : { type:'tahmin', text:'Sunucunun sorduğu eşitlik sorusunu dinleyin ve tahmininizi yazın.', unit:'' };
    if (g.clock){
      const running = C.isRunning(g);
      s.open = running; s.deadline = running ? g.clock.runAt + g.clock.left : null; s.left = C.clockLeft(g.clock, nowS());
      s.paused = g.phase === 'open' && !running ? g.clock.reasons.slice() : [];
    }
    if (g.intro) s.intro = g.intro.items.map(it => ({ i:it.i, j:it.j }));
    if (g.phase === 'revealed') s.answer = q ? q.answer : null;
    teams.forEach((t, i) => { const a = liveAccepted(i); if (a) s.ack[i] = a.t; });
    s.jrej = g.jrej || {};
  }
  if (g.view === 'scoreboard' && g.last){ s.lastWinners = g.last.winners; s.lastDelta = g.last.delta || null; s.lastJk = g.last.jk || null; s.answer = g.last.answer; s.qn = g.qIndex + 1; }
  if (g.view === 'stageEnd' && g.result){ s.qualified = g.result.qualified; s.tiePending = !!g.result.tie; s.eligible = g.result.tie ? g.result.tie.candidates : null; }
  if (g.view === 'champion' && g.result) s.champ = g.result.qualified[0];
  return s;
}

/* ---------- ağ dinleme: cevaplar, joker istekleri, oyuncular ---------- */
function netWatch(){
  if (!NET.ok || !S.game.started) return;
  const pin = S.game.pin, qk = inQ() ? currentQk() : null;
  if (NET.live.qk !== qk || NET.live.pin !== pin){
    if (NET.live.ref) NET.live.ref.off('value', NET.live.fn);
    if (NET.live.jref) NET.live.jref.off('value', NET.live.jfn);
    NET.live = { qk, pin, ans:{}, jreq:{}, ref:null, fn:null, jref:null, jfn:null };
    if (qk){
      const ref = NET.db.ref(`games/${pin}/answers/${qk}`);
      const fn = snap => { NET.live.ans = snap.val() || {}; onLive(); };
      ref.on('value', fn); NET.live.ref = ref; NET.live.fn = fn;
      if (!qk.startsWith('tie_')){
        const jref = NET.db.ref(`games/${pin}/jreq/${qk}`);
        const jfn = snap => { NET.live.jreq = snap.val() || {}; setTimeout(processJokers, 0); };
        jref.on('value', jfn); NET.live.jref = jref; NET.live.jfn = jfn;
      }
    }
  }
  const pk = pin + '/' + stageKey();
  if (NET.plKey !== pk){
    if (NET.plRef) NET.plRef.off('value', NET.plFn);
    NET.plKey = pk; NET.joined = {};
    NET.plRef = NET.db.ref(`games/${pin}/players/${stageKey()}`);
    NET.plFn = snap => { NET.joined = snap.val() || {}; render(); };
    NET.plRef.on('value', NET.plFn);
  }
}
let liveT = null;
function onLive(){ clearTimeout(liveT); liveT = setTimeout(() => { sync(); render(); }, 40); }
/* Joker isteklerini yetkili olarak işler (tekrar işlemez). Cevap dinleyicisi aynı turda güncellensin diye
   bir sonraki görev döngüsünde çalışır. */
function processJokers(){
  const g = G(); if (g.view !== 'question') return;
  const qk = currentQk(); if (!qk || NET.live.qk !== qk) return;
  const q = curQ(); let changed = false;
  for (const k in (NET.live.jreq || {})){
    const r = NET.live.jreq[k], i = +k, t = curTeams()[i];
    if (!r || typeof r.t !== 'number' || !t || C.seenJoker(g, qk, i, r.t)) continue;
    const ctx = { qk, qtype:q.type, isTie:false, i, name:t.name, j:r.j, t:r.t, owner:ownerOf(i), dev:r.dev, node:(NET.live.ans || {})[i] };
    const why = C.checkJoker(g, ctx);
    if (why) C.rejectJoker(g, ctx, why);
    else { const res = C.acceptJoker(g, ctx, nowS()); if (!res.grouped) addEvent('joker'); }
    changed = true;
  }
  if (changed){ save(); render(); }
}

/* ---------- sahne modeli (temizlenmiş) ---------- */
function joinInfo(){
  const g = G(), base = joinBase();
  if (!NET.ok || !g.started || !base) return null;
  const web = NET.mode === 'web';
  return { pin:g.pin, url:web ? base + 'kaplan-arena.html?pin=' + g.pin : base + '?pin=' + g.pin, addr:(web ? base + 'katil' : base).replace(/^https?:\/\//, '').replace(/\/$/, '') };
}
function teamList(idxs){
  const g = G(), teams = curTeams(), qk = currentQk();
  const list = idxs || teams.map((t, i) => i);
  return list.map(i => { const t = teams[i];
    return { name:t.name, arma:emblem(t.name), score:t.score, ans:!!(inQ() && g.phase !== 'ready' && liveAccepted(i)), jk:inQ() ? C.activeJoker(g, t.name, qk) : null, joined:!!(NET.joined && NET.joined[i]) }; });
}
function boardRows(teams, extra){
  return teams.map((t, i) => Object.assign({ i, name:t.name, arma:emblem(t.name), score:t.score }, extra ? extra(t, i) : {}))
    .sort((a, b) => b.score - a.score);
}
function stageModel(){
  const g = G(), st = STAGES[g.stage], nowL = Date.now();
  const m = { title:S.settings.title, motion:reducedMotion(), evId:g.evId || 0, events:(g.events || []).slice(-10).map(e => ({ id:e.id, kind:e.kind })),
    sound:{ on:!!S.settings.sound, volume:S.settings.volume, stage:StageHost.soundStage() }, stage:{ key:st.key, name:st.name, place:st.place, img:st.img } };
  const present = ui.present || 'welcome';
  if (present === 'welcome' || (!g.started && present !== 'map')){
    return Object.assign(m, { screen:'welcome', credits:CREDITS, resume:g.started && !g.finished });
  }
  if (present === 'map' || !g.started){
    const done = i => g.started && (g.stage > i || (g.stage === i && (g.view === 'stageEnd' || g.view === 'champion')) || g.finished);
    return Object.assign(m, { screen:'map', join:g.started && !g.finished ? joinInfo() : null,
      mapStages:STAGES.map((s, i) => ({ state:done(i) ? 'done' : (g.started && g.stage === i && !g.finished ? 'now' : '') })),
      classes:(g.started && curTeams().length ? curTeams().map(t => t.name) : S.settings.classes).map(n => ({ name:n, arma:emblem(n) })) });
  }
  if (g.view === 'draw'){
    const cls = S.settings.classes;
    const d = { pool:cls.map(n => ({ name:n, arma:emblem(n) })), started:!!g.draw, done:false, s1:[], s2:[] };
    if (g.draw){
      const seq = drawSeq(g.draw), shown = ui.drawShown == null ? seq.length : ui.drawShown, vis = new Set(seq.slice(0, shown).map(x => x.join(':')));
      for (const k of ['s1', 's2']) d[k] = g.draw[k].map((n, i) => vis.has(k + ':' + i) ? { name:n, arma:emblem(n) } : null);
      d.done = shown >= seq.length; d.last = shown > 0 ? seq[shown - 1].join(':') : ''; d.drum = ui.drum || '?';
    }
    return Object.assign(m, { screen:'draw', draw:d, join:joinInfo() });
  }
  if (g.view === 'teams') return Object.assign(m, { screen:'lobby', teams:teamList(), join:joinInfo() });
  if (inQ()){
    const q = curQ(), tie = isTie();
    const qi = tie ? null : { n:g.qIndex + 1, total:S.questions[st.key].length, type:q ? q.type : 'ders' };
    if (g.phase === 'cancelled') return Object.assign(m, { screen:'cancelled', q:qi, teams:teamList() });
    const base = { phase:g.phase, qk:currentQk(), teams:teamList(tie ? g.tie.candidates : null), paused:[] };
    if (g.clock){
      const running = C.isRunning(g), left = C.clockLeft(g.clock, nowS());
      base.clock = { total:g.clock.total, left, running, endsAt:running ? nowL + left : null };
      if (g.phase === 'open' && !running) base.paused = g.clock.reasons.slice();
    }
    if (g.intro){ base.intro = { id:g.intro.id, remain:Math.max(0, g.intro.until - nowS()), items:g.intro.items.map(it => ({ name:it.name, arma:emblem(it.name), j:it.j })) }; }
    if (tie){
      return Object.assign(m, base, { screen:'tie', q:g.phase === 'ready' ? null : (q ? { text:q.text, unit:q.unit || '', type:'tahmin' } : null), answer:g.phase === 'revealed' && q ? q.answer : null });
    }
    if (g.phase === 'ready') return Object.assign(m, base, { screen:'ready', q:qi });
    const pq = q.type === 'ders' ? { text:q.text, options:q.options, subject:q.subject, type:'ders' } : { text:q.text, unit:q.unit || '', type:'tahmin', subject:'Tahmin' };
    return Object.assign(m, base, { screen:'question', q:Object.assign(qi, pq), answer:g.phase === 'revealed' ? q.answer : null });
  }
  if (g.view === 'scoreboard' && g.last){
    const q = curQ(), L = g.last;
    return Object.assign(m, { screen:'scores', q:{ n:g.qIndex + 1, total:S.questions[st.key].length },
      answerText:q ? (q.type === 'ders' ? `${q.answer}) ${q.options[LETTERS.indexOf(q.answer)]}` : `${fmt(q.answer)} ${q.unit || ''}`.trim()) : '',
      board:boardRows(curTeams(), (t, i) => ({ delta:L.delta ? L.delta[i] : (L.winners.includes(i) ? 10 : undefined), jk:L.jk && L.jk[i] })) });
  }
  if (g.view === 'stageEnd' && g.result){
    const r = g.result, isFinal = st.key === 'final', tieSet = r.tie ? r.tie.candidates : [];
    const teams = curTeams();
    const note = r.tie ? `Eşitlik! ${r.tie.candidates.map(i => teams[i].name).join(', ')} için ek tahmin sorusu sorulacak.`
      : isFinal ? `Şampiyon: ${teams[r.qualified[0]].name}` : `Finale çıkanlar: ${r.qualified.map(i => teams[i].name).join(' ve ')}`;
    return Object.assign(m, { screen:'stageEnd', tie:!!r.tie, note:(r.tieNote ? r.tieNote + ' · ' : '') + note,
      board:boardRows(teams, (t, i) => ({ win:r.qualified.includes(i), out:!r.qualified.includes(i) && !tieSet.includes(i) && !r.tie, badge:r.qualified.includes(i) ? (isFinal ? 'Şampiyon' : 'Finalde') : tieSet.includes(i) ? 'Eşitlik' : '' })) });
  }
  if (g.view === 'champion' && g.result){
    const teams = g.teams.final, ci = g.result.qualified[0];
    const rest = boardRows(teams).filter(r => r.i !== ci);
    const champ = { name:teams[ci].name, arma:emblem(teams[ci].name), score:teams[ci].score };
    return Object.assign(m, { screen:'champion', champ, podium:[champ, rest[0], rest[1]] });
  }
  if (g.view === 'ended') return Object.assign(m, { screen:'ended', board:boardRows(curTeams()) });
  return Object.assign(m, { screen:'map', classes:[], mapStages:[] });
}
function reducedMotion(){
  let os = false; try{ os = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
  return !!S.settings.reduceMotion || os;
}

/* ---------- sahne bağlantısı ---------- */
function onStageLink(kind){
  const g = G();
  if (kind === 'join' || kind === 'hello'){
    ui.stageSeen = true; ui.stageLost = false;
    if (g.clock && g.clock.reasons.includes('stage')){ C.unpause(g, 'stage', nowS()); save(); }
    pushStage(); render(); return;
  }
  if (kind === 'lost' && StageHost.count() === 0){
    ui.stageLost = true;
    if (inQ() && g.phase === 'open' && g.clock){ C.pause(g, 'stage', nowS()); C.pause(g, 'admin', nowS()); save(); }
    render();
  }
}

/* ---------- akış eylemleri ---------- */
function drawSeq(d){ const seq = []; const m = Math.max(d.s1.length, d.s2.length); for (let i = 0; i < m; i++){ if (d.s1[i]) seq.push(['s1', i]); if (d.s2[i]) seq.push(['s2', i]); } return seq; }
function runDrawAnim(){
  const g = G(), seq = drawSeq(g.draw), all = S.settings.classes;
  if (reducedMotion()){ ui.drawShown = null; save(); render(); return; }
  ui.drawShown = 0; render(); pushStage();
  clearInterval(ui.drumH); clearInterval(ui.drawH);
  ui.drumH = setInterval(() => { ui.drum = all[rand(all.length)]; pushStage(); }, 140);
  ui.drawH = setInterval(() => {
    ui.drawShown++;
    if (ui.drawShown >= seq.length){ clearInterval(ui.drawH); clearInterval(ui.drumH); ui.drawShown = null; save(); }
    render(); pushStage();
  }, 1100);
}
function prefillFrom(frozen){
  const g = G(), teams = curTeams(), q = curQ();
  ui.sel = []; ui.guesses = {};
  teams.forEach((t, i) => {
    const a = frozen[i]; if (!a) return;
    if (!isTie() && q && q.type === 'ders'){ if (C.isCorrect(a.v, q.answer, activeJk(i))) ui.sel.push(i); }
    else ui.guesses[i] = numStr(a.v);
  });
}
/* Açıklama anında kabul edilmiş cevapları dondurur (pencere içinde gönderilmiş, yetkili cihazdan, geçerli biçimde). */
function freezeAnswers(){
  const g = G(), qk = currentQk(), frozen = {};
  curTeams().forEach((t, i) => { const a = liveAccepted(i); if (a) frozen[i] = a; });
  g.frozen[qk] = frozen; prefillFrom(frozen);
}
function finishStage(){
  const g = G(), key = stageKey(), teams = curTeams();
  g.result = C ? cutoff(teams.map((t, i) => ({ i, score:t.score })), key === 'final' ? 1 : 2) : null;
  g.view = 'stageEnd';
}
function cutoff(scores, slots){
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  if (sorted.length <= slots) return { qualified:sorted.map(x => x.i), tie:null };
  const boundary = sorted[slots - 1].score;
  const above = sorted.filter(x => x.score > boundary).map(x => x.i);
  const at = sorted.filter(x => x.score === boundary).map(x => x.i);
  const remaining = slots - above.length;
  if (at.length === remaining) return { qualified:[...above, ...at], tie:null };
  return { qualified:above, tie:{ candidates:at, slots:remaining } };
}
function toQuestion(idx){
  const g = G();
  g.qIndex = idx; g.view = 'question'; g.phase = 'ready'; g.clock = null; g.win = []; g.jrej = {}; g.intro = null;
  ui.sel = []; ui.guesses = {}; ui.showKey = false; ui.confirm = null;
}
function setScreen(s){
  ui.screen = s;
  if (s === 'welcome') ui.present = 'welcome';
  else if (s === 'menu') ui.present = 'map';
  else if (s === 'game') ui.present = 'game';
  ui.confirm = null; ui.edit = null;
  render(); pushStage();
}
