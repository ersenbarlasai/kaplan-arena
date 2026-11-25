// Kaplan Arena çekirdek mantık testleri — çalıştırma: node --test tests/
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
  assert.equal(s.schema, 2);
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
