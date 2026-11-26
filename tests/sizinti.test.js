/* Şık sızıntısı: doğru cevap, şıkların biçimine bakarak (soruya bakmadan) bulunabilmemeli.
   Ölçü: her şık çiftinin anahtarları arasında bir uzaklık hesaplanır. Doğru şık, diğer üçüne toplamda en yakın
   tek şıksa "tek merkez", en uzak tek şıksa "tek uç" sayılır. Şansa düşen oran %25'tir; sınır %50. */
const test = require('node:test');
const assert = require('node:assert');
const B = require('./load.js');

const N = 300;               // kategori ve düzey başına soru
const LIMIT = 0.5;
// Bu kategoride şıkların birbirine benzerliği ölçülmez: doğru cevap farklı olandır, yani tanımı gereği
// uçtaki şıktır; döndürülmüş benzerlerin yanındaki "yakın yanlış" ise merkeze düşer. Cevabı soru belirler.
const EXEMPT = { odd: 'doğru cevap tanımı gereği diğerlerinden farklı olan şıktır' };

function dist(a, b) {
  const cells = (s, sep) => s.split(sep);
  const byPos = (x, y) => { let d = 0; for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) d++; return d; };
  if (a.includes('|')) return byPos(cells(a, '|'), cells(b, '|'));
  if (a.includes(';')) {
    const x = new Set(a.slice(1).split(';')), y = new Set(b.slice(1).split(';'));
    let d = 0;
    x.forEach((t) => { if (!y.has(t)) d++; });
    y.forEach((t) => { if (!x.has(t)) d++; });
    return d;
  }
  if (a.includes('/')) return byPos(a.replace(/^[a-z]+/, ''), b.replace(/^[a-z]+/, ''));
  if (a.includes('+')) return byPos(cells(a, '+'), cells(b, '+'));
  return byPos(a, b);
}

function rates(id, level) {
  const rng = new B.RNG(20260 + level * 7919);
  let central = 0, outlier = 0, used = 0;
  for (let i = 0; i < N; i++) {
    const q = B.generate(id, level, rng);
    if (q.options.every((o) => o.value != null)) return null;          // sayısal şıklar: sıralı ve ölçülmez
    const keys = q.options.map((o) => o.key);
    const sums = keys.map((k, x) => keys.reduce((s, k2, y) => s + (x === y ? 0 : dist(k, k2)), 0));
    const lo = Math.min(...sums), hi = Math.max(...sums);
    used++;
    if (sums[q.answer] === lo && sums.filter((v) => v === lo).length === 1) central++;
    if (lo !== hi && sums[q.answer] === hi && sums.filter((v) => v === hi).length === 1) outlier++;
  }
  return { central: central / used, outlier: outlier / used };
}

for (const c of B.CATS) {
  test('şık sızıntısı: ' + c.id, { skip: EXEMPT[c.id] ? 'ölçü uygulanmaz: ' + EXEMPT[c.id] : false }, () => {
    for (const lv of B.LEVELS) {
      const r = rates(c.id, lv);
      if (!r) continue;
      const where = c.id + ' s' + lv;
      assert.ok(r.central < LIMIT, where + ' doğru cevap çok sık tek merkez: %' + Math.round(r.central * 100));
      assert.ok(r.outlier < LIMIT, where + ' doğru cevap çok sık tek uç: %' + Math.round(r.outlier * 100));
    }
  });
}

test('katla ve deş: istem doğru çekimlenir', () => {
  for (const lv of B.LEVELS) for (let seed = 1; seed <= 40; seed++) {
    const q = B.generate('fold', lv, new B.RNG(seed));
    assert.ok(!/çizgidenler/.test(q.prompt), q.prompt);
    assert.ok(lv >= 3 ? q.prompt.includes('çizgilerden sırayla') : /çizgiden katlan/.test(q.prompt), 'düzey ' + lv + ': ' + q.prompt);
  }
});

test('mini sudoku: boş satır cümlesi düzgün', () => {
  for (const lv of B.LEVELS) for (let seed = 1; seed <= 150; seed++) {
    const q = B.generate('sudoku', lv, new B.RNG(seed));
    assert.ok(!/hiçbir renk var/.test(q.explain), q.explain);
  }
});

test('farklı olan: 3. düzeyde tek-çift sayı türü yok', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const q = B.generate('odd', 3, new B.RNG(seed));
    assert.ok(!/tek sayıda şekil|çift sayıda şekil/.test(q.explain), q.explain);
  }
});
