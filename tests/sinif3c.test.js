const test = require('node:test');
const assert = require('node:assert');
const B = require('./load.js');

const G = B.Shapes.Grid;
const gen = (id, lv, seed) => B.generate(id, lv, new B.RNG(seed));
const forEach = (id, fn, runs) => { for (const lv of B.LEVELS) for (let seed = 1; seed <= (runs || 200); seed++) fn(gen(id, lv, seed), lv, seed); };
const value = (q) => q.options[q.answer].value;

test('kapılardan geçiş: yollar tek tek dolaşılarak sayılır', () => {
  forEach('maze', (q) => {
    const m = q.meta, last = m.sizes.length - 1;
    let n = 0;
    const walk = (layer, room) => {
      if (layer === last) { n++; return; }
      for (const e of m.edges[layer]) if (e[0] === room) walk(layer + 1, e[1]);
    };
    walk(0, 0);
    assert.strictEqual(value(q), n);
    assert.strictEqual(m.answer, n);
    for (let l = 0; l < last; l++) {                    // her odadan çıkış, her odaya giriş var
      for (let a = 0; a < m.sizes[l]; a++) assert.ok(m.edges[l].some((e) => e[0] === a));
      for (let b = 0; b < m.sizes[l + 1]; b++) assert.ok(m.edges[l].some((e) => e[1] === b));
    }
  });
});

test('ocak planı: yemeklerin tüm sıralamaları denenir, en kısa süre bulunur', () => {
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map((p) => [x].concat(p))));
  forEach('cook', (q) => {
    const d = q.meta.d;
    let best = Infinity;
    for (const p of perms(d)) {                         // her yemek, ilk boşalan ocağa konur
      const st = [0, 0];
      p.forEach((x) => { st[st[0] <= st[1] ? 0 : 1] += x; });
      best = Math.min(best, Math.max(st[0], st[1]));
    }
    assert.strictEqual(value(q), best);
    assert.strictEqual(new Set(d).size, d.length);
  }, 60);
});

test('çubukla kare: doğru takım kare yapar, öbürleri yapamaz (alt küme taramasıyla)', () => {
  const can = (sticks) => {
    const total = sticks.reduce((a, b) => a + b, 0);
    if (total % 4) return false;
    const side = total / 4, n = sticks.length, full = (1 << n) - 1;
    const ok = [];
    for (let m = 1; m <= full; m++) { let s = 0; for (let i = 0; i < n; i++) if (m & (1 << i)) s += sticks[i]; if (s === side) ok.push(m); }
    const memo = new Map();
    const cover = (mask, k) => {                        // mask: kullanılmış çubuklar; k kenar daha gerekli
      if (k === 0) return mask === full;
      const key = mask * 8 + k;
      if (memo.has(key)) return memo.get(key);
      let r = false;
      for (const m of ok) if (!(m & mask) && cover(mask | m, k - 1)) { r = true; break; }
      memo.set(key, r);
      return r;
    };
    return cover(0, 4);
  };
  forEach('sticks', (q) => {
    const m = q.meta, make = (c) => Array(c[0]).fill(m.lens[0]).concat(Array(c[1]).fill(m.lens[1]));
    const flags = m.combos.map((c) => can(make(c)));
    assert.strictEqual(flags.filter(Boolean).length, 1);
    assert.ok(can(make(m.good)));
    assert.strictEqual(q.options[q.answer].key, 't' + [m.good[0] ? m.good[0] + ' kısa' : '', m.good[1] ? m.good[1] + ' uzun' : ''].filter(Boolean).join(' ve '));
  }, 80);
});

test('noktalı kâğıt: dörtlü seçimleri deneyerek kareler sayılır', () => {
  forEach('dots', (q) => {
    const m = q.meta, P = m.pts;
    const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    let total = 0;
    const areas = new Set();
    for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) for (let c = b + 1; c < P.length; c++) for (let d = c + 1; d < P.length; d++) {
      const pts = [P[a], P[b], P[c], P[d]], ds = [];
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) ds.push(d2(pts[i], pts[j]));
      ds.sort((x, y) => x - y);
      if (ds[0] > 0 && ds[0] === ds[1] && ds[1] === ds[2] && ds[2] === ds[3] && ds[4] === ds[5] && ds[4] === 2 * ds[0]) { total++; areas.add(ds[0]); }
    }
    assert.strictEqual(m.total, total);
    assert.strictEqual(m.areas, areas.size);
    assert.strictEqual(value(q), m.mode === 'count' ? total : areas.size);
  }, 100);
});

test('geriye doğru: başlangıç sayısı ileri doğru işlemlerle sonuca varır; robot benzetimi', () => {
  forEach('back', (q) => {
    const m = q.meta;
    if (m.robot) {
      let heads = m.h, cuts = 0;
      while (heads > 0) { cuts++; heads--; if (heads > 0 && cuts % 3 === 0) heads++; }
      assert.strictEqual(cuts, m.cuts);
      assert.notStrictEqual(m.cuts % 3, 0);
      assert.strictEqual(value(q), m.h);
      return;
    }
    let v = m.start;
    for (const [id, k] of m.ops) {
      v = id === 'add' ? v + k : id === 'sub' ? v - k : id === 'mul' ? v * k : v / 2;
      assert.ok(Number.isInteger(v) && v >= 1);
    }
    assert.strictEqual(v, m.result);
    assert.strictEqual(value(q), m.start);
  });
});

test('kartı çevir: kartın noktaları üç boyutta döndürülüp arka yüz okunur', () => {
  // Kartın yüzey noktaları (x, y, z); z = +1 ön, z = -1 arka. Her çevirme bir eksen çevresinde 180° dönmedir:
  // sağ/sol kenar: (x, y, z) -> (-x, y, -z); üst/alt kenar: (x, y, z) -> (x, -y, -z)
  const rot = { sağ: (p) => [-p[0], p[1], -p[2]], sol: (p) => [-p[0], p[1], -p[2]], üst: (p) => [p[0], -p[1], -p[2]], alt: (p) => [p[0], -p[1], -p[2]] };
  forEach('flip', (q) => {
    const m = q.meta, pic = m.picture, n = pic.length, mid = (n - 1) / 2;
    const seenAt = (i, j) => [j - mid, i - mid, 1];       // göze görünen yüzdeki hücre merkezi
    // arka yüzün içeriği: verilen çevirmeden sonra gözün gördüğü resim `pic`
    const back = {};
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const p = rot[m.given](seenAt(i, j));
      back[p[0] + ',' + p[1]] = pic[i][j];
    }
    const out = Array.from({ length: n }, () => Array(n).fill(null));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      // görünen noktanın kartın üzerindeki yeri: çevirmeler tersten geri alınır
      const p = m.ask.slice().reverse().reduce((pt, sd) => rot[sd](pt), seenAt(i, j));
      assert.strictEqual(p[2], -1, 'arka yüz görünmeli');
      out[i][j] = back[p[0] + ',' + p[1]];
    }
    assert.strictEqual(G.key(out), G.key(m.answer));
    assert.strictEqual(q.options[q.answer].key, 'k' + G.key(out));
  });
});
