/* Kaplan Arena — admin eylemleri. Yarışma akışı tam manueldir; hiçbir eylem kendiliğinden ilerlemez. */
function cineStart(mode){
  ACT.welcome();                                   // aktif yarışmayı 'break' + 'admin' ile duraklatır, sahneyi karşılamaya alır
  ui.cine = { mode, id:uid(), at:Date.now() };
  if (!StageHost.count()) toast('Sahne penceresi açık değil. Film sahne ekranında oynar; önce "Sahne Ekranını Aç".', 5000);
  else if (mode === 'opening' && reducedMotion()) toast('Hareketleri azaltma açık: sahnede açılış filmi yerine sabit karşılama gösterilir.', 5000);
  render(); pushStage();
}
function startShow(kind, dur){
  const g = G();
  g.show = { id:'sh' + ((g.evId || 0) + 1) + '_' + Math.round(nowS()), kind, at:Math.round(nowS()), dur, skip:false, stage:g.stage };
}
const ACT = {
  cancel(){ ui.confirm = null; render(); },

  /* ---- ekranlar ---- */
  welcome(){
    const g = G();
    if (g.started && !g.finished){
      g.brk = true;
      if (inQ() && g.phase === 'open' && g.clock){ C.pause(g, 'break', nowS()); C.pause(g, 'admin', nowS()); }
      save();
    }
    setScreen('welcome');
  },
  /* ---- sinematik: açılış filmi / ara döngüsü (ikisi de ekran değişene kadar döngüde). Aktif yarışmada ortak
     duraklatma kullanılır (süre ve cevap kabulü birlikte durur); döngü, Atla veya Durdur yarışmayı ilerletmez —
     devam yalnız admin eylemiyle. Film yokken karşılamada sahne ara müziğini çalar. */
  cineOpening(){ cineStart('opening'); },
  cineLoop(){ cineStart('loop'); },
  cineSkip(){ if (ui.cine && ui.cine.mode === 'opening'){ ui.cine = null; render(); pushStage(); } },
  cineStop(){ ui.cine = null; if (ui.screen !== 'welcome') ACT.welcome(); else { render(); pushStage(); } },
  begin(){
    const g = G();
    if (g.brk){ g.brk = false; if (g.clock){ C.unpause(g, 'break', nowS()); } save(); }
    setScreen(g.started && !g.finished && LOCK.state !== 'other' ? 'game' : 'menu');
  },
  menu(){ setScreen('menu'); },
  start(){ if (LOCK.state === 'other') return render(); setScreen('game'); },
  manage(){ ui.screen = 'manage'; ui.confirm = null; render(); },
  settings(){ ui.screen = 'settings'; ui.confirm = null; render(); },
  openStage(){
    if (!StageHost.open()) toast('Sahne penceresi açılamadı. Tarayıcının açılır pencere engelini bu sayfa için kapatın.', 6000);
    else toast('Sahne penceresi açıldı. Projeksiyona taşıyıp tam ekran yapın; sesi sahnede etkinleştirin.', 5000);
  },
  noStage(){ ui.noStageOk = true; const g = G(); if (g.clock && g.clock.reasons.includes('stage')){ C.unpause(g, 'stage', nowS()); save(); } render(); },
  toggleSound(){ S.settings.sound = !S.settings.sound; save(); render(); },

  /* ---- yarışma başlat/bitir ---- */
  newGameAsk(){ ui.confirm = 'newgame'; render(); },
  async newGameYes(){
    // Yeni yarışma (format v3, eleme): katılımcılar kararlı teamId ile, kurallar/kontenjanlar, karışık tekrarsız soru
    // planı, admin anahtarı ve takıma özel kaptan kodları başlangıçta kayda sabitlenir. Ayar değişikliği açık yarışmayı etkilemez.
    const roster = nextRoster(), err = C.rosterError(roster);
    if (err){ ui.confirm = null; return toast(err + ' Ayarlar ekranından takım listesini düzeltin.', 6000); }
    const pl = C.buildPlan(S.questions, (typeof window !== 'undefined' && window.KA_RNG) || rnd01);   // KA_RNG: testte enjekte edilen rastgelelik
    if (!pl.plan.s1.length || !pl.plan.s2.length || !pl.plan.final.length){ ui.confirm = null; return toast('Her turda en az bir soru olmalı (Orman Geçidi, Kadim Kale, Kaplan Arenası). Soru Yönetimi ekranından ekleyin.', 7000); }
    const g = newGame(); g.started = true; g.since = Math.round(nowS());
    g.mode = 'elim'; g.format = C.makeFormat(roster.length, { perRound:S.settings.perRound || 10 }); g.roster = roster.slice();
    g.teams.all = roster.map((n, k) => ({ id:'t' + (k + 1), name:n, score:0, status:'active' }));
    g.codes = captainCodes(g.teams.all.map(t => t.id)); g.akey = randKey(24);
    g.plan = pl.plan; g.planDups = pl.dups; g.asked = {}; g.rounds = []; g.elimLog = []; g.show = null;
    C.newRound(g, 0, g.teams.all.map(t => t.id));
    g.view = 'teams'; g.stage = 0;
    if (lockOn()){
      let j;
      try{ j = await lockReq('acquire', true, g); }catch(e){ return toast('Bağlantı kurulamadı, tekrar deneyin.'); }
      LOCK.info = j.info || null;
      if (j.state !== 'mine'){ LOCK.state = 'other'; ui.confirm = null; setScreen('menu'); return; }
      LOCK.state = 'mine';
    }
    S.game = g; syncEmblems(); ui.confirm = null; ui.drawShown = null; ui.codesOpen = true;
    NET.key = g.akey;
    if (NET.ok && !(await ctlSync())) toast('Telefon yetki kaydı sunucuya yazılamadı; bağlantı gelince yeniden denenecek.', 6000);
    if (NET.ok){ try{ NET.db.ref('games/' + S.game.pin + '/meta').set({ created:TS(), title:S.settings.title }); }catch(e){} }
    addEvent('stage');
    save(); setScreen('game'); lockSync(false);
  },
  endAsk(){ ui.confirm = 'end'; render(); },
  endYes(){ const g = G(); if (g.clock) C.stopClock(g, nowS()); ui.confirm = null; g.started = true; g.view = 'ended'; g.finished = true; save(); setScreen('game'); lockSync(false); },

  /* ---- kura ve etap ---- */
  drawGo(){
    const g = G();
    if (shared() || elim()) return;                         // ortak/eleme yarışmasında grup kurası yoktur
    const list = g.roster || S.settings.classes;            // eski kayıt: rosteri yoksa mevcut davranış
    if (list.length < 4) return toast('İki gruplu turnuva kurası için en az 4 takım gerekir.', 5000);
    const sh = shuffle(list), n1 = Math.ceil(sh.length / 2);
    g.draw = { s1:sh.slice(0, n1), s2:sh.slice(n1) }; C.assignEmblems(S.settings.emblems, sh);
    save(); runDrawAnim();
  },
  redrawAsk(){ ui.confirm = 'redraw'; render(); },
  redrawYes(){ ui.confirm = null; ACT.drawGo(); },
  drawOk(){
    const g = G();
    g.teams.s1 = g.draw.s1.map(n => ({ name:n, score:0 }));
    g.teams.s2 = g.draw.s2.map(n => ({ name:n, score:0 }));
    g.stage = 0; g.view = 'teams'; addEvent('stage'); save(); render();
  },
  startStage(){
    const key = stageKey();
    if (elim()){
      const g = G(); if (g.view !== 'teams') return;
      const first = C.nextUnasked(g, key, 0);
      if (first < 0) return toast('Bu turda sorulmamış soru kalmadı. Soru Yönetimi’nde yeni soru ekleyip “Yeni Soruları Ekle” deyin.', 7000);
      C.snapRound(g, g.stage);                          // tur kazancı bu toplamlara göre hesaplanır; toplamlar sıfırlanmaz
      g.result = null; g.tie = null; g.last = null; g.history = []; g.show = null;
      toQuestion(first); save(); render(); return;
    }
    if (!S.questions[key].length) return toast('Bu etapta soru yok. Önce Soru Yönetimi ekranından soru ekleyin.');
    // Turnuvada her etap kendi takım listesiyle sıfırdan başlar; ortak yarışmada puanlar etaplar boyunca birikir.
    if (!shared()) curTeams().forEach(t => t.score = 0);
    const g = G(); g.result = null; g.tie = null; g.last = null; g.history = [];
    toQuestion(0); save(); render();
  },

  /* ---- soru aşamaları ---- */
  showQ(){
    const g = G(); if (!inQ() || g.phase !== 'ready') return;
    if (elim()){
      // Gösterme ve tüketim tek geçiş: soru bu yarışmada bir kez sorulur (iptal/geri alma/yenileme bunu geri almaz).
      const q = curQ();
      if (q && C.isAsked(g, q)) return toast('Bu soru bu yarışmada zaten soruldu; tekrar oynatılamaz.', 5000);
      if (q) C.markAsked(g, q, { at:Math.round(nowS()), stage:stageKey(), qk:currentQk() });
    }
    C.showQuestion(g, S.settings.seconds * 1000, nowS());
    if (ui.stageSeen && StageHost.count() === 0 && !ui.noStageOk){ C.pause(g, 'stage', nowS()); C.pause(g, 'admin', nowS()); }
    save(); render();
  },
  pause(){ const g = G(); if (g.phase !== 'open') return; C.pause(g, 'admin', nowS()); save(); render(); },
  resume(){
    const g = G(); if (g.phase !== 'open' || !g.clock) return;
    if (g.clock.reasons.includes('stage') && StageHost.count() === 0 && !ui.noStageOk) return toast('Sahne bağlı değil. Sahneyi yeniden açın ya da "Sahnesiz Devam" seçin.', 5000);
    if (g.clock.reasons.includes('joker')) return toast('Joker tanıtımı bitince devam edebilirsiniz.');
    C.unpause(g, 'admin', nowS()); save(); render();
  },
  revealAsk(){
    const g = G(); if (!inQ()) return;
    if (g.phase === 'open' && clockLeftMs() > 0){ ui.confirm = 'reveal'; return render(); }
    ACT.revealYes();
  },
  revealYes(){
    const g = G(); ui.confirm = null;
    if (!C.reveal(g, nowS())) return render();
    ui.touched = false;
    freezeAnswers();
    if (!isTie()) g.rv = { qk:currentQk(), id:'rv' + ((g.evId || 0) + 1) + '_' + Math.round(nowS()), at:nowS(), sel:[...ui.sel], guesses:Object.assign({}, ui.guesses) };
    addEvent('reveal'); save(); render();
    // Süre içinde gönderilmiş ama henüz ulaşmamış cevaplar (ağ gecikmesi) için hemen yeniden yokla ve
    // puanlar gösterilmeden önce iki kez yenile. Kabul ölçütü gönderim zamanıdır, ulaşma zamanı değil.
    try{ if (NET.ok && NET.db && NET.db.start) NET.db.start(); }catch(e){}
    const qk = currentQk();
    [1500, 3000].forEach(ms => setTimeout(() => { const g2 = G(); if (currentQk() === qk && inQ() && g2.phase === 'revealed' && !(g2.scored || {})[qk] && !ui.touched){ freezeAnswers(); rvSync(); save(); render(); } }, ms));
  },
  toggleTeam(d){ const i = +d.i; ui.touched = true; ui.sel = ui.sel.includes(i) ? ui.sel.filter(x => x !== i) : [...ui.sel, i]; rvSync(); save(); render(); },
  showScores(){
    const g = G(); if (g.view !== 'question' || g.phase !== 'revealed') return;
    const q = curQ(), teams = curTeams(), qk = currentQk();
    let winners = [], detail = null;
    if (q.type === 'ders') winners = [...ui.sel].sort((a, b) => a - b);
    else {
      const guesses = teams.map((t, i) => parseNum(ui.guesses[i]));
      const bad = teams.findIndex((t, i) => String(ui.guesses[i] || '').trim() && guesses[i] == null);
      if (bad >= 0) return toast(`${teams[bad].name} için geçerli bir sayı girin.`);
      const r = C.closestWinners(guesses, q.answer); winners = r.winners; detail = { guesses, dists:r.dists };
    }
    const jk = {}, stakes = {}; teams.forEach((t, i) => { const j = activeJk(i); if (j) jk[i] = j; const st = C.riskStake(g, tkey(t), qk); if (st) stakes[i] = st; });
    winners = winners.filter(i => teams[i] && teams[i].status !== 'out');   // kural ihlaliyle elenen takım puan almaz
    if (!g.scored[qk]){ pushHistory(); C.applyScore(g, teams, qk, winners, jk, { detail, stakes }); }
    const sc = g.scored[qk];
    g.last = { qk, winners:sc.winners, delta:sc.delta, jk:sc.jk, detail:sc.detail, answer:q.answer, unit:q.unit, at:sc.at || (sc.at = nowS()) };
    g.view = 'scoreboard'; ui.scoreEdit = false; addEvent('scores'); save(); render();
  },
  undo(){
    const g = G(); if (!g.history.length) return;
    const h = g.history.slice(0, -1), snap = JSON.parse(g.history[g.history.length - 1]);
    // Sorulmuş soru kaydı (asked) ve soru planı geri gitmez; geri alma yalnız puan/eşitlik düzeltmesidir.
    S.game = Object.assign(snap, { history:h, plan:g.plan || snap.plan || null, asked:Object.assign({}, snap.asked || {}, g.asked || {}) }); ui.scoreEdit = false;
    if (S.game.rv && S.game.rv.qk === currentQk()){ ui.sel = [...(S.game.rv.sel || [])]; ui.guesses = Object.assign({}, S.game.rv.guesses || {}); }
    else if (S.game.frozen && currentQk() && S.game.frozen[currentQk()]) prefillFrom(S.game.frozen[currentQk()]);
    save(); render(); toast('Son işlem geri alındı.');
  },
  scoreEdit(){ ui.scoreEdit = !ui.scoreEdit; render(); },
  adj(d){ const t = curTeams()[+d.i]; pushHistory(); t.score = Math.max(0, t.score + (+d.v)); save(); render(); },
  next(){
    const g = G();
    if (!(g.view === 'scoreboard' || (g.view === 'question' && g.phase === 'cancelled'))) return;
    if (elim()){ const n = isLastQ() ? -1 : C.nextUnasked(g, stageKey(), g.qIndex + 1); if (n >= 0) toQuestion(n); else finishStage(); }
    else if (g.qIndex + 1 < S.questions[stageKey()].length) toQuestion(g.qIndex + 1);
    else { finishStage(); }
    save(); render();
  },
  cancelAsk(){ ui.confirm = 'cancelq'; render(); },
  cancelYes(){
    const g = G(); ui.confirm = null;
    if (!(g.view === 'question' || g.view === 'scoreboard')) return render();
    const qk = currentQk();
    if (!qk) return render();
    if (g.cancelled[qk]){ toast('Bu soru zaten iptal edildi.'); return; }
    if (elim()) g.history = [];                   // iptal kesindir: geri alınamaz; gösterilmiş soru zaten tüketildi
    else pushHistory();
    g.view = 'question';
    C.cancelQuestion(g, curTeams(), qk, nowS());
    g.last = null; addEvent('cancel'); save(); render(); toast('Soru iptal edildi; puan etkisi geri alındı, jokerler iade edildi.', 5000);
  },
  jkAsk(d){ ui.confirm = `jk:${d.i}:${d.j}`; ui.riskStake = 10; render(); },
  riskPick(d){ ui.riskStake = +d.v; render(); },
  jkYes(d){
    const g = G(), i = +d.i, j = d.j, t = curTeams()[i]; ui.confirm = null;
    if (!t || g.view !== 'question' || t.status === 'out') return render();
    const qk = currentQk(), now = nowS();
    const ctx = { qk, qtype:curQ().type, isTie:false, i, name:tkey(t), label:t.name, j, t:now, stake:+d.s || 0, riskOk:riskOn(), perRound:elim() && rules().jokersPerRound, admin:true, owner:null, dev:'admin', node:(NET.live.ans || {})[nk(i)] };
    const why = C.checkJoker(g, ctx);
    if (why) return toast(why, 5000);
    const res = C.acceptJoker(g, ctx, now); if (!res.grouped) addEvent('joker');
    save(); render();
  },

  /* ---- eşitlik ve etap sonu ---- */
  startTie(){
    const g = G(), r = g.result;
    if (g.view !== 'stageEnd' || !r || !r.tie) return;
    g.tieRound = (g.tieRound || 0) + 1;
    // Eşitlik havuzu da karışık plandan; gösterilince tüketilir. Havuz biterse sözlü soru (admin cevabı girer).
    g.tie = { candidates:r.tie.candidates, slots:r.tie.slots, poolIdx:elim() ? C.nextUnasked(g, 'tie', 0) : g.tieUsed };
    g.view = 'tie'; g.phase = 'ready'; g.clock = null; g.win = []; g.intro = null; ui.guesses = {}; ui.tieAns = '';
    save(); render();
  },
  resolveTie(){
    const g = G(), t = g.tie, teams = curTeams();
    if (g.phase !== 'revealed') return toast('Önce cevabı açıklayın.');
    const q = curQ();
    const ans = q ? q.answer : parseNum(document.getElementById('tie-ans')?.value);
    if (ans == null) return toast('Önce doğru cevabı girin.');
    const scores = t.candidates.map(i => { const v = parseNum(ui.guesses[i]); return { i, score:v == null ? -Infinity : -Math.round(Math.abs(v - ans) * 1e6) / 1e6 }; });
    if (scores.every(s => s.score === -Infinity)) return toast(`En az bir ${noun().gen} tahminini girin.`);
    pushHistory();
    if (q && !elim()) g.tieUsed = Math.max(g.tieUsed, t.poolIdx + 1);
    const res = cutoff(scores, t.slots);
    const detail = t.candidates.map(i => `${teams[i].name}: ${ui.guesses[i] ? fmt(parseNum(ui.guesses[i])) : '—'}`).join(', ');
    g.result.qualified = g.result.qualified.concat(res.qualified);
    ui.guesses = {}; ui.tieAns = '';
    if (res.tie){
      g.tieRound = (g.tieRound || 0) + 1;
      g.tie = { candidates:res.tie.candidates, slots:res.tie.slots, poolIdx:elim() ? C.nextUnasked(g, 'tie', 0) : g.tieUsed };
      g.phase = 'ready'; g.clock = null; g.win = [];
      save(); render(); toast('Yine eşitlik! Yeni bir eşitlik sorusu hazır.');
    } else {
      g.result.tie = null;
      g.result.tieNote = `Eşitlik sorusunu ${res.qualified.map(i => teams[i].name).join(' ve ')} kazandı (cevap ${fmt(ans)}; ${detail})`;
      g.tie = null; g.view = 'stageEnd'; g.phase = 'ready'; g.clock = null; save(); render();
    }
  },
  /* ---- eleme yarışması: sonuç açıklama, gösteri, tur geçişi (hepsi açık admin komutu, idempotent) ---- */
  revealRound(){
    const g = G();
    if (!elim() || g.view !== 'stageEnd' || !g.result || g.result.tie || g.result.revealed) return;
    C.commitRound(g, g.stage, g.result.qualified);     // elenenler kalıcı; ikinci çağrı hiçbir şey yapmaz
    g.result.revealed = true; g.history = [];
    if (stageKey() === 'final'){
      g.view = 'champion'; g.finished = true; startShow('champion', 9000); addEvent('champion'); save(); render(); lockSync(false); return;
    }
    startShow('round', 7000); addEvent('roundEnd'); save(); render();
  },
  showSkip(){ const g = G(); if (g.show && !g.show.skip){ g.show.skip = true; save(); render(); } },
  showReplay(){
    const g = G(); if (!g.show || !g.result || !g.result.revealed) return;
    startShow(g.show.kind, g.show.dur); addEvent(g.show.kind === 'champion' ? 'champion' : 'roundEnd'); save(); render();
  },
  planAdd(d){
    const g = G(); if (!elim()) return;
    const n = C.planAppend(g, d.k, S.questions[d.k], rnd01);
    save(); render(); toast(n ? `${n} yeni soru bu yarışmanın sırasına eklendi.` : 'Eklenecek yeni (sorulmamış, tekrarsız) soru yok.', 5000);
  },
  tieRetry(){
    const g = G(); if (!elim() || g.view !== 'tie' || g.phase !== 'ready' || !g.tie) return;
    const k = C.nextUnasked(g, 'tie', 0);
    if (k < 0) return toast('Eşitlik havuzunda sorulmamış soru yok. Önce Soru Yönetimi › Eşitlik bölümüne yeni soru ekleyin.', 6000);
    g.tie.poolIdx = k; save(); render();
  },
  /* Kural 08: ekran değişikliği. Sistem telefondan algılar ve bildirir; elemeyi admin onaylar (kilit ekranı, gelen arama
     gibi yanlış alarmlarda takımı haksız elememek için). Elenen takım o anki sorudan puan almaz, sonraki tura geçemez. */
  dqAsk(d){ ui.confirm = 'dq:' + d.id; render(); },
  dqYes(d){
    const g = G(), t = C.teamById(g, d.id); ui.confirm = null;
    if (!elim() || !t || t.status === 'out' || g.finished) return render();
    t.dq = { stage:g.stage, at:Math.round(nowS()), reason:'ekran' };
    t.status = 'out'; t.outStage = g.stage; t.outTotal = t.score;
    (ui.violSeen || (ui.violSeen = {}))[t.id] = Date.now();
    addEvent('dq'); save(); render(); ctlSync();
    toast(`${t.name} kural ihlali (ekran değişikliği) nedeniyle elendi.`, 6000);
  },
  violDismiss(d){ (ui.violSeen || (ui.violSeen = {}))[d.id] = Date.now(); render(); },
  codesToggle(){ ui.codesOpen = !ui.codesOpen; render(); },
  devResetAsk(d){ ui.confirm = 'dev:' + d.id; render(); },
  async devResetYes(d){
    const g = G(), t = C.teamById(g, d.id); ui.confirm = null;
    if (!elim() || !t || t.status === 'out') return render();
    const ok = await ctlSync({ reset:[t.id] });
    toast(ok ? `${t.name}: kaptan telefonu sıfırlandı. Yeni telefon kaptan koduyla bağlanabilir.` : 'Sunucuya ulaşılamadı; tekrar deneyin.', 6000);
  },
  advance(){
    const g = G(), st = STAGES[g.stage], key = st.key, teams = curTeams();
    if (!g.result || g.result.tie) return;
    if (elim()){
      const r = g.rounds[g.stage];
      if (key === 'final' || !g.result.revealed || !r || !r.done || g.rounds[g.stage + 1]) return;
      C.newRound(g, g.stage + 1, r.done.up);             // yalnız yükselenler; elenen bir daha kadroya alınmaz
      g.stage++; g.history = []; g.result = null; g.show = null; g.view = 'teams'; addEvent('stage'); save(); render(); return;
    }
    if (shared()){
      if (key !== 'final'){ g.stage++; g.history = []; g.result = null; g.view = 'teams'; addEvent('stage'); save(); render(); }
      else { g.view = 'champion'; g.finished = true; addEvent('champion'); save(); render(); lockSync(false); }
      return;
    }
    if (key !== 'final'){
      g.qualified[key] = g.result.qualified.map(i => ({ name:teams[i].name, from:st.name }));
      g.stage++; g.history = []; g.result = null; g.view = 'teams';
      if (g.stage === 2) g.teams.final = [...g.qualified.s1, ...g.qualified.s2].map(t => ({ name:t.name, from:t.from, score:0 }));
      addEvent('stage'); save(); render();
    } else {
      g.view = 'champion'; g.finished = true; addEvent('champion'); save(); render(); lockSync(false);
    }
  },
  confetti(){ if (elim()) return ACT.showReplay(); addEvent('champion'); save(); },
  joinOpen(){ ui.joinOpen = true; render(); },
  joinClose(){ ui.joinOpen = false; render(); },
  keyToggle(){ ui.showKey = !ui.showKey; render(); },
  async lockRetry(){ const ok = await lockSync(true); render(); toast(ok ? 'Açık başka yarışma yok, başlatabilirsiniz.' : 'Diğer yarışma hâlâ açık.'); },
  localEndAsk(){ ui.confirm = 'localend'; render(); },
  localEndYes(){
    const g = G(); ui.confirm = null; if (g.clock) C.stopClock(g, nowS()); g.view = 'ended'; g.finished = true; save();
    if (NET.ok && g.pin){ try{ NET.db.ref('games/' + g.pin + '/state').set(buildState()); }catch(e){} }
    render(); toast('Bu cihazdaki eski yarışma kapatıldı.');
  },

  /* ---- soru yönetimi, yedek, ayarlar (mevcut davranış korunur) ---- */
  tab(d){ ui.tab = d.k; ui.confirm = null; render(); },
  addQ(d){ ui.edit = d.t === 'ders' ? {id:null, type:'ders', subject:SUBJECTS[0], text:'', options:['','','',''], answer:'A'} : {id:null, type:'tahmin', text:'', answer:'', unit:''}; render(); document.getElementById('e-text')?.focus(); },
  editQ(d){ const q = S.questions[ui.tab].find(x=>x.id===d.id); if (!q) return; ui.edit = JSON.parse(JSON.stringify(q)); render(); },
  closeEdit(){ ui.edit = null; render(); },
  overlayClose(d, el, e){ if (e.target === el){ ui.edit = null; render(); } },
  saveQ(){
    const e = ui.edit, v = id => document.getElementById(id)?.value ?? '';
    const text = v('e-text').trim(); if (!text) return toast('Soru metnini yazın.');
    let q;
    if (e.type === 'ders'){
      const options = [0,1,2,3].map(i=>v('e-opt-'+i).trim());
      if (options.some(o=>!o)) return toast('Dört şıkkın hepsini doldurun.');
      const ans = document.querySelector('input[name="e-ans"]:checked')?.value; if (!ans) return toast('Doğru şıkkı işaretleyin.');
      q = {id:e.id||uid(), type:'ders', subject:v('e-subject'), text, options, answer:ans};
    } else {
      const n = parseNum(v('e-num')); if (n == null) return toast('Doğru cevabı sayı olarak girin.');
      q = {id:e.id||uid(), type:'tahmin', text, answer:n, unit:v('e-unit').trim()};
    }
    const list = S.questions[ui.tab], ix = list.findIndex(x=>x.id===q.id);
    if (ix >= 0) list[ix] = q; else list.push(q);
    ui.edit = null; save(); render(); toast('Soru kaydedildi.');
  },
  delAsk(d){ ui.confirm = 'del:'+d.id; render(); },
  delYes(d){ S.questions[ui.tab] = S.questions[ui.tab].filter(q=>q.id!==d.id); ui.confirm = null; save(); render(); toast('Soru silindi.'); },
  move(d){ const l = S.questions[ui.tab], i = l.findIndex(q=>q.id===d.id), j = i + (+d.d); if (j<0||j>=l.length) return; [l[i],l[j]] = [l[j],l[i]]; save(); render(); },
  copyBackup(){
    const ta = document.getElementById('backup-text');
    const fallback = () => { ta.focus(); ta.select(); toast('Metin seçildi; Ctrl+C ile kopyalayın.'); };
    try{ navigator.clipboard.writeText(ui.backup).then(()=>toast('Yedek metni kopyalandı.'), fallback); }catch(e){ fallback(); }
  },
  downloadBackup(){
    try{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ui.backup], {type:'application/json'}));
      a.download = 'kaplan-arena-yedek.json'; document.body.appendChild(a); a.click(); a.remove();
    }catch(e){ toast('İndirme yapılamadı; metni kopyalayın.'); }
  },
  importAsk(){
    const txt = (document.getElementById('imp-text')?.value || '').trim(); ui.importText = txt;
    if (!txt) return toast('Önce bir yedek dosyası seçin ya da metni yapıştırın.');
    try{ validateImport(JSON.parse(txt)); }catch(e){ return toast('Yedek okunamadı: ' + e.message); }
    ui.confirm = 'import'; render();
  },
  samplesAsk(){ ui.confirm = 'samples'; render(); },
  samplesYes(){ S.questions = sampleQuestions(); ui.confirm = null; save(); render(); toast('Örnek sorular yüklendi.'); },
  resetAllAsk(){ ui.confirm = 'resetall'; render(); },
};

/* Mevcut yönetim eylemlerinin şema 2 ile uyumlu sürümleri */
Object.assign(ACT, {
  exportData(){ ui.backup = JSON.stringify({ app:'kaplan-arena', version:2, settings:S.settings, questions:S.questions }, null, 2); render(); },
  importYes(){
    try{
      const o = validateImport(JSON.parse(ui.importText));
      S.questions = o.questions; if (o.settings) S.settings = Object.assign(S.settings, o.settings);
      syncEmblems();
      ui.confirm = null; ui.importText = ''; save(); render(); toast('Sorular içe aktarıldı.');
    }catch(e){ toast('Yedek okunamadı: ' + e.message); }
  },
  saveSettings(){
    const title = document.getElementById('set-title').value.trim() || 'Kaplan Arena';
    const sec = Math.round(Number(document.getElementById('set-sec').value));
    if (!(sec >= 5 && sec <= 600)) return toast('Süre 5 ile 600 saniye arasında olmalı.');
    // Aynı temizlik/doğrulama yeni yarışma başlatmada ve yedek içe aktarmada da kullanılır (KaplanCore).
    const classes = C.normRoster(document.getElementById('set-classes').value), rerr = C.rosterError(classes);
    if (rerr) return toast(rerr, 5000);
    const per = Math.round(Number(document.getElementById('set-per')?.value || 10));
    if (!(per >= 1 && per <= 30)) return toast('Tur başına soru sayısı 1 ile 30 arasında olmalı.');
    S.settings.title = title; S.settings.seconds = sec; S.settings.classes = classes; S.settings.perRound = per;
    S.settings.sound = document.getElementById('set-sound').checked;
    S.settings.volume = Math.max(0, Math.min(100, Math.round(Number(document.getElementById('set-vol').value))));
    S.settings.reduceMotion = document.getElementById('set-motion').checked;
    syncEmblems();
    save(); render(); toast('Ayarlar kaydedildi.');
  },
  soundTest(){ addEvent('test'); save(); toast('Etkin ses sahnesine test sesi gönderildi.'); },
  resetAllYes(){ S = defaultState(); ui.confirm = null; save(); setScreen('menu'); lockSync(false); toast('Tüm veriler sıfırlandı.'); }
});
