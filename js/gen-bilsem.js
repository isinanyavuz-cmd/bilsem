/* BİLSEM'in resmî tiplerinden eksik kalanlar: Harf Şifresi (şifreleme) ve Eşitlik.
   Cevaplar hesaplanır; kural ve eşitlik sistemlerinin tek cevap verdiği üretimde denetlenir. */
(function (root) {
  'use strict';
  const B = root.Bilsem, S = B.Shapes, Q = B.Q;
  const INK = S.INK, r1 = S.r1, PAL = S.COLOR_IDS;
  const SOFT = { fill: '#566889', weight: 700 };

  /* ---------- Harf Şifresi ---------- */
  const ALPHA = Array.from('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ');   // 29 harflik Türk alfabesi
  const WORDS = ['KEDİ', 'ELMA', 'KUŞ', 'ARABA', 'KALEM', 'OKUL', 'BALIK', 'KUZU', 'MASA', 'ÇİÇEK', 'GÖZ', 'AĞAÇ', 'DENİZ', 'BULUT', 'TAVUK', 'YILDIZ', 'AYI', 'KOLTUK'];
  const N29 = ALPHA.length;
  /* kural: { kind: 'shift' | 'atbash', k, rev } */
  function encode(word, rule) {
    const out = Array.from(word).map((ch) => {
      const i = ALPHA.indexOf(ch);
      if (i < 0) throw new Error('alfabede olmayan harf: ' + ch);
      return ALPHA[rule.kind === 'shift' ? (((i + rule.k) % N29) + N29) % N29 : N29 - 1 - i];
    });
    return (rule.rev ? out.reverse() : out).join('');
  }
  const RULES = [];
  [false, true].forEach((rev) => {
    [-3, -2, -1, 1, 2, 3].forEach((k) => RULES.push({ kind: 'shift', k: k, rev: rev }));
    RULES.push({ kind: 'atbash', k: 0, rev: rev });
  });
  const ruleKey = (r) => r.kind + r.k + (r.rev ? 'r' : '');
  const ruleText = (r) => {
    const base = r.kind === 'atbash' ? 'Alfabede ilk harfin yerine son harf, ikinci harfin yerine sondan ikinci harf yazılıyor (A yerine Z, B yerine Y gibi).'
      : 'Her harfin yerine alfabede ondan ' + Math.abs(r.k) + (r.k > 0 ? ' sonraki' : ' önceki') + ' harf yazılıyor.';
    return base + (r.rev ? ' Sonra kelime tersten yazılıyor.' : '');
  };

  B.GEN.cipher = function (rng, level) {
    const pool = level === 1 ? RULES.filter((r) => r.kind === 'shift' && !r.rev && Math.abs(r.k) === 1)
      : level === 2 ? RULES.filter((r) => r.kind === 'shift' && !r.rev && Math.abs(r.k) >= 2)
        : level === 3 ? RULES.filter((r) => (r.kind === 'atbash' && !r.rev) || (r.kind === 'shift' && r.rev && Math.abs(r.k) === 1))
          : RULES.filter((r) => r.rev);
    let rule, ex, target;
    for (let t = 0; ; t++) {
      if (t > 500) throw new Error('şifre üretilemedi');
      rule = rng.pick(pool);
      const w = rng.sample(WORDS.filter((x) => (level === 1 ? x.length <= 4 : x.length >= 3)), 2);
      ex = w[0]; target = w[1];
      if (level === 1 && target.length > 4) continue;
      // örnek çifti tek bir kurala uymalı
      const fits = RULES.filter((r) => encode(ex, r) === encode(ex, rule));
      if (fits.length !== 1) continue;
      if (new Set(Array.from(target)).size < 3) continue;
      break;
    }
    const exCode = encode(ex, rule), answer = encode(target, rule);
    // şekil: örnek kelime ve şifresi, altında sorulan kelime
    const cs = 40, g = 6, row = (letters, y, fill) => Array.from(letters).map((ch, i) => S.tile(8 + i * (cs + g), y, cs, fill ? { fill: fill } : {}) + S.text(8 + i * (cs + g) + cs / 2, y + cs / 2, ch, 26)).join('');
    const W = Math.max(ex.length, target.length) * (cs + g) + 16 + 2;
    const arrow = (y) => '<path d="M' + r1(W / 2) + ' ' + y + 'v16m-7 -7l7 7l7 -7" fill="none" stroke="#566889" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>';
    const inner = S.text(W / 2, 10, 'şifre', 14, SOFT) + row(ex, 20) + arrow(66) + row(exCode, 90, '#e8ddff') +
      S.text(W / 2, 148, 'aynı şifre', 14, SOFT) + row(target, 158) + arrow(204) + Array.from(target).map((_, i) => S.qtile(8 + i * (cs + g), 228, cs)).join('');
    const q = { stem: S.svg(W, 276, inner, { maxW: Math.min(W * 1.2, 360) }) };
    q.prompt = 'Bir şifrede ' + ex + ' kelimesi ' + exCode + ' olarak yazılıyor. Aynı şifreyle ' + target + ' nasıl yazılır?';
    q.meta = { rule: rule, ex: ex, exCode: exCode, target: target, answer: answer };
    const pairs = Array.from(ex).map((ch, i) => ch + '→' + Array.from(exCode)[rule.rev ? ex.length - 1 - i : i]);
    q.explain = ruleText(rule) + ' (Örnekte ' + (rule.rev ? 'tersten yazmadan önce: ' : '') + pairs.join(', ') + '.) ' + target + ' kelimesi böylece ' + answer + ' olur.';
    const wrong = RULES.filter((r) => ruleKey(r) !== ruleKey(rule)).map((r) => encode(target, r));
    return Q.finish(rng, q, Q.text(answer), rng.shuffle(wrong).map(Q.text));
  };

  /* ---------- Eşitlik ---------- */
  const MULTI = (counts) => counts.reduce((a, c) => a + c, 0);
  const valueOf = (counts, v) => counts.reduce((a, c, i) => a + c * v[i], 0);
  /* sayı vektörlerini küçükten büyüğe tarar: ürün: tüm (c0..cn) boyları ≤ max toplam */
  function multisets(nT, maxTotal) {
    const out = [];
    const go = (i, left, cur) => {
      if (i === nT) { if (MULTI(cur) > 0) out.push(cur.slice()); return; }
      for (let c = 0; c <= left; c++) { cur.push(c); go(i + 1, left - c, cur); cur.pop(); }
    };
    go(0, maxTotal, []);
    return out;
  }

  B.GEN.equiv = function (rng, level) {
    const nT = level <= 2 ? 2 : 3, nRows = [0, 1, 2, 2, 3][level], hi = [0, 4, 6, 8, 9][level];
    const shapes = rng.sample(['circle', 'square', 'triangle', 'star', 'heart', 'hexagon'], nT), colors = rng.sample(PAL, nT);
    const figs = shapes.map((s, i) => ({ shape: s, color: colors[i] }));
    const all = multisets(nT, 4);
    let v, rows, ask, T, unit, n, consistent;
    for (let t = 0; ; t++) {
      if (t > 2000) throw new Error('eşitlik sistemi üretilemedi');
      v = Array.from({ length: nT }, () => rng.int(1, hi));
      if (new Set(v).size < nT) continue;
      rows = [];
      let bad = false;
      for (let r = 0; r < nRows && !bad; r++) {
        const left = rng.pick(all.filter((c) => MULTI(c) >= 1 && MULTI(c) <= (level === 1 ? 3 : 4)));
        const rights = all.filter((c) => valueOf(c, v) === valueOf(left, v) && JSON.stringify(c) !== JSON.stringify(left) && !c.some((x, i) => x > 0 && left[i] > 0));
        if (!rights.length) { bad = true; break; }
        rows.push({ left: left, right: rng.pick(rights) });
      }
      if (bad) continue;
      // sorulan: sol tarafın toplamı, hangi şekilden kaç tanedir?
      const qLeft = rng.pick(all.filter((c) => MULTI(c) >= 1 && MULTI(c) <= (level <= 2 ? 3 : 4) && c.filter((x) => x > 0).length <= (level >= 3 ? 2 : 1)));
      const Tn = valueOf(qLeft, v), cand = [];
      for (let u = 0; u < nT; u++) if (!qLeft[u] && Tn % v[u] === 0 && Tn / v[u] >= 2 && Tn / v[u] <= 12) cand.push(u);
      if (!cand.length) continue;
      const u = rng.pick(cand);
      // her değer üçlüsü (1..14) satırları sağlıyorsa sorulan sayı aynı mı?
      const answers = new Set(), good = [];
      const tri = (vv) => {
        if (rows.every((r) => valueOf(r.left, vv) === valueOf(r.right, vv))) {
          const tt = valueOf(qLeft, vv);
          answers.add(tt % vv[u] === 0 ? tt / vv[u] : -1);
          good.push(vv.slice());
        }
      };
      const rec = (i, cur) => { if (i === nT) { tri(cur); return; } for (let x = 1; x <= 14; x++) { cur.push(x); rec(i + 1, cur); cur.pop(); } };
      rec(0, []);
      if (answers.size !== 1 || answers.has(-1)) continue;
      ask = qLeft; unit = u; T = Tn; n = Tn / v[u]; consistent = good;
      break;
    }
    // en küçük tam sayı çözümü (açıklama için)
    consistent.sort((a, b) => a.reduce((x, y) => x + y, 0) - b.reduce((x, y) => x + y, 0));
    const small = consistent[0], size = 34, gap = 6;
    const items = (counts) => { const a = []; counts.forEach((c, i) => { for (let k = 0; k < c; k++) a.push(i); }); return a; };
    const width = (list) => list.length * (size + gap);
    const eq = (x, y) => S.text(x, y, '=', 34, SOFT);
    const maxL = Math.max.apply(null, rows.map((r) => width(items(r.left))).concat([width(items(ask))])), maxR = Math.max.apply(null, rows.map((r) => width(items(r.right))).concat([size + 12 + size + gap]));
    const W = 16 + maxL + 40 + maxR, rowH = size + 18, H = 12 + (rows.length + 1) * rowH;
    let inner = '';
    const drawList = (list, x, y) => list.map((i, k) => S.figAt(figs[i], x + k * (size + gap), y, size)).join('');
    rows.forEach((r, ri) => {
      const y = 10 + ri * rowH;
      inner += drawList(items(r.left), 8 + maxL - width(items(r.left)), y) + eq(8 + maxL + 20, y + size / 2) + drawList(items(r.right), 8 + maxL + 40, y);
    });
    const yq = 10 + rows.length * rowH + 6;
    inner += '<path d="M8 ' + (yq - 8) + 'H' + (W - 8) + '" stroke="#c5d3ea" stroke-width="2.5" stroke-dasharray="6 6"/>' +
      drawList(items(ask), 8 + maxL - width(items(ask)), yq) + eq(8 + maxL + 20, yq + size / 2) + S.qtile(8 + maxL + 40, yq - 3, size + 6) + S.figAt(figs[unit], 8 + maxL + 40 + size + 12, yq, size);
    const q = { stem: S.svg(W, H + 14, inner, { maxW: Math.min(W * 1.25, 420) }) };
    q.prompt = 'Aynı şekiller hep aynı ağırlıkta. Son eşitlikte soru işaretinin yerine kaç tane gelmeli?';
    q.meta = { nT: nT, rows: rows, ask: ask, unit: unit, answer: n, small: small };
    const nm = (i) => S.name(figs[i]);
    q.explain = 'Şekillere değer verelim: ' + figs.map((f, i) => S.name(f) + ' = ' + small[i]).join(', ') + '. ' +
      rows.map((r) => valueOf(r.left, small) + ' = ' + valueOf(r.right, small)).join(', ') + ' eşitlikleri bu değerlerle doğru. Sorudaki sol taraf ' + valueOf(ask, small) + ' eder; bir ' + nm(unit) + ' ' + small[unit] + ' olduğu için ' + valueOf(ask, small) + ' ÷ ' + small[unit] + ' = ' + n + ' tane gerekir.';
    return Q.finishNum(rng, q, n, { min: 1, prefer: [n + 1, n - 1, n + 2, MULTI(ask)] });
  };

  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
