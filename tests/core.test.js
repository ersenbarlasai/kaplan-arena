// Kaplan Arena çekirdek mantık testleri — çalıştırma: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../app/core.js');

const team = (name, score) => ({ name, score });
function openGame(now, total) {
  const g = { phase: 'ready', jokers: {}, jdone: {}, jrej: {}, scored: {}, cancelled: {} };
  C.showQuestion(g, total || 45000, now);
  return g;
}

test('puan tablosu: normal, çift cevap, çifte puan, ceza ve sıfır sınırı', () => {
  // dizin: 0 normal doğru, 1 çift cevap doğru, 2 çift cevap yanlış, 3 çifte puan doğru, 4 çifte puan yanlış, 5 jokerli cevapsız (0 puan), 6 jokerli 5 puanlı yanlış, 7 normal yanlış
  const scores = [20, 20, 20, 20, 20, 0, 5, 20];
  const winners = [0, 1, 3];
  const jk = { 1: 'double', 2: 'double', 3: 'x2', 4: 'x2', 5: 'x2', 6: 'double' };
  const d = C.computeDelta(scores, winners, jk);
  assert.deepEqual(d, { 0: 10, 1: 10, 2: -10, 3: 20, 4: -10, 5: 0, 6: -5 });
  assert.equal(d[7], undefined);
});

test('applyScore bir kez uygular; tekrar çağrı puanı çoğaltmaz', () => {
  const g = { scored: {} }, teams = [team('9A', 0), team('9B', 5)];
  assert.equal(C.applyScore(g, teams, 'q1', [0], { 1: 'x2' }), true);
  assert.deepEqual(teams.map(t => t.score), [10, 0]);
  assert.deepEqual(g.scored.q1.delta, { 0: 10, 1: -5 });
  assert.equal(C.applyScore(g, teams, 'q1', [0], { 1: 'x2' }), false);
  assert.deepEqual(teams.map(t => t.score), [10, 0]);
});

test('saat: soru gösterilince tek pencere açılır, sıfırda kilitlenir', () => {
  const g = openGame(1000, 10000);
  assert.equal(g.phase, 'open');
  assert.equal(C.isRunning(g), true);
  assert.equal(C.clockLeft(g.clock, 6000), 5000);
  assert.equal(C.tickClock(g, 9000), null);
  assert.equal(C.tickClock(g, 11001), 'timeup');
  assert.equal(g.phase, 'locked');
  assert.deepEqual(g.win, [[1000, 11000]]);
  assert.equal(C.inWindow(g.win, 11000 + C.GRACE_MS), true);
  assert.equal(C.inWindow(g.win, 11000 + C.GRACE_MS + 1), false);
});

test('hazırlıkta saat çalışmaz ve pencere yoktur', () => {
  const g = { phase: 'ready' };
  C.ensureClock(g, 45000);
  assert.equal(C.maybeStart(g, 1000), false);
  assert.deepEqual(g.win, []);
});

test('duraklatma nedenleri: bir neden kalkınca diğeri sürerse saat başlamaz', () => {
  const g = openGame(0, 30000);
  C.pause(g, 'joker', 5000);
  C.pause(g, 'stage', 5500);
  assert.equal(C.isRunning(g), false);
  assert.equal(g.clock.left, 25000);
  assert.equal(C.unpause(g, 'joker', 8000), false);
  assert.equal(C.isRunning(g), false);
  assert.equal(C.unpause(g, 'stage', 9000), true);
  assert.equal(C.clockLeft(g.clock, 10000), 24000);
  assert.deepEqual(g.win, [[0, 5000], [9000, null]]);
});

test('cevap seçimi: en son geçerli gönderim, pencere dışı ve yetkisiz cihaz sayılmaz', () => {
  const win = [[1000, 5000]];
  const node = {
    a: { v: 'A', t: 1500, dev: 'd1' },
    b: { v: 'C', t: 4000, dev: 'd1' },
    c: { v: 'D', t: 6000, dev: 'd1' },       // süre sonrası
    d: { v: 'B', t: 4500, dev: 'x' }         // başka cihaz
  };
  assert.deepEqual(C.pickAnswer(node, { win, qtype: 'ders', owner: 'd1' }), { v: 'C', t: 4000 });
  // eski biçim tek düğüm
  assert.deepEqual(C.pickAnswer({ v: 'A', t: 2000, dev: 'd1' }, { win, qtype: 'ders', owner: 'd1' }), { v: 'A', t: 2000 });
});

test('çift cevap: iki farklı şık zorunlu; biri doğruysa doğru', () => {
  assert.equal(C.validAnswer('AB', 'ders', 'double'), true);
  assert.equal(C.validAnswer('AA', 'ders', 'double'), false);
  assert.equal(C.validAnswer('A', 'ders', 'double'), false);
  assert.equal(C.validAnswer('AB', 'ders', null), false);
  assert.equal(C.isCorrect('BD', 'D', 'double'), true);
  assert.equal(C.isCorrect('AC', 'D', 'double'), false);
  const win = [[0, 10000]];
  assert.equal(C.pickAnswer({ s: { v: 'B', t: 100, dev: 'd' } }, { win, qtype: 'ders', jk: 'double', owner: 'd' }), null);
});

test('tahmin: en yakın ve eşit uzaklıktakiler kazanır', () => {
  const r = C.closestWinners([100, 140, null, 160], 150);
  assert.deepEqual(r.winners, [1, 3]);
  assert.equal(C.validAnswer(12.5, 'tahmin'), true);
  assert.equal(C.validAnswer('12', 'tahmin'), false);
});

function jctx(g, over) {
  return Object.assign({ qk: 'q1', qtype: 'ders', isTie: false, i: 0, name: '9A', j: 'x2', t: 2000, owner: 'd1', dev: 'd1', node: null }, over);
}

test('joker: uygunluk kuralları', () => {
  const g = openGame(1000, 30000);
  assert.equal(C.checkJoker(g, jctx(g)), '');
  assert.match(C.checkJoker(g, jctx(g, { isTie: true })), /Eşitlik/);
  assert.match(C.checkJoker(g, jctx(g, { j: 'double', qtype: 'tahmin' })), /yalnız şıklı/);
  assert.equal(C.checkJoker(g, jctx(g, { j: 'x2', qtype: 'tahmin' })), '');
  assert.match(C.checkJoker(g, jctx(g, { dev: 'baska' })), /yetkili/);
  assert.match(C.checkJoker(g, jctx(g, { t: 500 })), /süre işlerken/);
  // ilk cevaptan sonra joker yok
  assert.match(C.checkJoker(g, jctx(g, { t: 3000, node: { s: { v: 'A', t: 2500, dev: 'd1' } } })), /Cevap gönderildikten/);
  // cevaptan önce joker geçerli
  assert.equal(C.checkJoker(g, jctx(g, { t: 2000, node: { s: { v: 'A', t: 2500, dev: 'd1' } } })), '');
  // hazırlıkta yok
  const r = { phase: 'ready' }; C.ensureClock(r, 1000);
  assert.match(C.checkJoker(r, jctx(r)), /açık değil/);
});

test('joker: kabul hakkı tüketir; aynı soruda ikinci joker ve yarışma boyunca tekrar reddedilir', () => {
  const g = openGame(1000, 30000);
  const a = C.acceptJoker(g, jctx(g), 2100);
  assert.equal(a.grouped, false);
  assert.equal(g.jokers['9A'].x2, 'q1');
  assert.equal(C.isRunning(g), false);
  assert.deepEqual(g.clock.reasons, ['joker']);
  // tanıtım bitince saat kendiliğinden devam eder (başka neden yok)
  assert.equal(C.endIntro(g, 2100 + C.INTRO_MS - 1), false);
  assert.equal(C.endIntro(g, 2100 + C.INTRO_MS), true);
  assert.equal(C.isRunning(g), true);
  assert.match(C.checkJoker(g, jctx(g, { j: 'double', t: 7000 })), /zaten bir joker/);
  // sonraki soru: aynı joker kullanılmış
  C.showQuestion(g, 30000, 20000);
  assert.match(C.checkJoker(g, jctx(g, { qk: 'q2', t: 21000 })), /daha önce kullanıldı/);
  assert.equal(C.checkJoker(g, jctx(g, { qk: 'q2', j: 'double', t: 21000 })), '');
});

test('joker gruplama: duraklama öncesi gönderilenler aynı tanıtıma eklenir, sonrakiler reddedilir', () => {
  const g = openGame(1000, 30000);
  C.acceptJoker(g, jctx(g, { i: 0, name: '9A', t: 5000 }), 5100);       // duraklama 5100'de
  // 5050'de gönderilmiş, 5400'de ulaşan istek: pencere 5100'de kapandığı için geçerli
  const c2 = jctx(g, { i: 1, name: '9B', dev: 'd2', owner: 'd2', j: 'double', t: 5050 });
  assert.equal(C.checkJoker(g, c2), '');
  const r2 = C.acceptJoker(g, c2, 5400);
  assert.equal(r2.grouped, true);
  assert.equal(g.intro.items.length, 2);
  assert.equal(g.intro.until, 5100 + C.INTRO_MS);       // tanıtım uzamaz
  // duraklama sırasında gönderilen istek reddedilir
  assert.match(C.checkJoker(g, jctx(g, { i: 2, name: '9C', dev: 'd3', owner: 'd3', t: 6000 })), /süre işlerken/);
});

test('başka duraklatma nedeni varken tanıtım bitişi oyunu başlatmaz', () => {
  const g = openGame(0, 30000);
  C.acceptJoker(g, jctx(g, { t: 1000 }), 1000);
  C.pause(g, 'stage', 1500);
  C.pause(g, 'admin', 1500);
  C.endIntro(g, 1000 + C.INTRO_MS);
  assert.equal(C.isRunning(g), false);
  C.unpause(g, 'stage', 9000);
  assert.equal(C.isRunning(g), false);
  C.unpause(g, 'admin', 9500);
  assert.equal(C.isRunning(g), true);
});

test('joker reddi ve tekilleştirme', () => {
  const g = openGame(0, 30000);
  const c = jctx(g, { t: 50000 });
  C.rejectJoker(g, c, 'Joker yalnız süre işlerken kullanılabilir.');
  assert.equal(C.seenJoker(g, 'q1', 0, 50000), true);
  assert.equal(g.jrej[0].why.length > 0, true);
});

test('iptal: gerçek değişim geri alınır, jokerler iade edilir, tekrar iptal etkisizdir', () => {
  const g = openGame(0, 30000), teams = [team('9A', 30), team('9B', 5), team('9C', 0)];
  g.jokers = { '9A': { double: null, x2: 'q1' }, '9B': { double: 'q1', x2: 'q0' }, '9C': { double: null, x2: null } };
  C.reveal(g, 5000);
  C.applyScore(g, teams, 'q1', [0], { 0: 'x2', 1: 'double' });
  assert.deepEqual(teams.map(t => t.score), [50, 0, 0]);
  assert.deepEqual(g.scored.q1.delta, { 0: 20, 1: -5 });
  assert.equal(C.cancelQuestion(g, teams, 'q1', 6000), true);
  assert.deepEqual(teams.map(t => t.score), [30, 5, 0]);      // nominal 10 değil gerçek 5 iade
  assert.equal(g.jokers['9A'].x2, null);
  assert.equal(g.jokers['9B'].double, null);
  assert.equal(g.jokers['9B'].x2, 'q0');                    // önceki soru etkilenmez
  assert.equal(g.phase, 'cancelled');
  assert.equal(C.cancelQuestion(g, teams, 'q1', 7000), false);
  assert.deepEqual(teams.map(t => t.score), [30, 5, 0]);
  assert.equal(C.applyScore(g, teams, 'q1', [0], {}), false);  // iptal edilen soru puanlanmaz
});

test('iptal: puan gösterilmeden önce yalnız joker iadesi', () => {
  const g = openGame(0, 30000), teams = [team('9A', 10)];
  g.jokers = { '9A': { double: 'q1', x2: null } };
  C.cancelQuestion(g, teams, 'q1', 1000);
  assert.equal(teams[0].score, 10);
  assert.equal(g.jokers['9A'].double, null);
});

test('armalar: mevcut eşleşmeler kalıcı, yeni sınıf boş numarayı alır, 12+ sınıf desteklenir', () => {
  const m = C.assignEmblems({}, ['9A', '9B', '9C']);
  assert.deepEqual(m, { '9A': 0, '9B': 1, '9C': 2 });
  C.assignEmblems(m, ['9C', 'Yeni Sınıf', '9A']);
  assert.deepEqual(m, { '9A': 0, '9B': 1, '9C': 2, 'Yeni Sınıf': 3 });
  const many = C.assignEmblems({}, Array.from({ length: 15 }, (_, i) => 'S' + i));
  assert.equal(many.S14, 14);
  assert.deepEqual(C.emblemInfo(14), { file: 'arma-yaprak.svg', variant: 1, key: 'yaprak' });
});

test('göç: eski kayıt korunur, şema 2 alanları eklenir, çalışan saat durdurulur', () => {
  const old = {
    settings: { title: 'Okul Yarışması', seconds: 30, sound: true, classes: ['9A', '9B', '9C', '9D'] },
    questions: { s1: [{ id: 'x', type: 'ders', text: 'Soru', options: ['a', 'b', 'c', 'd'], answer: 'B' }], s2: [], final: [], tie: [] },
    game: { started: true, view: 'question', shown: true, revealed: false, stage: 0, teams: { s1: [{ name: '9A', score: 20 }], s2: [], final: [] } }
  };
  const s = C.migrate(JSON.parse(JSON.stringify(old)), { now: 1000 });
  assert.equal(s.schema, C.SCHEMA);
  assert.equal(s.settings.title, 'Okul Yarışması');
  assert.deepEqual(s.questions, old.questions);
  assert.equal(s.game.teams.s1[0].score, 20);
  assert.equal(s.game.phase, 'open');
  assert.deepEqual(s.game.clock.reasons, ['admin']);
  assert.deepEqual(Object.keys(s.settings.emblems), ['9A', '9B', '9C', '9D']);
  // çalışırken kaydedilmiş saat: yeniden açılışta durur, pencere kapanır
  const run = C.migrate({ settings: { classes: ['9A'] }, game: { view: 'question', phase: 'open', clock: { total: 30000, left: 30000, runAt: 1000, reasons: [], savedAt: 5000 }, win: [[1000, null]] } }, { now: 9000 });
  assert.equal(run.game.clock.left, 26000);
  assert.deepEqual(run.game.win, [[1000, 5000]]);
  assert.deepEqual(run.game.clock.reasons, ['admin']);
  // tekrar göç değiştirmez
  const again = C.migrate(JSON.parse(JSON.stringify(s)), { now: 2000 });
  assert.deepEqual(again.settings.emblems, s.settings.emblems);
});

/* ---------- Üç Kampüs — Ortak Yarışma ---------- */
test('takım listesi: boşluk/satır/virgül temizliği; en az 3 benzersiz ad', () => {
  assert.deepEqual(C.normRoster('Kampüs A\n  Kampüs   B ,Kampüs C\n\n , '), ['Kampüs A', 'Kampüs B', 'Kampüs C']);
  assert.deepEqual(C.normRoster([' Kampüs A ', 'Kampüs B,Kampüs C', null, '']), ['Kampüs A', 'Kampüs B', 'Kampüs C']);
  assert.equal(C.rosterError(['A', 'B', 'C']), '');
  assert.match(C.rosterError(['A', 'B']), /En az 3/);
  assert.match(C.rosterError([]), /En az 3/);
  assert.match(C.rosterError(C.normRoster('Kampüs A\nKampüs B\nkampüs  a')), /iki kez/);
  assert.match(C.rosterError(C.normRoster('İzmir\nizmir\nAnkara')), /iki kez/);
  assert.equal(C.rosterError(C.normRoster(Array.from({ length: 20 }, (_, i) => 'T' + i))), '');   // ilgisiz üst sınır yok
});

test('mod seçimi: 3 takım ortak yarışma, 4+ iki gruplu turnuva; modsuz kayıt turnuvadır', () => {
  assert.equal(C.modeFor(3), 'shared');
  assert.equal(C.modeFor(4), 'tournament');
  assert.equal(C.modeFor(11), 'tournament');
  const old = { teams: { s1: [team('9A', 5)], s2: [team('9B', 0)], final: [] } };
  assert.equal(C.isShared(old), false);
  assert.deepEqual(C.teamsOf(old, 's1').map(t => t.name), ['9A']);
  const sh = { mode: 'shared', teams: { all: [team('A', 0), team('B', 0), team('C', 0)], s1: [], s2: [], final: [] } };
  for (const k of ['s1', 's2', 'final']) assert.equal(C.teamsOf(sh, k), sh.teams.all);   // tek puan kaynağı
});

test('ortak yarışma etap sonucu: ilk iki etapta eleme/eşitlik yok; finalde yalnız lider eşitliği', () => {
  const sc = arr => arr.map((score, i) => ({ i, score }));
  const r1 = C.stageOutcome('shared', sc([20, 20, 20]), 's1');
  assert.equal(r1.tie, null); assert.deepEqual(r1.qualified.sort(), [0, 1, 2]);
  assert.equal(C.stageOutcome('shared', sc([0, 0, 0]), 's2').tie, null);
  const f = C.stageOutcome('shared', sc([30, 30, 20]), 'final');
  assert.deepEqual(f.tie, { candidates: [0, 1], slots: 1 }); assert.deepEqual(f.qualified, []);
  assert.deepEqual(C.stageOutcome('shared', sc([10, 40, 20]), 'final'), { qualified: [1], tie: null });
  assert.deepEqual(C.stageOutcome('shared', sc([40, 20, 20]), 'final'), { qualified: [0], tie: null });   // 2./3. eşitliği şampiyonluk eşitliği değil
  assert.deepEqual(C.stageOutcome('shared', sc([20, 20, 20]), 'final').tie, { candidates: [0, 1, 2], slots: 1 });
  // turnuva davranışı değişmedi: grup etabında ilk 2, finalde 1
  assert.deepEqual(C.stageOutcome('tournament', sc([30, 20, 10, 0]), 's1'), { qualified: [0, 1], tie: null });
  assert.deepEqual(C.stageOutcome('tournament', sc([30, 20, 20, 0]), 's1'), { qualified: [0], tie: { candidates: [1, 2], slots: 1 } });
  assert.deepEqual(C.stageOutcome(undefined, sc([30, 20, 20]), 'final'), { qualified: [0], tie: null });
});

test('ortak yarışma: puanlar üç etap boyunca birikir; jokerler yarışmada birer kez; iptal bir kez geri alır', () => {
  const g = { mode: 'shared', teams: { all: [team('Kampüs A', 0), team('Kampüs B', 0), team('Kampüs C', 0)] }, jokers: {}, jdone: {}, jrej: {}, scored: {}, cancelled: {} };
  const T = k => C.teamsOf(g, k);
  // 1. etap: A Çifte Puan doğru, B doğru → 20/10/0
  C.jokerRec(g, 'Kampüs A').x2 = 's1_0_q1';
  C.applyScore(g, T('s1'), 's1_0_q1', [0, 1], { 0: 'x2' });
  assert.deepEqual(T('s1').map(t => t.score), [20, 10, 0]);
  // 1. etap soru 2: C +10, sonra iptal → bir kez geri
  C.applyScore(g, T('s1'), 's1_1_q2', [2], {});
  C.cancelQuestion(g, T('s1'), 's1_1_q2', 0);
  C.cancelQuestion(g, T('s1'), 's1_1_q2', 0);
  assert.deepEqual(T('s1').map(t => t.score), [20, 10, 0]);
  // 2. etap: A'nın Çifte Puan hakkı geri gelmez
  const g2 = Object.assign(openGame(1000, 30000), { jokers: g.jokers });
  const why = C.checkJoker(g2, { qk: 's2_0_q3', qtype: 'ders', isTie: false, i: 0, name: 'Kampüs A', j: 'x2', t: 2000, owner: null, dev: 'd', node: null });
  assert.match(why, /daha önce kullanıldı/);
  C.applyScore(g, T('s2'), 's2_0_q3', [1, 2], { 2: 'x2' });
  assert.deepEqual(T('s2').map(t => t.score), [20, 20, 20]);
  // final sıfırlanmadan devam eder
  C.applyScore(g, T('final'), 'final_0_q4', [0, 1], {});
  assert.deepEqual(T('final').map(t => t.score), [30, 30, 20]);
  assert.deepEqual(C.stageOutcome('shared', T('final').map((t, i) => ({ i, score: t.score })), 'final').tie, { candidates: [0, 1], slots: 1 });
});

test('göç: ortak listedeki takımların armaları korunur', () => {
  const s = { settings: { classes: ['9A', '9B', '9C', '9D'], emblems: {} }, game: { mode: 'shared', teams: { all: [team('Kampüs A', 0), team('Kampüs B', 0), team('Kampüs C', 0)] } } };
  C.migrate(s, { now: 1 });
  for (const n of ['Kampüs A', 'Kampüs B', 'Kampüs C']) assert.equal(typeof s.settings.emblems[n], 'number');
});

/* ---------- eleme yarışması (format v3) ---------- */
function elimGame(names) {
  const g = { mode: 'elim', format: C.makeFormat(names.length), stage: 0, teams: { all: names.map((n, k) => ({ id: 't' + (k + 1), name: n, score: 0, status: 'active' })) }, rounds: [] };
  C.newRound(g, 0, g.teams.all.map(t => t.id));
  return g;
}
function setScores(g, arr) { C.roundTeams(g, g.stage).forEach((t, i) => { t.score = arr[i]; }); }
function finishAndAdvance(g) {
  const o = C.roundOutcome(g, g.stage);
  assert.equal(o.tie, null, 'eşitlik beklenmiyordu');
  assert.equal(C.commitRound(g, g.stage, o.qualified), true);
  const up = g.rounds[g.stage].done.up;
  if (g.stage < 2) { C.newRound(g, g.stage + 1, up); g.stage++; }
  return { o, up };
}

test('kontenjanlar: 3 → 3 → 2 → 1, 4 → 3 → 2 → 1, kalabalıkta max(3, ⌈n/2⌉)', () => {
  assert.deepEqual(C.quotasFor(3), [3, 2, 1]);
  assert.deepEqual(C.quotasFor(4), [3, 2, 1]);
  assert.deepEqual(C.quotasFor(5), [3, 2, 1]);
  assert.deepEqual(C.quotasFor(7), [4, 2, 1]);
  assert.deepEqual(C.quotasFor(11), [6, 2, 1]);
  assert.equal(C.quotasFor(2), null);
});

test('dört takım: 4 aynı turda → 3 → 2 → tek şampiyon; elenen üst turlarda yok, puanlar birikir', () => {
  const g = elimGame(['A', 'B', 'C', 'D']);
  assert.equal(C.teamsOf(g, 's1').length, 4);
  setScores(g, [40, 30, 20, 10]);
  let r = finishAndAdvance(g);
  assert.deepEqual(r.up, ['t1', 't2', 't3']);
  assert.equal(C.teamById(g, 't4').status, 'out');
  assert.deepEqual(C.teamsOf(g, 's2').map(t => t.id), ['t1', 't2', 't3']);
  C.snapRound(g, 1);
  // Kale: toplamlar sıfırlanmaz; tur kazananı net kazançla (C +40), yükselme toplamla (A 50, C 60)
  setScores(g, [50, 35, 60]);
  r = finishAndAdvance(g);
  assert.deepEqual(r.o.winners, [2]);
  assert.deepEqual([...r.up].sort(), ['t1', 't3']);
  assert.ok(!C.teamsOf(g, 'final').some(t => t.id === 't4' || t.id === 't2'));
  C.snapRound(g, 2);
  const fin = C.roundTeams(g, 2).map(t => t.id);   // yükselme sırası: C (60), A (50)
  assert.deepEqual(fin, ['t3', 't1']);
  setScores(g, [65, 70]);
  r = finishAndAdvance(g);
  assert.deepEqual(r.up, ['t1'], 'şampiyon final sonu toplam puanla');
  assert.equal(g.rounds[1].done.out.length, 1, 'üçüncü yalnız Kale elenmesinden bulunur');
});

test('üç takım: Orman elemesiz (3 → 3) ama tur kazananı açıklanır; Kale sonrası 2 finalist', () => {
  const g = elimGame(['A', 'B', 'C']);
  setScores(g, [10, 30, 20]);
  let r = finishAndAdvance(g);
  assert.equal(r.o.all, true);
  assert.deepEqual(r.o.winners, [1]);
  assert.equal(r.up.length, 3);
  assert.ok(g.teams.all.every(t => t.status === 'active'));
  C.snapRound(g, 1);
  setScores(g, [40, 30, 30]);
  const o = C.roundOutcome(g, 1);
  assert.deepEqual(o.qualified, [0]);
  assert.deepEqual(o.tie, { candidates: [1, 2], slots: 1 }, 'sınır eşitliğinde eleme kesinleşmez');
  assert.equal(g.rounds[1].done, null);
});

test('kalabalık başlangıç (7 takım): 7 → 4 → 2 → 1; sınır eşitliği yalnız sınırdaki takımlarla', () => {
  const g = elimGame(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  setScores(g, [70, 60, 50, 40, 40, 20, 10]);
  const o = C.roundOutcome(g, 0);
  assert.deepEqual(o.qualified, [0, 1, 2]);
  assert.deepEqual(o.tie, { candidates: [3, 4], slots: 1 });
  // eşitlik çözüldü: D yükselir
  assert.equal(C.commitRound(g, 0, [0, 1, 2, 3]), true);
  assert.equal(C.commitRound(g, 0, [0, 1, 2, 4]), false, 'ikinci kesinleştirme etkisiz (idempotent)');
  assert.deepEqual(g.rounds[0].done.up, ['t1', 't2', 't3', 't4']);
  assert.equal(g.teams.all.filter(t => t.status === 'out').length, 3);
  assert.equal(g.elimLog.length, 3);
});

test('tur kazananı eşitse ortak kazananlar; kümülatif eleme kuralı değişmez', () => {
  const g = elimGame(['A', 'B', 'C', 'D']);
  g.teams.all.forEach((t, i) => { t.score = [0, 0, 0, 0][i]; });
  setScores(g, [30, 30, 10, 0]);
  const o = C.roundOutcome(g, 0);
  assert.deepEqual(o.winners, [0, 1]);
  assert.deepEqual(o.qualified, [0, 1, 2]);
});

test('soru planı: Fisher–Yates (enjekte rastgelelik), bankalar arası ve farklı id\'li aynı içerik tekrarlanmaz', () => {
  const D = (id, t, o) => ({ id, type: 'ders', subject: 'Türkçe', text: t, options: o, answer: 'A' });
  const T = (id, t, a) => ({ id, type: 'tahmin', text: t, answer: a, unit: '' });
  const qs = {
    s1: [D('a', 'İki artı iki kaç?', ['4', '5', '6', '7']), T('b', 'Kızılırmak kaç km?', 1355), D('c', 'Başkent?', ['Ankara', 'İzmir', 'Bursa', 'Van'])],
    s2: [D('x', '  iki ARTI iki kaç ', ['7', '6', '5', '4']), T('y', 'Everest kaç m?', 8849)],
    final: [T('z', 'kızılırmak  kaç KM', 1355), T('w', 'Türkiye kaç il?', 81)],
    tie: [T('t1', 'Everest kaç m?', 8849), T('t2', 'Boğaz kaç km?', 31)]
  };
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const a = C.buildPlan(qs, rnd);
  seed = 7; const b = C.buildPlan(qs, rnd);
  assert.deepEqual(a.plan.s1.map(q => q.id), b.plan.s1.map(q => q.id), 'aynı tohum → aynı sıra (testte enjekte)');
  assert.equal(a.dups, 3);
  const all = ['s1', 's2', 'final', 'tie'].flatMap(k => a.plan[k].map(q => q.cid));
  assert.equal(new Set(all).size, all.length, 'yarışma çapında benzersiz');
  assert.equal(a.plan.s2.length + a.plan.final.length + a.plan.tie.length, 3);
  // karıştırma gerçekten sıra değiştirir (çok sayıda örnekte hem ilk hem son konum değişir)
  const firsts = new Set(); for (let k = 0; k < 40; k++) firsts.add(C.shuffle([1, 2, 3, 4, 5], Math.random)[0]);
  assert.ok(firsts.size >= 3);
});

test('sorulan soru kalıcı tüketilir; planAppend sorulmuş/plandaki içeriği eklemez; nextUnasked atlar', () => {
  const T = (id, t) => ({ id, type: 'tahmin', text: t, answer: 1, unit: '' });
  const g = { plan: C.buildPlan({ s1: [T('a', 'Bir'), T('b', 'İki')], s2: [], final: [], tie: [T('c', 'Üç')] }, () => 0).plan, asked: {} };
  const q0 = g.plan.s1[0];
  assert.equal(C.markAsked(g, q0, { at: 1 }), true);
  assert.equal(C.markAsked(g, q0, { at: 2 }), false);
  assert.equal(C.nextUnasked(g, 's1', 0), 1);
  assert.equal(C.markAsked(g, g.plan.s1[1]), true);
  assert.equal(C.nextUnasked(g, 's1', 0), -1, 'tükenen havuz eski soruları döndürmez');
  assert.equal(C.planAppend(g, 'tie', [T('n1', '  bir '), T('n2', 'Üç'), T('n3', 'Dört')], () => 0), 1, 'yalnız yeni benzersiz soru eklenir');
  assert.equal(g.plan.tie[g.plan.tie.length - 1].text, 'Dört');
});

test('göç: şema 3; eski turnuva/ortak kayıt dönüştürülmez, puan silinmez', () => {
  const s = { settings: { classes: ['A', 'B', 'C', 'D'] }, game: { started: true, mode: 'shared', stage: 1, view: 'teams', teams: { all: [{ name: 'A', score: 30 }] } } };
  C.migrate(s);
  assert.equal(s.schema, 3);
  assert.equal(s.game.mode, 'shared');
  assert.equal(s.game.teams.all[0].score, 30);
  assert.equal(s.game.plan, undefined);
});
