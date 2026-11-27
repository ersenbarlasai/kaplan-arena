/* Kaplan Arena — çekirdek yarışma mantığı (DOM'suz, saf).
   Tarayıcıda window.KaplanCore, Node'da require('./app/core.js') olarak kullanılır.
   Ayrıntılı şema: tasarim/TEKNIK-NOT.md */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KaplanCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCHEMA = 3;
  const JOKERS = ['double', 'x2', 'risk'];
  const RISK_STAKES = [5, 10, 15];
  /* Puan/joker kuralları yarışma kaydına sabitlenir (g.format.rules). Kuralı olmayan kayıtlar eski kuralla sürer. */
  const LEGACY_RULES = { reset: false, jokersPerRound: false, x2Loss: true, floor: true, risk: false, perRound: 0 };
  const RULES_V4 = { reset: true, jokersPerRound: true, x2Loss: false, floor: false, risk: true, perRound: 10 };
  function rulesOf(g) { return (g && g.format && g.format.rules) || LEGACY_RULES; }
  const GRACE_MS = 250;        // süre sonuna yakın gönderilen cevaplar için ağ toleransı
  const INTRO_MS = 3500;       // joker tanıtımı (ortak duraklama) süresi
  const PENALTY = 10;
  const ARMAS = ['pusula', 'yildiz', 'yaprak', 'alev', 'dag', 'gunes', 'ay', 'kitap', 'kanat', 'simsek', 'kristal', 'kopru'];
  const PERSISTENT_REASONS = ['stage', 'break'];

  /* ---------- saat ve cevap pencereleri ----------
     clock = { total, left, runAt, reasons }  (ms; runAt: çalışmaya başladığı an, null = durdu)
     g.win = [[başla, bitir|null], ...]        cevap/joker kabul pencereleri */
  function clockNew(totalMs) { return { total: totalMs, left: totalMs, runAt: null, reasons: [] }; }
  function ensureClock(g, totalMs) {
    if (!g.clock) g.clock = clockNew(totalMs || 45000);
    if (!Array.isArray(g.clock.reasons)) g.clock.reasons = [];
    if (!Array.isArray(g.win)) g.win = [];
    return g.clock;
  }
  function clockLeft(c, now) { return c.runAt == null ? Math.max(0, c.left) : Math.max(0, c.left - (now - c.runAt)); }
  function isRunning(g) { return !!(g.clock && g.clock.runAt != null); }
  function stopClock(g, now) {
    const c = ensureClock(g);
    if (c.runAt != null) {
      c.left = clockLeft(c, now); c.runAt = null;
      const w = g.win[g.win.length - 1];
      if (w && w[1] == null) w[1] = now;
    }
  }
  function maybeStart(g, now) {
    const c = ensureClock(g);
    if (g.phase === 'open' && c.runAt == null && c.reasons.length === 0 && c.left > 0) {
      c.runAt = now; g.win.push([now, null]);
      return true;
    }
    return false;
  }
  function pause(g, reason, now) {
    const c = ensureClock(g);
    if (!c.reasons.includes(reason)) c.reasons.push(reason);
    stopClock(g, now);
  }
  function unpause(g, reason, now) {
    const c = ensureClock(g);
    c.reasons = c.reasons.filter(r => r !== reason);
    return maybeStart(g, now);
  }
  /* Soruyu göster: aşama open, yeni saat. Sahne kaybı/ara gibi kalıcı nedenler korunur. */
  function showQuestion(g, totalMs, now) {
    const prev = (g.clock && g.clock.reasons) || [];
    g.clock = clockNew(totalMs);
    g.clock.reasons = prev.filter(r => PERSISTENT_REASONS.includes(r));
    g.win = []; g.phase = 'open'; g.intro = null; g.jrej = {};
    maybeStart(g, now);
  }
  /* Süre doldu mu? Dolduysa cevap kabulü kilitlenir. 'timeup' döner. */
  function tickClock(g, now) {
    if (g.phase !== 'open' || !isRunning(g)) return null;
    if (clockLeft(g.clock, now) > 0) return null;
    const c = g.clock, end = c.runAt + c.left;
    c.left = 0; c.runAt = null;
    const w = g.win[g.win.length - 1];
    if (w && w[1] == null) w[1] = end;
    g.phase = 'locked';
    return 'timeup';
  }
  /* Cevabı açıkla (süre bitti ya da onaylı erken açıklama): saat durur, cevaplar kilitlenir. */
  function reveal(g, now) {
    if (g.phase !== 'open' && g.phase !== 'locked') return false;
    stopClock(g, now);
    if (g.clock) g.clock.left = g.phase === 'open' ? g.clock.left : 0;
    g.phase = 'revealed'; g.intro = null;
    if (g.clock) g.clock.reasons = g.clock.reasons.filter(r => PERSISTENT_REASONS.includes(r));
    return true;
  }
  function inWindow(win, t, grace) {
    if (typeof t !== 'number' || !isFinite(t)) return false;
    const gr = grace == null ? GRACE_MS : grace;
    return (win || []).some(w => t >= w[0] && (w[1] == null || t <= w[1] + gr));
  }

  /* ---------- cevaplar ---------- */
  function validAnswer(v, qtype, jk) {
    if (qtype === 'tahmin') return typeof v === 'number' && isFinite(v);
    if (typeof v !== 'string') return false;
    if (jk === 'double') return /^[ABCD]{2}$/.test(v) && v[0] !== v[1];
    return /^[ABCD]$/.test(v);
  }
  /* KV düğümü: eski biçim {v,t,dev} ya da yeni {sid:{v,t,dev}} */
  function submissions(node) {
    if (!node || typeof node !== 'object') return [];
    if ('v' in node) return [node];
    return Object.keys(node).map(k => node[k]).filter(s => s && typeof s === 'object' && 'v' in s);
  }
  function ownSub(s, owner) { return !owner || s.dev === owner; }
  /* Kabul edilen cevap: pencere içinde, biçimi geçerli, yetkili cihazdan gelen en son gönderim. */
  function pickAnswer(node, opt) {
    let best = null;
    for (const s of submissions(node)) {
      if (!ownSub(s, opt.owner)) continue;
      if (!inWindow(opt.win, s.t)) continue;
      if (!validAnswer(s.v, opt.qtype, opt.jk)) continue;
      if (!best || s.t > best.t) best = { v: s.v, t: s.t };
    }
    return best;
  }
  function firstSubmitT(node, opt) {
    let first = null;
    for (const s of submissions(node)) {
      if (!ownSub(s, opt.owner) || !inWindow(opt.win, s.t)) continue;
      if (first == null || s.t < first) first = s.t;
    }
    return first;
  }
  function isCorrect(v, answer, jk) {
    if (typeof v !== 'string') return false;
    if (jk === 'double') return v.length === 2 && v.includes(answer);
    return v === answer;
  }

  /* ---------- jokerler ---------- */
  function jokerRec(g, name) {
    if (!g.jokers) g.jokers = {};
    return g.jokers[name] || (g.jokers[name] = { double: null, x2: null, risk: null, stake: null });
  }
  function activeJoker(g, name, qk) {
    const r = (g.jokers || {})[name] || {};
    return r.double === qk ? 'double' : r.x2 === qk ? 'x2' : r.risk === qk ? 'risk' : null;
  }
  function riskStake(g, name, qk) { const r = (g.jokers || {})[name] || {}; return r.risk === qk ? r.stake : null; }
  /* Joker isteğini doğrular; uygunsa '' döner, değilse Türkçe ret nedeni. */
  function checkJoker(g, c) {
    if (c.isTie) return 'Eşitlik sorusunda joker kullanılamaz.';
    if (!JOKERS.includes(c.j)) return 'Geçersiz joker.';
    if (c.j === 'double' && c.qtype !== 'ders') return 'Çifte Cevap yalnız şıklı sorularda kullanılır.';
    if (c.j === 'risk' && !c.riskOk) return 'Risk Jokeri yalnız Kaplan Arenası Büyük Final’de kullanılır.';
    if (c.j === 'risk' && !RISK_STAKES.includes(c.stake)) return 'Risk için 5, 10 ya da 15 puan seçin.';
    if (g.phase !== 'open') return 'Soru açık değilken joker kullanılamaz.';
    if (!c.admin && c.owner && c.dev !== c.owner) return 'Bu takımın/sınıfın yetkili telefonu değil.';
    if (!inWindow(g.win, c.t, 0)) return 'Joker yalnız süre işlerken kullanılabilir.';
    const r = jokerRec(g, c.name);
    if (r.double === c.qk || r.x2 === c.qk || r.risk === c.qk) return 'Bu soruda zaten bir joker kullanıldı.';
    if (r[c.j] != null) return c.perRound ? 'Bu joker bu turda zaten kullanıldı.' : 'Bu joker daha önce kullanıldı.';
    const first = firstSubmitT(c.node, { win: g.win, owner: c.owner });
    if (first != null && first <= c.t) return 'Cevap gönderildikten sonra joker kullanılamaz.';
    return '';
  }
  /* Kabul: hak hemen tüketilir. Tanıtım yoksa ortak duraklama başlar; varsa (ve istek duraklamadan
     önce gönderilmişse) aynı tanıtıma eklenir. Dönen değer: { intro, grouped } */
  function acceptJoker(g, c, now) {
    const rec = jokerRec(g, c.name); rec[c.j] = c.qk;
    if (c.j === 'risk') rec.stake = c.stake;
    if (!g.jdone) g.jdone = {};
    (g.jdone[c.qk] || (g.jdone[c.qk] = {}))[c.i] = c.t;
    if (g.jrej) delete g.jrej[c.i];
    const item = { i: c.i, name: c.label || c.name, j: c.j };
    if (c.j === 'risk') item.s = c.stake;
    if (g.intro && now < g.intro.until && c.t <= g.intro.pauseAt) {
      g.intro.items.push(item);
      return { intro: g.intro, grouped: true };
    }
    pause(g, 'joker', now);
    g.intro = { id: (g.evId || 0) + 1, pauseAt: now, until: now + INTRO_MS, items: [item] };
    return { intro: g.intro, grouped: false };
  }
  function rejectJoker(g, c, why) {
    if (!g.jdone) g.jdone = {};
    (g.jdone[c.qk] || (g.jdone[c.qk] = {}))[c.i] = c.t;
    if (!g.jrej) g.jrej = {};
    g.jrej[c.i] = { t: c.t, j: c.j, why };
  }
  function seenJoker(g, qk, i, t) { return !!(g.jdone && g.jdone[qk] && g.jdone[qk][i] === t); }
  /* Tanıtım bittiyse yalnız 'joker' nedeni kalkar; başka neden varsa saat başlamaz. */
  function endIntro(g, now) {
    if (!g.intro || now < g.intro.until) return false;
    g.intro = null;
    unpause(g, 'joker', now);
    return true;
  }

  /* ---------- puan ---------- */
  /* scores: mevcut puanlar, winners: kazanan dizinler, jk: {i: 'double'|'x2'|'risk'}, opt: { rules, stakes:{i:puan} }
     → {i: gerçek değişim}. Kurallar (v4): doğru +10; Çifte Cevap biri doğru +10, ikisi yanlış −10; Çift Puan doğru +20,
     yanlış 0; Risk doğru +risk, yanlış −risk; sıfır tabanı yok. Eski kural: jokerli yanlış −10, puan 0'ın altına inmez. */
  function computeDelta(scores, winners, jk, opt) {
    const R = (opt && opt.rules) || LEGACY_RULES, stakes = (opt && opt.stakes) || {};
    const delta = {};
    scores.forEach((s, i) => {
      const j = jk && jk[i], won = winners.includes(i), st = +stakes[i] || 0;
      let d;
      if (won) d = j === 'x2' ? 20 : j === 'risk' ? st : 10;
      else d = j === 'double' ? -PENALTY : j === 'x2' ? (R.x2Loss ? -PENALTY : 0) : j === 'risk' ? -st : 0;
      if (R.floor && d < 0) d = -Math.min(-d, Math.max(0, s)) || 0;
      if (d !== 0 || j) delta[i] = d;
    });
    return delta;
  }
  /* Bir sorunun puanını bir kez uygular. Zaten uygulanmışsa false. */
  function applyScore(g, teams, qk, winners, jk, extra) {
    if (!g.scored) g.scored = {};
    if (g.scored[qk] || (g.cancelled && g.cancelled[qk])) return false;
    const R = rulesOf(g), stakes = (extra && extra.stakes) || {};
    const delta = computeDelta(teams.map(t => t.score), winners, jk, { rules: R, stakes });
    for (const i in delta) teams[i].score = R.floor ? Math.max(0, teams[i].score + delta[i]) : teams[i].score + delta[i];
    g.scored[qk] = Object.assign({ delta, jk: jk || {}, winners: winners.slice() }, extra || {});
    return true;
  }
  /* Soru iptali: gerçek uygulanmış değişim geri alınır, bu soruda tüketilen jokerler iade edilir. */
  function cancelQuestion(g, teams, qk, now) {
    if (!g.cancelled) g.cancelled = {};
    if (g.cancelled[qk]) return false;
    const reverted = {}, refund = [];
    const sc = g.scored && g.scored[qk];
    if (sc) {
      for (const i in sc.delta) {
        const t = teams[i]; if (!t) continue;
        const before = t.score;
        t.score = rulesOf(g).floor ? Math.max(0, t.score - sc.delta[i]) : t.score - sc.delta[i];
        reverted[i] = t.score - before;
      }
      delete g.scored[qk];
    }
    for (const name in (g.jokers || {})) {
      const r = g.jokers[name];
      for (const j of JOKERS) if (r[j] === qk) { r[j] = null; if (j === 'risk') r.stake = null; refund.push([name, j]); }
    }
    stopClock(g, now);
    if (g.clock) g.clock.reasons = g.clock.reasons.filter(r => PERSISTENT_REASONS.includes(r));
    g.intro = null;
    g.cancelled[qk] = { reverted, refund };
    g.phase = 'cancelled';
    return true;
  }

  /* ---------- tahmin ---------- */
  function closestWinners(guesses, answer) {
    const dists = guesses.map(v => v == null ? null : Math.round(Math.abs(v - answer) * 1e6) / 1e6);
    const valid = dists.filter(x => x != null);
    if (!valid.length) return { winners: [], dists };
    const m = Math.min(...valid);
    return { winners: dists.map((x, i) => x === m ? i : -1).filter(i => i >= 0), dists };
  }

  /* ---------- takım listesi ve yarışma modu ----------
     'shared' = Üç Kampüs — Ortak Yarışma: üç takım üç etabın tamamında aynı anda yarışır, eleme yok, puanlar
     birikir; finalde birincilik eşitse yalnız eşit liderlere yedek tahmin sorusu sorulur.
     'tournament' = iki gruplu turnuva (4+ takım; modu kayıtlı olmayan eski kayıtlar da budur).
     Mod yarışma başlarken kayda yazılır (g.mode); sonraki ayar değişiklikleri açık yarışmayı dönüştürmez. */
  const MIN_TEAMS = 3;
  function normRoster(input) {
    const raw = Array.isArray(input) ? input.map(x => x == null ? '' : String(x)).join('\n') : String(input == null ? '' : input);
    return raw.split(/[\r\n,]+/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }
  function rosterError(list) {
    if (!Array.isArray(list) || list.length < MIN_TEAMS) return `En az ${MIN_TEAMS} benzersiz takım/sınıf adı girin.`;
    const seen = new Set();
    for (const n of list) {
      if (typeof n !== 'string' || !n.trim()) return 'Boş takım/sınıf adı olamaz.';
      const k = n.toLocaleLowerCase('tr-TR');
      if (seen.has(k)) return `"${n}" adı listede iki kez geçiyor.`;
      seen.add(k);
    }
    return '';
  }
  function modeFor(n) { return n === MIN_TEAMS ? 'shared' : 'tournament'; }
  function isShared(g) { return !!g && g.mode === 'shared'; }
  /* Etabın takım dizisi. Ortak yarışmada tek kaynak g.teams.all (etaplar arasında kopya yok). */
  function teamsOf(g, key) { if (isElim(g)) return roundTeams(g, g.stage || 0); return isShared(g) ? ((g.teams && g.teams.all) || []) : (((g && g.teams) || {})[key] || []); }
  function cutoff(scores, slots) {
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    if (sorted.length <= slots) return { qualified: sorted.map(x => x.i), tie: null };
    const boundary = sorted[slots - 1].score;
    const above = sorted.filter(x => x.score > boundary).map(x => x.i);
    const at = sorted.filter(x => x.score === boundary).map(x => x.i);
    const remaining = slots - above.length;
    if (at.length === remaining) return { qualified: [...above, ...at], tie: null };
    return { qualified: above, tie: { candidates: at, slots: remaining } };
  }
  /* Etap sonucu. scores: [{i, score}] */
  function stageOutcome(mode, scores, key) {
    if (mode === 'shared' && key !== 'final') return { qualified: [...scores].sort((a, b) => b.score - a.score).map(x => x.i), tie: null, all: true };
    return cutoff(scores, key === 'final' ? 1 : 2);
  }

  /* ---------- eleme yarışması (format v3, yeni yarışmalar) ----------
     Bütün aktif takımlar her turun sorularını aynı anda yanıtlar. Toplam puan etaplar boyunca birikir;
     yükselme ve şampiyonluk toplam puana göre, tur kazananı o turdaki net kazanca göre belirlenir.
     Kontenjanlar yarışma başında kayda sabitlenir (g.format.quotas): 3 → 3 → 2 → 1, 4 → 3 → 2 → 1,
     n > 4 → max(3, ⌈n/2⌉) → 2 → 1. */
  /* Format v4 (Kaplan Arenası Yarışma Kuralları, 27.11.2026): 6 → 4 → 2 → 1; her tur 10 soru; her turda puanlar
     sıfırlanır ve jokerler yenilenir; finale özel Risk Jokeri. 3 ve 4 takım için önceki onaylı akış korunur
     (3 → 3 → 2 → 1, 4 → 3 → 2 → 1); genel kural ilk turdan max(3, ⌈2n/3⌉) takım. */
  const FORMAT_V = 4;
  function quotasFor(n) {
    if (!(n >= MIN_TEAMS)) return null;
    return [Math.min(n, Math.max(3, Math.ceil(2 * n / 3))), 2, 1];
  }
  function makeFormat(n, opt) {
    const rules = Object.assign({}, RULES_V4, opt && opt.perRound ? { perRound: opt.perRound } : {});
    return { v: FORMAT_V, kind: 'elim', n, quotas: quotasFor(n), stages: ['s1', 's2', 'final'], rules };
  }
  function isElim(g) { return !!g && g.mode === 'elim'; }
  const STAGE_KEYS = ['s1', 's2', 'final'];
  function teamById(g, id) { return ((g.teams && g.teams.all) || []).find(t => t.id === id) || null; }
  /* Turun katılımcıları (tur başında sabitlenen kimlik listesi; aynı nesneler g.teams.all içindedir). */
  function roundTeams(g, stage) {
    const r = (g.rounds || [])[stage];
    return r ? r.ids.map(id => teamById(g, id)).filter(Boolean) : [];
  }
  function newRound(g, stage, ids) {
    if (!g.rounds) g.rounds = [];
    if (g.rounds[stage]) return g.rounds[stage];
    const R = rulesOf(g);
    if (stage > 0 && R.reset) for (const id of ids) { const t = teamById(g, id); if (t) t.score = 0; }   // her tur 0 puanla başlar
    if (stage > 0 && R.jokersPerRound){ if (g.rounds[stage - 1]) g.rounds[stage - 1].jokers = g.jokers || {}; g.jokers = {}; }   // jokerler yenilenir
    const start = {};
    for (const id of ids) { const t = teamById(g, id); start[id] = t ? t.score : 0; }
    return (g.rounds[stage] = { key: STAGE_KEYS[stage], ids: ids.slice(), start, done: null });
  }
  /* Tur başı toplam snapshot'ı (tur sorusu başlamadan önce yenilenir; tur içinde değişmez). */
  function snapRound(g, stage) {
    const r = g.rounds[stage]; if (!r || r.done) return;
    for (const id of r.ids) { const t = teamById(g, id); r.start[id] = t ? t.score : 0; }
  }
  /* Tur sonucu: kümülatif toplamla kontenjan; tur kazananı net kazançla. Eşitlik varsa elenen ilan edilmez. */
  function roundOutcome(g, stage) {
    const r = g.rounds[stage], teams = roundTeams(g, stage), quota = g.format.quotas[stage];
    const gains = teams.map(t => t.score - (r.start[t.id] || 0));
    // Kural ihlaliyle (ekran değişikliği) elenen takım sıralamaya ve tur kazananına girmez.
    const live = teams.map((t, i) => i).filter(i => !teams[i].dq);
    const maxGain = live.length ? Math.max(...live.map(i => gains[i])) : 0;
    const winners = live.filter(i => gains[i] === maxGain);
    const scores = live.map(i => ({ i, score: teams[i].score }));
    const all = quota >= live.length;
    const cut = all ? { qualified: [...scores].sort((a, b) => b.score - a.score).map(x => x.i), tie: null } : cutoff(scores, quota);
    return Object.assign(cut, { all, gains, winners, quota });
  }
  /* Tur sonucunu kalıcı yaz (idempotent). qualified: tur içi dizinler, yükselme sırası. */
  function commitRound(g, stage, qualified) {
    const r = g.rounds[stage];
    if (!r || r.done) return false;
    const teams = roundTeams(g, stage), res = roundOutcome(g, stage);
    const up = qualified.map(i => teams[i].id), out = teams.filter(t => !up.includes(t.id));
    for (const t of out) { t.status = 'out'; t.outStage = stage; t.outTotal = t.score; }
    r.done = { up, out: out.map(t => t.id), winners: res.winners.map(i => teams[i].id),
      gains: Object.fromEntries(teams.map((t, i) => [t.id, res.gains[i]])), totals: Object.fromEntries(teams.map(t => [t.id, t.score])) };
    if (!g.elimLog) g.elimLog = [];
    for (const t of out) g.elimLog.push({ id: t.id, name: t.name, stage, total: t.score, reason: t.dq ? 'dq' : 'score' });
    return true;
  }

  /* ---------- soru planı: karıştırma, kanonik kimlik, tekrarsızlık ---------- */
  function shuffle(arr, rnd) {
    const a = arr.slice(), r = rnd || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function normText(s) {
    return String(s == null ? '' : s).normalize('NFKD').toLocaleLowerCase('tr-TR')
      .replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
  /* İçerik temelli kimlik: aynı metin (+ şıklar, sırası fark etmez) farklı bankada/id ile gelse de aynıdır. */
  function canonKey(q) {
    const opts = q && q.type === 'ders' && Array.isArray(q.options) ? q.options.map(normText).sort().join('|') : '';
    return 'c' + fnv(normText(q && q.text) + '#' + opts);
  }
  const PLAN_KEYS = ['s1', 's2', 'final', 'tie'];
  /* Yarışma başında: bankaların kopyası karıştırılır; bankalar arası ve banka içi tekrarlar elenir. */
  function buildPlan(questions, rnd) {
    const plan = {}, seen = new Set(); let dups = 0;
    for (const k of PLAN_KEYS) {
      plan[k] = [];
      for (const q of shuffle((questions && questions[k]) || [], rnd)) {
        const cid = canonKey(q);
        if (seen.has(cid)) { dups++; continue; }
        seen.add(cid); plan[k].push(Object.assign(JSON.parse(JSON.stringify(q)), { cid }));
      }
    }
    return { plan, dups };
  }
  /* Açık yarışmaya admin komutuyla yeni soru ekleme: plandaki ya da sorulmuş içerik eklenmez; sıra sona eklenir. */
  function planAppend(g, key, bank, rnd) {
    const inPlan = new Set(PLAN_KEYS.flatMap(k => (g.plan[k] || []).map(q => q.cid)));
    const add = [];
    for (const q of shuffle(bank || [], rnd)) {
      const cid = canonKey(q);
      if (inPlan.has(cid) || (g.asked && g.asked[cid])) continue;
      inPlan.add(cid); add.push(Object.assign(JSON.parse(JSON.stringify(q)), { cid }));
    }
    g.plan[key] = (g.plan[key] || []).concat(add);
    return add.length;
  }
  function isAsked(g, q) { return !!(q && g.asked && g.asked[q.cid || canonKey(q)]); }
  /* Soru gerçekten gösterildiğinde tüketilir (idempotent). */
  function markAsked(g, q, meta) {
    if (!q) return false;
    const cid = q.cid || canonKey(q);
    if (!g.asked) g.asked = {};
    if (g.asked[cid]) return false;
    g.asked[cid] = Object.assign({ at: 0 }, meta || {});
    return true;
  }
  function nextUnasked(g, key, from) {
    const list = (g.plan && g.plan[key]) || [];
    for (let i = from || 0; i < list.length; i++) if (!isAsked(g, list[i])) return i;
    return -1;
  }

  /* ---------- armalar ---------- */
  /* Var olan eşleşmeler değişmez; yeni sınıf en küçük boş numarayı alır. */
  function assignEmblems(map, names) {
    const m = map && typeof map === 'object' ? map : {};
    const used = new Set(Object.keys(m).map(k => m[k]));
    for (const n of names) {
      if (n == null || n === '' || Object.prototype.hasOwnProperty.call(m, n)) continue;
      let k = 0; while (used.has(k)) k++;
      m[n] = k; used.add(k);
    }
    return m;
  }
  function emblemInfo(n) {
    const k = Math.max(0, n | 0);
    return { file: 'arma-' + ARMAS[k % ARMAS.length] + '.svg', variant: Math.floor(k / ARMAS.length), key: ARMAS[k % ARMAS.length] };
  }

  /* ---------- kalıcı kayıt göçü ---------- */
  function migrate(s, opts) {
    if (!s || typeof s !== 'object') return s;
    const now = (opts && opts.now) || Date.now();
    const st = s.settings || (s.settings = {});
    if (typeof st.volume !== 'number') st.volume = 80;
    if (typeof st.reduceMotion !== 'boolean') st.reduceMotion = false;
    if (typeof st.sound !== 'boolean') st.sound = true;
    const names = [].concat(st.classes || []);
    const g = s.game || {};
    for (const k of ['s1', 's2', 'final', 'all']) for (const t of ((g.teams || {})[k] || [])) names.push(t.name);
    st.emblems = assignEmblems(st.emblems, names);
    if (s.game) {
      ['jokers', 'jdone', 'jrej', 'scored', 'cancelled', 'frozen'].forEach(k => { if (!g[k] || typeof g[k] !== 'object') g[k] = {}; });
      if (!Array.isArray(g.events)) g.events = [];
      if (g.mode === 'elim'){ if (!g.asked || typeof g.asked !== 'object') g.asked = {}; if (!Array.isArray(g.rounds)) g.rounds = []; if (!Array.isArray(g.elimLog)) g.elimLog = []; }
      if (typeof g.evId !== 'number') g.evId = 0;
      if (!Array.isArray(g.win)) g.win = [];
      const total = (st.seconds || 45) * 1000;
      if (!g.clock) g.clock = clockNew(total);
      if (!Array.isArray(g.clock.reasons)) g.clock.reasons = [];
      if (g.view === 'question' && !g.phase) {
        // eski kayıt: shown/revealed → aşama. Saat kayıtlı değildi; admin devam ettirir.
        g.phase = !g.shown ? 'ready' : g.revealed ? 'revealed' : 'open';
        if (g.phase === 'open') { g.clock = clockNew(total); g.clock.reasons = ['admin']; g.win = []; }
      }
      // Yeniden açılışta çalışan saat durdurulur; devamı admin verir (pencere son kayıtta kapanır).
      if (g.clock.runAt != null) {
        const at = typeof g.clock.savedAt === 'number' ? g.clock.savedAt : now;
        g.clock.left = Math.max(0, g.clock.left - Math.max(0, at - g.clock.runAt));
        g.clock.runAt = null;
        const w = g.win[g.win.length - 1]; if (w && w[1] == null) w[1] = at;
        if (!g.clock.reasons.includes('admin')) g.clock.reasons.push('admin');
      }
      if (g.intro) { g.intro = null; g.clock.reasons = g.clock.reasons.filter(r => r !== 'joker'); if (g.phase === 'open' && !g.clock.reasons.includes('admin')) g.clock.reasons.push('admin'); }
      g.clock.reasons = g.clock.reasons.filter(r => r !== 'stage');   // sahne bağlantısı yeniden izlenir
    }
    s.schema = SCHEMA;
    return s;
  }

  return {
    SCHEMA, JOKERS, GRACE_MS, INTRO_MS, PENALTY, ARMAS,
    clockNew, ensureClock, clockLeft, isRunning, stopClock, maybeStart, pause, unpause, showQuestion, tickClock, reveal, inWindow,
    validAnswer, submissions, pickAnswer, firstSubmitT, isCorrect,
    jokerRec, activeJoker, checkJoker, acceptJoker, rejectJoker, seenJoker, endIntro,
    computeDelta, applyScore, cancelQuestion, closestWinners,
    MIN_TEAMS, normRoster, rosterError, modeFor, isShared, teamsOf, cutoff, stageOutcome,
    RISK_STAKES, LEGACY_RULES, RULES_V4, rulesOf, riskStake,
    FORMAT_V, quotasFor, makeFormat, isElim, teamById, roundTeams, newRound, snapRound, roundOutcome, commitRound,
    shuffle, normText, canonKey, buildPlan, planAppend, isAsked, markAsked, nextUnasked,
    assignEmblems, emblemInfo, migrate
  };
});
