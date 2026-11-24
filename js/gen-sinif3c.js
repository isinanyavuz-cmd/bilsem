/* Kangaroo tarzı türler: Kapılardan Geçiş, Ocak Planı, Çubukla Kare, Noktalı Kâğıt, Geriye Doğru, Kartı Çevir.
   Cevaplar kuraldan hesaplanır (yol sayımı, bölüştürme araması, kare sayımı, benzetim). */
(function (root) {
  'use strict';
  const B = root.Bilsem, S = B.Shapes, Q = B.Q, G = S.Grid;
  const INK = S.INK, r1 = S.r1, PAL = S.COLOR_IDS;
  const fillOf = (id) => S.COLORS[id].fill;
  const SOFT = { fill: '#566889', weight: 700 };
  const ORANGE = '#e08600';

  /* ---------- Kapılardan Geçiş ---------- */
  const MAZE_SIZES = [null, [1, 2, 3, 1], [1, 3, 3, 1], [1, 3, 3, 2, 1], [1, 3, 3, 3, 1]];
  function pathCounts(sizes, edges) {
    const cnt = sizes.map((n, l) => Array(n).fill(l === 0 ? 1 : 0));
    for (let l = 0; l + 1 < sizes.length; l++) edges[l].forEach((e) => { cnt[l + 1][e[1]] += cnt[l][e[0]]; });
    return cnt;
  }

  B.GEN.maze = function (rng, level) {
    const sizes = MAZE_SIZES[level], p = level === 1 ? 0.5 : 0.55;
    let edges, cnt;
    for (let t = 0; ; t++) {
      if (t > 500) throw new Error('labirent üretilemedi');
      edges = [];
      for (let l = 0; l + 1 < sizes.length; l++) {
        const e = [];
        for (let a = 0; a < sizes[l]; a++) for (let b = 0; b < sizes[l + 1]; b++) if (rng.chance(p)) e.push([a, b]);
        for (let a = 0; a < sizes[l]; a++) if (!e.some((x) => x[0] === a)) e.push([a, rng.int(0, sizes[l + 1] - 1)]);
        for (let b = 0; b < sizes[l + 1]; b++) if (!e.some((x) => x[1] === b)) e.push([rng.int(0, sizes[l] - 1), b]);
        edges.push(e);
      }
      cnt = pathCounts(sizes, edges);
      const total = cnt[sizes.length - 1][0];
      if (total >= (level === 1 ? 4 : 5) && total <= (level === 1 ? 6 : 28)) break;      // en az 4: doğru cevap şıklar arasında her yerde olabilsin
    }
    const total = cnt[sizes.length - 1][0], gx = 84, rw = 40, gy = 62, maxN = Math.max.apply(null, sizes);
    const W = (sizes.length - 1) * gx + 2 * 52 + rw, H = maxN * gy + 16;
    const pos = (l, i) => [52 + l * gx + rw / 2, 8 + (H - 16 - sizes[l] * gy) / 2 + i * gy + gy / 2];
    let inner = '';
    edges.forEach((es, l) => es.forEach((e) => {
      const a = pos(l, e[0]), b = pos(l + 1, e[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      inner += '<path d="M' + r1(a[0]) + ' ' + r1(a[1]) + 'L' + r1(b[0]) + ' ' + r1(b[1]) + '" stroke="#8aa0c4" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M' + r1(mx - 5) + ' ' + r1(my - 6) + 'L' + r1(mx + 6) + ' ' + r1(my) + 'L' + r1(mx - 5) + ' ' + r1(my + 6) + 'Z" fill="' + ORANGE + '"/>';
    }));
    sizes.forEach((n, l) => { for (let i = 0; i < n; i++) {
      const c = pos(l, i);
      inner += '<rect x="' + r1(c[0] - 15) + '" y="' + r1(c[1] - 15) + '" width="30" height="30" rx="8" fill="#fff" stroke="' + INK + '" stroke-width="3"/>';
    } });
    inner += S.emoji(pos(0, 0)[0] - 44, pos(0, 0)[1], '🐭', 34) + S.emoji(pos(sizes.length - 1, 0)[0] + 44, pos(sizes.length - 1, 0)[1], '🧀', 34);
    const q = { stem: S.svg(W, H, inner, { maxW: Math.min(W * 1.2, 440) }) };
    q.prompt = 'Fare soldan sağa, kapılardan yalnızca okların gösterdiği yönde geçerek peynire gidiyor. Kaç farklı yol izleyebilir?';
    q.meta = { sizes: sizes, edges: edges, answer: total };
    q.explain = 'Her odaya gelen yol sayısı, o odaya kapıyla bağlı önceki odaların yol sayılarının toplamıdır. Soldan sağa yol sayıları: ' +
      cnt.map((c) => c.join(', ')).join(' | ') + '. Peynire ' + total + ' farklı yoldan gidilir.';
    return Q.finishNum(rng, q, total, { min: 1, prefer: [total - 1, total + 1, total + 2, total - 2, edges[edges.length - 1].length] });
  };

  /* ---------- Ocak Planı ---------- */
  const DISHES = ['🍲', '🍳', '🥘', '🍝', '🥧', '🍛'];
  function bestSplit(d) {
    let best = Infinity, set = 0;
    const total = d.reduce((a, b) => a + b, 0);
    for (let m = 0; m < (1 << d.length); m++) {
      let s = 0;
      for (let i = 0; i < d.length; i++) if (m & (1 << i)) s += d[i];
      const mk = Math.max(s, total - s);
      if (mk < best) { best = mk; set = m; }
    }
    return { time: best, mask: set };
  }
  function greedyTime(d) {
    const st = [0, 0];
    d.forEach((x) => { const i = st[0] <= st[1] ? 0 : 1; st[i] += x; });
    return Math.max(st[0], st[1]);
  }

  B.GEN.cook = function (rng, level) {
    const n = [0, 4, 5, 5, 6][level];
    let d, opt;
    for (let t = 0; ; t++) {
      if (t > 500) throw new Error('yemek planı üretilemedi');
      d = rng.sample([5, 10, 15, 20, 25, 30, 35, 40, 45], n);
      opt = bestSplit(d);
      const total = d.reduce((a, b) => a + b, 0), half = Math.ceil(total / 2 / 5) * 5;
      if (level >= 3 && greedyTime(d) === opt.time) continue;           // sırayla ocağa koymak yanlış sonuç versin
      if (level === 3 && opt.time === half) continue;
      if (level < 3 && opt.time === Math.max.apply(null, d)) continue;
      break;
    }
    const total = d.reduce((a, b) => a + b, 0), W = 380, rh = 38, H = 28 + n * rh;
    let inner = S.text(W / 2, 12, 'İki ocak var: ' + '🔥🔥', 17, SOFT);
    d.forEach((x, i) => {
      const y = 26 + i * rh, w = x * 5.2;
      inner += S.emoji(26, y + rh / 2 - 2, DISHES[i], 26) + '<rect x="50" y="' + (y + 5) + '" width="' + r1(w) + '" height="' + (rh - 12) + '" rx="9" fill="' + fillOf(PAL[i % PAL.length]) + '" stroke="' + INK + '" stroke-width="2.8"/>' +
        S.text(50 + w + 34, y + rh / 2 - 2, x + ' dk', 17, { weight: 800 });
    });
    const q = { stem: S.svg(W, H, inner, { maxW: 440 }) };
    q.prompt = 'Her ocağa aynı anda bir yemek konabilir ve yemek tamamen pişmeden ocaktan alınmaz. ' + n + ' yemeğin hepsinin pişmesi en az kaç dakika sürer?';
    const a = [], b = [];
    d.forEach((x, i) => (opt.mask & (1 << i) ? a : b).push(x));
    q.meta = { d: d, answer: opt.time, split: [a, b] };
    q.explain = 'Yemekleri iki ocağa en dengeli bölmek gerekir: bir ocakta ' + a.join(' + ') + ' = ' + a.reduce((x, y) => x + y, 0) + ' dk, öbüründe ' + b.join(' + ') + ' = ' + b.reduce((x, y) => x + y, 0) +
      ' dk. Hepsi, uzun süren ocağın bitmesiyle biter: ' + opt.time + ' dk.';
    // süreler 5'in katı olduğundan şıklar da 5'er dakika arayla sıralanır; doğru cevabın yeri rastgele
    const below = Math.min(rng.int(0, 3), (opt.time - 5) / 5), arr = [];
    for (let k = -below; k <= 3 - below; k++) arr.push(opt.time + 5 * k);
    q.options = arr.map(Q.num);
    q.answer = arr.indexOf(opt.time);
    return q;
  };

  /* ---------- Çubukla Kare ---------- */
  /* Çubuklar uç uca eklenerek dört eşit kenar oluşturabiliyor mu? (kırmak ve üst üste bindirmek yok) */
  function canSquare(sticks) {
    const total = sticks.reduce((a, b) => a + b, 0);
    if (total % 4) return null;
    const side = total / 4, s = sticks.slice().sort((x, y) => y - x), sums = [0, 0, 0, 0], groups = [[], [], [], []];
    const go = (i) => {
      if (i === s.length) return sums.every((v) => v === side);
      const seen = new Set();
      for (let k = 0; k < 4; k++) {
        if (sums[k] + s[i] > side || seen.has(sums[k])) continue;
        seen.add(sums[k]);
        sums[k] += s[i]; groups[k].push(s[i]);
        if (go(i + 1)) return true;
        sums[k] -= s[i]; groups[k].pop();
      }
      return false;
    };
    return go(0) ? { side: side, groups: groups.map((g) => g.slice()) } : null;
  }
  const stickList = (a, b, s, l) => Array(s).fill(a).concat(Array(l).fill(b));
  const stickText = (s, l) => [s ? s + ' kısa' : '', l ? l + ' uzun' : ''].filter(Boolean).join(' ve ');

  B.GEN.sticks = function (rng, level) {
    const lens = [null, [1, 3], [1, 3], [2, 3], [2, 5]][level], maxN = [0, 8, 10, 11, 12][level];
    let combos, good;
    for (let t = 0; ; t++) {
      if (t > 2000) throw new Error('çubuk takımları üretilemedi');
      combos = [];
      while (combos.length < 4) {
        const s = rng.int(0, 8), l = rng.int(0, 6);
        if (s + l < 4 || s + l > maxN || combos.some((c) => c[0] === s && c[1] === l)) continue;
        combos.push([s, l]);
      }
      const ok = combos.filter((c) => canSquare(stickList(lens[0], lens[1], c[0], c[1])));
      if (ok.length !== 1) continue;
      if (level >= 3) {                                            // toplam 4'e bölünüp de yine de olmayan bir çeldirici olsun
        const trick = combos.some((c) => { const L = stickList(lens[0], lens[1], c[0], c[1]); return L.reduce((a, b) => a + b, 0) % 4 === 0 && !canSquare(L); });
        if (!trick) continue;
      }
      good = ok[0];
      break;
    }
    const sc = 18, W = 330;
    const stick = (x, y, len, col) => '<rect x="' + x + '" y="' + y + '" width="' + r1(len * sc) + '" height="16" rx="8" fill="' + fillOf(col) + '" stroke="' + INK + '" stroke-width="2.6"/>';
    const inner = S.text(W / 2, 12, 'Elimizde iki boy çubuk var', 16, SOFT) +
      stick(36, 30, lens[0], 'yellow') + S.text(36 + lens[0] * sc + 56, 38, 'kısa: ' + lens[0] + ' cm', 17) +
      stick(36, 62, lens[1], 'blue') + S.text(36 + lens[1] * sc + 56, 70, 'uzun: ' + lens[1] + ' cm', 17);
    const q = { stem: S.svg(W, 92, inner, { maxW: 380 }), layout: 'wide' };
    q.prompt = 'Çubuklar kırılmadan ve üst üste bindirilmeden uç uca eklenerek bir kare yapılacak. Hangi takımla kare yapılabilir?';
    const info = canSquare(stickList(lens[0], lens[1], good[0], good[1]));
    q.meta = { lens: lens, combos: combos, good: good };
    q.explain = 'Toplam uzunluk ' + (good[0] * lens[0] + good[1] * lens[1]) + ' cm; karenin 4 kenarı eşit olacağından her kenar ' + info.side + ' cm olmalı. ' +
      stickText(good[0], good[1]) + ' çubukla kenarlar şöyle çıkar: ' + info.groups.map((g) => g.join(' + ')).join(' | ') + '. Diğer takımlarda toplam 4\'e bölünmez ya da kenarlar eşit yapılamaz.';
    const right = Q.text(stickText(good[0], good[1]));
    return Q.finish(rng, q, right, combos.filter((c) => c !== good).map((c) => Q.text(stickText(c[0], c[1]))));
  };

  /* ---------- Noktalı Kâğıt ---------- */
  function countSquares(pts, W, H) {
    const has = new Set(pts.map((p) => p[0] + ',' + p[1])), byVec = {}, areas = new Set();
    let total = 0;
    pts.forEach((p) => {
      for (let a = 1; a < Math.max(W, H); a++) for (let b = 0; b < Math.max(W, H); b++) {
        const v = [a, b], w = [-b, a];
        if (has.has((p[0] + v[0]) + ',' + (p[1] + v[1])) && has.has((p[0] + w[0]) + ',' + (p[1] + w[1])) && has.has((p[0] + v[0] + w[0]) + ',' + (p[1] + v[1] + w[1]))) {
          total++; areas.add(a * a + b * b);
          const k = a + ',' + b; byVec[k] = (byVec[k] || 0) + 1;
        }
      }
    });
    return { total: total, areas: areas.size, byVec: byVec };
  }

  B.GEN.dots = function (rng, level) {
    const dim = [null, [3, 3], [4, 3], [4, 4], [4, 4]][level], W = dim[0], H = dim[1];
    const all = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) all.push([x, y]);
    const mode = level === 4 ? 'areas' : 'count';
    let pts, res;
    for (let t = 0; ; t++) {
      if (t > 500) throw new Error('nokta kümesi üretilemedi');
      const drop = level === 1 || level === 2 ? 0 : level === 3 ? rng.int(3, 5) : rng.int(0, 2);
      const gone = new Set(rng.sample(all.map((_, i) => i), drop));
      pts = all.filter((_, i) => !gone.has(i));
      res = countSquares(pts, W, H);
      const ans = mode === 'count' ? res.total : res.areas;
      if (level === 3 && (ans < 2 || ans > 9)) continue;
      if (level === 4 && ans < 4) continue;
      if (ans < 2) continue;
      break;
    }
    const gap = 54, pad = 26, svgW = (W - 1) * gap + 2 * pad, svgH = (H - 1) * gap + 2 * pad;
    let inner = '';
    pts.forEach((p) => { inner += '<circle cx="' + (pad + p[0] * gap) + '" cy="' + (pad + p[1] * gap) + '" r="7.5" fill="' + INK + '"/>'; });
    const q = { stem: S.svg(svgW, svgH, inner, { maxW: Math.min(svgW * 1.2, 360) }) };
    const ans = mode === 'count' ? res.total : res.areas;
    q.prompt = mode === 'count' ? 'Köşeleri bu noktalarda olan kaç kare çizilebilir? (Eğik duran kareler de sayılır.)'
      : 'Köşeleri bu noktalarda olan karelerden kaç tanesi birbirinden farklı büyüklüktedir? (Eğik duran kareler de sayılır.)';
    q.meta = { W: W, H: H, pts: pts, mode: mode, answer: ans, total: res.total, areas: res.areas };
    const parts = Object.keys(res.byVec).sort().map((k) => { const v = k.split(',').map(Number); return v[1] === 0 ? v[0] + '×' + v[0] + ' düz kare: ' + res.byVec[k] : 'eğik kare (' + v[0] + ' sağa, ' + v[1] + ' yukarı): ' + res.byVec[k]; });
    q.explain = 'Önce kenar boyuna göre sayalım: ' + parts.join('; ') + '. Toplam ' + res.total + ' kare' + (mode === 'areas' ? '; bunların ' + res.areas + ' tanesi farklı büyüklükte (alanlar: kenar vektöründen a² + b² bulunur).' : '.');
    return Q.finishNum(rng, q, ans, { min: 1, prefer: [mode === 'count' ? res.areas : res.total, ans + 1, ans - 1, ans + 2] });
  };

  /* ---------- Geriye Doğru ---------- */
  const OPS = [
    { id: 'add', text: (k) => 'sayıya ' + k + ' ekledi', fn: (x, k) => x + k },
    { id: 'sub', text: (k) => 'sayıdan ' + k + ' çıkardı', fn: (x, k) => x - k },
    { id: 'mul', text: (k) => 'sayıyı ' + k + ' ile çarptı', fn: (x, k) => x * k },
    { id: 'half', text: () => 'sayının yarısını aldı', fn: (x) => x / 2 },
  ];
  const cap = (t) => t.charAt(0).toLocaleUpperCase('tr') + t.slice(1);
  const robotCuts = (h) => { let heads = h, cuts = 0; while (heads > 0) { cuts++; heads--; if (heads > 0 && cuts % 3 === 0) heads++; } return cuts; };

  B.GEN.back = function (rng, level) {
    if (level === 4 && rng.chance(0.5)) {
      let h, c;
      do { h = rng.int(6, 16); c = robotCuts(h); } while (c % 3 === 0);
      const q = { prompt: 'Kötü robotun kafaları kesilerek yenilecek. Her 3 kafa kesildiğinde 1 yeni kafa çıkıyor. Robotu yenmek için toplam ' + c + ' kafa kesmek gerekiyor. Robotun başlangıçta kaç kafası vardı?' };
      q.stem = S.svg(220, 80, S.emoji(110, 40, '🤖', 56), { maxW: 140 });
      q.meta = { robot: true, h: h, cuts: c, answer: h };
      const regrown = Math.floor((c - 1) / 3);
      q.explain = 'Her 3. kesişten sonra 1 kafa uzar. ' + c + ' kesişte bu ' + regrown + ' kez olur (' + Array.from({ length: regrown }, (_, i) => 3 * (i + 1)).join('., ') + '. kesişlerde). Uzayan kafalar da kesildiği için başta ' + c + ' − ' + regrown + ' = ' + h + ' kafa vardı.';
      return Q.finishNum(rng, q, h, { min: 1, prefer: [c, h + 1, h - 1, regrown, c - regrown + 1] });
    }
    const steps = [0, 1, 2, 3, 4][level];
    let ops, start, val;
    for (let t = 0; ; t++) {
      if (t > 500) throw new Error('işlem zinciri üretilemedi');
      start = rng.int(2, level === 1 ? 15 : 24);
      val = start;
      ops = [];
      let bad = false;
      for (let i = 0; i < steps && !bad; i++) {
        const o = rng.pick(OPS), k = o.id === 'mul' ? rng.int(2, 3) : o.id === 'half' ? 0 : rng.int(2, level === 1 ? 12 : 9);
        if (o.id === 'half' && (val % 2 || val < 4)) { bad = true; break; }
        if (o.id === 'sub' && val - k < 1) { bad = true; break; }
        if (o.id === 'mul' && val * k > 90) { bad = true; break; }
        if (ops.length && ops[ops.length - 1].o.id === o.id) { bad = true; break; }
        val = o.fn(val, k);
        ops.push({ o: o, k: k });
      }
      if (!bad && val >= 1 && val <= 99 && (steps < 2 || ops.some((x) => x.o.id === 'mul' || x.o.id === 'half'))) break;
    }
    const who = rng.pick(['Ali', 'Ayşe', 'Can', 'Elif', 'Mert', 'Defne']);
    const sent = ops.map((x, i) => {
      const t = x.o.text(x.k);
      return ops.length === 1 ? cap(t) : (i === 0 ? 'Önce ' : i === ops.length - 1 ? 'En son ' : 'Sonra ') + t;
    }).join('. ') + '.';
    const story = who + ' aklından bir sayı tuttu. ' + sent + ' Sonuç ' + val + ' oldu.';
    const q = { prompt: who + ' hangi sayıyı tutmuştu?', stem: '<div class="story"><p>' + story + '</p></div>', promptBelow: true };
    q.speech = story + ' ' + q.prompt;
    q.meta = { start: start, ops: ops.map((x) => [x.o.id, x.k]), result: val, answer: start };
    let back = val;
    const lines = [];
    for (let i = ops.length - 1; i >= 0; i--) {
      const x = ops[i];
      const prev = x.o.id === 'add' ? back - x.k : x.o.id === 'sub' ? back + x.k : x.o.id === 'mul' ? back / x.k : back * 2;
      lines.push(back + (x.o.id === 'add' ? ' − ' + x.k : x.o.id === 'sub' ? ' + ' + x.k : x.o.id === 'mul' ? ' ÷ ' + x.k : ' × 2') + ' = ' + prev);
      back = prev;
    }
    q.explain = 'Sondan başa doğru, her işlemin tersini yap: ' + lines.join(', ') + '. Tutulan sayı ' + start + '.';
    return Q.finishNum(rng, q, start, { min: 1, prefer: [val, start + 1, start - 1, val - ops.reduce((a, x) => a + (x.o.id === 'add' ? x.k : 0), 0)] });
  };

  /* ---------- Kartı Çevir ---------- */
  /* Kart bir dikey (sağ/sol kenar) ya da yatay (üst/alt kenar) eksen çevresinde 180° döner. Matrisle yürütülür. */
  const RV = [-1, 1, -1], RH = [1, -1, -1];            // köşegen matrisler: x, y, z işaretleri
  const FLIP_AXIS = { sağ: RV, sol: RV, üst: RH, alt: RH };
  function flipsView(seq) {                              // yürütüldükten sonra arka yüz görünüyorsa dönüşüm işaretleri
    const m = [1, 1, 1];
    seq.forEach((f) => { for (let i = 0; i < 3; i++) m[i] *= FLIP_AXIS[f][i]; });
    return m[2] === -1 ? { x: -m[0], y: m[1] } : null;   // arka yüzün, ilk bakıştaki kart koordinatlarındaki görünümü
  }
  const FLIP_NAME = { sağ: 'sağ kenarından', sol: 'sol kenarından', üst: 'üst kenarından', alt: 'alt kenarından' };

  B.GEN.flip = function (rng, level) {
    const sides = ['sağ', 'sol', 'üst', 'alt'];
    const n = level >= 3 ? 4 : 3, pal = rng.sample(PAL, 2);
    let m, keys;
    for (let t = 0; ; t++) {
      if (t > 300) throw new Error('kart resmi üretilemedi');
      m = Array.from({ length: n }, () => Array.from({ length: n }, () => (rng.chance(0.5) ? rng.int(1, 2) : 0)));
      const tf = [m, G.flipH(m), G.flipV(m), G.flipH(G.flipV(m))];
      keys = tf.map(G.key);
      if (new Set(keys).size === 4 && m.flat().filter(Boolean).length >= n + 1) break;
    }
    // verilen: tek çevirme (sağ ya da üst). Sorulan: tek sayıda çevirme dizisi.
    const given = rng.pick(['sağ', 'üst']);
    const extra = level === 1 ? 0 : level === 2 ? 0 : level === 3 ? 2 : 4;
    let ask;
    for (let t = 0; ; t++) {
      if (t > 300) throw new Error('çevirme dizisi üretilemedi');
      ask = [rng.pick(sides)];
      for (let i = 0; i < extra; i++) ask.push(rng.pick(sides));
      if (level === 1 && FLIP_AXIS[ask[0]] === FLIP_AXIS[given]) continue;     // 1. kademe: öbür eksen
      if (level === 2 && ask[0] === given) continue;                            // 2. kademe: karşı kenar da olabilir (aynı görüntü)
      if (!flipsView(ask)) continue;
      break;
    }
    const g = flipsView([given]), t = flipsView(ask);
    const sx = g.x * t.x, sy = g.y * t.y;                               // köşegen matrisler kendi tersidir
    let ans = m;
    if (sx === -1) ans = G.flipH(ans);
    if (sy === -1) ans = G.flipV(ans);
    const stem = S.svg(220, 212, G.draw(m, pal, 30, 14, 160) +
      S.text(110, 198, '(kartın arka yüzü)', 15, SOFT), { maxW: 250 });
    const q = { stem: stem };
    q.prompt = 'Kart ' + FLIP_NAME[given] + ' çevrilince arka yüzü yukarıdaki gibi görünüyor. Kartı baştan alıp ' +
      (ask.length === 1 ? FLIP_NAME[ask[0]] + ' çevirseydik' : 'sırayla ' + ask.map((s) => FLIP_NAME[s]).join(', ') + ' çevirseydik') + ' hangi yüz görünürdü?';
    q.meta = { given: given, ask: ask, picture: m, answer: ans };
    q.explain = 'Sağ ya da sol kenardan çevirmek resmi sağ-sol ters (ayna) gösterir; üst ya da alt kenardan çevirmek aşağı-yukarı ters gösterir. ' +
      (ask.length === 1 ? 'Bu yüzden ' + FLIP_NAME[ask[0]] + ' çevirince ' + (sx === 1 && sy === 1 ? 'aynı resim' : sx === -1 && sy === -1 ? 'resmin yarım tur döndürülmüşü' : sx === -1 ? 'resmin sağ-sol ters hâli' : 'resmin aşağı-yukarı ters hâli') + ' görünür.'
        : 'Çevirmeleri sırayla uygulayınca sonuç: ' + (sx === 1 && sy === 1 ? 'verilen resmin aynısı.' : sx === -1 && sy === -1 ? 'verilen resmin yarım tur döndürülmüşü.' : sx === -1 ? 'verilen resmin sağ-sol ters hâli.' : 'verilen resmin aşağı-yukarı ters hâli.'));
    const mk = (x) => ({ html: S.svg(100, 100, G.draw(x, pal, 9, 9, 82), { cls: 'opt-svg' }), key: 'k' + G.key(x) });
    return Q.finish(rng, q, mk(ans), [m, G.flipH(m), G.flipV(m), G.flipH(G.flipV(m))].map(mk));
  };

  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
