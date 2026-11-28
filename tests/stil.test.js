/* Görsel standart tek yerde durur: js/shapes.js (STIL, COLORS ve çizim yardımcıları).
   Bu test, üreteçlerin ve tür simgelerinin kendi rengini ya da kendi kutusunu çizmesini engeller. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const B = require('./load.js');

const JS = path.join(__dirname, '..', 'js');
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const read = (f) => fs.readFileSync(path.join(JS, f), 'utf8');
const gens = fs.readdirSync(JS).filter((f) => /^gen-.*\.js$/.test(f));

test('üreteç dosyalarında elle yazılmış renk kodu yok', () => {
  assert.ok(gens.length >= 9, 'üreteç dosyaları bulunamadı');
  for (const f of gens) {
    const hits = read(f).match(HEX) || [];
    assert.deepStrictEqual(hits, [], f + ': renkler Bilsem.Shapes içinden alınmalı (S.STIL, S.COLORS, S.tone)');
  }
});

test('tür simgeleri de renklerini ortak kütüphaneden alır', () => {
  const src = read('app.js');
  const a = src.indexOf('const ICONS = {'), b = src.indexOf('const icon = (id)');
  assert.ok(a > 0 && b > a, 'ICONS bölümü bulunamadı');
  assert.deepStrictEqual(src.slice(a, b).match(HEX) || [], []);
});

test('renk paleti eksiksiz: her rengin dolgusu, koyu kenarı ve açık tonu var', () => {
  const S = B.Shapes;
  assert.strictEqual(S.COLOR_IDS.length, 6);
  for (const id of S.COLOR_IDS) {
    const c = S.COLORS[id];
    for (const k of ['fill', 'edge', 'tint']) assert.match(c[k], /^#[0-9a-f]{6}$/, id + '.' + k);
    assert.ok(c.name, id + ' adı');
    assert.strictEqual(new Set([c.fill, c.edge, c.tint]).size, 3, id);
  }
  // şıklar renk adıyla da sorulduğu için dolgular birbirinden farklı olmalı
  assert.strictEqual(new Set(S.COLOR_IDS.map((id) => S.COLORS[id].fill)).size, 6);
});

test('çizimler ortak kil dilini kullanır ve eski lacivert çerçeve geri gelmez', () => {
  const OLD = ['#1d2b4a', '#c5d3ea', '#e9f0fb', '#566889', '#5a6b8c'];
  for (const c of B.CATS) {
    for (const lv of B.LEVELS) {
      for (let seed = 1; seed <= 12; seed++) {
        const q = B.generate(c.id, lv, new B.RNG(seed));
        const all = (q.stem || '') + (q.memo ? q.memo.html : '') + q.options.map((o) => o.html).join('');
        for (const h of OLD) assert.ok(all.indexOf(h) < 0, c.id + ' s' + lv + ' #' + seed + ' eski renk ' + h);
      }
    }
  }
  // kil parçası: dudak + gövde + parlaklık
  const fig = B.Shapes.figSvg({ shape: 'circle', color: 'red' });
  assert.ok(fig.includes('bz-lip') && fig.includes('bz-gloss') && fig.includes(B.Shapes.COLORS.red.edge));
});

test('şık çizimleri doğru cevabı işaretlemez: aynı türde şıkların çizim iskeleti aynı', () => {
  // renk ve konum dışındaki sınıf adları şıklar arasında değişmemeli
  const skeleton = (html) => (html.match(/class="[^"]*"/g) || []).filter((x) => /bz-(tone|back|q|glass|paper|board)/.test(x)).sort().join('|');
  for (const id of ['matrix', 'pattern', 'analogy', 'mirror', 'rotate', 'fold', 'net', 'overlay', 'sym', 'fillgap']) {
    for (const lv of B.LEVELS) {
      for (let seed = 1; seed <= 40; seed++) {
        const q = B.generate(id, lv, new B.RNG(seed));
        const sk = q.options.map((o) => skeleton(o.html));
        assert.strictEqual(new Set(sk).size, 1, id + ' s' + lv + ' #' + seed);
      }
    }
  }
});
