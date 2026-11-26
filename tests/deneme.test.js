const test = require('node:test');
const assert = require('node:assert');
const B = require('./load.js');
const E = B.Exam;

const coreIds = B.CATS.filter((c) => c.core).map((c) => c.id);
const count = (arr) => arr.reduce((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {});

test('asıl konular: tam 18 tane ve istenen liste', () => {
  assert.deepStrictEqual(coreIds.slice().sort(), 'pattern matrix analogy odd fillgap rotate mirror sym cubes roll view fold shadow code cipher equiv numseq memory'.split(' ').sort());
  assert.strictEqual(B.CATS.length, 28);
});

test('deneme kademeleri sıraya göre: %20 Kolay, %40 Orta, %40 Zor; En Zor yok', () => {
  [[20, [4, 8, 8]], [40, [8, 16, 16]], [60, [12, 24, 24]]].forEach(([n, want]) => {
    const lv = Array.from({ length: n }, (_, k) => E.examLevel(k, n));
    assert.ok(!lv.includes(4));
    assert.deepStrictEqual([1, 2, 3].map((l) => lv.filter((x) => x === l).length), want);
    assert.deepStrictEqual(lv.slice().sort(), lv, 'kolaydan zora sıralı');
  });
});

test('deneme konuları: ardışık tekrar yok, 20 soruda her asıl konu var', () => {
  for (let seed = 1; seed <= 300; seed++) {
    [20, 40, 60].forEach((n) => {
      const seq = E.examCats(new B.RNG(seed), n);
      assert.strictEqual(seq.length, n);
      for (let i = 1; i < n; i++) assert.notStrictEqual(seq[i], seq[i - 1]);
      const c = count(seq);
      coreIds.forEach((id) => assert.ok(c[id] >= 1, id + ' eksik (n=' + n + ')'));
      seq.forEach((id) => assert.ok(B.catById(id)));
    });
  }
});

test('deneme konuları: asıl konu başına sıklık diğerlerinin yaklaşık iki katı', () => {
  // 40 ve 60 soruda: beklenen toplam asıl pay = 36/46 (asıl ağırlık 2, diğer 1)
  [40, 60].forEach((n) => {
    let core = 0, all = 0;
    for (let seed = 1; seed <= 400; seed++) E.examCats(new B.RNG(seed), n).forEach((id) => { all++; if (coreIds.includes(id)) core++; });
    const share = core / all, want = 36 / 46;
    assert.ok(Math.abs(share - want) < 0.05, 'n=' + n + ' pay ' + share.toFixed(3) + ' beklenen ' + want.toFixed(3));
  });
  // 20 soruda 18 asıl konunun tamamı zorunlu olduğundan pay en az 0.9
  let core = 0, all = 0;
  for (let seed = 1; seed <= 200; seed++) E.examCats(new B.RNG(seed), 20).forEach((id) => { all++; if (coreIds.includes(id)) core++; });
  assert.ok(core / all >= 0.9);
});

test('günün görevi: asıl konuların ağırlığı iki katı', () => {
  const S = B.Store;
  S.data = B.StoreUtil.blank();
  let core = 0, all = 0;
  for (let seed = 1; seed <= 3000; seed++) {
    const plan = S.dailyPlan(new B.RNG(seed), 1);   // ilk çekiliş ağırlıkla orantılı
    all++; if (B.catById(plan[0].type).core) core++;
  }
  const share = core / all, want = 36 / 46;   // boş kayıtta tüm ağırlıklar eşit
  assert.ok(Math.abs(share - want) < 0.03, 'pay ' + share.toFixed(3) + ' beklenen ' + want.toFixed(3));
  assert.strictEqual(S.dailyPlan(new B.RNG(5), 10).length, 10);
});

test('görsel hafıza: resim her kademede 6 saniye görünür', () => {
  [1, 2, 3, 4].forEach((lv) => {
    for (let s = 1; s <= 20; s++) assert.strictEqual(B.generate('memory', lv, new B.RNG(s)).memo.seconds, 6);
  });
});
