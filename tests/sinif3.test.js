const test = require('node:test');
const assert = require('node:assert');
const B = require('./load.js');

const G = B.Shapes.Grid;
const RUNS = 300;
const gen = (id, lv, seed) => B.generate(id, lv, new B.RNG(seed));
const forEach = (id, fn, levels) => { for (const lv of levels || B.LEVELS) for (let seed = 1; seed <= RUNS; seed++) fn(gen(id, lv, seed), lv, seed); };
const correctKey = (q) => q.options[q.answer].key;

/* Üreticiden bağımsız: küpü üç boyutlu vektörlerle yuvarlar. Her kareye alta gelen yüzün numarasını yazar. */
function rollFaces(cells) {
  const idx = new Map(cells.map((c, i) => [c.join(','), i])), out = Array(cells.length).fill(-1);
  const faces = { '0,0,1': 1, '0,0,-1': 0, '1,0,0': 4, '-1,0,0': 5, '0,1,0': 3, '0,-1,0': 2 };   // normal -> yüz no (karşılar: 0-1, 2-3, 4-5)
  const rot = {
    '0,1': (v) => [v[2], v[1], -v[0]],      // sağa (sütun +1): üst yüz sağa gider, sağ yüz alta iner
    '0,-1': (v) => [-v[2], v[1], v[0]],
    '1,0': (v) => [v[0], v[2], -v[1]],      // aşağıya (satır +1)
    '-1,0': (v) => [v[0], -v[2], v[1]],
  };
  // yuvarlanınca küp, kendi normal vektörleriyle birlikte döner: yeni normaldeki yüz = eskisinin döndürülmüşü
  const spin = (state, f) => { const n = {}; for (const k of Object.keys(state)) n[f(k.split(',').map(Number)).join(',')] = state[k]; return n; };
  const go = (i, st) => {
    out[i] = st['0,0,-1'];
    for (const d of Object.keys(rot)) {
      const dr = Number(d.split(',')[0]), dc = Number(d.split(',')[1]), j = idx.get((cells[i][0] + dr) + ',' + (cells[i][1] + dc));
      if (j != null && out[j] < 0) go(j, spin(st, rot[d]));
    }
  };
  go(0, faces);
  return out;
}
const isNet = (cells) => { const f = rollFaces(cells); return cells.length === 6 && f.every((x) => x >= 0) && new Set(f).size === 6; };

test('küp açılımı: 216 sabit altıgenden tam 11 serbest şekil küp olur; iki yöntem aynı sonucu verir', () => {
  const H = B.Net.hexominoes();
  assert.strictEqual(H.all.length, 216);
  assert.strictEqual(new Set(H.valid.map(B.Net.freeKey)).size, 11);
  for (const c of H.all) assert.strictEqual(!!B.Net.fold(c), isNet(c));
});

test('desen tamamlama: parça desenin kuralından gelir, yanlış şıklar farklıdır', () => {
  forEach('fillgap', (q) => {
    const m = q.meta, g = m.g, N = m.N;
    const patch = g.slice(m.r0, m.r0 + m.hole).map((r) => r.slice(m.c0, m.c0 + m.hole));
    assert.strictEqual(correctKey(q), 'p' + G.key(patch));
    assert.ok(new Set([].concat.apply([], patch)).size >= 2);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (m.kind === 'tile') assert.strictEqual(g[r][c], g[r % 2][c % 2]);
      if (m.kind === 'tile3') assert.strictEqual(g[r][c], g[r % 3][c % 3]);
      if (/^mirror/.test(m.kind)) { assert.strictEqual(g[r][c], g[r][N - 1 - c]); assert.strictEqual(g[r][c], g[N - 1 - r][c]); }
      if (/^rot/.test(m.kind)) assert.strictEqual(g[r][c], g[c][N - 1 - r]);
    }
    if (m.kind === 'diag') for (let r = 0; r + 1 < N; r++) for (let c = 0; c < N; c++) {
      const cc = c + m.dir;                          // (r+dir*c) sabit olan hücreler aynı renkte
      if (cc >= 0 && cc < N) assert.strictEqual(g[r + 1][c], g[r][cc]);
    }
    if (/^(mirror|rot)/.test(m.kind)) {                // boşluk tek bir çeyreğin içinde kalır
      const h = N / 2;
      assert.strictEqual(Math.floor(m.r0 / h), Math.floor((m.r0 + m.hole - 1) / h));
      assert.strictEqual(Math.floor(m.c0 / h), Math.floor((m.c0 + m.hole - 1) / h));
    }
  });
});

test('şeffaf kâğıt: cevap, çevrilmiş kâğıtların birleşimidir', () => {
  const rotCw = (m) => m[0].map((_, c) => m.map((row, r) => m[m.length - 1 - r][c]));   // saat yönü: üreticiden bağımsız yazım
  forEach('overlay', (q) => {
    const m = q.meta, n = m.n;
    const res = Array.from({ length: n }, () => Array(n).fill(0));
    m.sheets.forEach((s, i) => {
      let x = s;
      for (let k = 0; k < m.rots[i]; k++) x = rotCw(x);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (x[r][c]) res[r][c] = 1;
    });
    assert.strictEqual(correctKey(q), 'b' + G.key(res));
    assert.ok(n * n - res.flat().reduce((a, b) => a + b, 0) >= 2, 'tamamen kara olmasın');
    if (m.rots.some(Boolean)) {
      const plain = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (__, c) => (m.sheets.some((s) => s[r][c]) ? 1 : 0)));
      assert.notStrictEqual(G.key(res), G.key(plain), 'çevirmek sonucu değiştirmeli');
    }
  });
});

test('yuvarlanan küp: üç boyutlu döndürmeyle aynı cevap', () => {
  const NORMAL = { T: '0,0,1', B: '0,0,-1', E: '1,0,0', W: '-1,0,0', S: '0,1,0', N: '0,-1,0' };
  const spin = { E: (v) => [v[2], v[1], -v[0]], S: (v) => [v[0], v[2], -v[1]] };   // sağa: üst -> +x; sola: üst -> +y
  forEach('roll', (q, lv) => {
    const m = q.meta;
    let at = {};                                      // normal -> renk
    for (const f of Object.keys(NORMAL)) at[NORMAL[f]] = m.start[f];
    for (const d of m.dirs) {
      const n = {};
      for (const k of Object.keys(at)) n[spin[d](k.split(',').map(Number)).join(',')] = at[k];
      at = n;
    }
    assert.strictEqual(m.answer, at[NORMAL[m.target]]);
    assert.strictEqual(correctKey(q), 'c' + m.answer);
    assert.strictEqual(new Set(Object.values(m.start)).size, 6);
    if (lv > 1) assert.strictEqual(m.dirs.length, lv - 1);
    else assert.ok(m.dirs.length <= 1);
  });
});

test('küp görünümü: cevap kulelerin gerçek silüetidir', () => {
  forEach('view', (q) => {
    const m = q.meta, h = m.heights, W = h.length, D = h[0].length;
    for (let x = 0; x < W; x++) for (let y = 0; y < D; y++) {
      if (x) assert.ok(h[x - 1][y] >= h[x][y]);
      if (y) assert.ok(h[x][y - 1] >= h[x][y]);
    }
    let want = [];
    if (m.side === 'L') { for (let x = 0; x < W; x++) { let t = 0; for (let y = 0; y < D; y++) t = Math.max(t, h[x][y]); want.push(t); } }
    else { for (let y = D - 1; y >= 0; y--) { let t = 0; for (let x = 0; x < W; x++) t = Math.max(t, h[x][y]); want.push(t); } }
    assert.deepStrictEqual(m.view, want);
    assert.strictEqual(correctKey(q), 'v' + want.join(','));
  });
});

test('küp açılımı: cevap gerçekten küp olur, çeldiriciler olmaz', () => {
  forEach('net', (q, lv) => {
    const m = q.meta;
    if (lv <= 2) {
      assert.ok(isNet(m.good));
      assert.strictEqual(m.bad.length, 3);
      for (const b of m.bad) assert.ok(!isNet(b));
      assert.strictEqual(correctKey(q), 'n' + B.Net.freeKey(m.good));
    } else if (lv === 3) {
      assert.ok(isNet(m.cells));
      const f = rollFaces(m.cells);
      assert.strictEqual(f[m.opposite], f[m.ask] ^ 1);
      assert.strictEqual(correctKey(q), 'c' + m.colors[m.opposite]);
      assert.strictEqual(new Set(m.colors).size, 6);
    } else {
      assert.strictEqual(m.cells.length, 7);
      const works = (i) => { const rest = m.cells.filter((_, j) => j !== i); return B.Net.connected(rest) && isNet(B.Net.normalize(rest)); };
      const ok = m.cells.map((_, i) => i).filter(works).map((i) => m.labels[i]);
      assert.ok(ok.length >= 1);
      assert.deepStrictEqual(ok.slice().sort(), m.removable.slice().sort());
      assert.ok(ok.includes(m.answer));
      const shown = q.options.map((o) => o.value).filter((v) => v !== m.answer);
      for (const v of shown) assert.ok(!ok.includes(v), 'çeldirici de doğru olamaz');
    }
  });
});
