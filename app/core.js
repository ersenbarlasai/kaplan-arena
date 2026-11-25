/* Kaplan Arena — çekirdek yarışma mantığı (DOM'suz, saf).
   Tarayıcıda window.KaplanCore, Node'da require('./app/core.js') olarak kullanılır.
   Ayrıntılı şema: tasarim/TEKNIK-NOT.md */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KaplanCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCHEMA = 2;
  const JOKERS = ['double', 'x2'];
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
    return g.jokers[name] || (g.jokers[name] = { double: null, x2: null });
  }
  function activeJoker(g, name, qk) {
    const r = (g.jokers || {})[name] || {};
    return r.double === qk ? 'double' : r.x2 === qk ? 'x2' : null;
  }
  /* Joker isteğini doğrular; uygunsa '' döner, değilse Türkçe ret nedeni. */
  function checkJoker(g, c) {
    if (c.isTie) return 'Eşitlik sorusunda joker kullanılamaz.';
    if (!JOKERS.includes(c.j)) return 'Geçersiz joker.';
    if (c.j === 'double' && c.qtype !== 'ders') return 'Çift Cevap yalnız şıklı sorularda kullanılır.';
    if (g.phase !== 'open') return 'Soru açık değilken joker kullanılamaz.';
    if (!c.admin && c.owner && c.dev !== c.owner) return 'Bu sınıfın yetkili telefonu değil.';
    if (!inWindow(g.win, c.t, 0)) return 'Joker yalnız süre işlerken kullanılabilir.';
    const r = jokerRec(g, c.name);
    if (r.double === c.qk || r.x2 === c.qk) return 'Bu soruda zaten bir joker kullanıldı.';
    if (r[c.j] != null) return 'Bu joker daha önce kullanıldı.';
    const first = firstSubmitT(c.node, { win: g.win, owner: c.owner });
    if (first != null && first <= c.t) return 'Cevap gönderildikten sonra joker kullanılamaz.';
    return '';
  }
  /* Kabul: hak hemen tüketilir. Tanıtım yoksa ortak duraklama başlar; varsa (ve istek duraklamadan
     önce gönderilmişse) aynı tanıtıma eklenir. Dönen değer: { intro, grouped } */
  function acceptJoker(g, c, now) {
    jokerRec(g, c.name)[c.j] = c.qk;
    if (!g.jdone) g.jdone = {};
    (g.jdone[c.qk] || (g.jdone[c.qk] = {}))[c.i] = c.t;
    if (g.jrej) delete g.jrej[c.i];
    const item = { i: c.i, name: c.name, j: c.j };
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
  /* scores: mevcut puanlar, winners: kazanan dizinler, jk: {i: 'double'|'x2'} → {i: gerçek değişim} */
  function computeDelta(scores, winners, jk) {
    const delta = {};
    scores.forEach((s, i) => {
      const j = jk && jk[i], won = winners.includes(i);
      let d = won ? (j === 'x2' ? 20 : 10) : (j ? -PENALTY : 0);
      if (d < 0) d = -Math.min(PENALTY, Math.max(0, s)) || 0;
      if (d !== 0 || j) delta[i] = d;
    });
    return delta;
  }
  /* Bir sorunun puanını bir kez uygular. Zaten uygulanmışsa false. */
  function applyScore(g, teams, qk, winners, jk, extra) {
    if (!g.scored) g.scored = {};
    if (g.scored[qk] || (g.cancelled && g.cancelled[qk])) return false;
    const delta = computeDelta(teams.map(t => t.score), winners, jk);
    for (const i in delta) teams[i].score = Math.max(0, teams[i].score + delta[i]);
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
        t.score = Math.max(0, t.score - sc.delta[i]);
        reverted[i] = t.score - before;
      }
      delete g.scored[qk];
    }
    for (const name in (g.jokers || {})) {
      const r = g.jokers[name];
      for (const j of JOKERS) if (r[j] === qk) { r[j] = null; refund.push([name, j]); }
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
    for (const k of ['s1', 's2', 'final']) for (const t of ((g.teams || {})[k] || [])) names.push(t.name);
    st.emblems = assignEmblems(st.emblems, names);
    if (s.game) {
      ['jokers', 'jdone', 'jrej', 'scored', 'cancelled', 'frozen'].forEach(k => { if (!g[k] || typeof g[k] !== 'object') g[k] = {}; });
      if (!Array.isArray(g.events)) g.events = [];
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
    assignEmblems, emblemInfo, migrate
  };
});
