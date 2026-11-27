// Hesap bağlama: bulut kaydı, yerel kaydın hesaba aktarılması, çıkışta silme.
const test = require('node:test');
const assert = require('node:assert/strict');

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m,
  };
}

const B = require('./load.js');
const Store = B.Store;
const U = B.StoreUtil;

function withEnv(fn) {
  const prevLs = globalThis.localStorage, prevSync = globalThis.BilsemSync;
  const pushes = [];
  globalThis.localStorage = fakeStorage();
  globalThis.BilsemSync = { push: (d) => pushes.push(d) };
  try { fn(globalThis.localStorage, pushes); }
  finally { globalThis.localStorage = prevLs; globalThis.BilsemSync = prevSync; }
}

function progressWith(stars) {
  const d = U.blank();
  d.cats.cubes = { stars: [stars, 0, 0, 0], seen: 3, ok: 2, ms: 0, recent: [1, 0, 1], skill: 1 };
  return JSON.stringify(d);
}

test('hydrate: geçerli kaydı yükler, bozuk kaydı reddeder', () => {
  withEnv(() => {
    assert.equal(Store.hydrate(progressWith(2)), true);
    assert.equal(Store.data.cats.cubes.stars[0], 2);
    assert.equal(Store.hydrate('{bozuk'), false);
    assert.equal(Store.hydrate(JSON.stringify({ v: 9 })), false);
  });
});

test('attach: bulutta kayıt varsa onu kullanır ve buluta geri göndermez', () => {
  withEnv((ls, pushes) => {
    ls.setItem('bilsem.v3', progressWith(1));              // bu cihazdaki eski kayıt
    const src = Store.attach('uid-a', progressWith(3));
    assert.equal(src, 'cloud');
    assert.equal(Store.data.cats.cubes.stars[0], 3);
    assert.equal(ls.getItem('bilsem.owner'), 'uid-a');
    assert.equal(pushes.length, 0);
  });
});

test('attach: bulutta kayıt yok ve cihaz henüz hesapsızsa yerel ilerleme ilk hesaba aktarılır', () => {
  withEnv((ls, pushes) => {
    ls.setItem('bilsem.v3', progressWith(2));
    const src = Store.attach('uid-a', null);
    assert.equal(src, 'adopted');
    assert.equal(Store.data.cats.cubes.stars[0], 2);
    assert.equal(pushes.length, 1, 'aktarılan kayıt buluta gönderilmeli');
  });
});

test('attach: cihaz başka bir hesaba bağlıyken yeni hesap yerel ilerlemeyi almaz', () => {
  withEnv((ls, pushes) => {
    ls.setItem('bilsem.v3', progressWith(2));
    ls.setItem('bilsem.owner', 'uid-eski');
    const src = Store.attach('uid-yeni', null);
    assert.equal(src, 'blank');
    assert.equal(Store.data.cats.cubes, undefined);
    assert.equal(ls.getItem('bilsem.owner'), 'uid-yeni');
    assert.equal(pushes.length, 1);
  });
});

test('attach: eski sürüm (v2) yerel kayıt taşınarak aktarılır', () => {
  withEnv((ls) => {
    const old = { v: 2, settings: {}, cats: { cubes: { stars: [0, 2, 0, 0], seen: 1, ok: 1, ms: 0, recent: [1], skill: 2 } }, days: {}, exams: [], span: {} };
    ls.setItem('bilsem.v2', JSON.stringify(old));
    assert.equal(Store.attach('uid-a', null), 'adopted');
    assert.equal(Store.data.cats.cubes.stars[2], 2, 'eski Orta (2. kademe) yeni Zor (3. kademe) olur');
  });
});

test('detach: çıkışta yerel ilerleme ve hesap bilgisi silinir', () => {
  withEnv((ls) => {
    Store.attach('uid-a', progressWith(3));
    Store.detach();
    assert.equal(ls.getItem('bilsem.v3'), null);
    assert.equal(ls.getItem('bilsem.owner'), null);
    assert.equal(Store.data.cats.cubes, undefined);
  });
});

test('save: her değişiklik yerel kayda yazılır ve buluta gönderilir', () => {
  withEnv((ls, pushes) => {
    Store.attach('uid-a', progressWith(0));
    pushes.length = 0;
    Store.setStars('cubes', 1, 3);
    Store.save();
    assert.equal(pushes.length, 1);
    assert.equal(JSON.parse(ls.getItem('bilsem.v3')).cats.cubes.stars[0], 3);
  });
});

/* ---------- internetsiz çalışma ve iki cihazın birleşmesi ---------- */
function rec(build) { const d = U.blank(); build(d); return d; }

test('attach (internet yok): aynı hesabın bu cihazdaki kaydıyla devam eder, başka hesabınkiyle değil', () => {
  withEnv((ls, pushes) => {
    ls.setItem('bilsem.v3', progressWith(2));
    ls.setItem('bilsem.owner', 'uid-a');
    assert.equal(Store.attach('uid-a', null, true), 'local');
    assert.equal(Store.data.cats.cubes.stars[0], 2);
    assert.equal(pushes.length, 0, 'internet yokken gönderilmeye çalışılmaz');
    assert.equal(Store.attach('uid-b', null, true), 'none');
    assert.equal(ls.getItem('bilsem.owner'), 'uid-a', 'başka hesap cihazı devralmaz');
  });
});

test('attach: aynı hesabın internetsiz yapılmış ilerlemesi buluttakiyle birleşir ve gönderilir', () => {
  withEnv((ls, pushes) => {
    const cloud = rec((d) => { d.cats.cubes = { stars: [3, 0, 0, 0], seen: 10, ok: 8, ms: 0, recent: [1], skill: 1.5 }; d.ts = 100; });
    const local = rec((d) => {
      d.cats.cubes = { stars: [1, 2, 0, 0], seen: 14, ok: 11, ms: 0, recent: [1, 1], skill: 2.1 };
      d.cats.odd = { stars: [2, 0, 0, 0], seen: 5, ok: 4, ms: 0, recent: [1], skill: 1.2 };
      d.ts = 200;
    });
    ls.setItem('bilsem.v3', JSON.stringify(local));
    ls.setItem('bilsem.owner', 'uid-a');
    assert.equal(Store.attach('uid-a', JSON.stringify(cloud)), 'merged');
    assert.deepEqual(Store.data.cats.cubes.stars, [3, 2, 0, 0], 'yıldızların en büyüğü');
    assert.equal(Store.data.cats.cubes.seen, 14, 'daha çok çözülen kayıt');
    assert.equal(Store.data.cats.odd.seen, 5, 'yalnızca bu cihazdaki konu da gelir');
    assert.equal(pushes.length, 1);
  });
});

test('merge: iki cihaz birbirinin ilerlemesini silmez', () => {
  const a = rec((d) => {
    d.cats.cubes = { stars: [3, 1, 0, 0], seen: 20, ok: 15, ms: 0, recent: [1], skill: 2.3 };
    d.days['2026-11-27'] = { n: 10, ok: 8, daily: true, stars: 2 };
    d.exams = [{ date: '2026-11-26', at: 1, n: 20, ok: 15, blank: 1, sec: 600 }];
    d.span.plays = 3; d.span.best[1].both = 5;
    d.settings.sound = false; d.ts = 500;
  });
  const b = rec((d) => {
    d.cats.cubes = { stars: [2, 2, 0, 0], seen: 12, ok: 9, ms: 0, recent: [0], skill: 1.8 };
    d.cats.memory = { stars: [1, 0, 0, 0], seen: 4, ok: 3, ms: 0, recent: [1], skill: 1 };
    d.days['2026-11-27'] = { n: 14, ok: 9, daily: false };
    d.days['2026-11-28'] = { n: 5, ok: 5, daily: false };
    d.exams = [{ date: '2026-11-26', at: 1, n: 20, ok: 15, blank: 1, sec: 600 }, { date: '2026-11-28', at: 9, n: 40, ok: 30, blank: 0, sec: 1500 }];
    d.span.plays = 5; d.span.best[1].both = 4; d.span.best[2].fwd = 6;
    d.settings.sound = true; d.ts = 400;
  });
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = U.merge(U.parse(x), U.parse(y));
    assert.deepEqual(m.cats.cubes.stars, [3, 2, 0, 0]);
    assert.equal(m.cats.cubes.seen, 20);
    assert.equal(m.cats.memory.seen, 4);
    assert.deepEqual(m.days['2026-11-27'], { n: 14, ok: 9, daily: true, stars: 2 });
    assert.equal(m.days['2026-11-28'].n, 5);
    assert.equal(m.exams.length, 2, 'aynı deneme iki kez sayılmaz');
    assert.equal(m.span.plays, 5);
    assert.equal(m.span.best[1].both, 5);
    assert.equal(m.span.best[2].fwd, 6);
    assert.equal(m.settings.sound, false, 'ayarlar son kaydeden cihazdan');
    assert.equal(m.ts, 500);
  }
  const once = U.merge(U.parse(a), U.parse(b));
  assert.deepEqual(U.merge(once, U.parse(b)), once, 'birleşen kayıt yeniden birleşince değişmez');
});

test('merge: ilerleme bir cihazda sıfırlandıysa eski ilerleme geri gelmez', () => {
  withEnv(() => {
    Store.data = U.parse(rec((d) => { d.cats.cubes = { stars: [3, 0, 0, 0], seen: 30, ok: 20, ms: 0, recent: [1], skill: 2 }; d.ts = 10; }));
    const old = JSON.stringify(Store.data);
    Store.reset();
    assert.ok(Store.data.epoch > 0);
    Store.mergeCloud(old);
    assert.equal(Store.data.cats.cubes, undefined);
  });
});

test('mergeCloud: buluttaki ilerleme bu cihazdakine eklenir, bulut boşsa kayıt değişmez', () => {
  withEnv((ls) => {
    Store.data = U.parse(progressWith(1));
    const before = JSON.stringify(Store.data);
    Store.mergeCloud(null);
    assert.equal(JSON.stringify(Store.data), before);
    Store.mergeCloud(progressWith(3));
    assert.equal(Store.data.cats.cubes.stars[0], 3);
    assert.equal(JSON.parse(ls.getItem('bilsem.v3')).cats.cubes.stars[0], 3, 'birleşen kayıt cihaza da yazılır');
  });
});
