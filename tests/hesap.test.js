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
