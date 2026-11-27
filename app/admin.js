/* Kaplan Arena — admin (yetkili yarışma durumu ve saat sahibi).
   Aşamalar tam manueldir: Hazır mısınız → Soruyu Göster → (süre) → Cevabı Açıkla → Puanları Göster → Sonraki Soru.
   Telefon komutları (cevap, joker) burada doğrulanır; sahneye ve telefonlara yalnız gösterilecek veri gider. */
const C = KaplanCore;
let S, ui;
const G = () => S.game;
const stageKey = () => STAGES[G().stage].key;
const curTeams = () => C.teamsOf(G(), stageKey());
/* Yarışma modu kayda yazılıdır (g.mode). Modsuz eski kayıt turnuvadır; ayardaki takım sayısına bakılmaz. */
const shared = () => C.isShared(G());
/* Eleme yarışması (format v3, bütün yeni yarışmalar): kararlı teamId, tur katılımcıları, kalıcı karışık soru planı.
   'shared' ve 'tournament' yalnız eski (göç edilmiş) yarışma kayıtlarında kalır. */
const elim = () => C.isElim(G());
const gameMode = () => elim() ? 'elim' : shared() ? 'shared' : 'tournament';
/* Yeni yarışmada kullanılacak liste ve mod (ayarlardan; açık yarışmayı etkilemez). */
const nextRoster = () => C.normRoster(S.settings.classes);
const nextMode = () => 'elim';
const nextFormat = () => C.makeFormat(nextRoster().length);
/* Kapsayıcı adlandırma: ortak yarışmada "takım", turnuvada mevcut "sınıf". */
const NOUNS = { elim:{ one:'takım', many:'takımlar', Many:'Takımlar', dat:'takımlara', gen:'takımın' }, shared:{ one:'takım', many:'takımlar', Many:'Takımlar', dat:'takımlara', gen:'takımın' }, tournament:{ one:'sınıf', many:'sınıflar', Many:'Sınıflar', dat:'sınıflara', gen:'sınıfın' } };
const noun = mode => NOUNS[mode || (G().started ? gameMode() : nextMode())] || NOUNS.tournament;
/* Telefon sahipliği yolu: ortak yarışmada tüm yarışma boyunca tek kayıt (etap geçişinde cihaz-takım eşleşmesi korunur). */
const plKey = () => shared() || elim() ? 'all' : stageKey();
/* Kimlik: yeni yarışmada joker/ağ yolu anahtarı kararlı teamId; eski kayıtta ad / dizin. */
const tkey = t => t.id || t.name;
const nk = i => { const t = curTeams()[i]; return elim() ? (t ? t.id : '_') : i; };
const idxOf = k => elim() ? curTeams().findIndex(t => t.id === k) : +k;
/* Tek soru çözücüsü: yeni yarışmada yarışma başında oluşturulan karışık plan (g.plan), eski kayıtta soru bankası. */
function qList(key){ const g = G(); return elim() && g.plan ? (g.plan[key] || []) : (S.questions[key] || []); }
function qAt(key, idx){ return idx == null || idx < 0 ? null : (qList(key)[idx] || null); }
/* Tur başına soru sayısı (v4: 10). İptal edilen soru sayılmaz; yerine plandaki sıradaki soru gelir. */
const rules = () => C.rulesOf(G());
function roundPlayed(key){
  const g = G(), c = g.cancelled || {};
  return Object.keys(g.asked || {}).filter(k => g.asked[k].stage === key && !c[g.asked[k].qk]).length;
}
function roundLeft(key){ const g = G(); return qList(key).filter(q => !C.isAsked(g, q)).length; }
/* Ekranda “Soru k / N”: eleme yarışmasında tur içi sıra (tur başına soru sınırıyla), eski kayıtta plan dizini. */
function roundProg(){
  const g = G(), key = stageKey();
  if (!elim()) return { n:g.qIndex + 1, total:qList(key).length };
  const per = rules().perRound || 1e9, played = roundPlayed(key), q = curQ();
  const curCounts = q && C.isAsked(g, q) && !(g.cancelled || {})[currentQk()];
  const n = played + (curCounts ? 0 : 1);
  return { n:Math.min(n, per), total:Math.min(per, played + roundLeft(key) + (curCounts ? 0 : 0)) };
}
const isLastQ = () => {
  const g = G();
  if (!elim()) return g.qIndex + 1 >= qList(stageKey()).length;
  const per = rules().perRound || 1e9;
  return roundPlayed(stageKey()) >= per || C.nextUnasked(g, stageKey(), g.qIndex + 1) < 0;
};
/* Risk Jokeri: yalnız v4 kurallı yarışmada, Büyük Final turunda. */
const riskOn = () => elim() && rules().risk && G().stage === 2;
const JK_KEYS = () => riskOn() ? ['double', 'x2', 'risk'] : ['double', 'x2'];
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
  if (g.view === 'question' || (g.view === 'scoreboard' && g.last)){ const q = qAt(key, g.qIndex); return q ? `${key}_${g.qIndex}_${q.id}` : null; }
  if (g.view === 'tie' && g.tie) return `tie_${key}_${g.tieRound}`;
  return null;
}
function curQ(){
  const g = G();
  if (g.view === 'question' || g.view === 'scoreboard') return qAt(stageKey(), g.qIndex);
  if (g.view === 'tie' && g.tie) return qAt('tie', g.tie.poolIdx);
  return null;
}
const qType = () => isTie() ? 'tahmin' : ((curQ() || {}).type || 'ders');
function activeJk(i){ const t = curTeams()[i]; return t ? C.activeJoker(G(), tkey(t), currentQk()) : null; }
function ownerOf(i){ const j = NET.joined && NET.joined[nk(i)]; return j && j.dev ? j.dev : null; }
/* Kabul katmanı: yalnız bu turun aktif kadrosu (eşitlikte yalnız adaylar), yetkili cihaz, pencere içi, geçerli biçim. */
function liveAccepted(i){
  const g = G(); if (!inQ() || !curTeams()[i] || curTeams()[i].status === 'out') return null;   // kural ihlaliyle elenen takım
  if (isTie() && g.tie && !g.tie.candidates.includes(i)) return null;
  return C.pickAnswer((NET.live.ans || {})[nk(i)], { win:g.win, qtype:qType(), jk:activeJk(i), owner:ownerOf(i) });
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
  NET.key = S.game.akey || null;
  ctlSync();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { try{ NET.db.ref('games/' + S.game.pin + '/state').set(buildState()); }catch(e){ console.error(e); } }, 60);
}
function pushStage(){ clearTimeout(stageTimer); stageTimer = setTimeout(() => { const m = stageModel(); ui.model = m; StageHost.send(m); paintPreview(); }, 30); }
function toast(m, ms){ ui.msg = m; render(); clearTimeout(toast.h); toast.h = setTimeout(() => { ui.msg = ''; render(); }, ms || 3600); }
/* Denetim kaydı (yalnız sunucu; GET yanıtına girmez): takım kaptan kodları, aktiflik, açık soru anahtarı, aday listesi.
   Sunucu telefon komutlarını bununla doğrular; admin kabul katmanı ayrıca aynı kontrolleri yapar. */
let ctlLast = '';
function ctlModel(){
  const g = G(); if (!elim() || !g.akey || !g.started) return null;
  const teams = {};
  for (const t of g.teams.all) teams[t.id] = { code:g.codes[t.id], act:t.status !== 'out' && !g.finished };
  // Kabul penceresi açıklamadan sonra da kısa süre açık kalır: süre içinde gönderilip ağda gecikmiş cevaplar sunucuya
  // ulaşabilsin (admin yine gönderim zamanını cevap penceresiyle karşılaştırır; pencere dışı cevap sayılmaz).
  const open = inQ() && ['open', 'locked', 'revealed'].includes(g.phase);
  const ids = open ? (isTie() ? g.tie.candidates.map(i => curTeams()[i].id) : curTeams().map(t => t.id)) : null;
  return { teams, qk:open ? currentQk() : null, acc:open, jk:inQ() && g.phase === 'open' && g.view === 'question', risk:riskOn(), elig:ids };
}
function ctlSync(extra){
  const m = ctlModel(); if (!m || !NET.ok) return Promise.resolve(false);
  const js = JSON.stringify(m);
  if (!extra && js === ctlLast) return Promise.resolve(true);
  ctlLast = js;
  return netCall('ctl', Object.assign({ pin:G().pin, key:G().akey, ctl:m }, extra || {})).then(r => {
    if (r.code !== 200){ ctlLast = ''; if (r.code === 403) toast('Bu yarışma kodu başka bir yönetim anahtarına bağlı. Yeni yarışma başlatın.', 8000); }
    return r.code === 200;
  }, () => { ctlLast = ''; return false; });
}
function pushHistory(){ const g = G(); const snap = Object.assign({}, g, { history:[], plan:null }); g.history.push(JSON.stringify(snap)); if (g.history.length > 40) g.history.shift(); }

/* ---------- saat döngüsü ---------- */
function cineStatus(){
  const c = cineState();
  if (!c) return 'Sahnede sabit karşılama' + bgmNote();
  if (c.mode === 'loop') return 'Sahnede ara döngüsü oynuyor';
  if (reducedMotion()) return 'Hareketleri azaltma açık · sahnede sabit karşılama' + bgmNote();
  const s = Math.floor(c.elapsed / 1000) % CINE.opening.dur, tur = Math.floor(c.elapsed / 1000 / CINE.opening.dur) + 1;
  return `Sahnede açılış filmi (döngü) · 0:${String(s).padStart(2, '0')} / 1:00${tur > 1 ? ' · ' + tur + '. tur' : ''}`;
}
const bgmNote = () => S.settings.sound && S.settings.volume > 0 ? ' · ara müziği çalıyor' : ' · ses kapalı';
function cineTick(){
  const el = document.getElementById('cine-st');
  if (el){ const t = cineStatus(); if (el.textContent !== t) el.textContent = t; }
}
function adminTick(){
  cineTick();
  const g = G(); if (!g || !g.started) return;
  const now = nowS(); let changed = false;
  // Gösteri süresi dolunca kontrol çubuğu bir kez yenilenir (Atla düğmesi kalkar); akış ilerlemez.
  const sh = g.show; if (sh && !sh.skip && now - sh.at >= sh.dur && ui.showDone !== sh.id){ ui.showDone = sh.id; render(); }
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
  return curTeams().map(t => { const r = (g.jokers || {})[tkey(t)] || {}; return JK_KEYS().map(j => r[j] == null ? 0 : (r[j] === qk && inQ() ? 2 : 1)); });
}
function buildState(){
  const g = G(), st = STAGES[g.stage], key = st.key, teams = curTeams(), qk = currentQk();
  const s = { v:4, title:S.settings.title, mode:gameMode(), pk:plKey(), view:g.view, stage:key, stageName:st.name, place:st.place, teams:teams.map(t => t.name), scores:teams.map(t => t.score),
    arma:teams.map(t => emblem(t.name)), ids:elim() ? teams.map(t => t.id) : null, out:elim() ? outMap() : null, quotas:elim() ? g.format.quotas : null,
    risk:riskOn(), jkRound:elim() && rules().jokersPerRound, reset:elim() && rules().reset,
    qk, phase:inQ() ? g.phase : null, q:null, qType:null, qn:0, qt:roundProg().total,
    open:false, deadline:null, left:null, paused:[], intro:null, answer:null, ack:{}, jk:jkStates(), jrej:{}, brk:!!g.brk,
    eligible:null, lastDelta:null, lastJk:null, lastWinners:null, qualified:null, tiePending:false, champ:null, draw:null, ts:TS() };
  if (g.view === 'draw') s.draw = g.draw && ui.drawShown == null ? g.draw : null;
  if (inQ()){
    const q = curQ();
    if (g.view === 'question'){ s.qType = q ? q.type : null; s.qn = roundProg().n; }
    else { s.qType = 'tahmin'; s.eligible = g.tie.candidates; }
    const visible = g.phase !== 'ready';
    if (visible) s.q = q ? (q.type === 'ders' ? { type:'ders', subject:q.subject, text:q.text, options:q.options } : { type:'tahmin', text:q.text, unit:q.unit || '' })
                         : { type:'tahmin', text:'Sunucunun sorduğu eşitlik sorusunu dinleyin ve tahmininizi yazın.', unit:'' };
    if (g.clock){
      const running = C.isRunning(g);
      s.open = running; s.deadline = running ? g.clock.runAt + g.clock.left : null; s.left = C.clockLeft(g.clock, nowS());
      s.paused = g.phase === 'open' && !running ? g.clock.reasons.slice() : [];
    }
    if (g.intro) s.intro = g.intro.items.map(it => ({ i:it.i, j:it.j, s:it.s || null }));
    s.stake = teams.map(t => C.riskStake(g, tkey(t), qk));
    if (g.phase === 'revealed') s.answer = q ? q.answer : null;
    teams.forEach((t, i) => { const a = liveAccepted(i); if (a) s.ack[i] = a.t; });
    if (g.phase === 'revealed' && !isTie()){ const r = rvWinners(); if (r && g.rv) s.correct = r.winners; }
    s.jrej = g.jrej || {};
  }
  if (g.view === 'scoreboard' && g.last){ s.lastWinners = g.last.winners; s.lastDelta = g.last.delta || null; s.lastJk = g.last.jk || null; s.answer = g.last.answer; s.qn = roundProg().n; }
  if (elim() && g.view === 'stageEnd' && g.result){
    // Sonuç kesinleşip açıklanmadan telefonlara yükselen/elenen bilgisi gitmez.
    const r = g.result, done = (g.rounds[g.stage] || {}).done;
    s.tiePending = !!r.tie; s.eligible = r.tie ? r.tie.candidates : null; s.next = STAGES[g.stage + 1] ? STAGES[g.stage + 1].place : null;
    s.rnd = { revealed:!!r.revealed, all:!!r.all };
    if (r.revealed && done){ s.qualified = r.qualified; s.rnd.up = done.up; s.rnd.winners = done.winners.map(id => C.teamById(g, id).name); s.rnd.gains = teams.map(t => done.gains[t.id]); }
  }
  else if (g.view === 'stageEnd' && g.result){ s.qualified = g.result.qualified; s.tiePending = !!g.result.tie; s.eligible = g.result.tie ? g.result.tie.candidates : null; s.next = STAGES[g.stage + 1] ? STAGES[g.stage + 1].place : null; }
  if (g.view === 'champion' && g.result) s.champ = g.result.qualified[0];
  return s;
}

/* Elenen takımlar (kalıcı arşiv): telefon "elendiniz" görünümü için. */
function outMap(){
  const o = {};
  for (const t of (G().teams.all || [])) if (t.status === 'out') o[t.id] = { name:t.name, stage:STAGES[t.outStage] ? STAGES[t.outStage].place : '', total:t.outTotal, dq:!!t.dq };
  return o;
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
  // Ekran değişikliği bildirimleri (kural 08): telefonlar sunucu komutuyla yazar; admin uyarır, elemeyi admin onaylar.
  if (elim() && NET.violPin !== pin){
    if (NET.violRef) NET.violRef.off('value', NET.violFn);
    NET.violPin = pin; NET.viol = {};
    NET.violRef = NET.db.ref(`games/${pin}/viol`);
    NET.violFn = snap => { NET.viol = snap.val() || {}; render(); };
    NET.violRef.on('value', NET.violFn);
  }
  const pk = pin + '/' + plKey();
  if (NET.plKey !== pk){
    if (NET.plRef) NET.plRef.off('value', NET.plFn);
    NET.plKey = pk; NET.joined = {};
    NET.plRef = NET.db.ref(`games/${pin}/players/${plKey()}`);
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
    const r = NET.live.jreq[k], i = idxOf(k), t = curTeams()[i];
    if (!r || typeof r.t !== 'number' || !t || C.seenJoker(g, qk, i, r.t)) continue;
    if (t.status === 'out') continue;
    const ctx = { qk, qtype:q.type, isTie:false, i, name:tkey(t), label:t.name, j:r.j, t:r.t, stake:+r.s || 0, riskOk:riskOn(), perRound:elim() && rules().jokersPerRound, owner:ownerOf(i), dev:r.dev, node:(NET.live.ans || {})[nk(i)] };
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
    return { name:t.name, arma:emblem(t.name), score:t.score, ans:!!(inQ() && g.phase !== 'ready' && liveAccepted(i)), jk:inQ() ? C.activeJoker(g, tkey(t), qk) : null, joined:!!(NET.joined && NET.joined[nk(i)]), dq:!!t.dq }; });
}
/* Puana göre sıralı; eşit puanda prio (ör. eşitlik sorusu sonucu) sırası kullanılır, yoksa kararlı takım sırası. */
function boardRows(teams, extra, prio){
  const rk = i => { const k = (prio || []).indexOf(i); return k < 0 ? 1e6 : k; };
  return teams.map((t, i) => Object.assign({ i, name:t.name, arma:emblem(t.name), score:t.score }, extra ? extra(t, i) : {}))
    .sort((a, b) => (b.score - a.score) || (rk(a.i) - rk(b.i)));
}
function stageModel(){
  const g = G(), st = STAGES[g.stage], nowL = Date.now();
  const m = { title:S.settings.title, mode:g.started ? gameMode() : nextMode(), motion:reducedMotion(), evId:g.evId || 0, events:(g.events || []).slice(-10).map(e => ({ id:e.id, kind:e.kind })),
    sound:{ on:!!S.settings.sound, volume:S.settings.volume, stage:StageHost.soundStage() }, stage:{ key:st.key, name:st.name, place:st.place, img:st.img } };
  const present = ui.present || 'welcome';
  if (present === 'welcome' || (!g.started && present !== 'map')){
    return Object.assign(m, { screen:'welcome', credits:CREDITS, resume:g.started && !g.finished, cine:cineModel(), bgm:CINE.loop.src });
  }
  if (present === 'map' || !g.started){
    const done = i => g.started && (g.stage > i || (g.stage === i && (g.view === 'stageEnd' || g.view === 'champion')) || g.finished);
    return Object.assign(m, { screen:'map', join:g.started && !g.finished ? joinInfo() : null,
      mapStages:STAGES.map((s, i) => ({ state:done(i) ? 'done' : (g.started && g.stage === i && !g.finished ? 'now' : '') })),
      classes:(g.started && curTeams().length ? curTeams().map(t => t.name) : S.settings.classes).map(n => ({ name:n, arma:emblem(n) })) });
  }
  if (g.view === 'draw'){
    const cls = g.roster || S.settings.classes;
    const d = { pool:cls.map(n => ({ name:n, arma:emblem(n) })), started:!!g.draw, done:false, s1:[], s2:[] };
    if (g.draw){
      const seq = drawSeq(g.draw), shown = ui.drawShown == null ? seq.length : ui.drawShown, vis = new Set(seq.slice(0, shown).map(x => x.join(':')));
      for (const k of ['s1', 's2']) d[k] = g.draw[k].map((n, i) => vis.has(k + ':' + i) ? { name:n, arma:emblem(n) } : null);
      d.done = shown >= seq.length; d.last = shown > 0 ? seq[shown - 1].join(':') : ''; d.drum = ui.drum || '?';
    }
    return Object.assign(m, { screen:'draw', draw:d, join:joinInfo() });
  }
  if (g.view === 'teams') return Object.assign(m, { screen:'lobby', teams:teamList(), join:joinInfo(), showScores:(shared() || (elim() && !rules().reset)) && g.stage > 0, quota:elim() ? lobbyQuota() : null });
  if (inQ()){
    const q = curQ(), tie = isTie();
    const pr = roundProg(), qi = tie ? null : { n:pr.n, total:pr.total, type:q ? q.type : 'ders' };
    if (g.phase === 'cancelled') return Object.assign(m, { screen:'cancelled', q:qi, teams:teamList() });
    const base = { phase:g.phase, qk:currentQk(), teams:teamList(tie ? g.tie.candidates : null), paused:[] };
    if (g.clock){
      const running = C.isRunning(g), left = C.clockLeft(g.clock, nowS());
      base.clock = { total:g.clock.total, left, running, endsAt:running ? nowL + left : null };
      if (g.phase === 'open' && !running) base.paused = g.clock.reasons.slice();
    }
    if (g.intro){ base.intro = { id:g.intro.id, remain:Math.max(0, g.intro.until - nowS()), items:g.intro.items.map(it => ({ name:it.name, arma:emblem(it.name), j:it.j, s:it.s || null })) }; }
    if (tie){
      return Object.assign(m, base, { screen:'tie', q:g.phase === 'ready' ? null : (q ? { text:q.text, unit:q.unit || '', type:'tahmin' } : null), answer:g.phase === 'revealed' && q ? q.answer : null });
    }
    if (g.phase === 'ready') return Object.assign(m, base, { screen:'ready', q:qi });
    const pq = q.type === 'ders' ? { text:q.text, options:q.options, subject:q.subject, type:'ders' } : { text:q.text, unit:q.unit || '', type:'tahmin', subject:'Tahmin' };
    return Object.assign(m, base, { screen:'question', q:Object.assign(qi, pq), answer:g.phase === 'revealed' ? q.answer : null, correct:g.phase === 'revealed' ? correctModel() : null });
  }
  if (g.view === 'scoreboard' && g.last){
    const q = curQ(), L = g.last;
    return Object.assign(m, { screen:'scores', q:roundProg(),
      answerText:q ? (q.type === 'ders' ? `${q.answer}) ${q.options[LETTERS.indexOf(q.answer)]}` : `${fmt(q.answer)} ${q.unit || ''}`.trim()) : '',
      scoreAnim:{ id:'sc:' + (L.qk || g.qIndex) + ':' + (L.at || 0), elapsed:L.at ? Math.max(0, nowS() - L.at) : 1e9 },
      board:boardRows(curTeams(), (t, i) => { const d = L.delta ? L.delta[i] : (L.winners.includes(i) ? 10 : undefined);
        return { delta:d, jk:L.jk && L.jk[i], from:Math.max(0, t.score - (d || 0)) }; }) });
  }
  if (elim() && g.view === 'stageEnd' && g.result) return Object.assign(m, roundEndModel());
  if (g.view === 'stageEnd' && g.result){
    const r = g.result, isFinal = st.key === 'final', tieSet = r.tie ? r.tie.candidates : [];
    const teams = curTeams();
    if (shared()){
      // Ortak yarışma: eleme yok. Ara etaplarda bütün takımlar toplam puanlarıyla devam eder; finalde toplam puan
      // (lider eşitliğinde yalnız eşitlik sorusu sırası) şampiyonu belirler.
      const next = STAGES[g.stage + 1];
      const note = r.tie ? `Birincilikte eşitlik! ${r.tie.candidates.map(i => teams[i].name).join(', ')} için ek tahmin sorusu sorulacak; toplam puanlar değişmez.`
        : isFinal ? `Şampiyon: ${teams[r.qualified[0]].name} · toplam puanla`
        : `Üç takım da yola devam ediyor · sıradaki durak: ${next.place} · puanlar birikerek sürüyor`;
      return Object.assign(m, { screen:'stageEnd', tie:!!r.tie, note:(r.tieNote ? r.tieNote + ' · ' : '') + note, totals:true,
        board:boardRows(teams, (t, i) => ({ win:isFinal && !r.tie && r.qualified[0] === i, badge:isFinal ? (!r.tie && r.qualified[0] === i ? 'Şampiyon' : tieSet.includes(i) ? 'Eşitlik' : '') : 'Devam' }), r.qualified) });
    }
    const note = r.tie ? `Eşitlik! ${r.tie.candidates.map(i => teams[i].name).join(', ')} için ek tahmin sorusu sorulacak.`
      : isFinal ? `Şampiyon: ${teams[r.qualified[0]].name}` : `Finale çıkanlar: ${r.qualified.map(i => teams[i].name).join(' ve ')}`;
    return Object.assign(m, { screen:'stageEnd', tie:!!r.tie, note:(r.tieNote ? r.tieNote + ' · ' : '') + note,
      board:boardRows(teams, (t, i) => ({ win:r.qualified.includes(i), out:!r.qualified.includes(i) && !tieSet.includes(i) && !r.tie, badge:r.qualified.includes(i) ? (isFinal ? 'Şampiyon' : 'Finalde') : tieSet.includes(i) ? 'Eşitlik' : '' })) });
  }
  if (elim() && g.view === 'champion' && g.result) return Object.assign(m, champModel());
  if (g.view === 'champion' && g.result){
    const teams = curTeams(), ci = g.result.qualified[0];
    const rest = boardRows(teams, null, g.result.qualified).filter(r => r.i !== ci);
    const champ = { name:teams[ci].name, arma:emblem(teams[ci].name), score:teams[ci].score };
    return Object.assign(m, { screen:'champion', champ, podium:[champ, rest[0], rest[1]] });
  }
  if (g.view === 'ended') return Object.assign(m, { screen:'ended', board:boardRows(elim() ? g.teams.all : curTeams()) });
  return Object.assign(m, { screen:'map', classes:[], mapStages:[] });
}
/* ---------- eleme yarışması: tur sonu gösterisi ve şampiyonluk modelleri ----------
   Gösteri kalıcı olay kimliği + admin başlangıç zamanıyla tanımlıdır; sahne yeniden çizimi/yenilenmesi baştan
   başlatmaz (geçen süre modelde, HTML'de değil). Gösteri hiçbir zaman soru açmaz, saati çalıştırmaz, tur geçirmez. */
function showModel(){
  const s = G().show; if (!s) return null;
  return { id:s.id, kind:s.kind, dur:s.dur, skip:!!s.skip, elapsed:s.skip ? s.dur : Math.max(0, nowS() - s.at) };
}
function lobbyQuota(){
  const g = G(), n = curTeams().length, q = g.format.quotas[g.stage], next = STAGES[g.stage + 1];
  const R = rules(), per = R.perRound ? ` · ${R.perRound} soru` : '', z = R.reset ? ' · puanlar 0’dan başlar' : '';
  if (g.stage === 2) return `${n} finalist${z}${per} · Risk Jokeri açık · galip şampiyon`;
  return q >= n ? `${n} takım${z}${per} · bu turda eleme yok · hepsi ${next.to} ilerler` : `${n} takım${z}${per} · tur puanında ilk ${q} ${next.to} yükselir`;
}
function roundEndModel(){
  const g = G(), st = STAGES[g.stage], r = g.result, teams = curTeams(), isFinal = st.key === 'final', next = STAGES[g.stage + 1];
  const names = idx => idx.map(i => teams[i].name).join(', ');
  const base = { screen:'roundEnd', title:isFinal ? 'Final Tamamlandı' : `${st.place} Tamamlandı` };
  if (r.tie) return Object.assign(base, { phase:'tie', cands:r.tie.candidates.map(i => ({ name:teams[i].name, arma:emblem(teams[i].name) })),
    note:isFinal ? `Birincilikte eşitlik: ${names(r.tie.candidates)} · ek tahmin sorusu sorulacak. Şampiyon eşitlik çözülünce açıklanır.`
                 : `Yükselme sınırında eşitlik: ${names(r.tie.candidates)} · ek tahmin sorusu sorulacak. Sonuç eşitlik çözülünce açıklanır.` });
  if (!r.revealed) return Object.assign(base, { phase:'pending', note:isFinal ? 'Şampiyon birazdan açıklanacak' : 'Tur sonucu birazdan açıklanacak' });
  const done = (g.rounds[g.stage] || {}).done || { up:[], out:[], winners:[], gains:{} };
  const T = id => C.teamById(g, id);
  const winners = done.winners.map(id => ({ name:T(id).name, arma:emblem(T(id).name), gain:done.gains[id] }));
  const board = boardRows(teams, t => { const up = done.up.includes(t.id); return { gain:done.gains[t.id], win:up, out:!up, badge:up ? next.at : t.dq ? 'Kural ihlali' : 'Elendi' }; }, r.qualified);
  const upN = done.up.map(id => T(id).name), outN = done.out.map(id => T(id).name);
  const note = r.all ? `${upN.length === 3 ? 'Üç' : upN.length} takım da ${next.to} ilerliyor` : `${upN.join(', ')} ${next.to} yükseldi · ${outN.join(', ')} yolculuğunu burada tamamladı`;
  return Object.assign(base, { phase:'show', show:showModel(), winners, board, note, all:!!r.all, next:next.place, reset:!!rules().reset });
}
function champModel(){
  const g = G(), teams = curTeams(), ci = g.result.qualified[0], ch = teams[ci];
  const fin = boardRows(teams, null, g.result.qualified), second = fin.find(r => r.i !== ci) || null;
  // Üçüncülük maçı yoktur: yalnız Kadim Kale'de tek takım elendiyse (kesinleşmiş eleme geçmişinden) gösterilir.
  const r2 = (g.rounds[1] || {}).done, third = r2 && r2.out.length === 1 ? C.teamById(g, r2.out[0]) : null;
  const P = (t, note) => t ? { name:t.name, arma:emblem(t.name), score:t.score, note:note || '' } : null;
  return { screen:'champion', elim:true, reset:!!rules().reset, champ:P(ch), podium:[P(ch, 'Şampiyon'), P(second, 'Finalist'), P(third, 'Kadim Kale’de tamamladı')], show:showModel(), music:CHAMP.src };
}
/* Sinematik oturumu (yalnız karşılama ekranında). Her oynatma yeni kimlik alır; sahne aynı kimliği yeniden
   başlatmaz. Açılış ve ara döngüsü, ekran değişene ya da Atla/Durdur'a kadar döngüde sürer. */
function cineState(){
  const c = ui.cine; if (!c) return null;
  return { mode:c.mode, id:c.id, elapsed:Math.max(0, Date.now() - c.at) };
}
function cineModel(){
  const c = cineState(); if (!c) return null;
  const cfg = CINE[c.mode];
  return { mode:c.mode, id:c.id, elapsed:c.elapsed, dur:cfg.dur, src:cfg.src, poster:cfg.poster || '' };
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
  const g = G(), seq = drawSeq(g.draw), all = g.roster || S.settings.classes;
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
/* ---------- Doğru Bilenler gösterimi ----------
   g.rv = { qk, id, at, sel, guesses }: açıklama anında oluşur, elle düzeltmeler de buraya yazılır.
   Bu bir doğruluk gösterimidir; puan "Puanları Göster"e kadar uygulanmaz ve gösterilmez. */
function rvWinners(){
  const g = G(), q = curQ(), teams = curTeams();
  if (!inQ() || isTie() || g.phase !== 'revealed' || !q) return null;
  if (q.type === 'ders') return { winners:[...ui.sel].filter(i => teams[i]).sort((a, b) => a - b), guesses:null };
  const guesses = teams.map((t, i) => parseNum(ui.guesses[i]));
  return { winners:C.closestWinners(guesses, q.answer).winners, guesses };
}
function rvSync(){
  const g = G(), qk = currentQk();
  if (!g.rv || g.rv.qk !== qk) return;
  g.rv.sel = [...ui.sel]; g.rv.guesses = Object.assign({}, ui.guesses);
}
function correctModel(){
  const g = G(), r = rvWinners(); if (!r || !g.rv) return null;
  const teams = curTeams();
  const list = r.winners.map(i => { const t = teams[i], j = activeJk(i);
    return { name:t.name, arma:emblem(t.name), x2:j === 'x2', dbl:j === 'double', guess:r.guesses && r.guesses[i] != null ? fmt(r.guesses[i]) : null }; });
  return { id:g.rv.id, elapsed:Math.max(0, nowS() - g.rv.at), list, none:list.length === 0, tahmin:!!r.guesses };
}
/* Açıklama anında kabul edilmiş cevapları dondurur (pencere içinde gönderilmiş, yetkili cihazdan, geçerli biçimde). */
function freezeAnswers(){
  const g = G(), qk = currentQk(), frozen = {};
  curTeams().forEach((t, i) => { const a = liveAccepted(i); if (a) frozen[i] = a; });
  g.frozen[qk] = frozen; prefillFrom(frozen);
}
function finishStage(){
  const g = G(), key = stageKey(), teams = curTeams();
  if (elim()){
    // Toplam puanla kontenjan; tur kazananı net kazançla. Eşitlik çözülmeden eleme/kazanan ilan edilmez.
    const o = C.roundOutcome(g, g.stage);
    g.result = { qualified:o.qualified, tie:o.tie, all:o.all, revealed:false };
    g.view = 'stageEnd'; g.show = null; return;
  }
  g.result = C.stageOutcome(gameMode(), teams.map((t, i) => ({ i, score:t.score })), key);
  g.view = 'stageEnd';
}
function cutoff(scores, slots){ return C.cutoff(scores, slots); }
function toQuestion(idx){
  const g = G();
  g.qIndex = idx; g.view = 'question'; g.phase = 'ready'; g.clock = null; g.win = []; g.jrej = {}; g.intro = null;
  ui.sel = []; ui.guesses = {}; ui.showKey = false; ui.confirm = null;
}
function setScreen(s){
  ui.screen = s;
  if (s !== 'welcome') ui.cine = null;           // karşılamadan çıkınca sinematik durur
  if (s === 'welcome') ui.present = 'welcome';
  else if (s === 'menu') ui.present = 'map';
  else if (s === 'game') ui.present = 'game';
  ui.confirm = null; ui.edit = null;
  render(); pushStage();
}
