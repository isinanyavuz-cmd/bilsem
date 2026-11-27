/* 3. sınıf türleri: Desen Tamamlama, Şeffaf Kâğıt, Küp Devirme, Küp Görünümü, Küp Açılımı.
   Cevaplar kuraldan hesaplanır: küp devirme ve açılım için küp gerçekten yuvarlanır/katlanır. */
(function (root) {
  'use strict';
  const B = root.Bilsem, S = B.Shapes, Q = B.Q, G = S.Grid;
  const INK = S.INK, r1 = S.r1, PAL = S.COLOR_IDS;
  const fillOf = (id) => S.COLORS[id].fill;
  const nameOf = (id) => S.COLORS[id].name;
  const SOFT = { fill: '#566889', weight: 700 };
  const BLACK = '#26324f';

  /* ---------- ortak: siyah kareli şeffaf kâğıt çizimi ---------- */
  function blackGrid(m, x, y, size, o) {
    o = o || {};
    const n = m.length, c = size / n;
    let s = '<g transform="translate(' + r1(x) + ' ' + r1(y) + ')"><rect width="' + size + '" height="' + size + '" rx="6" fill="' + (o.bg || '#fff') + '"/>';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
      if (m[r][k]) s += '<rect x="' + r1(k * c) + '" y="' + r1(r * c) + '" width="' + r1(c) + '" height="' + r1(c) + '" fill="' + BLACK + '"/>';
    }
    let lines = '';
    for (let i = 1; i < n; i++) lines += 'M' + r1(i * c) + ' 0V' + size + 'M0 ' + r1(i * c) + 'H' + size;
    s += '<path d="' + lines + '" stroke="' + (o.line || '#8aa0c4') + '" stroke-opacity=".7" stroke-width="' + r1(Math.max(1.2, size / 80)) + '" fill="none"/>';
    s += '<rect width="' + size + '" height="' + size + '" rx="6" fill="none" stroke="' + (o.edge || INK) + '" stroke-width="' + r1(Math.max(2.4, size / 36)) + '"/></g>';
    return s;
  }
  const blackOpt = (m) => ({ html: S.svg(100, 100, blackGrid(m, 9, 9, 82), { cls: 'opt-svg' }), key: 'b' + G.key(m) });

  /* ---------- Desen Tamamlama ---------- */
  const sub = (g, r0, c0, h) => g.slice(r0, r0 + h).map((row) => row.slice(c0, c0 + h));
  const randGrid = (rng, n, k) => Array.from({ length: n }, () => Array.from({ length: n }, () => rng.int(1, k)));
  const colorsUsed = (m) => new Set([].concat.apply([], m)).size;

  /* Dört köşe: bir çeyrekten simetriyle tüm desen. mode 'mirror' (aynalama) ya da 'rot' (çeyrek tur). */
  function quarters(q, mode) {
    const h = q.length, N = 2 * h, g = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < h; r++) for (let c = 0; c < h; c++) {
      const v = q[r][c];
      g[r][c] = v;
      if (mode === 'mirror') { g[r][N - 1 - c] = v; g[N - 1 - r][c] = v; g[N - 1 - r][N - 1 - c] = v; }
      else { g[c][N - 1 - r] = v; g[N - 1 - r][N - 1 - c] = v; g[N - 1 - c][r] = v; }
    }
    return g;
  }

  function buildPattern(rng, level) {
    const kinds = level === 1 ? ['tile'] : level === 2 ? ['tile', 'tile', 'tile3'] : level === 3 ? ['diag', 'mirror'] : ['rot', 'mirror8', 'rot8'];
    const kind = rng.pick(kinds), k = level === 1 ? 2 : 3, pal = rng.sample(PAL, k);
    let N = 6, g, hole = 2, p = 0, dir = 1, free = true, quad = 0;
    if (kind === 'tile' || kind === 'tile3') {
      p = kind === 'tile' ? 2 : 3;
      const kk = level === 2 && kind === 'tile3' ? 2 : k;
      let m;
      do { m = randGrid(rng, p, kk); } while (colorsUsed(m) < Math.min(kk, 2) || (kk === 3 && colorsUsed(m) < 3 && rng.chance(0.7)));
      g = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (__, c) => m[r % p][c % p]));
    } else if (kind === 'diag') {
      p = rng.pick([3, 4]);
      let seq;
      do { seq = Array.from({ length: p }, () => rng.int(1, 3)); } while (colorsUsed([seq]) < 3 && !(p === 4 && colorsUsed([seq]) >= 2));
      dir = rng.pick([1, -1]);
      g = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (__, c) => seq[(((r + dir * c) % p) + p) % p]));
    } else {
      free = false;
      N = kind.endsWith('8') ? 8 : 6;
      quad = N / 2;
      if (N === 8) hole = 3;
      let q;
      do { q = randGrid(rng, quad, 3); } while (colorsUsed(q) < 3);
      g = quarters(q, kind.startsWith('rot') ? 'rot' : 'mirror');
    }
    let r0, c0;
    if (free) { r0 = rng.int(0, N - hole); c0 = rng.int(0, N - hole); }
    else {
      const h = N / 2, qr = rng.int(0, 1), qc = rng.int(0, 1);
      r0 = qr * h + rng.int(0, h - hole); c0 = qc * h + rng.int(0, h - hole);
    }
    return { kind: kind, pal: pal, g: g, N: N, hole: hole, r0: r0, c0: c0, p: p, dir: dir };
  }

  const PATTERN_WHY = {
    tile: 'Küçük bir kalıp aynen tekrar ediyor. Boşluğun yerindeki kareler desenin başka yerlerinde de var: oradaki renklere bakınca doğru parçayı buluruz.',
    tile3: 'Küçük bir kalıp aynen tekrar ediyor. Boşluğun yerindeki kareler desenin başka yerlerinde de var: oradaki renklere bakınca doğru parçayı buluruz.',
    diag: 'Renkler çapraz çizgiler hâlinde hep aynı sırayla tekrar ediyor. Boşluğun çevresindeki çaprazları devam ettirince doğru parça çıkar.',
    mirror: 'Desen ortadan hem yatay hem dikey aynalanmış gibi simetrik. Boşluğun aynadaki karşılığı olan parçaya bakınca doğru parçayı buluruz.',
    mirror8: 'Desen ortadan hem yatay hem dikey aynalanmış gibi simetrik. Boşluğun aynadaki karşılığı olan parçaya bakınca doğru parçayı buluruz.',
    rot: 'Desenin dört köşesi aynı parçanın çeyrek tur çevrilmiş hâli. Boşluk hangi köşedeyse, başka bir köşedeki parçayı çevirerek doğru parçayı buluruz.',
    rot8: 'Desenin dört köşesi aynı parçanın çeyrek tur çevrilmiş hâli. Boşluk hangi köşedeyse, başka bir köşedeki parçayı çevirerek doğru parçayı buluruz.',
  };

  B.GEN.fillgap = function (rng, level) {
    const P = buildPattern(rng, level), h = P.hole, patch = sub(P.g, P.r0, P.c0, h);
    if (colorsUsed(patch) < 2) throw new Error('parça tek renk');
    const view = P.g.map((row) => row.slice());
    for (let r = 0; r < h; r++) for (let c = 0; c < h; c++) view[P.r0 + r][P.c0 + c] = 0;
    const size = 288, cs = size / P.N;
    const stem = S.svg(300, 300, G.draw(view, P.pal, 6, 6, size) +
      '<rect x="' + r1(6 + P.c0 * cs) + '" y="' + r1(6 + P.r0 * cs) + '" width="' + r1(h * cs) + '" height="' + r1(h * cs) + '" rx="6" fill="#fff4cc" stroke="#f0a000" stroke-width="4" stroke-dasharray="9 6"/>' +
      S.text(6 + (P.c0 + h / 2) * cs, 6 + (P.r0 + h / 2) * cs, '?', Math.min(54, h * cs * 0.7), { fill: '#e08600' }), { maxW: 320 });
    const mk = (m) => ({ html: S.svg(100, 100, G.draw(m, P.pal, 9, 9, 82), { cls: 'opt-svg' }), key: 'p' + G.key(m) });
    const single = [];
    for (let r = 0; r < h; r++) for (let c = 0; c < h; c++) for (let v = 1; v <= P.pal.length; v++) {
      if (v === patch[r][c]) continue;
      const m = patch.map((row) => row.slice());
      m[r][c] = v;
      single.push(m);
    }
    const tfs = [G.rot(patch), G.rot(G.rot(patch)), G.flipH(patch), G.flipV(patch)];
    const recolor = (m) => {
      const r = rng.int(0, h - 1), c = rng.int(0, h - 1), x = m.map((row) => row.slice());
      x[r][c] = rng.pick(Array.from({ length: P.pal.length }, (_, i) => i + 1).filter((v) => v !== x[r][c]));
      return x;
    };
    const ds = Q.spread(rng, patch, recolor, G.key, { pool: level >= 3 ? tfs : [] }).concat(rng.shuffle(tfs), rng.shuffle(single)).map(mk);
    const q = { prompt: 'Desendeki boş yere hangi parça gelmeli?', stem: stem };
    q.meta = { kind: P.kind, g: P.g, pal: P.pal, N: P.N, hole: h, r0: P.r0, c0: P.c0, p: P.p, dir: P.dir, patch: patch };
    q.explain = PATTERN_WHY[P.kind];
    return Q.finish(rng, q, mk(patch), ds);
  };

  /* ---------- Şeffaf Kâğıt ---------- */
  const ROT_NAME = { 1: 'saat yönünde çeyrek tur', 2: 'yarım tur', 3: 'saat yönünün tersine çeyrek tur' };
  const ROT_MARK = { 1: '↻ çeyrek tur', 2: '↻ yarım tur', 3: '↺ çeyrek tur' };
  const turn = (m, k) => { let x = m; for (let i = 0; i < k; i++) x = G.rot(x); return x; };
  const combine = (ms, fn) => ms[0].map((row, r) => row.map((_, c) => (fn(ms.map((m) => m[r][c])) ? 1 : 0)));
  const unionOf = (ms) => combine(ms, (v) => v.some(Boolean));
  const countOf = (m) => m.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
  const ORD3 = ['birinci', 'ikinci', 'üçüncü'];

  B.GEN.overlay = function (rng, level) {
    const n = level === 2 || level === 4 ? 4 : 3, ns = level === 4 ? rng.int(2, 3) : 2, p = n === 3 ? 0.3 : 0.24;
    let sheets, rots, result, plain;
    for (let t = 0; ; t++) {
      if (t > 400) throw new Error('kâğıtlar üretilemedi');
      sheets = Array.from({ length: ns }, () => Array.from({ length: n }, () => Array.from({ length: n }, () => (rng.chance(p) ? 1 : 0))));
      if (sheets.some((m) => countOf(m) < 2)) continue;
      rots = sheets.map(() => 0);
      if (level === 3) rots[rng.int(0, ns - 1)] = rng.pick([1, 3]);
      if (level === 4) {
        rots = sheets.map(() => rng.pick([0, 0, 1, 2, 3]));
        if (rots.every((v) => !v)) rots[rng.int(0, ns - 1)] = rng.pick([1, 3]);
      }
      result = unionOf(sheets.map((m, i) => turn(m, rots[i])));
      plain = unionOf(sheets);
      if (n * n - countOf(result) < 2) continue;
      if (rots.some(Boolean) && G.key(result) === G.key(plain)) continue;
      break;
    }
    const sz = ns === 3 ? 92 : 112, gap = 34, W = ns * sz + (ns - 1) * gap + 16, H = sz + 62;
    let inner = '';
    sheets.forEach((m, i) => {
      const x = 8 + i * (sz + gap);
      inner += S.text(x + sz / 2, 14, 'Kâğıt ' + (i + 1), 15, SOFT) + blackGrid(m, x, 28, sz, { bg: '#e3efff', line: '#6f8fbf', edge: '#3d6fb8' });
      if (rots[i]) inner += S.text(x + sz / 2, 28 + sz + 18, ROT_MARK[rots[i]], 15, { fill: '#e08600', weight: 800 });
      if (i) inner += S.text(x - gap / 2, 28 + sz / 2, '+', 28, SOFT);
    });
    const q = { stem: S.svg(W, H, inner, { maxW: Math.min(W * 1.15, 400) }) };
    const turned = rots.map((v, i) => (v ? ORD3[i] + ' kâğıt ' + ROT_NAME[v] : '')).filter(Boolean);
    q.prompt = turned.length
      ? 'Şeffaf kâğıtlar altlarındaki işaretlere göre çevrilip üst üste konuyor. Siyah kareler nasıl görünür?'
      : 'Şeffaf kâğıtlar üst üste konuyor. Siyah kareler nasıl görünür?';
    q.meta = { sheets: sheets, rots: rots, result: result, n: n };
    q.explain = 'Üst üste koyunca bir karede en az bir kâğıtta siyah varsa o kare siyah görünür. ' +
      (turned.length ? 'Önce ' + turned.join(', ') + '; sonra kâğıtları üst üste koyduk. ' : '') + 'Sonuçta ' + countOf(result) + ' siyah kare olur.';
    const wrongDir = unionOf(sheets.map((m, i) => turn(m, (4 - rots[i]) % 4)));
    const inter = combine(sheets.map((m, i) => turn(m, rots[i])), (v) => v.every(Boolean));
    const xor = combine(sheets.map((m, i) => turn(m, rots[i])), (v) => v.filter(Boolean).length === 1);
    const toggles = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const m = result.map((row) => row.slice());
      m[r][c] = 1 - m[r][c];
      toggles.push(m);
    }
    const first = rots.some(Boolean) ? [plain, wrongDir, xor, inter] : [xor, inter];
    const flip = (m) => { const x = m.map((row) => row.slice()), r = rng.int(0, n - 1), c = rng.int(0, n - 1); x[r][c] = 1 - x[r][c]; return x; };
    const spread = Q.spread(rng, result, flip, G.key, { pool: first });
    return Q.finish(rng, q, blackOpt(result), spread.concat(rng.shuffle(first), rng.shuffle(toggles)).map(blackOpt));
  };

  /* ---------- Küp Devirme ---------- */
  const OPP = { T: 'B', B: 'T', E: 'W', W: 'E', S: 'N', N: 'S' };
  /* Yüzler: T üst, B alt, E sağ (koyu), S sol (açık), W ve N görünmeyen arka yüzler. */
  function roll(f, dir) {
    const g = Object.assign({}, f);
    if (dir === 'E') { g.T = f.W; g.E = f.T; g.B = f.E; g.W = f.B; }     // sağa devrilir: sağ yüzünün üstüne yatar
    else { g.T = f.N; g.S = f.T; g.B = f.S; g.N = f.B; }                  // sola devrilir: sol yüzünün üstüne yatar
    return g;
  }
  const FACE_WORD = { T: 'üst yüz', E: 'sağ yüz', S: 'sol yüz', B: 'alt yüz' };
  const DIR_WORD = { E: 'sağa', S: 'sola' };

  function cubeSvg(f) {
    const s = 62, a = s * 0.866, b = s * 0.5, W = 330, w = 2 * a + 16, cw = (W - w) / 2, pad = 8;
    const P = (pts) => pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ');
    const face = (pts, col, shade) => '<polygon points="' + P(pts) + '" fill="' + fillOf(col) + '"/><polygon points="' + P(pts) + '" fill="#000" fill-opacity="' + shade + '"/>';
    let cube = '<g transform="translate(' + r1(cw + a + pad) + ' ' + pad + ')" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round">' +
      face([[0, 0], [a, b], [0, 2 * b], [-a, b]], f.T, 0) +
      face([[-a, b], [0, 2 * b], [0, 2 * b + s], [-a, b + s]], f.S, 0.1) +
      face([[0, 2 * b], [a, b], [a, b + s], [0, 2 * b + s]], f.E, 0.2) + '</g>';
    const ch = 2 * b + s + 2 * pad, y = ch + 52, cell = 32, grp = 2 * cell + 28, gp = 16;
    let leg = S.text(W / 2, ch + 12, 'Karşılıklı yüzler', 16, SOFT);
    [['T', 'B'], ['E', 'W'], ['S', 'N']].forEach((pr, i) => {
      const x = (W - (3 * grp + 2 * gp)) / 2 + i * (grp + gp);
      const chip = (xx, col) => '<rect x="' + r1(xx) + '" y="' + (y - cell / 2) + '" width="' + cell + '" height="' + cell + '" rx="7" fill="' + fillOf(col) + '" stroke="' + INK + '" stroke-width="2.6"/>';
      leg += chip(x, f[pr[0]]) + S.text(x + cell + 14, y, '↔', 22, SOFT) + chip(x + cell + 28, f[pr[1]]);
    });
    return S.svg(W, y + cell / 2 + 6, cube + leg, { maxW: 360 });
  }
  const colorOpt = (id) => ({
    html: S.svg(100, 100, '<rect x="22" y="8" width="56" height="56" rx="14" fill="' + fillOf(id) + '" stroke="' + INK + '" stroke-width="4"/>' + S.text(50, 83, nameOf(id), 19), { cls: 'opt-svg' }),
    key: 'c' + id,
  });

  B.GEN.roll = function (rng, level) {
    const cols = rng.shuffle(PAL), f0 = { T: cols[0], B: cols[1], E: cols[2], W: cols[3], S: cols[4], N: cols[5] };
    const steps = level === 1 ? (rng.chance(0.4) ? 0 : 1) : level === 2 ? 1 : level === 3 ? 2 : 3;
    let dirs, f, target;
    for (let t = 0; ; t++) {
      if (t > 300) throw new Error('devirme üretilemedi');
      dirs = Array.from({ length: steps }, () => rng.pick(['E', 'S']));
      f = f0;
      dirs.forEach((d) => { f = roll(f, d); });
      target = steps === 0 ? 'B' : level === 1 ? 'T' : rng.pick(['T', 'T', 'E', 'S']);
      if (steps && f[target] === f0[target]) continue;       // hiç değişmeyen yüzü sormayalım
      break;
    }
    const q = { stem: cubeSvg(f0) };
    const order = dirs.map((d) => DIR_WORD[d]);
    const seq = order.map((w, i) => (i ? 'sonra ' : steps > 1 ? 'önce ' : '') + w).join(', ');
    q.prompt = steps === 0 ? 'Bu küpün altında, yere değen yüz hangi renk?'
      : 'Küp ' + seq + ' devriliyor. Her devrilmede küp o taraftaki yüzünün üstüne yatıyor. Sonunda ' + FACE_WORD[target] + ' hangi renk olur?';
    let trace = 'Başta üst ' + nameOf(f0.T) + ', sağ ' + nameOf(f0.E) + ', sol ' + nameOf(f0.S) + '; görünmeyen alt yüz ' + nameOf(f0.B) + '. ';
    if (steps === 0) trace += 'Alt yüz üst yüzün tam karşısındadır; üst ' + nameOf(f0.T) + ' olduğu için alt ' + nameOf(f0.B) + '.';
    else {
      let cur = f0;
      dirs.forEach((d) => { cur = roll(cur, d); trace += DIR_WORD[d][0].toUpperCase() + DIR_WORD[d].slice(1) + ' devrilince üst ' + nameOf(cur.T) + ', sağ ' + nameOf(cur.E) + ', sol ' + nameOf(cur.S) + ' olur. '; });
      trace += 'Cevap: ' + nameOf(f[target]) + '.';
    }
    q.explain = trace;
    q.meta = { start: f0, dirs: dirs, target: target, answer: f[target] };
    const correct = f[target], others = PAL.filter((c) => c !== correct);
    return Q.finish(rng, q, colorOpt(correct), rng.shuffle(others).map(colorOpt));
  };

  /* ---------- Küp Görünümü ---------- */
  function towers(rng, W, D, maxH) {
    const h = [];
    for (let x = 0; x < W; x++) {
      h.push([]);
      for (let y = 0; y < D; y++) {
        const lim = Math.min(x ? h[x - 1][y] : maxH, y ? h[x][y - 1] : maxH);
        const lo = x && y && rng.chance(0.3) ? 0 : 1;
        h[x].push(!x && !y ? maxH : rng.int(Math.min(lo, lim), lim));
      }
    }
    return h;
  }
  const viewLeft = (h) => h.map((col) => Math.max.apply(null, col));
  const viewRight = (h) => { const D = h[0].length, o = []; for (let y = D - 1; y >= 0; y--) o.push(Math.max.apply(null, h.map((col) => col[y]))); return o; };
  const same = (a, b) => a.join(',') === b.join(',');

  function silhouette(v, maxH, tone) {
    const n = v.length, c = Math.min(82 / n, 82 / maxH, 34), x0 = 9 + (82 - n * c) / 2, base = 91;
    let o = '<path d="M7 ' + base + 'H93" stroke="#8aa0c4" stroke-width="3" stroke-linecap="round"/><g stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round">';
    v.forEach((hh, i) => { for (let k = 0; k < hh; k++) o += '<rect x="' + r1(x0 + i * c) + '" y="' + r1(base - (k + 1) * c) + '" width="' + r1(c) + '" height="' + r1(c) + '" fill="' + tone.l + '"/>'; });
    return o + '</g>';
  }

  B.GEN.view = function (rng, level) {
    const dims = [null, [2, 2], rng.pick([[3, 2], [2, 3]]), [3, 3], rng.pick([[4, 3], [3, 4]])][level], maxH = [0, 3, 3, 3, 4][level];
    // 1. kademede de iki yön ve üç kat: 2 kat ve hep soldan bakınca doğru cevap her soruda aynı çıkıyordu
    const side = rng.pick(['L', 'R']), tone = rng.pick(S.CUBE_TONES);
    let h, vL, vR;
    for (let t = 0; ; t++) {
      if (t > 400) throw new Error('kule üretilemedi');
      h = towers(rng, dims[0], dims[1], maxH);
      vL = viewLeft(h); vR = viewRight(h);
      const v = side === 'L' ? vL : vR;
      if (new Set(v).size < 2 || same(v, v.slice().reverse()) || same(vL, vR)) continue;
      break;
    }
    const v = side === 'L' ? vL : vR, other = side === 'L' ? vR : vL;
    const c = S.cubes(h, 40, tone), ex = 78, W = c.w + 2 * ex, H = c.h + 24;
    const ey = H - 26, ax = side === 'L' ? 36 : W - 36, dx = side === 'L' ? 1 : -1;
    const arrow = '<path d="M' + r1(ax + dx * 12) + ' ' + (ey - 16) + 'l' + dx * 34 + ' -28m' + dx * -2 + ' 15l' + dx * 2 + ' -15l' + dx * -15 + ' -2" fill="none" stroke="#e08600" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
    const stem = S.svg(W, H, '<g transform="translate(' + ex + ' 12)">' + c.inner + '</g>' + S.emoji(ax, ey, '👁️', 40) + arrow, { maxW: Math.min(W * 1.2, 420) });
    const q = { stem: stem };
    q.prompt = 'Şekildeki göz yapıya ' + (side === 'L' ? 'soldan (sol yüzün karşısından)' : 'sağdan (sağ yüzün karşısından)') + ' bakıyor. Göz yapıyı nasıl görür?';
    q.meta = { heights: h, side: side, view: v };
    q.explain = (side === 'L' ? 'Soldan bakınca sütunları soldan sağa görürüz' : 'Sağdan bakınca sütunları sağ yüzün solundan sağına görürüz') +
      '. Her sütunda en yüksek kuleyi saymak gerekir, arkadaki alçak kuleler gizlenir: ' + v.join(', ') + ' küp yüksekliğinde.';
    const mk = (vv) => ({ html: S.svg(100, 100, silhouette(vv, maxH, tone), { cls: 'opt-svg' }), key: 'v' + vv.join(',') });
    const bump = (vv, i, d) => { const o = vv.slice(); o[i] += d; return o; };
    const ds = [v.slice().reverse(), other];
    for (let i = 0; i < v.length; i++) { if (v[i] < maxH) ds.push(bump(v, i, 1)); if (v[i] > 1) ds.push(bump(v, i, -1)); }
    const nudge = (vv) => { const i = rng.int(0, vv.length - 1), d = rng.pick([1, -1]); return vv[i] + d >= 1 && vv[i] + d <= maxH ? bump(vv, i, d) : null; };
    const spread = Q.spread(rng, v, nudge, (vv) => vv.join(','), { pool: [v.slice().reverse(), other] });
    return Q.finish(rng, q, mk(v), spread.concat(rng.shuffle(ds)).filter((a) => a.length === v.length).map(mk));
  };

  /* ---------- Küp Açılımı ---------- */
  const D4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const ck = (r, c) => r + ',' + c;
  function normalize(cells) {
    const r0 = Math.min.apply(null, cells.map((c) => c[0])), c0 = Math.min.apply(null, cells.map((c) => c[1]));
    return cells.map((c) => [c[0] - r0, c[1] - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
  const cellsKey = (cells) => cells.map((c) => c.join()).join(';');
  /* Küp yuvarlanarak katlama: her kareye alta gelen yüz numarası yazılır; 6 kare 6 farklı yüz verirse açılımdır. */
  const MOVES = [
    [0, 1, (s) => ({ B: s.E, E: s.T, T: s.W, W: s.B, N: s.N, S: s.S })],
    [0, -1, (s) => ({ B: s.W, W: s.T, T: s.E, E: s.B, N: s.N, S: s.S })],
    [1, 0, (s) => ({ B: s.S, S: s.T, T: s.N, N: s.B, E: s.E, W: s.W })],
    [-1, 0, (s) => ({ B: s.N, N: s.T, T: s.S, S: s.B, E: s.E, W: s.W })],
  ];
  function fold(cells) {
    if (cells.length !== 6) return null;
    const idx = new Map(cells.map((c, i) => [ck(c[0], c[1]), i])), face = Array(6).fill(-1);
    const go = (i, st) => {
      face[i] = st.B;
      for (const m of MOVES) {
        const j = idx.get(ck(cells[i][0] + m[0], cells[i][1] + m[1]));
        if (j != null && face[j] < 0) go(j, m[2](st));
      }
    };
    go(0, { B: 0, T: 1, N: 2, S: 3, E: 4, W: 5 });
    return face.every((x) => x >= 0) && new Set(face).size === 6 ? face : null;     // karşı yüz: no ^ 1
  }
  function connected(cells) {
    const set = new Set(cells.map((c) => ck(c[0], c[1]))), seen = new Set([ck(cells[0][0], cells[0][1])]), st = [cells[0]];
    while (st.length) {
      const c = st.pop();
      for (const d of D4) { const k = ck(c[0] + d[0], c[1] + d[1]); if (set.has(k) && !seen.has(k)) { seen.add(k); st.push([c[0] + d[0], c[1] + d[1]]); } }
    }
    return seen.size === cells.length;
  }
  function transforms(cells) {
    const out = [];
    let cur = cells;
    for (let i = 0; i < 4; i++) {
      cur = cur.map((c) => [c[1], -c[0]]);
      out.push(normalize(cur), normalize(cur.map((c) => [c[0], -c[1]])));
    }
    return out;
  }
  const freeKey = (cells) => transforms(cells).map(cellsKey).sort()[0];

  let HEX = null;
  function hexominoes() {
    if (HEX) return HEX;
    let cur = [[[0, 0]]];
    for (let n = 2; n <= 6; n++) {
      const seen = new Map();
      cur.forEach((sh) => {
        const set = new Set(sh.map((c) => ck(c[0], c[1])));
        sh.forEach((c) => D4.forEach((d) => {
          const nr = c[0] + d[0], nc = c[1] + d[1];
          if (set.has(ck(nr, nc))) return;
          const t = normalize(sh.concat([[nr, nc]])), k = cellsKey(t);
          if (!seen.has(k)) seen.set(k, t);
        }));
      });
      cur = Array.from(seen.values());
    }
    const run = (cells) => {
      const set = new Set(cells.map((c) => ck(c[0], c[1])));
      let best = 1;
      cells.forEach((c) => D4.forEach((d) => { let n = 1; while (set.has(ck(c[0] + d[0] * n, c[1] + d[1] * n))) n++; best = Math.max(best, n); }));
      return best;
    };
    const block = (cells) => { const set = new Set(cells.map((c) => ck(c[0], c[1]))); return cells.some((c) => set.has(ck(c[0] + 1, c[1])) && set.has(ck(c[0], c[1] + 1)) && set.has(ck(c[0] + 1, c[1] + 1))); };
    HEX = { all: cur, valid: [], easy: [], hard: [] };
    cur.forEach((cells) => {
      if (fold(cells)) HEX.valid.push(cells);
      else if (block(cells) || run(cells) >= 5) HEX.easy.push(cells);
      else HEX.hard.push(cells);
    });
    return HEX;
  }

  function netDraw(cells, box, o) {
    o = o || {};
    const R = Math.max.apply(null, cells.map((c) => c[0])) + 1, C = Math.max.apply(null, cells.map((c) => c[1])) + 1;
    const cs = Math.min(box / C, box / R, o.max || 1e9), ox = (box - C * cs) / 2, oy = (box - R * cs) / 2;
    let s = '<g stroke="' + INK + '" stroke-width="' + r1(Math.max(2, cs / 11)) + '" stroke-linejoin="round">';
    cells.forEach((c, i) => {
      const x = ox + c[1] * cs, y = oy + c[0] * cs;
      s += '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(cs) + '" height="' + r1(cs) + '" fill="' + (o.fills ? fillOf(o.fills[i]) : '#cfe3ff') + '"/>';
    });
    s += '</g>';
    if (o.labels) cells.forEach((c, i) => { s += S.text(ox + (c[1] + 0.5) * cs, oy + (c[0] + 0.5) * cs, o.labels[i], cs * 0.5); });
    return s;
  }
  const netOpt = (cells) => ({ html: S.svg(100, 100, '<g transform="translate(6 6)">' + netDraw(cells, 88, { max: 30 }) + '</g>', { cls: 'opt-svg' }), key: 'n' + freeKey(cells) });

  B.GEN.net = function (rng, level) {
    const H = hexominoes();
    if (level <= 2) {
      const good = rng.pick(H.valid), pool = level === 1 ? H.easy : H.hard, seen = new Set(), cand = [];
      rng.shuffle(pool).forEach((cells) => {
        const k = freeKey(cells);
        if (!seen.has(k)) { seen.add(k); cand.push(cells); }
      });
      // çeldirici üçlüsü Q.finish'te seçilir: doğru açılım ne hep "en farklı" ne de hep "en tipik" şık olur
      const q = { prompt: 'Hangi açılım katlanınca bir küp olur?', stem: '' };
      q.stem = S.svg(300, 70, S.emoji(150, 36, '🧊', 52), { maxW: 120 });
      q.meta = { good: good };
      q.explain = 'Küpün 6 yüzü var. Doğru açılımı katlayınca 6 kare tam 6 farklı yüz yapar. ' +
        (level === 1 ? 'Diğerlerinde kareler katlanınca üst üste biner (yan yana 4 karelik blok ya da çok uzun sıra küp yapmaz).' : 'Diğerlerinde en az iki kare katlanınca üst üste biner, bir yüz de boş kalır.');
      Q.finish(rng, q, netOpt(good), cand.map(netOpt));
      const byKey = new Map(cand.map((c) => [netOpt(c).key, c]));
      q.meta.bad = q.options.filter((_, i) => i !== q.answer).map((o) => byKey.get(o.key));
      return q;
    }
    if (level === 3) {
      const cells = rng.pick(H.valid), face = fold(cells), cols = rng.shuffle(PAL);
      const a = rng.int(0, 5), opp = face.indexOf(face[a] ^ 1);
      const q = { prompt: 'Bu açılım katlanıp küp yapılınca ' + nameOf(cols[a]) + ' yüzün tam karşısındaki yüz hangi renk olur?' };
      q.stem = S.svg(300, 280, '<g transform="translate(20 10)">' + netDraw(cells, 260, { fills: cols, max: 60 }) + '</g>', { maxW: 340 });
      q.meta = { cells: cells, colors: cols, ask: a, opposite: opp };
      q.explain = 'Açılımı katlayınca ' + nameOf(cols[a]) + ' yüzün karşısına ' + nameOf(cols[opp]) + ' yüz gelir. Diğer dört renk ' + nameOf(cols[a]) + ' yüzün yanındaki yüzlerdir.';
      const others = [0, 1, 2, 3, 4, 5].filter((i) => i !== a && i !== opp);
      return Q.finish(rng, q, colorOpt(cols[opp]), rng.shuffle(others).map((i) => colorOpt(cols[i])));
    }
    // 4. kademe: 7 kare çizilmiş, hangisi çıkarılırsa küp açılımı olur?
    const good = rng.pick(H.valid), set = new Set(good.map((c) => ck(c[0], c[1])));
    const adds = [];
    good.forEach((c) => D4.forEach((d) => { const r = c[0] + d[0], k = c[1] + d[1]; if (!set.has(ck(r, k))) adds.push([r, k]); }));
    const cells = normalize(good.concat([rng.pick(adds)]));
    if (Math.max.apply(null, cells.map((c) => c[0])) > 5 || Math.max.apply(null, cells.map((c) => c[1])) > 5) throw new Error('çok geniş');
    const removable = [], blocked = [];
    cells.forEach((_, i) => {
      const rest = cells.filter((__, j) => j !== i);
      (connected(rest) && fold(normalize(rest)) ? removable : blocked).push(i);
    });
    if (blocked.length < 3) throw new Error('yetersiz çeldirici');
    const label = rng.shuffle([1, 2, 3, 4, 5, 6, 7]), ans = rng.pick(removable);
    const q = { prompt: 'Bir küp açılımı için 7 kare çizilmiş ama 1 kare fazla. Hangi kareyi çıkarırsak açılım küp olur?' };
    q.stem = S.svg(300, 280, '<g transform="translate(20 10)">' + netDraw(cells, 260, { labels: label, max: 52 }) + '</g>', { maxW: 340 });
    q.meta = { cells: cells, labels: label, removable: removable.map((i) => label[i]), answer: label[ans] };
    q.explain = 'Küpün 6 yüzü var, açılımda 6 kare olmalı. ' + label[ans] + ' numaralı kareyi çıkarınca kalan 6 kare katlanınca üst üste binmeden 6 farklı yüz oluşturur.';
    return Q.finish(rng, q, Q.num(label[ans]), rng.shuffle(blocked).map((i) => Q.num(label[i])));
  };

  B.Net = { fold: fold, hexominoes: hexominoes, freeKey: freeKey, connected: connected, normalize: normalize };

  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
