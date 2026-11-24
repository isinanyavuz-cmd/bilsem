/* 3. sınıf türleri, ikinci tur: Katla ve Deş, Simetri, Yalancı–Doğrucu, Sihirli Kare, Mini Sudoku.
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
    q.prompt = 'Kâğıt turuncu çizgiden' + (two ? 'ler sırayla' : '') + ' katlanıp delikler açılıyor. Kâğıt tekrar açılınca nasıl görünür?';
    q.meta = { N: N, vf: vf, hf: hf, R0: R0, C0: C0, folded: folded, holes: correct };
    q.explain = 'Katlanmış kâğıttaki her delik, açılınca katlama çizgisinin öbür yanında ayna görüntüsüyle de çıkar. ' + (two ? 'İki kez katlandığı için her delik dört yerde görünür.' : 'Bir kez katlandığı için her delik iki yerde görünür.') + ' Toplam ' + correct.length + ' delik olur.';
    const mk = (cells) => ({ html: S.svg(100, 100, paperDraw(N, N, 82 / N, cells, 9, 9), { cls: 'opt-svg' }), key: 'f' + cellKey(cells) });
    const ds = [actual, unfold(actual, vf, false), unfold(actual, false, hf)];
    ds.push(uniq(actual.concat(actual.map((c) => [N - 1 - c[0], N - 1 - c[1]]))));       // aynalama yerine yarım tur çevirme
    ds.push(uniq(actual.concat(actual.map((c) => [c[1], c[0]]))));                          // köşegen yansıması
    for (let t = 0; t < 8; t++) {                                                          // doğru açılmışın bir deliği kaymış
      const c = correct.map((h) => h.slice()), i = rng.int(0, c.length - 1), d = rng.pick([[0, 1], [1, 0], [0, -1], [-1, 0]]);
      const nr = c[i][0] + d[0], nc = c[i][1] + d[1];
      if (nr >= 0 && nc >= 0 && nr < N && nc < N) { c[i] = [nr, nc]; ds.push(uniq(c)); }
    }
    return Q.finish(rng, q, mk(correct), rng.shuffle(ds).map(mk));
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
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!inGiven(r, c)) { const m = full.map((row) => row.slice()); m[r][c] = 1 - m[r][c]; ds.push(m); }
    return Q.finish(rng, q, mk(full), rng.shuffle(ds).map(mk));
  };

  /* ---------- Yalancı mı, Doğrucu mu? ---------- */
  const PEOPLE = [['👦', 'Ali'], ['👧', 'Ayşe'], ['🧒', 'Can'], ['👧', 'Elif'], ['👦', 'Mert'], ['👧', 'Zeynep'], ['👦', 'Efe'], ['👧', 'Defne']];
  /* t: durum (herkesin doğru söyleyip söylemediği); i: konuşan kişi */
  function holds(s, i, t) {
    const n = t.length, liars = t.filter((v) => !v).length;
    switch (s.t) {
      case 'T': return t[s.x];
      case 'F': return !t[s.x];
      case 'bothLie': return !t[i] && !t[s.x];
      case 'bothTrue': return t[i] && t[s.x];
      case 'atLeast': return liars >= 1;
      case 'one': return liars === 1;
      case 'all': return liars === n;
      default: throw new Error('bilinmeyen ifade');
    }
  }
  function consistent(stmts) {
    const n = stmts.length, out = [];
    for (let mask = 0; mask < (1 << n); mask++) {
      const t = Array.from({ length: n }, (_, i) => !!(mask & (1 << i)));
      if (stmts.every((s, i) => holds(s, i, t) === t[i])) out.push(t);
    }
    return out;
  }
  const says = (s, names) => ({
    T: () => names[s.x] + ' doğru söylüyor.',
    F: () => names[s.x] + ' yalan söylüyor.',
    bothLie: () => 'Ben ve ' + names[s.x] + ' yalan söylüyoruz.',
    bothTrue: () => 'Ben ve ' + names[s.x] + ' doğru söylüyoruz.',
    atLeast: () => 'Aramızda en az bir yalancı var.',
    one: () => 'Aramızda tam bir yalancı var.',
    all: () => 'Hepimiz yalan söylüyoruz.',
  }[s.t]());

  B.GEN.liar = function (rng, level) {
    const n = level <= 2 ? 3 : 4, kinds = [null, ['T', 'F', 'all', 'atLeast'], ['T', 'F', 'bothLie', 'bothTrue'], ['T', 'F', 'bothLie', 'bothTrue', 'atLeast', 'one'], ['T', 'F', 'bothLie', 'bothTrue', 'atLeast', 'one', 'all']][level];
    let stmts, sol;
    for (let t = 0; ; t++) {
      if (t > 3000) throw new Error('tek çözümlü ifadeler bulunamadı');
      stmts = Array.from({ length: n }, (_, i) => {
        const type = rng.pick(kinds);
        let x;
        do { x = rng.int(0, n - 1); } while (x === i);
        return { t: type, x: x };
      });
      if (!stmts.some((s) => s.t !== 'T' && s.t !== 'F')) continue;      // yalnızca "X doğru/yalan" cümleleriyle çözüm hep çift çıkar: bir çapa gerekir
      const all = consistent(stmts);
      if (all.length === 1) { sol = all[0]; break; }
    }
    const people = rng.sample(PEOPLE, n), names = people.map((p) => p[1]);
    const li = stmts.map((s, i) => '<li><b>' + people[i][0] + ' ' + names[i] + ':</b> “' + says(s, names) + '”</li>').join('');
    const intro = 'Doğru söyleyen çocuk her zaman doğru söyler, yalan söyleyen çocuk her zaman yalan söyler. ' + n + ' çocuk konuşuyor:';
    const nT = sol.filter(Boolean).length, nL = n - nT;
    const opt = (i) => ({ html: '<span class="opt-pair"><span class="opt-emoji">' + people[i][0] + '</span><span class="opt-cap">' + names[i] + '</span></span>', key: 'p' + names[i] });
    const q = { stem: '<div class="story"><p>' + intro + '</p><ul>' + li + '</ul></div>', promptBelow: true };
    let mode;
    if (nT === 1) mode = 'who-true'; else if (nL === 1) mode = 'who-liar'; else mode = 'count';
    q.meta = { stmts: stmts, sol: sol, mode: mode };
    q.explain = 'Her çocuğun doğru ya da yalan söylediğini denedik; hiçbir çelişki çıkmayan tek durum bu: ' + names.map((nm, i) => nm + (sol[i] ? ' doğru' : ' yalan') + ' söylüyor').join(', ') + '.';
    q.speech = intro + ' ' + stmts.map((s, i) => names[i] + ': ' + says(s, names)).join(' ');
    if (mode === 'count') {
      q.prompt = 'Kaç çocuk yalan söylüyor?';
      q.speech += ' ' + q.prompt;
      return Q.finishNum(rng, q, nL, { min: 0, max: n });
    }
    const who = mode === 'who-true' ? sol.findIndex(Boolean) : sol.findIndex((v) => !v);
    q.prompt = mode === 'who-true' ? 'Hangi çocuk doğru söylüyor?' : 'Hangi çocuk yalan söylüyor?';
    q.speech += ' ' + q.prompt;
    return Q.finish(rng, q, opt(who), rng.shuffle(Array.from({ length: n }, (_, i) => i).filter((i) => i !== who)).map(opt), n);
  };

  /* ---------- Sihirli Kare ---------- */
  /* Her 3×3 sihirli kare: orta sayı c, iki ayar a ve b ile. Katsayılar [c, a, b]. */
  const MAGIC = [[[1, 1, 0], [1, -1, -1], [1, 0, 1]], [[1, -1, 1], [1, 0, 0], [1, 1, -1]], [[1, 0, -1], [1, 1, 1], [1, -1, 0]]];
  const magicVal = (c, a, b, r, k) => MAGIC[r][k][0] * c + MAGIC[r][k][1] * a + MAGIC[r][k][2] * b;
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const LINE_NAME = ['1. satır', '2. satır', '3. satır', '1. sütun', '2. sütun', '3. sütun', 'sol üstten sağ alta köşegen', 'sağ üstten sol alta köşegen'];

  /* Görünen kareleri sağlayan, tüm hücreleri pozitif tamsayı olan bütün sihirli karelerde hedef hücrenin alabileceği değerler */
  function possibleValues(vis, target) {
    const out = new Set();
    for (let a = -30; a <= 30; a++) for (let b = -30; b <= 30; b++) {
      // c, görünen ilk hücreden bulunur
      const f = Object.keys(vis)[0], fr = Math.floor(f / 3), fk = f % 3, c = vis[f] - (magicVal(0, a, b, fr, fk));
      let ok = true;
      for (let i = 0; i < 9 && ok; i++) { const v = magicVal(c, a, b, Math.floor(i / 3), i % 3); if (v < 1 || (vis[i] != null && vis[i] !== v)) ok = false; }
      if (ok) out.add(magicVal(c, a, b, Math.floor(target / 3), target % 3));
    }
    return out;
  }

  B.GEN.magic = function (rng, level) {
    const hidden = [0, 1, 1, 2, 3][level];
    let grid, hid, tgt, sum, steps;
    for (let t = 0; ; t++) {
      if (t > 600) throw new Error('sihirli kare üretilemedi');
      const c = level === 1 ? rng.int(5, 7) : rng.int(7, 22), a = rng.int(1, level === 1 ? 4 : 7) * rng.pick([1, -1]), b = rng.int(1, level === 1 ? 4 : 7) * rng.pick([1, -1]);
      grid = Array.from({ length: 9 }, (_, i) => magicVal(c, a, b, Math.floor(i / 3), i % 3));
      if (new Set(grid).size !== 9 || grid.some((v) => v < 1 || v > 60)) continue;
      if (level === 1 && !(Math.max.apply(null, grid) <= 11)) continue;
      hid = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8], hidden);
      tgt = hid[0];
      const vis = {};
      grid.forEach((v, i) => { if (hid.indexOf(i) < 0) vis[i] = v; });
      sum = 3 * c;
      const known = Object.assign({}, vis), txt = [];
      let progress = true, sumKnown = level <= 2 || LINES.some((ln) => ln.every((i) => known[i] != null));
      if (!sumKnown) continue;
      while (progress && known[tgt] == null) {
        progress = false;
        for (let li = 0; li < LINES.length; li++) {
          const unk = LINES[li].filter((i) => known[i] == null);
          if (unk.length !== 1) continue;
          const have = LINES[li].filter((i) => i !== unk[0]).map((i) => known[i]), v = sum - have.reduce((x, y) => x + y, 0);
          known[unk[0]] = v;
          txt.push(LINE_NAME[li] + ': ' + sum + ' − (' + have.join(' + ') + ') = ' + v);
          progress = true;
          break;
        }
      }
      if (known[tgt] == null || known[tgt] !== grid[tgt]) continue;
      const pv = possibleValues(vis, tgt);
      if (pv.size !== 1 || !pv.has(grid[tgt])) continue;
      steps = txt;
      break;
    }
    const cs = 64, W = 400, ox = (W - 3 * cs) / 2, labels = level <= 2 ? ['?'] : ['A', 'B', 'C'];
    let inner = (level <= 2 ? S.text(W / 2, 14, 'Her satırın, sütunun ve köşegenin toplamı ' + sum, 15, SOFT) : S.text(W / 2, 14, 'Her satırın, sütunun ve köşegenin toplamı aynı', 15, SOFT));
    for (let i = 0; i < 9; i++) {
      const x = ox + (i % 3) * cs, y = 30 + Math.floor(i / 3) * cs, h = hid.indexOf(i);
      if (h === 0) inner += S.qtile(x + 3, y + 3, cs - 6).replace('>?</text>', '>' + labels[0] + '</text>');
      else if (h > 0) inner += S.tile(x + 3, y + 3, cs - 6, { fill: '#fff4cc', stroke: '#f0a000' }) + S.text(x + cs / 2, y + cs / 2, labels[h], 30, { fill: ORANGE });
      else inner += S.tile(x + 3, y + 3, cs - 6) + S.text(x + cs / 2, y + cs / 2, grid[i], 32);
    }
    const want = level <= 2 ? '?' : 'A';
    const q = { stem: S.svg(W, 30 + 3 * cs + 10, inner, { maxW: 400 }) };
    q.prompt = want + ' yerine hangi sayı gelmeli?';
    q.meta = { grid: grid, hid: hid, tgt: tgt, sum: sum, answer: grid[tgt], showSum: level <= 2 };
    q.explain = 'Üç sayının toplamı ' + sum + ' olmalı. ' + steps.join('. ') + '.';
    return Q.finishNum(rng, q, grid[tgt], { min: 1, prefer: [sum - grid[tgt], grid[tgt] + 1, grid[tgt] - 1, grid[tgt] + 2] });
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
      ? 'Satırda ' + (rowC.join(', ') || 'hiçbir renk') + ' var; sütunda ' + (colC.join(', ') || 'hiçbir renk') + ' var' + (box ? '; kutudaki renkler de eleniyor' : '') + '. Geriye ' + nameOf(cols[cn[0] - 1]) + ' kalır.'
      : 'Boş kareleri tek tek eleyerek ilerleyince soru işaretinin yeri ' + nameOf(cols[sol[ask[0]][ask[1]] - 1]) + ' çıkar.';
    q.meta = { n: n, box: box, puzzle: puzzle, ask: ask, cols: cols, answer: sol[ask[0]][ask[1]] };
    const right = cols[sol[ask[0]][ask[1]] - 1];
    return Q.finish(rng, q, colorOpt(right), rng.shuffle(cols.filter((c) => c !== right)).map(colorOpt), n);
  };

  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
