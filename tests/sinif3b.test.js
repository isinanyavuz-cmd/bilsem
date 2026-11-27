const test = require('node:test');
const assert = require('node:assert');
const B = require('./load.js');

const G = B.Shapes.Grid;
const gen = (id, lv, seed) => B.generate(id, lv, new B.RNG(seed));
const forEach = (id, fn, runs, levels) => { for (const lv of levels || B.LEVELS) for (let seed = 1; seed <= (runs || 200); seed++) fn(gen(id, lv, seed), lv, seed); };
const correctKey = (q) => q.options[q.answer].key;

test('katlama: kâğıt gerçekten katlanıp delikler yeniden açılınca aynı sonuç çıkar', () => {
  forEach('fold', (q) => {
    const m = q.meta, N = m.N, h = N / 2;
    // her kâğıt karesinin katlanmış kâğıttaki yeri (üreticiden bağımsız: katmanları üst üste bindir)
    const place = (r, c) => {
      let rr = r, cc = c;
      if (m.vf) cc = c < h ? (m.C0 === 0 ? c : h - 1 - c) : (m.C0 === 0 ? N - 1 - c : c - h);
      if (m.hf) rr = r < h ? (m.R0 === 0 ? r : h - 1 - r) : (m.R0 === 0 ? N - 1 - r : r - h);
      return [rr, cc];
    };
    const open = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const p = place(r, c);
      if (m.folded.some((f) => f[0] === p[0] && f[1] === p[1])) open.push(r + ',' + c);
    }
    assert.deepStrictEqual(open.sort(), m.holes.map((x) => x.join(',')).sort());
    assert.strictEqual(correctKey(q), 'f' + m.holes.map((x) => x.join(',')).sort().join(';'));
    assert.strictEqual(m.holes.length, m.folded.length * (m.vf && m.hf ? 4 : 2));
  });
});

test('simetri: tamamlanan yarı ayna görüntüsüdür; eksen sayısı elle sayılanla aynı', () => {
  forEach('sym', (q, lv) => {
    const m = q.meta;
    if (lv < 4) {
      const N = m.N, f = m.full;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (m.kind === 'V') assert.strictEqual(f[r][c], f[r][N - 1 - c]);
        if (m.kind === 'H') assert.strictEqual(f[r][c], f[N - 1 - r][c]);
        if (m.kind === 'D') assert.strictEqual(f[r][c], f[c][r]);
        const inGiven = m.kind === 'V' ? c < N / 2 : m.kind === 'H' ? r < N / 2 : c >= r;
        assert.strictEqual(f[r][c], inGiven ? m.given[r][c] : f[r][c]);
        if (inGiven) assert.strictEqual(f[r][c], m.given[r][c]);
        else assert.strictEqual(m.given[r][c], 0);
      }
      assert.strictEqual(correctKey(q), 'y' + G.key(f));
    } else {
      const g = m.m, N = g.length;
      let n = 0;
      const same = (fn) => { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = fn(r, c); if (g[r][c] !== g[t[0]][t[1]]) return false; } return true; };
      if (same((r, c) => [r, N - 1 - c])) n++;
      if (same((r, c) => [N - 1 - r, c])) n++;
      if (same((r, c) => [c, r])) n++;
      if (same((r, c) => [N - 1 - c, N - 1 - r])) n++;
      assert.strictEqual(q.options[q.answer].value, n);
    }
  });
});

test('yalancı mı doğrucu mu: tek tutarlı durum vardır ve cevap odur', () => {
  // ifadeler üreticiden bağımsız yorumlanır
  const truth = (s, i, t) => {
    const liars = t.map((v, k) => (v ? -1 : k)).filter((k) => k >= 0);
    if (s.t === 'T') return t[s.x] === true;
    if (s.t === 'F') return t[s.x] === false;
    if (s.t === 'bothLie') return t[i] === false && t[s.x] === false;
    if (s.t === 'bothTrue') return t[i] === true && t[s.x] === true;
    if (s.t === 'atLeast') return liars.length >= 1;
    if (s.t === 'one') return liars.length === 1;
    if (s.t === 'all') return liars.length === t.length;
    throw new Error(s.t);
  };
  forEach('liar', (q) => {
    const m = q.meta, n = m.stmts.length, sols = [];
    for (let mask = 0; mask < (1 << n); mask++) {
      const t = Array.from({ length: n }, (_, i) => (mask >> i) % 2 === 1);
      // doğru söyleyenin ifadesi doğru, yalan söyleyenin ifadesi yanlış olmalı
      if (m.stmts.every((s, i) => truth(s, i, t) === t[i])) sols.push(t);
    }
    assert.strictEqual(sols.length, 1);
    assert.deepStrictEqual(sols[0], m.sol);
    const names = Array.from(q.stem.matchAll(/<b>\S+ ([^:<]+):<\/b>/g)).map((x) => x[1]);
    assert.strictEqual(names.length, n);
    const liars = m.sol.filter((v) => !v).length;
    if (m.mode === 'count') assert.strictEqual(q.options[q.answer].value, liars);
    else {
      const who = m.mode === 'who-true' ? m.sol.indexOf(true) : m.sol.indexOf(false);
      assert.strictEqual(correctKey(q), 'p' + names[who]);
      assert.strictEqual(m.sol.filter((v) => v === (m.mode === 'who-true')).length, 1);
    }
    for (const s of m.stmts) assert.ok(s.x >= 0 && s.x < n);
    m.stmts.forEach((s, i) => assert.ok(s.x !== i || !/T|F|bothLie|bothTrue/.test(s.t)));
  });
});

test('sihirli kare: kare gerçekten sihirli, gizli sayılar tek çözümlü (1-60 arası tüm sayılar denenir)', () => {
  const sums = (g) => [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]].map((l) => l.reduce((a, i) => a + g[i], 0));
  forEach('magic', (q, lv) => {
    const m = q.meta, g = m.grid;
    assert.ok(new Set(sums(g)).size === 1 && sums(g)[0] === m.sum);
    assert.strictEqual(q.options[q.answer].value, g[m.tgt]);
    assert.strictEqual(m.hid.length, [0, 1, 1, 2, 3][lv]);
    // gizli hücrelere olası tüm değerler denenir: sihirli kareyi bozmayanlar sayılır
    const hid = m.hid, cur = g.slice(), found = new Set();
    const go = (k) => {
      if (k === hid.length) { if (new Set(sums(cur)).size === 1) found.add(cur[m.tgt]); return; }
      for (let v = 1; v <= 60; v++) { cur[hid[k]] = v; go(k + 1); }
    };
    go(0);
    assert.deepStrictEqual(Array.from(found), [g[m.tgt]]);
  }, 40);
});

test('mini sudoku: bulmaca tek çözümlü, cevap o çözümdeki renk', () => {
  forEach('sudoku', (q) => {
    const m = q.meta, n = m.n, g = m.puzzle.map((r) => r.slice());
    let count = 0, sol = null;
    const ok = (r, c, v) => {
      for (let i = 0; i < n; i++) if (g[r][i] === v || g[i][c] === v) return false;
      if (m.box) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (Math.floor(i / m.box) === Math.floor(r / m.box) && Math.floor(j / m.box) === Math.floor(c / m.box) && g[i][j] === v) return false;
      return true;
    };
    const go = (p) => {
      while (p < n * n && g[Math.floor(p / n)][p % n]) p++;
      if (p === n * n) { count++; sol = g.map((r) => r.slice()); return; }
      const r = Math.floor(p / n), c = p % n;
      for (let v = 1; v <= n; v++) if (ok(r, c, v)) { g[r][c] = v; go(p + 1); g[r][c] = 0; }
    };
    go(0);
    assert.strictEqual(count, 1);
    assert.strictEqual(sol[m.ask[0]][m.ask[1]], m.answer);
    assert.strictEqual(m.puzzle[m.ask[0]][m.ask[1]], 0);
    assert.strictEqual(correctKey(q), 'c' + m.cols[m.answer - 1]);
    assert.strictEqual(q.options.length, n);
  });
});
