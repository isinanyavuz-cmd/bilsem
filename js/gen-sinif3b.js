/* 3. sınıf türleri, ikinci tur: Katla ve Deş, Simetri, Mini Sudoku.
   Her sorunun cevabı kuraldan hesaplanır; bulmacalarda çözümün tek olduğu üretimde denetlenir. */
(function (root) {
  'use strict';
  const B = root.Bilsem, S = B.Shapes, Q = B.Q, G = S.Grid;
  const INK = S.INK, r1 = S.r1, PAL = S.COLOR_IDS;
  const fillOf = (id) => S.COLORS[id].fill;
  const nameOf = (id) => S.COLORS[id].name;
  const SOFT = { fill: '#566889', weight: 700 };
  const ORANGE = '#e08600';
  const colorOpt = (id) => ({
    html: S.svg(100, 100, '<rect x="22" y="8" width="56" height="56" rx="14" fill="' + fillOf(id) + '" stroke="' + INK + '" stroke-width="4"/>' + S.text(50, 83, nameOf(id), 19), { cls: 'opt-svg' }),
    key: 'c' + id,
  });
  const cellKey = (cells) => cells.map((c) => c[0] + ',' + c[1]).sort().join(';');
  const uniq = (cells) => { const m = new Map(); cells.forEach((c) => m.set(c[0] + ',' + c[1], c)); return Array.from(m.values()); };

  /* ---------- Katla ve Deş ---------- */
  const PAPER = '#ffe9a8';
  function paperDraw(rows, cols, cs, holes, x, y) {
    let s = '<g transform="translate(' + r1(x) + ' ' + r1(y) + ')"><rect width="' + r1(cols * cs) + '" height="' + r1(rows * cs) + '" rx="4" fill="' + PAPER + '"/>';
    let lines = '';
    for (let i = 1; i < cols; i++) lines += 'M' + r1(i * cs) + ' 0V' + r1(rows * cs);
    for (let i = 1; i < rows; i++) lines += 'M0 ' + r1(i * cs) + 'H' + r1(cols * cs);
    s += '<path d="' + lines + '" stroke="#c9a94a" stroke-opacity=".55" stroke-width="1.2" fill="none"/>';
    holes.forEach((h) => { s += '<circle cx="' + r1((h[1] + 0.5) * cs) + '" cy="' + r1((h[0] + 0.5) * cs) + '" r="' + r1(cs * 0.3) + '" fill="#fff" stroke="' + INK + '" stroke-width="2.4"/>'; });
    return s + '<rect width="' + r1(cols * cs) + '" height="' + r1(rows * cs) + '" rx="4" fill="none" stroke="' + INK + '" stroke-width="3"/></g>';
  }
  const arrowPath = (x0, y0, x1, y1) => {
    const a = Math.atan2(y1 - y0, x1 - x0), L = 9;
    return '<path d="M' + r1(x0) + ' ' + r1(y0) + 'L' + r1(x1) + ' ' + r1(y1) + 'M' + r1(x1 - L * Math.cos(a - 0.5)) + ' ' + r1(y1 - L * Math.sin(a - 0.5)) + 'L' + r1(x1) + ' ' + r1(y1) + 'L' + r1(x1 - L * Math.cos(a + 0.5)) + ' ' + r1(y1 - L * Math.sin(a + 0.5)) + '" fill="none" stroke="' + ORANGE + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
  };

  B.GEN.fold = function (rng, level) {
    const N = level === 1 || level === 3 ? 4 : 6;
    const two = level >= 3;
    const axis = two ? 'both' : level === 1 ? 'v' : rng.pick(['v', 'h']);
    const vf = axis === 'v' || axis === 'both', hf = axis === 'h' || axis === 'both';
    const vside = rng.pick(['L', 'R']), hside = rng.pick(['T', 'B']);          // katlanınca kâğıdın kalan yarısı
    const fr = hf ? N / 2 : N, fc = vf ? N / 2 : N, R0 = hf && hside === 'B' ? N / 2 : 0, C0 = vf && vside === 'R' ? N / 2 : 0;
    const k = level === 1 ? 1 : level === 2 ? 2 : level === 3 ? rng.int(1, 2) : rng.int(2, 3);
    const folded = rng.sample(Array.from({ length: fr * fc }, (_, i) => [Math.floor(i / fc), i % fc]), k);
    const actual = folded.map((h) => [h[0] + R0, h[1] + C0]);
    const unfold = (cells, v, h) => {
      let o = cells.slice();
      if (v) o = o.concat(o.map((c) => [c[0], N - 1 - c[1]]));
      if (h) o = o.concat(o.map((c) => [N - 1 - c[0], c[1]]));
      return uniq(o);
    };
    const correct = unfold(actual, vf, hf);
    const cs = N === 4 ? 30 : 22, A = N * cs, gap = 44, W = 14 + A + gap + (fc * cs) + 14, H = A + 50, oy = 30;
    let inner = S.text(14 + A / 2, 12, 'Kâğıt', 15, SOFT) + S.text(14 + A + gap + (fc * cs) / 2, 12, 'Katlanmış', 15, SOFT);
    inner += paperDraw(N, N, cs, [], 14, oy);
    const dash = (d) => '<path d="' + d + '" stroke="' + ORANGE + '" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round"/>';
    if (vf) {
      inner += dash('M' + r1(14 + A / 2) + ' ' + (oy - 6) + 'V' + r1(oy + A + 6));
      const sx = vside === 'L' ? 14 + A * 0.85 : 14 + A * 0.15, ex = vside === 'L' ? 14 + A * 0.58 : 14 + A * 0.42;
      inner += arrowPath(sx, oy + A * (hf ? 0.28 : 0.5), ex, oy + A * (hf ? 0.28 : 0.5));
      if (two) inner += S.text(14 + A / 2, oy + A + 16, '1', 15, { fill: ORANGE });
    }
    if (hf) {
      inner += dash('M' + (14 - 6) + ' ' + r1(oy + A / 2) + 'H' + r1(14 + A + 6));
      const sy = hside === 'T' ? oy + A * 0.85 : oy + A * 0.15, ey = hside === 'T' ? oy + A * 0.58 : oy + A * 0.42;
      inner += arrowPath(14 + A * (vf ? 0.28 : 0.5), sy, 14 + A * (vf ? 0.28 : 0.5), ey);
      if (two) inner += S.text(14 + A + 14, oy + A / 2 - 16, '2', 15, { fill: ORANGE });
    }
    inner += '<path d="M' + (14 + A + 8) + ' ' + r1(oy + A / 2) + 'h' + (gap - 16) + 'm-7 -7l7 7l-7 7" fill="none" stroke="#566889" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
    inner += paperDraw(fr, fc, cs, folded, 14 + A + gap, oy + (A - fr * cs) / 2);
    const q = { stem: S.svg(W, H, inner, { maxW: Math.min(W * 1.25, 420) }) };
    q.prompt = 'Kâğıt turuncu çizgi' + (two ? 'lerden sırayla' : 'den') + ' katlanıp delikler açılıyor. Kâğıt tekrar açılınca nasıl görünür?';
    q.meta = { N: N, vf: vf, hf: hf, R0: R0, C0: C0, folded: folded, holes: correct };
    q.explain = 'Katlanmış kâğıttaki her delik, açılınca katlama çizgisinin öbür yanında ayna görüntüsüyle de çıkar. ' + (two ? 'İki kez katlandığı için her delik dört yerde görünür.' : 'Bir kez katlandığı için her delik iki yerde görünür.') + ' Toplam ' + correct.length + ' delik olur.';
    const mk = (cells) => ({ html: S.svg(100, 100, paperDraw(N, N, 82 / N, cells, 9, 9), { cls: 'opt-svg' }), key: 'f' + cellKey(cells) });
    const ds = [actual, unfold(actual, vf, false), unfold(actual, false, hf)];
    ds.push(uniq(actual.concat(actual.map((c) => [N - 1 - c[0], N - 1 - c[1]]))));       // aynalama yerine yarım tur çevirme
    ds.push(uniq(actual.concat(actual.map((c) => [c[1], c[0]]))));                          // köşegen yansıması
    const shift = (cells) => {                                                              // doğru açılmışın bir deliği kaymış
      const c = cells.map((h) => h.slice()), i = rng.int(0, c.length - 1), d = rng.pick([[0, 1], [1, 0], [0, -1], [-1, 0]]);
      const nr = c[i][0] + d[0], nc = c[i][1] + d[1];
      if (nr < 0 || nc < 0 || nr >= N || nc >= N) return null;
      c[i] = [nr, nc];
      return uniq(c);
    };
    // Doğru açılım tüm yansımaları içerdiğinden en çok deliği olan şık olurdu. Fazladan delikli çeldiriciler de var:
    // bir yansıma fazladan uygulanmış ya da bir delik fazladan sayılmış hâller.
    const extra = [uniq(correct.concat(correct.map((c) => [N - 1 - c[0], N - 1 - c[1]]))), uniq(correct.concat(correct.map((c) => [c[1], c[0]])))];
    if (!two) extra.push(unfold(actual, true, true));
    for (let t = 0; t < 4; t++) { const c = [rng.int(0, N - 1), rng.int(0, N - 1)]; extra.push(uniq(correct.concat([c]))); }
    const more = rng.shuffle(extra.filter((c) => c.length > correct.length));
    const spread = Q.spread(rng, correct, shift, cellKey, { pool: ds });
    for (let t = 0; t < 8; t++) { const x = shift(correct); if (x) spread.push(x); }
    return Q.finish(rng, q, mk(correct), spread.slice(0, 3).concat(more.slice(0, 3), spread.slice(3), rng.shuffle(ds), more.slice(3)).map(mk));
  };

  /* ---------- Simetri ---------- */
  const DIH = [
    (r, c) => [r, c], (r, c, N) => [c, N - 1 - r], (r, c, N) => [N - 1 - r, N - 1 - c], (r, c, N) => [N - 1 - c, r],
    (r, c, N) => [r, N - 1 - c], (r, c, N) => [N - 1 - r, c], (r, c) => [c, r], (r, c, N) => [N - 1 - c, N - 1 - r],
  ];
  const OPS = { V: DIH[4], H: DIH[5], D: DIH[6], A: DIH[7], R: DIH[1] };
  const AXIS_NAME = { V: 'dikey', H: 'yatay', D: 'sol üstten sağ alta çapraz', A: 'sağ üstten sol alta çapraz' };
  const blankM = (N) => Array.from({ length: N }, () => Array(N).fill(0));
  const invariant = (m, f) => { const N = m.length; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = f(r, c, N); if (m[r][c] !== m[t[0]][t[1]]) return false; } return true; };

  B.GEN.sym = function (rng, level) {
    const col = rng.pick(PAL), pal = [col];
    if (level === 4) {
      const N = 5, recipes = [['V'], ['H'], ['D'], ['A'], ['V', 'H'], ['D', 'A'], ['R'], ['R'], ['V', 'H', 'D']];
      let m, axes;
      for (let t = 0; ; t++) {
        if (t > 400) throw new Error('simetrik şekil üretilemedi');
        const rec = rng.pick(recipes);
        m = blankM(N);
        const seeds = rng.int(2, 4);
        for (let s = 0; s < seeds; s++) {
          const r = rng.int(0, N - 1), c = rng.int(0, N - 1), orbit = [[r, c]];
          for (let i = 0; i < orbit.length; i++) rec.forEach((o) => { const t2 = OPS[o](orbit[i][0], orbit[i][1], N); if (!orbit.some((p) => p[0] === t2[0] && p[1] === t2[1])) orbit.push(t2); });
          orbit.forEach((p) => { m[p[0]][p[1]] = 1; });
        }
        const filled = m.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
        if (filled < 5 || filled > 17) continue;
        axes = ['V', 'H', 'D', 'A'].filter((o) => invariant(m, OPS[o]));
        break;
      }
      const q = { stem: S.svg(300, 300, G.draw(m, pal, 6, 6, 288), { maxW: 320 }) };
      q.prompt = 'Bu şeklin kaç simetri ekseni var? (Eksen, şekli ortadan katlayınca iki yarının tam üst üste oturduğu çizgidir.)';
      q.meta = { m: m, axes: axes.length, names: axes };
      q.explain = axes.length ? 'Şekli katlayarak denedik: ' + axes.map((o) => AXIS_NAME[o]).join(', ') + ' eksen' + (axes.length > 1 ? 'ler' : '') + ' var. Toplam ' + axes.length + ' simetri ekseni.' : 'Dikey, yatay ve iki çapraz katlamada da yarılar üst üste oturmuyor: simetri ekseni yok.';
      return Q.finishNum(rng, q, axes.length, { min: 0, max: 4 });
    }
    const N = level === 1 ? 4 : level === 2 ? 6 : 5, kind = level === 1 ? 'V' : level === 2 ? rng.pick(['V', 'H']) : 'D';
    const inGiven = (r, c) => (kind === 'V' ? c < N / 2 : kind === 'H' ? r < N / 2 : c >= r);
    const mirror = (r, c) => (kind === 'V' ? [r, N - 1 - c] : kind === 'H' ? [N - 1 - r, c] : [c, r]);
    let given, full;
    for (let t = 0; ; t++) {
      if (t > 300) throw new Error('yarım şekil üretilemedi');
      given = blankM(N);
      let n = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (inGiven(r, c) && rng.chance(0.5)) { given[r][c] = 1; n++; }
      if (n < N - 1) continue;
      full = given.map((row) => row.slice());
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!inGiven(r, c)) { const s = mirror(r, c); full[r][c] = given[s[0]][s[1]]; }
      const mk0 = DIH.map((d) => { const m = given.map((row) => row.slice()); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!inGiven(r, c)) { const s = d(r, c, N); m[r][c] = inGiven(s[0], s[1]) ? given[s[0]][s[1]] : 0; } return G.key(m); });
      if (new Set(mk0).size >= 4 && new Set(mk0).has(G.key(full))) break;
    }
    const cs = 288 / N;
    let tint = '';
    if (kind === 'V') tint = '<rect x="' + r1(6 + (N / 2) * cs) + '" y="6" width="' + r1((N / 2) * cs) + '" height="288" fill="#cfe0fa" fill-opacity=".45"/>';
    if (kind === 'H') tint = '<rect x="6" y="' + r1(6 + (N / 2) * cs) + '" width="288" height="' + r1((N / 2) * cs) + '" fill="#cfe0fa" fill-opacity=".45"/>';
    if (kind === 'D') tint = '<polygon points="6,6 294,294 6,294" fill="#cfe0fa" fill-opacity=".45"/>';
    const axisLine = kind === 'V' ? 'M150 0V300' : kind === 'H' ? 'M0 150H300' : 'M0 0L300 300';
    const q = { stem: S.svg(300, 300, G.draw(given, pal, 6, 6, 288) + tint + '<path d="' + axisLine + '" stroke="' + ORANGE + '" stroke-width="4" stroke-dasharray="10 7" stroke-linecap="round"/>', { maxW: 320 }) };
    q.prompt = 'Turuncu kesik çizgi bir ayna gibi. Şeklin boş yarısı aynadaki görüntüsüyle tamamlanınca nasıl görünür?';
    q.meta = { N: N, kind: kind, given: given, full: full };
    q.explain = 'Ayna çizgisinin bir yanındaki her kare, öbür yanda çizgiye aynı uzaklıkta yansır. Çizgiye yakın kareler yine çizgiye yakın kalır.';
    const mk = (m) => ({ html: S.svg(100, 100, G.draw(m, pal, 9, 9, 82), { cls: 'opt-svg' }), key: 'y' + G.key(m) });
    const ds = DIH.map((d) => { const m = given.map((row) => row.slice()); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!inGiven(r, c)) { const s = d(r, c, N); m[r][c] = inGiven(s[0], s[1]) ? given[s[0]][s[1]] : 0; } return m; });
    const flips = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!inGiven(r, c)) { const m = full.map((row) => row.slice()); m[r][c] = 1 - m[r][c]; flips.push(m); }
    const flip = (m) => { const x = m.map((row) => row.slice()), p = rng.pick(free); x[p[0]][p[1]] = 1 - x[p[0]][p[1]]; return x; };
    const free = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!inGiven(r, c)) free.push([r, c]);
    // Yalnız doğru şık simetrik olursa çocuk verilen yarıya bakmadan "simetrik olanı" seçer. Bu yüzden iki çeldirici de
    // simetriktir ama verilen yarının bir karesi farklıdır: hangisinin verilen yarıyla aynı olduğuna bakmak gerekir.
    const complete = (g) => { const m = g.map((row) => row.slice()); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!inGiven(r, c)) { const p = mirror(r, c); m[r][c] = g[p[0]][p[1]]; } return m; };
    const givenCells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (inGiven(r, c)) givenCells.push([r, c]);
    const flipG = (g, cells) => { const x = g.map((row) => row.slice()); cells.forEach((p) => { x[p[0]][p[1]] = 1 - x[p[0]][p[1]]; }); return x; };
    const gc = rng.shuffle(givenCells);
    const symWrong = [complete(flipG(given, [gc[0]])), complete(flipG(given, [gc[0], gc[1]])), complete(flipG(given, [gc[2]])), complete(flipG(given, [gc[3], gc[4]]))];
    const symKeys = new Set(symWrong.map((m) => 'y' + G.key(m)));
    // sahte merkez: simetrik yanlışın kendisinden türeyen (simetrik olmayan) çeldiriciler
    const fake = [flip(symWrong[0]), flip(symWrong[2])];
    const spread = Q.spread(rng, full, flip, G.key, { pool: ds });
    return Q.finish(rng, q, mk(full), rng.shuffle(symWrong).concat(fake, spread, rng.shuffle(ds), rng.shuffle(flips)).map(mk), 4, { need: { ok: (d) => symKeys.has(d.key), count: 2 } });
  };

  /* ---------- Mini Sudoku ---------- */
  function latinCount(n, box, g, limit) {
    let count = 0, first = null;
    const ok = (r, c, v) => {
      for (let i = 0; i < n; i++) if (g[r][i] === v || g[i][c] === v) return false;
      if (box) { const br = r - (r % box), bc = c - (c % box); for (let i = 0; i < box; i++) for (let j = 0; j < box; j++) if (g[br + i][bc + j] === v) return false; }
      return true;
    };
    const go = (pos) => {
      if (count >= limit) return;
      while (pos < n * n && g[Math.floor(pos / n)][pos % n]) pos++;
      if (pos === n * n) { count++; if (!first) first = g.map((r) => r.slice()); return; }
      const r = Math.floor(pos / n), c = pos % n;
      for (let v = 1; v <= n; v++) if (ok(r, c, v)) { g[r][c] = v; go(pos + 1); g[r][c] = 0; }
    };
    go(0);
    return { count: count, first: first };
  }

  B.GEN.sudoku = function (rng, level) {
    const n = level === 1 ? 3 : 4, box = level >= 3 ? 2 : 0, maxBlank = [0, 4, 6, 8, 11][level];
    const cols = rng.sample(PAL, n);
    // rastgele tam çözüm: ilk satırı karıştır, kalanı geri izlemeyle doldur
    let sol;
    for (let t = 0; ; t++) {
      if (t > 50) throw new Error('çözüm üretilemedi');
      const g = Array.from({ length: n }, () => Array(n).fill(0));
      g[0] = rng.shuffle(Array.from({ length: n }, (_, i) => i + 1));
      const fill = (pos) => {
        if (pos === n * n) return true;
        const r = Math.floor(pos / n), c = pos % n;
        if (g[r][c]) return fill(pos + 1);
        for (const v of rng.shuffle(Array.from({ length: n }, (_, i) => i + 1))) {
          let bad = false;
          for (let i = 0; i < n && !bad; i++) if (g[r][i] === v || g[i][c] === v) bad = true;
          if (!bad && box) { const br = r - (r % box), bc = c - (c % box); for (let i = 0; i < box; i++) for (let j = 0; j < box; j++) if (g[br + i][bc + j] === v) bad = true; }
          if (bad) continue;
          g[r][c] = v;
          if (fill(pos + 1)) return true;
          g[r][c] = 0;
        }
        return false;
      };
      if (fill(1)) { sol = g; break; }
    }
    const puzzle = sol.map((r) => r.slice()), blanks = [];
    for (const p of rng.shuffle(Array.from({ length: n * n }, (_, i) => i))) {
      if (blanks.length >= maxBlank) break;
      const r = Math.floor(p / n), c = p % n, keep = puzzle[r][c];
      puzzle[r][c] = 0;
      if (latinCount(n, box, puzzle.map((x) => x.slice()), 2).count === 1) blanks.push([r, c]); else puzzle[r][c] = keep;
    }
    if (blanks.length < Math.min(maxBlank, 3)) throw new Error('çok az boş kare');
    const cand = (r, c) => {
      const seen = new Set();
      for (let i = 0; i < n; i++) { if (puzzle[r][i]) seen.add(puzzle[r][i]); if (puzzle[i][c]) seen.add(puzzle[i][c]); }
      if (box) { const br = r - (r % box), bc = c - (c % box); for (let i = 0; i < box; i++) for (let j = 0; j < box; j++) if (puzzle[br + i][bc + j]) seen.add(puzzle[br + i][bc + j]); }
      return Array.from({ length: n }, (_, i) => i + 1).filter((v) => !seen.has(v));
    };
    const easy = blanks.filter((b) => cand(b[0], b[1]).length === 1);
    if (!easy.length && level < 4) throw new Error('kolay kare yok');
    const ask = rng.pick(easy.length ? easy : blanks);
    const cs = n === 3 ? 84 : 66, W = n * cs + 20;
    let inner = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const x = 10 + c * cs, y = 10 + r * cs, v = puzzle[r][c];
      if (r === ask[0] && c === ask[1]) inner += S.qtile(x + 2, y + 2, cs - 4);
      else {
        inner += S.tile(x + 2, y + 2, cs - 4);
        if (v) inner += '<circle cx="' + r1(x + cs / 2) + '" cy="' + r1(y + cs / 2) + '" r="' + r1(cs * 0.31) + '" fill="' + fillOf(cols[v - 1]) + '" stroke="' + INK + '" stroke-width="3"/>';
      }
    }
    if (box) inner += '<path d="M' + r1(10 + (n / 2) * cs) + ' 6V' + (10 + n * cs + 4) + 'M6 ' + r1(10 + (n / 2) * cs) + 'H' + (10 + n * cs + 4) + '" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 8"/>';
    const q = { stem: S.svg(W, W, inner, { maxW: n === 3 ? 270 : 300 }) };
    q.prompt = box ? 'Her satırda, her sütunda ve her 2×2 kutuda dört renk de birer kez bulunmalı. Soru işaretinin yerine hangi renk gelmeli?'
      : 'Her satırda ve her sütunda ' + (n === 3 ? 'üç' : 'dört') + ' renk de birer kez bulunmalı. Soru işaretinin yerine hangi renk gelmeli?';
    const cn = cand(ask[0], ask[1]);
    const rowC = puzzle[ask[0]].filter(Boolean).map((v) => nameOf(cols[v - 1])), colC = puzzle.map((r) => r[ask[1]]).filter(Boolean).map((v) => nameOf(cols[v - 1]));
    q.explain = cn.length === 1
      ? (rowC.length ? 'Satırda ' + rowC.join(', ') + ' var' : 'Satırda hiç renk yok') + '; ' + (colC.length ? 'sütunda ' + colC.join(', ') + ' var' : 'sütunda hiç renk yok') + (box ? '; kutudaki renkler de eleniyor' : '') + '. Geriye ' + nameOf(cols[cn[0] - 1]) + ' kalır.'
      : 'Boş kareleri tek tek eleyerek ilerleyince soru işaretinin yeri ' + nameOf(cols[sol[ask[0]][ask[1]] - 1]) + ' çıkar.';
    q.meta = { n: n, box: box, puzzle: puzzle, ask: ask, cols: cols, answer: sol[ask[0]][ask[1]] };
    const right = cols[sol[ask[0]][ask[1]] - 1];
    return Q.finish(rng, q, colorOpt(right), rng.shuffle(cols.filter((c) => c !== right)).map(colorOpt), n);
  };

  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
