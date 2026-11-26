const test = require('node:test');
const assert = require('node:assert');
const B = require('./load.js');

const S = B.Store, U = B.StoreUtil;
const fresh = (grade) => { S.data = U.blank(); S.data.settings.grade = grade; return S; };

test('sınıflar: 2. sınıf ilk 20 türü, 3. sınıf hepsini görür', () => {
  assert.strictEqual(B.G3_ONLY.length, 18);
  for (const id of B.G3_ONLY) assert.ok(B.catById(id), id + ' tanımlı olmalı');
  assert.strictEqual(new Set(B.G3_ONLY).size, 18);
  assert.strictEqual(B.catsFor(2).length, B.CATS.length - 18);
  assert.strictEqual(B.catsFor(3).length, B.CATS.length);
  for (const c of B.catsFor(2)) assert.ok(!B.G3_ONLY.includes(c.id));
  for (const a of B.AREAS) assert.ok(B.catsFor(2).some((c) => c.area === a.id), '2. sınıfta ' + a.id + ' alanı boş kalmamalı');
});

test('yeni kayıt 2. sınıftır; geçersiz sınıf 2. sınıfa döner; 3. sınıf korunur', () => {
  assert.strictEqual(U.blank().settings.grade, 2);
  assert.strictEqual(fresh(2).grade(), 2);
  for (const bad of [undefined, 0, 4, '3', null]) { S.data = U.blank(); S.hydrate(JSON.stringify(Object.assign(U.blank(), { settings: Object.assign(U.blank().settings, { grade: bad }) }))); assert.strictEqual(S.grade(), 2, String(bad)); }
  S.data = U.blank(); S.hydrate(JSON.stringify(Object.assign(U.blank(), { settings: Object.assign(U.blank().settings, { grade: 3 }) })));
  assert.strictEqual(S.grade(), 3);
  // sınıf alanı olmayan eski kayıt
  const old = U.blank(); delete old.settings.grade;
  S.hydrate(JSON.stringify(old));
  assert.strictEqual(S.grade(), 2);
});

test('günün görevi: 2. sınıfta yeni türler gelmez, 3. sınıfta gelir; eski türler 3. sınıfta Orta kademeden başlar', () => {
  const g3 = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    fresh(2);
    for (const sp of S.dailyPlan(new B.RNG(seed), 10)) assert.ok(!B.G3_ONLY.includes(sp.type), sp.type);
    fresh(3);
    for (const sp of S.dailyPlan(new B.RNG(seed), 10)) {
      g3.add(sp.type);
      if (!B.G3_ONLY.includes(sp.type)) assert.ok(sp.level >= 2, 'eski tür 3. sınıfta en az Orta: ' + sp.type);
    }
  }
  for (const id of B.G3_ONLY) assert.ok(g3.has(id), id + ' 3. sınıfta görevlere girmeli');
});

test('çalışma kademesi: 3. sınıfta eski türler en az Orta, yeni türler Kolay\'dan başlar', () => {
  fresh(3);
  assert.strictEqual(S.workLevel('pattern'), 2);
  assert.strictEqual(S.workLevel('maze'), 1);
  fresh(2);
  assert.strictEqual(S.workLevel('pattern'), 1);
  // başarılı çalışma yine yukarı çıkarır
  fresh(3);
  S.cat('pattern').skill = 3.4;
  assert.strictEqual(S.workLevel('pattern'), 3);
});

test('2. ve 3. sınıf aynı türün ilerlemesini paylaşır', () => {
  fresh(2);
  S.recordAnswer('pattern', 2, true, 1000);
  const seen = S.cat('pattern').seen;
  S.data.settings.grade = 3;
  assert.strictEqual(S.cat('pattern').seen, seen);
});
