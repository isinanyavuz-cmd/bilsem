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

/* Ek basit tahmin yolları (Q.ranks ile: ızgara anahtarlarında satır satır karşılaştırma):
   "en çok öğesi olan", "en az öğesi olan", "ötekilerin hepsini kapsayan" şık (delik/kare kümeleri) ve
   aynı düzeyde doğru cevabın hep aynı şık olması (örn. her soruda aynı görünüş). */
const LIMIT2 = 0.45, TOP = 0.4;
// Ölçü testin içinde: üreticideki Q.ranks'e güvenmez (aynı tanım, bağımsız kopya).
function ranks(keys, ai) {
  const asSet = keys.some((k) => k.includes(';'));
  const P = keys.map((k) => (asSet ? { set: k.slice(1).split(';').filter(Boolean) } : { pos: k.includes('|') ? k.split('|') : k.includes('+') ? k.split('+') : k.includes('/') ? k.split('/') : Array.from(k) }));
  const d = (a, b) => {
    let n = 0;
    if (a.set) { a.set.forEach((t) => { if (!b.set.includes(t)) n++; }); b.set.forEach((t) => { if (!a.set.includes(t)) n++; }); return n; }
    for (let i = 0; i < Math.max(a.pos.length, b.pos.length); i++) if (a.pos[i] !== b.pos[i]) n++;
    return n;
  };
  const sums = P.map((a, i) => P.reduce((s, b, j) => s + (i === j ? 0 : d(a, b)), 0));
  return { center: sums.filter((v) => v < sums[ai]).length, sup: asSet && P.every((p, j) => j === ai || p.set.every((t) => P[ai].set.includes(t))) };
}
function simple(id, level) {
  const rng = new B.RNG(4242 + level);
  const freq = {};
  let used = 0, cen = 0, big = 0, small = 0, sup = 0;
  for (let i = 0; i < N; i++) {
    const q = B.generate(id, level, rng);
    if (q.options.every((o) => o.value != null)) return null;
    used++;
    const keys = q.options.map((o) => o.key);
    freq[keys[q.answer]] = (freq[keys[q.answer]] || 0) + 1;
    const cr = keys.map((_, x) => ranks(keys, x).center);
    if (cr[q.answer] === 0 && cr.filter((v) => v === 0).length === 1) cen++;
    if (keys.some((k) => k.includes(';'))) {
      const sets = keys.map((k) => k.slice(1).split(';').filter(Boolean)), L = sets.map((x) => x.length), a = L[q.answer];
      if (a === Math.max(...L) && L.filter((v) => v === a).length === 1) big++;
      if (a === Math.min(...L) && L.filter((v) => v === a).length === 1) small++;
      if (ranks(keys, q.answer).sup) sup++;
    }
  }
  return { cen: cen / used, big: big / used, small: small / used, sup: sup / used, top: Math.max(...Object.values(freq)) / used };
}

for (const c of B.CATS) {
  test('şık sızıntısı (ek yollar): ' + c.id, { skip: EXEMPT[c.id] ? 'ölçü uygulanmaz: ' + EXEMPT[c.id] : false }, () => {
    for (const lv of B.LEVELS) {
      const r = simple(c.id, lv);
      if (!r) continue;
      const where = c.id + ' s' + lv + ': ';
      assert.ok(r.cen < LIMIT2, where + 'doğru cevap çok sık en merkezdeki şık (satır ölçüsü): %' + Math.round(r.cen * 100));
      assert.ok(r.big < LIMIT2, where + 'doğru cevap çok sık en çok öğesi olan şık: %' + Math.round(r.big * 100));
      assert.ok(r.small < LIMIT2, where + 'doğru cevap çok sık en az öğesi olan şık: %' + Math.round(r.small * 100));
      assert.ok(r.sup < LIMIT2, where + 'doğru cevap çok sık ötekilerin hepsini kapsayan şık: %' + Math.round(r.sup * 100));
      assert.ok(r.top < TOP, where + 'aynı doğru cevap soruların %' + Math.round(r.top * 100) + "'inde çıkıyor");
    }
  });
}

/* Birleşik ölçü: şıkların birbirine göre özelliklerinden (her konumda kaç şıkla aynı değer, merkezlik sırası,
   öğe sayısı sırası, kapsama) öğrenen basit bir sayım sınıflandırıcısı. Soruların yarısıyla eğitilir, öbür yarısında
   doğru şıkkı soruya bakmadan tahmin eder. Şans %25; sınır %60 (tek tek yolların hiçbiri %45'i geçmez). */
const LEARN_N = 800, LEARN_LIMIT = 0.6;
function relFeats(keys) {
  const asSet = keys.some((k) => k.includes(';'));
  const P = keys.map((k) => (asSet ? { set: k.slice(1).split(';').filter(Boolean) } : { pos: k.includes('|') ? k.split('|') : k.includes('+') ? k.split('+') : k.includes('/') ? k.split('/') : Array.from(k) }));
  const R = keys.map((_, i) => ranks(keys, i));
  const rank = (arr, i) => arr.filter((v) => v > arr[i]).length + (arr.filter((v) => v === arr[i]).length > 1 ? 't' : '');
  return P.map((p, i) => {
    const f = ['c' + R[i].center + (R.filter((r) => r.center === R[i].center).length > 1 ? 't' : '')];
    if (asSet) {
      f.push('n' + rank(P.map((x) => x.set.length), i), 'sup' + R[i].sup);
      f.push('sub' + P.filter((x, j) => j !== i && x.set.every((t) => p.set.includes(t))).length);
      p.set.forEach((t) => f.push('sf' + P.filter((x) => x.set.includes(t)).length));
    } else p.pos.forEach((v, k) => f.push('pf' + k + '=' + P.filter((x) => x.pos[k] === v).length));
    return Array.from(new Set(f));
  });
}
function learned(id, level) {
  const rng = new B.RNG(777 + level * 13);
  const data = [];
  for (let i = 0; i < LEARN_N; i++) {
    const q = B.generate(id, level, rng);
    if (q.options.every((o) => o.value != null)) return null;
    data.push({ F: relFeats(q.options.map((o) => o.key)), a: q.answer });
  }
  const half = LEARN_N / 2, cnt = {};
  data.slice(0, half).forEach((d) => d.F.forEach((fs, j) => fs.forEach((f) => { const c = cnt[f] || (cnt[f] = [1, 4]); c[0] += j === d.a ? 1 : 0; c[1]++; })));
  const w = (f) => { const c = cnt[f]; if (!c) return 0; const p = c[0] / c[1]; return Math.log(p / (1 - p)); };
  let hit = 0;
  data.slice(half).forEach((d) => {
    const sc = d.F.map((fs) => fs.reduce((x, f) => x + w(f), 0)), m = Math.max(...sc), best = sc.map((v, j) => (v === m ? j : -1)).filter((j) => j >= 0);
    if (best.includes(d.a)) hit += 1 / best.length;
  });
  return hit / half;
}

for (const c of B.CATS) {
  test('şık sızıntısı (birleşik ölçü): ' + c.id, { skip: EXEMPT[c.id] ? 'ölçü uygulanmaz: ' + EXEMPT[c.id] : false }, () => {
    for (const lv of B.LEVELS) {
      const acc = learned(c.id, lv);
      if (acc == null) continue;
      assert.ok(acc < LEARN_LIMIT, c.id + ' s' + lv + ': şıklardan öğrenen tahminci %' + Math.round(acc * 100) + ' isabet ediyor');
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

test('simetri: doğru şık tek simetrik şık değil (verilen yarıyla karşılaştırmak gerekir)', () => {
  for (const lv of [1, 2, 3]) for (let seed = 1; seed <= 150; seed++) {
    const q = B.generate('sym', lv, new B.RNG(seed)), { N, kind } = q.meta;
    const symmetric = q.options.filter((o) => {
      const m = o.key.slice(1).split('/').map((r) => Array.from(r));
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const t = kind === 'V' ? [r, N - 1 - c] : kind === 'H' ? [N - 1 - r, c] : [c, r];
        if (m[r][c] !== m[t[0]][t[1]]) return false;
      }
      return true;
    });
    assert.ok(symmetric.length >= 3, 'düzey ' + lv + ' tohum ' + seed + ': yalnız ' + symmetric.length + ' simetrik şık');
  }
});
