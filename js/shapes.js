/* Şekil çizimleri ve görsel standart ("kil dili"). Her şey SVG metni üretir; DOM gerekmez.

   GÖRSEL STANDART: soru ve şık görsellerinin bütün renkleri, çizgi kalınlıkları, köşe ve gölge kuralları
   bu dosyadadır (STIL, COLORS ve aşağıdaki yardımcılar). Üreteç dosyaları (gen-*.js) renk kodu yazmaz;
   tests/stil.test.js bunu denetler. Kurallar:
   - Işık hep yukarıdan gelir: her kil parçanın üstü parlak (bz-gloss), altında koyu bir dudak (bz-lip) vardır.
     Şekil dönse ya da aynalansa da dudak ekranda aşağıda kalır.
   - Kenar çizgisi siyah değil, dolgunun koyu tonudur (COLORS[..].edge). Mürekkep (STIL.ink) yalnız yazıda,
     gölge resimlerinde ve ince yapı çizgilerinde kullanılır.
   - Malzemeler: kil (6 renk), kutu ve tahta (krem), soru işareti kutusu (sarı, kesik çizgili), kâğıt (hardal),
     cam ve su (mavi), yön ve eksen işaretleri (turuncu).
   - Soru kâğıdı açık ve koyu temada aynı (açık) kalır; bu yüzden görseller tek palet kullanır.
   - Deneme sınavında (html.exam-on) css dudakları ve parlaklığı gizler: aynı şekiller süssüz görünür. */
(function (root) {
  'use strict';
  const Bilsem = root.Bilsem = root.Bilsem || {};
  const r1 = (v) => Math.round(v * 10) / 10;

  const STIL = {
    ink: '#2b2048', inkDeep: '#140c2c', soft: '#6f5d78', white: '#ffffff',
    tile: '#fffaf0', tileLine: '#dcc4a2', tileLip: '#d6b990',          // şekil kutusu
    board: '#f3dfc0', boardLine: '#d3b68b',                             // tablo ve oyun tahtası zemini
    hi: '#fff1c4', hiLine: '#e09a00', hiInk: '#b87400',                 // soru işareti kutusu, başlangıç karesi
    accent: '#f08c00',                                                  // yön oku, katlama ve simetri çizgisi
    paper: '#ffe08a', paperLine: '#c9982a', paperGrid: '#e3bc52',       // katlanan kâğıt, küp açılımı
    glass: '#dcebff', glassLine: '#4d8fdd', water: '#2f9be1',           // ayna, şeffaf kâğıt, su
    W: { hair: 1.5, thin: 2.5, line: 3.5, bold: 5 },                    // çizgi kalınlıkları (100 birimlik kutuya göre)
    R: 0.2,                                                             // kutu köşe yuvarlaklığı (kenarın oranı)
    LIP: 4,                                                             // şeklin altındaki dudak (100 birimlik kutuda)
  };
  const INK = STIL.ink;

  /* fill: dolgu, edge: kenar ve dudak (dolgunun koyu tonu), tint: açık ton (çizgili dolgu, şifreli kutu) */
  const COLORS = {
    red: { name: 'kırmızı', fill: '#f0525f', edge: '#b02c42', tint: '#ffd6da' },
    blue: { name: 'mavi', fill: '#3f8ef5', edge: '#1f57b4', tint: '#d3e5ff' },
    yellow: { name: 'sarı', fill: '#ffd23a', edge: '#c08a0c', tint: '#fff1b8' },
    green: { name: 'yeşil', fill: '#37c06b', edge: '#1a8345', tint: '#cff2dc' },
    purple: { name: 'mor', fill: '#a467f0', edge: '#6c3ab8', tint: '#e8dbff' },
    orange: { name: 'turuncu', fill: '#ff9636', edge: '#c05c17', tint: '#ffe2c4' },
  };
  const COLOR_IDS = Object.keys(COLORS);
  const TONE_INK = { fill: STIL.ink, edge: STIL.ink, tint: '#cfc8dc', flat: true };       // gölge resmi: düz, tek renk
  const TONE_BLACK = { fill: STIL.ink, edge: STIL.inkDeep, tint: '#cfc8dc' };            // siyah kare
  const TONE_PAPER = { fill: STIL.paper, edge: STIL.paperLine, tint: '#fff3c9' };
  /* renk adı ya da hazır ton nesnesi -> ton */
  const tone = (c) => (typeof c === 'object' ? c : c === 'ink' ? TONE_INK : c === 'black' ? TONE_BLACK : c === 'paper' ? TONE_PAPER : COLORS[c]);

  function polyPts(n, R, rot) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = ((rot || 0) + (i * 360) / n - 90) * Math.PI / 180;
      pts.push(r1(R * Math.cos(a)) + ',' + r1(R * Math.sin(a)));
    }
    return pts.join(' ');
  }
  function starPts(R, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i * 36 - 90) * Math.PI / 180, rad = i % 2 ? r : R;
      pts.push(r1(rad * Math.cos(a)) + ',' + r1(rad * Math.sin(a)));
    }
    return pts.join(' ');
  }

  /* sym: şekil kaç derecede bir kendisiyle aynı görünür (90'ın katlarıyla döndürmede). */
  const SHAPES = {
    circle: { name: 'daire', gen: 'dairenin', abl: 'daireden', sym: 90, d: '<circle r="36"/>' },
    square: { name: 'kare', gen: 'karenin', abl: 'kareden', sym: 90, d: '<rect x="-32" y="-32" width="64" height="64" rx="9"/>' },
    triangle: { name: 'üçgen', gen: 'üçgenin', abl: 'üçgenden', sym: 360, d: '<path d="M0 -38L35 24L-35 24Z"/>' },
    diamond: { name: 'baklava', gen: 'baklavanın', abl: 'baklavadan', sym: 180, d: '<path d="M0 -40L27 0L0 40L-27 0Z"/>' },
    pentagon: { name: 'beşgen', gen: 'beşgenin', abl: 'beşgenden', sym: 360, d: '<polygon points="' + polyPts(5, 38) + '"/>' },
    hexagon: { name: 'altıgen', gen: 'altıgenin', abl: 'altıgenden', sym: 180, d: '<polygon points="' + polyPts(6, 38) + '"/>' },
    star: { name: 'yıldız', gen: 'yıldızın', abl: 'yıldızdan', sym: 360, d: '<polygon points="' + starPts(40, 17) + '"/>' },
    heart: { name: 'kalp', gen: 'kalbin', abl: 'kalpten', sym: 360, d: '<path d="M0 33C-14 21-38 7-38-12C-38-26-27-34-16-34C-8-34-2-29 0-23C2-29 8-34 16-34C27-34 38-26 38-12C38 7 14 21 0 33Z"/>' },
    plus: { name: 'artı', sym: 90, d: '<path d="M-12 -36H12V-12H36V12H12V36H-12V12H-36V-12H-12Z"/>' },
    arrow: { name: 'ok', sym: 360, d: '<path d="M0 -40L32 -4H14V38H-14V-4H-32Z"/>' },
    moon: { name: 'ay', sym: 360, d: '<path d="M18 -36A36 36 0 0 0 18 36A44 44 0 0 1 18 -36Z"/>' },
    drop: { name: 'damla', sym: 360, d: '<path d="M0 -40C8 -24 26 -6 26 12A26 26 0 0 1 -26 12C-26 -6 -8 -24 0 -40Z"/>' },
    semi: { name: 'yarım daire', sym: 360, d: '<path d="M-36 18A36 36 0 0 1 36 18Z"/>' },
    pac: { name: 'dilimli daire', sym: 360, d: '<path d="M0 0L31 -18A36 36 0 1 0 31 18Z"/>' },
    flag: { name: 'bayrak', sym: 360, chiral: true, d: '<path d="M-22 -40H-13V-36L26 -20L-13 -4V40H-22Z"/>' },
    ell: { name: 'L şekli', sym: 360, chiral: true, d: '<path d="M-28 -38H-4V14H30V38H-28Z"/>' },
  };

  const SIZE_NAMES = { 1: 'büyük', 0.72: 'orta boy', 0.46: 'küçük' };
  const FILL_NAMES = { solid: 'içi dolu', empty: 'içi boş', stripe: 'çizgili' };

  /* Dönmüş ya da aynalanmış bir parçanın kendi eksenlerinde "ekranın aşağısı" ve parlaklık yönü.
     Dönen: { dx, dy: aşağı yön birim vektörü, gl: parlaklık geçişinin kimliği } */
  function light(rot, mirror) {
    const a = (rot || 0) * Math.PI / 180, dx = (mirror ? -1 : 1) * Math.sin(a), dy = Math.cos(a);
    const k = ((Math.round(Math.atan2(-dy, -dx) / (Math.PI / 4)) % 8) + 8) % 8;
    return { dx: dx, dy: dy, gl: 'url(#bz-gl-' + k + ')' };
  }
  const UP = light(0, false).gl;

  /* Tek bir şekil; merkez (0,0), yaklaşık 40 birim yarıçap. */
  function one(f) {
    const sh = SHAPES[f.shape], col = tone(f.color), size = f.size || 1, L = light(f.rot, f.mirror);
    const lip = ' class="bz-lip" transform="translate(' + r1(L.dx * STIL.LIP) + ' ' + r1(L.dy * STIL.LIP) + ')"';
    let body;
    if (f.fill === 'empty') {
      // içi boş: koyu kenarlı renkli halka; sarı gibi açık renkler de seçilir
      body = '<g' + lip + ' fill="none" stroke="' + col.edge + '" stroke-width="12.5">' + sh.d + '</g>' +
        '<g fill="' + STIL.tile + '" stroke="' + col.edge + '" stroke-width="12.5">' + sh.d + '</g><g fill="none" stroke="' + col.fill + '" stroke-width="6.5">' + sh.d + '</g>';
    } else {
      const fill = f.fill === 'stripe' ? 'url(#bz-st-' + f.color + ')' : col.fill;
      body = '<g' + lip + ' fill="' + col.edge + '" stroke="' + col.edge + '" stroke-width="' + STIL.W.line + '">' + sh.d + '</g>' +
        '<g fill="' + fill + '" stroke="' + col.edge + '" stroke-width="' + STIL.W.line + '">' + sh.d + '</g>' +
        (col.flat ? '' : '<g class="bz-gloss" fill="' + L.gl + '">' + sh.d + '</g>');
    }
    const t = [];
    if (f.rot) t.push('rotate(' + f.rot + ')');
    if (f.mirror || size !== 1) t.push('scale(' + (f.mirror ? -size : size) + ' ' + size + ')');
    let inner = '';
    if (f.inner) {
      const ic = tone(f.inner.color);
      inner = '<g transform="scale(0.36)" fill="' + ic.fill + '" stroke="' + ic.edge + '" stroke-width="9">' + SHAPES[f.inner.shape].d + '</g>';
    }
    return '<g' + (t.length ? ' transform="' + t.join(' ') + '"' : '') + ' stroke-linejoin="round" stroke-linecap="round">' + body + inner + '</g>';
  }

  const COUNT_LAYOUT = {
    1: { s: 1, pos: [[0, 0]] },
    2: { s: 0.5, pos: [[-23, 0], [23, 0]] },
    3: { s: 0.46, pos: [[0, -21], [-23, 19], [23, 19]] },
    4: { s: 0.46, pos: [[-22, -22], [22, -22], [-22, 22], [22, 22]] },
  };

  /* 100x100 kutunun içeriği */
  function fig(f) {
    const L = COUNT_LAYOUT[f.count || 1];
    if (L.pos.length === 1) return '<g transform="translate(50 50)">' + one(f) + '</g>';
    return L.pos.map((p) => '<g transform="translate(' + (50 + p[0]) + ' ' + (50 + p[1]) + ') scale(' + L.s + ')">' + one(f) + '</g>').join('');
  }
  function figAt(f, x, y, s) {
    return '<g transform="translate(' + r1(x) + ' ' + r1(y) + ') scale(' + r1(s) / 100 + ')">' + fig(f) + '</g>';
  }

  /* İki şekil aynı görünüyorsa anahtarları da aynıdır. */
  function key(f) {
    const sym = SHAPES[f.shape].sym;
    const rot = (((f.rot || 0) % sym) + sym) % sym;
    return [f.shape, f.color, f.fill || 'solid', f.size || 1, rot, f.mirror ? 1 : 0, f.count || 1,
      f.inner ? f.inner.shape + '.' + f.inner.color : '-'].join('|');
  }

  function name(f) {
    const parts = [];
    if ((f.count || 1) > 1) parts.push(f.count);
    if (f.size && f.size !== 1) parts.push(SIZE_NAMES[f.size]);
    if (f.fill && f.fill !== 'solid') parts.push(FILL_NAMES[f.fill]);
    parts.push(COLORS[f.color].name, SHAPES[f.shape].name);
    return parts.join(' ');
  }

  function svg(w, h, inner, o) {
    o = o || {};
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + r1(w) + ' ' + r1(h) + '" class="' + (o.cls || 'q-svg') + '"' +
      (o.cls ? '' : ' style="max-width:' + Math.round(o.maxW || w) + 'px"') + ' aria-hidden="true">' + inner + '</svg>';
  }
  function figSvg(f) { return svg(100, 100, fig(f), { cls: 'opt-svg' }); }

  /* ---------- yazı ---------- */
  function text(x, y, str, size, o) {
    o = o || {};
    /* başlık yazı tipi (Baloo 2) aynı boyda daha küçük göründüğü için bir miktar büyütülür */
    return '<text x="' + r1(x) + '" y="' + r1(y) + '" dy="0.34em" text-anchor="middle" font-size="' + r1(size * 1.08) + '" font-weight="' + (o.weight || 800) +
      '" fill="' + (o.fill || INK) + '">' + str + '</text>';
  }
  /* yardımcı yazı: başlık, işlem işareti */
  function label(x, y, str, size) { return text(x, y, str, size, { fill: STIL.soft, weight: 700 }); }
  /* vurgulu yazı: adım numarası, dönüş işareti */
  function mark(x, y, str, size) { return text(x, y, str, size, { fill: STIL.hiInk }); }
  function emoji(x, y, ch, size) {
    return '<text x="' + r1(x) + '" y="' + r1(y) + '" dy="0.36em" text-anchor="middle" font-size="' + r1(size) + '">' + ch + '</text>';
  }
  /* koyu yuvarlak içinde açık yazı: adım sırası, tekrar sayısı */
  function badge(x, y, str, r) {
    r = r || 12;
    return '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r + '" fill="' + INK + '" stroke="' + STIL.tile + '" stroke-width="2"/>' + text(x, y, str, r * 1.25, { fill: STIL.white });
  }

  /* ---------- kutular ---------- */
  const rect = (x, y, w, h, rx, rest) => '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '" rx="' + r1(rx) + '" ' + rest + '/>';
  /* Şekil kutusu. o.w, o.h: genişlik ve yükseklik; o.tone: renkli (açık tonlu) kutu; o.back: kapalı kart. */
  function tile(x, y, s, o) {
    o = o || {};
    const w = o.w || s, h = o.h || s, rx = s * STIL.R, lip = Math.max(2, s * 0.035), t = o.tone ? tone(o.tone) : null;
    const fill = o.back ? STIL.board : t ? t.tint : STIL.tile, line = t ? t.fill : o.back ? STIL.boardLine : STIL.tileLine;
    return rect(x, y + lip, w, h, rx, 'class="bz-lip" fill="' + (t ? t.fill : o.back ? STIL.boardLine : STIL.tileLip) + '"') +
      rect(x, y, w, h, rx, 'class="bz-tile' + (t ? ' bz-tone' : o.back ? ' bz-back' : '') + '" fill="' + fill + '" stroke="' + line + '" stroke-width="' + STIL.W.thin + '"');
  }
  /* Soru işareti kutusu: cevabın geleceği yer. o.w: genişlik; o.q: işaret (boş metin: işaretsiz). */
  function qtile(x, y, s, o) {
    o = o || {};
    const w = o.w || s, q = o.q == null ? '?' : o.q, dash = Math.max(5, s * 0.115);
    return rect(x, y, w, s, s * STIL.R, 'class="bz-q" fill="' + STIL.hi + '" stroke="' + STIL.hiLine + '" stroke-width="' + r1(Math.max(2.5, Math.min(4, s * 0.045))) +
      '" stroke-linecap="round" stroke-dasharray="' + r1(dash) + ' ' + r1(dash * 0.75) + '"') + (q ? text(x + w / 2, y + s / 2, q, s * 0.6, { fill: STIL.hiInk }) : '');
  }
  /* Henüz bilinmeyen ara adım: boş, kesik çizgili kutu. */
  function ghost(x, y, s) {
    return rect(x, y, s, s, s * STIL.R, 'fill="none" stroke="' + STIL.boardLine + '" stroke-width="' + STIL.W.line + '" stroke-linecap="round" stroke-dasharray="9 8"');
  }
  /* Tahta: tablo, ızgara ve oyun alanlarının zemini. o.glass: şeffaf kâğıt; o.paper: kâğıt. */
  function board(x, y, w, h, o) {
    o = o || {};
    const rx = o.rx == null ? Math.max(4, Math.min(w, h) * 0.08) : o.rx, lip = Math.max(2, Math.min(w, h) * 0.022);
    const fill = o.glass ? STIL.glass : o.paper ? STIL.paper : STIL.board, line = o.glass ? STIL.glassLine : o.paper ? STIL.paperLine : STIL.boardLine;
    return rect(x, y + lip, w, h, rx, 'class="bz-lip" fill="' + line + '"') +
      rect(x, y, w, h, rx, 'class="' + (o.glass ? 'bz-glass' : o.paper ? 'bz-paper' : 'bz-board') + '" fill="' + fill + '" stroke="' + line + '" stroke-width="' + STIL.W.thin + '"');
  }
  /* Kil blok: ızgara karesi, renk örneği, komut düğmesi, makine gövdesi. o.rx, o.lip, o.flat (dudak kutunun içinde kalır). */
  function block(x, y, w, h, c, o) {
    o = o || {};
    const t = tone(c), rx = o.rx == null ? Math.min(w, h) * 0.2 : o.rx, lip = o.lip == null ? Math.max(1.2, Math.min(w, h) * 0.09) : o.lip;
    const bh = o.flat ? h - lip : h;
    return rect(x, y + lip, w, bh, rx, 'class="bz-lip" fill="' + t.edge + '"' + (o.sw ? ' stroke="' + t.edge + '" stroke-width="' + o.sw + '"' : '')) +
      rect(x, y, w, bh, rx, 'fill="' + t.fill + '"' + (o.sw ? ' stroke="' + t.edge + '" stroke-width="' + o.sw + '"' : '')) +
      rect(x, y, w, bh, rx, 'class="bz-gloss" fill="' + UP + '"');
  }
  /* Renk örneği ve adı: renk soran şıklar (100x100). */
  function swatch(id) {
    return block(22, 6, 56, 56, id, { rx: 15, lip: 5, sw: STIL.W.line }) + text(50, 84, COLORS[id].name, 19);
  }
  const swatchOpt = (id) => ({ html: svg(100, 100, swatch(id), { cls: 'opt-svg' }), key: 'c' + id });

  /* ---------- oklar ve işaretler ---------- */
  /* Düz ok. o.color (varsayılan: yardımcı gri), o.w kalınlık, o.head uç boyu. */
  function arrow(x0, y0, x1, y1, o) {
    o = o || {};
    const a = Math.atan2(y1 - y0, x1 - x0), w = o.w || STIL.W.bold, L = o.head || w * 2.1;
    const p = (d) => r1(x1 - L * Math.cos(a + d)) + ' ' + r1(y1 - L * Math.sin(a + d));
    return '<path d="M' + r1(x0) + ' ' + r1(y0) + 'L' + r1(x1) + ' ' + r1(y1) + 'M' + p(-0.7) + 'L' + r1(x1) + ' ' + r1(y1) + 'L' + p(0.7) +
      '" fill="none" stroke="' + (o.color || STIL.soft) + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  /* Kesik çizgi: katlama çizgisi, simetri ekseni (turuncu); o.soft: ayırıcı; o.color: başka renk. */
  function dash(d, o) {
    o = o || {};
    return '<path d="' + d + '" fill="none" stroke="' + (o.color || (o.soft ? STIL.boardLine : STIL.accent)) + '" stroke-width="' + (o.w || STIL.W.line) + '" stroke-dasharray="' + (o.dash || '9 7') + '" stroke-linecap="round"/>';
  }
  /* Kil ip: koyu kenar, renk ve ince bir parlaklık. d: yol, c: renk, w: kalınlık. */
  function rope(d, c, w) {
    const t = tone(c), common = '" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="';
    return '<path d="' + d + common + t.edge + '" stroke-width="' + (w + 5) + '"/><path d="' + d + common + t.fill + '" stroke-width="' + w + '"/>' +
      '<path class="bz-gloss" d="' + d + common + STIL.white + '" stroke-opacity=".3" stroke-width="' + r1(w * 0.28) + '"/>';
  }
  /* Dönüş oku: (cx, cy) çevresinde a0 açısından a1 açısına yay ve ok ucu (derece; 0 sağ, 90 aşağı). */
  function turn(cx, cy, r, a0, a1, o) {
    o = o || {};
    const w = o.w || STIL.W.bold, col = o.color || STIL.accent, rad = Math.PI / 180, cw = a1 > a0;
    const p = (a, rr) => r1(cx + (rr == null ? r : rr) * Math.cos(a * rad)) + ' ' + r1(cy + (rr == null ? r : rr) * Math.sin(a * rad));
    const h = w * 1.9, back = a1 - (cw ? 1 : -1) * (h / r) / rad * 0.9;
    const tx = -Math.sin(a1 * rad) * (cw ? 1 : -1), ty = Math.cos(a1 * rad) * (cw ? 1 : -1);
    const ex = cx + r * Math.cos(a1 * rad), ey = cy + r * Math.sin(a1 * rad);
    return '<path d="M' + p(a0) + 'A' + r + ' ' + r + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' ' + (cw ? 1 : 0) + ' ' + p(back) + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="M' + r1(ex + tx * h * 0.35) + ' ' + r1(ey + ty * h * 0.35) + 'L' + p(back, r - h * 0.75) + 'L' + p(back, r + h * 0.75) + 'Z" fill="' + col + '" stroke="' + col + '" stroke-width="2" stroke-linejoin="round"/>';
  }
  /* Ayna: dik cam şerit. */
  function mirrorLine(x, y0, y1) {
    return rect(x - 5, y0, 10, y1 - y0, 5, 'fill="' + STIL.glass + '" stroke="' + STIL.glassLine + '" stroke-width="' + STIL.W.hair + '"') +
      '<path d="M' + r1(x) + ' ' + r1(y0 + 6) + 'V' + r1(y1 - 6) + '" stroke="' + STIL.glassLine + '" stroke-width="' + STIL.W.thin + '" stroke-dasharray="6 7" stroke-linecap="round"/>';
  }
  /* Su: yatay dalgalı çizgi. */
  function waterLine(x0, x1, y, w) {
    let d = 'M' + r1(x0) + ' ' + r1(y);
    for (let x = x0; x < x1 - 10; x += 20) d += 'q5 -7 10 0t10 0';
    return '<path d="' + d + '" fill="none" stroke="' + STIL.water + '" stroke-width="' + (w || STIL.W.bold) + '" stroke-linecap="round"/>';
  }
  /* Bakan göz; dir: 1 sağa, -1 sola bakar. */
  function eye(x, y, s, dir) {
    const w = s / 2, h = s * 0.3, px = (dir || 1) * s * 0.09;
    return '<g transform="translate(' + r1(x) + ' ' + r1(y) + ')" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M' + r1(-w) + ' 0Q0 ' + r1(-h * 2.1) + ' ' + r1(w) + ' 0Q0 ' + r1(h * 2.1) + ' ' + r1(-w) + ' 0Z" fill="' + STIL.white + '" stroke="' + INK + '" stroke-width="' + STIL.W.line + '"/>' +
      '<circle cx="' + r1(px) + '" cy="0" r="' + r1(h * 0.78) + '" fill="' + COLORS.blue.fill + '" stroke="' + COLORS.blue.edge + '" stroke-width="' + STIL.W.hair + '"/>' +
      '<circle cx="' + r1(px) + '" cy="0" r="' + r1(h * 0.36) + '" fill="' + INK + '"/><circle cx="' + r1(px + h * 0.26) + '" cy="' + r1(-h * 0.28) + '" r="' + r1(h * 0.17) + '" fill="' + STIL.white + '"/></g>';
  }

  /* ---------- kareli şekiller: 0 boş, 1..n renk numarası ---------- */
  const Grid = {
    rot(m) { const n = m.length; return m.map((_, r) => m.map((__, c) => m[n - 1 - c][r])); },
    flipH(m) { return m.map((row) => row.slice().reverse()); },
    flipV(m) { return m.slice().reverse().map((row) => row.slice()); },
    key(m) { return m.map((r) => r.join('')).join('/'); },
    /* draw ile aynı yerleşim: kenar payı ve kare boyu. Kare merkezi: x + pad + (sütun + 0.5) * c */
    geom(cols, size) { const pad = Math.max(2, size * 0.03); return { pad: pad, c: (size - 2 * pad) / cols }; },
    /* Tek karelik fark: dolu bir kareyi komşu boş kareye taşır ya da rengini değiştirir. */
    nudge(rng, m, colors, kinds) {
      const n = m.length, x = m.map((r) => r.slice()), filled = [], empty = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) (x[r][c] ? filled : empty).push([r, c]);
      const kind = rng.pick(kinds || ['move']), p = rng.pick(filled);
      if (kind === 'recolor' && colors > 1) {
        let v;
        do { v = rng.int(1, colors); } while (v === x[p[0]][p[1]]);
        x[p[0]][p[1]] = v;
      } else if (kind === 'add' && empty.length) {
        const e = rng.pick(empty);
        x[e[0]][e[1]] = rng.int(1, colors || 1);
      } else if (kind === 'remove' && filled.length > 1) {
        x[p[0]][p[1]] = 0;
      } else if (empty.length) {
        const near = empty.filter((e) => Math.abs(e[0] - p[0]) + Math.abs(e[1] - p[1]) === 1);
        const e = near.length ? rng.pick(near) : rng.pick(empty);
        x[e[0]][e[1]] = x[p[0]][p[1]];
        x[p[0]][p[1]] = 0;
      }
      return x;
    },
    tf(m, t) {
      let x = t.mirror ? Grid.flipH(m) : m;
      for (let i = 0; i < ((t.rot || 0) / 90) % 4; i++) x = Grid.rot(x);
      return x;
    },
    /* Tahta üstünde kil kareler. pal: renk adları ya da tonlar. m dikdörtgen de olabilir (size genişliktir).
       o.glass: şeffaf kâğıt; o.zone(r, c): doldurulacak bölge (sarı); o.hole: { r, c, h } soru işaretli boşluk. */
    draw(m, pal, x, y, size, o) {
      o = o || {};
      const rows = m.length, cols = m[0].length, g = Grid.geom(cols, size), pad = g.pad, c = g.c, H = rows * c + 2 * pad;
      const gap = Math.max(1, c * 0.08), rx = (c - gap) * 0.2;
      let s = '<g transform="translate(' + r1(x) + ' ' + r1(y) + ')">' + board(0, 0, size, H, { glass: o.glass, rx: Math.max(4, c * 0.2 + pad) });
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < cols; k++) {
          const cx = pad + k * c + gap / 2, cy = pad + r * c + gap / 2, w = c - gap;
          if (o.hole && r >= o.hole.r && r < o.hole.r + o.hole.h && k >= o.hole.c && k < o.hole.c + o.hole.h) continue;
          if (m[r][k]) s += block(cx, cy, w, w, pal[m[r][k] - 1], { rx: rx, flat: true });
          else if (o.zone && o.zone(r, k)) s += rect(cx, cy, w, w, rx, 'class="bz-q" fill="' + STIL.hi + '" stroke="' + STIL.hiLine + '" stroke-width="' + r1(Math.max(1, c * 0.035)) + '" stroke-dasharray="' + r1(c * 0.12) + ' ' + r1(c * 0.1) + '"');
          else s += rect(cx, cy, w, w, rx, 'class="bz-cell" fill="' + (o.glass ? STIL.white : STIL.tile) + '"' + (o.glass ? ' fill-opacity=".7"' : ''));
        }
      }
      if (o.hole) {
        const h = o.hole.h * c - gap;
        s += '<g transform="translate(' + r1(pad + o.hole.c * c + gap / 2) + ' ' + r1(pad + o.hole.r * c + gap / 2) + ')">' + qtile(0, 0, h) + '</g>';
      }
      return s + '</g>';
    },
  };

  /* Döndürülüp ayna görüntüsü alınabilen nesneler: kareli şekil, harf/rakam, bayrak ve L şekli. */
  const TFS = [];
  [0, 90, 180, 270].forEach((rot) => { TFS.push({ rot: rot, mirror: false }); TFS.push({ rot: rot, mirror: true }); });
  const GLYPHS = ['F', 'R', 'P', 'G', 'J', 'L', '2', '4', '5', '7'];

  function blob(rng, n, k) {
    const m = Array.from({ length: n }, () => Array(n).fill(0));
    const filled = [[rng.int(0, n - 1), rng.int(0, n - 1)]];
    m[filled[0][0]][filled[0][1]] = 1;
    let guard = 0;
    while (filled.length < k && guard++ < 600) {
      const b = rng.pick(filled), d = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const r = b[0] + d[0], c = b[1] + d[1];
      if (r < 0 || c < 0 || r >= n || c >= n || m[r][c]) continue;
      m[r][c] = 1;
      filled.push([r, c]);
    }
    return { m: m, filled: filled };
  }

  /* spec: { kind: 'glyph' | 'shape' | 'grid', n, cells, accent } */
  function randObj(rng, spec) {
    if (spec.kind === 'glyph') return { kind: 'glyph', ch: rng.pick(GLYPHS), color: rng.pick(COLOR_IDS) };
    if (spec.kind === 'shape') return { kind: 'shape', shape: rng.pick(['flag', 'ell']), color: rng.pick(COLOR_IDS) };
    for (let t = 0; t < 300; t++) {
      const b = blob(rng, spec.n, spec.cells);
      if (b.filled.length < spec.cells) continue;
      rng.sample(b.filled, spec.accent || 0).forEach((p) => { b.m[p[0]][p[1]] = 2; });
      const o = { kind: 'grid', m: b.m, pal: rng.sample(COLOR_IDS, 2) };
      if (new Set(TFS.map((tf) => objKey(o, tf))).size === 8) return o;
    }
    throw new Error('kareli şekil üretilemedi');
  }
  function objKey(o, tf) {
    if (o.kind === 'grid') return 'g' + Grid.key(Grid.tf(o.m, tf)) + o.pal.join('');
    return o.kind[0] + (o.ch || o.shape) + o.color + '|' + tf.rot + (tf.mirror ? 'm' : '');
  }
  function objDraw(o, tf, x, y, s) {
    if (o.kind === 'grid') return Grid.draw(Grid.tf(o.m, tf), o.pal, x, y, s);
    if (o.kind === 'shape') return figAt({ shape: o.shape, color: o.color, rot: tf.rot, mirror: tf.mirror }, x, y, s);
    const col = COLORS[o.color], L = light(tf.rot, tf.mirror), lip = s * 0.045;
    const t = '<text dy="0.36em" text-anchor="middle" font-size="' + r1(s * 0.86) + '" font-weight="800" stroke-width="' + r1(s * 0.04) + '" stroke-linejoin="round" paint-order="stroke" ';
    return '<g transform="translate(' + r1(x + s / 2) + ' ' + r1(y + s / 2) + ') rotate(' + tf.rot + ')' + (tf.mirror ? ' scale(-1 1)' : '') + '">' +
      t + 'class="bz-lip" transform="translate(' + r1(L.dx * lip) + ' ' + r1(L.dy * lip) + ')" fill="' + col.edge + '" stroke="' + col.edge + '">' + o.ch + '</text>' +
      t + 'fill="' + col.fill + '" stroke="' + col.edge + '">' + o.ch + '</text></g>';
  }
  function objSvg(o, tf) { return svg(100, 100, objDraw(o, tf, 8, 6, 84), { cls: 'opt-svg' }); }
  /* Soru gövdesindeki nesne: kareli şekil kendi tahtasıyla, harf ve şekil bir kutunun içinde çizilir. */
  function objTile(o, tf, x, y, s) {
    if (o.kind === 'grid') return Grid.draw(Grid.tf(o.m, tf), o.pal, x, y, s);
    return tile(x, y, s) + objDraw(o, tf, x + s * 0.09, y + s * 0.09, s * 0.82);
  }
  /* kareli şekil şıkkı (100x100) */
  function gridSvg(m, pal, o) { return svg(100, 100, Grid.draw(m, pal, 8, 6, 84, o), { cls: 'opt-svg' }); }

  /* ---------- küpler ---------- */
  /* Küp yapısı: h[x][y] yükseklik. Dönen: { inner, w, h } */
  const CUBE_TONES = [
    { fill: '#f5ae17', edge: '#b37707', image: 'assets/kil/kup-sari.webp' },
    { fill: '#4269ca', edge: '#273f8f', image: 'assets/kil/kup-mavi.webp' },
    { fill: '#df5135', edge: '#9f2f1a', image: 'assets/kil/kup-kirmizi.webp' },
  ];
  function cubes(h, s, tn, box, mixed) {
    const a = s * 0.866, b = s * 0.5, items = [];
    for (let x = 0; x < h.length; x++) for (let y = 0; y < h[x].length; y++) for (let z = 0; z < h[x][y]; z++) items.push([x, y, z]);
    items.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]) || p[2] - q[2]);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, out = '';
    const firstTone = CUBE_TONES.indexOf(tn);
    for (const it of items) {
      const ox = (it[0] - it[1]) * a, oy = (it[0] + it[1]) * b - (it[2] + 1) * s;
      minX = Math.min(minX, ox - a); maxX = Math.max(maxX, ox + a);
      minY = Math.min(minY, oy); maxY = Math.max(maxY, oy + 2 * b + s);
      // Komşu küpleri farklı renklerle ayır; bakış yönü sorularında tek tonu koru.
      const color = mixed ? CUBE_TONES[(firstTone + it[0] + it[1] + it[2]) % CUBE_TONES.length] : tn;
      out += '<image href="' + color.image + '" x="' + r1(ox - a) + '" y="' + r1(oy) +
        '" width="' + r1(2 * a) + '" height="' + r1(2 * b + s) + '" preserveAspectRatio="none"/>';
    }
    let wire = '';
    if (box) {
      // kutunun görünen kenarları: üst yüz, öndeki üç dikme ve iki alt kenar
      const pt = (x, y, e) => { const v = [(x - y) * a, (x + y) * b - e * s]; minX = Math.min(minX, v[0]); maxX = Math.max(maxX, v[0]); minY = Math.min(minY, v[1]); maxY = Math.max(maxY, v[1]); return r1(v[0]) + ' ' + r1(v[1]); };
      const W = box[0], D = box[1], H = box[2];
      wire = '<path d="M' + pt(0, 0, H) + 'L' + pt(W, 0, H) + 'L' + pt(W, D, H) + 'L' + pt(0, D, H) + 'ZM' + pt(W, 0, H) + 'L' + pt(W, 0, 0) + 'L' + pt(W, D, 0) + 'L' + pt(0, D, 0) + 'L' + pt(0, D, H) +
        'M' + pt(W, D, H) + 'L' + pt(W, D, 0) + '" fill="none" stroke="' + STIL.soft + '" stroke-width="' + STIL.W.thin + '" stroke-dasharray="8 7" stroke-linecap="round"/>';
    }
    const pad = 8;
    return {
      inner: '<g transform="translate(' + r1(pad - minX) + ' ' + r1(pad - minY) + ')">' + out + wire + '</g>',
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    };
  }
  /* Yüzleri ayrı renkli tek küp (çizim): f = { T üst, S sol, E sağ } renk adı ya da ton. Dönen: { inner, w, h } */
  function isoCube(f, s) {
    const a = s * 0.866, b = s * 0.5, pad = 6, sw = STIL.W.thin;
    const P = (pts) => pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ');
    /* her yüz kendi renginin koyusuyla çevrilir; yan yüzler ışık almadığı için gölgelenir */
    const face = (pts, c, shade) => { const t = tone(c); return '<polygon points="' + P(pts) + '" fill="' + t.fill + '" stroke="' + t.edge + '" stroke-width="' + sw + '"/>' +
      (shade ? '<polygon class="bz-shade" points="' + P(pts) + '" fill="' + STIL.inkDeep + '" fill-opacity="' + shade + '" stroke="none"/>' : '<polygon class="bz-gloss" points="' + P(pts) + '" fill="' + UP + '" stroke="none"/>'); };
    const top = [[0, 0], [a, b], [0, 2 * b], [-a, b]], left = [[-a, b], [0, 2 * b], [0, 2 * b + s], [-a, b + s]], right = [[0, 2 * b], [a, b], [a, b + s], [0, 2 * b + s]];
    const outline = [[0, 0], [a, b], [a, b + s], [0, 2 * b + s], [-a, b + s], [-a, b]];
    return {
      inner: '<g transform="translate(' + r1(a + pad) + ' ' + pad + ')" stroke-linejoin="round">' +
        '<polygon class="bz-lip" transform="translate(0 ' + r1(s * 0.08) + ')" points="' + P(outline) + '" fill="' + STIL.inkDeep + '" fill-opacity=".3" stroke="' + STIL.inkDeep + '" stroke-opacity=".3" stroke-width="' + sw + '"/>' +
        face(left, f.S, 0.12) + face(right, f.E, 0.26) + face(top, f.T, 0) +
        '<path class="bz-gloss" d="M' + r1(-a + 3) + ' ' + r1(b + 2.5) + 'L0 ' + r1(2 * b + 2.5) + 'L' + r1(a - 3) + ' ' + r1(b + 2.5) + 'M0 ' + r1(2 * b + 4) + 'V' + r1(2 * b + s - 4) +
        '" fill="none" stroke="' + STIL.white + '" stroke-opacity=".38" stroke-width="2" stroke-linecap="round"/></g>',
      w: 2 * a + 2 * pad, h: 2 * b + s + 2 * pad + s * 0.08 + 2,
    };
  }

  /* Çizgili dolgu desenleri ve parlaklık geçişleri; sayfada bir kez bulunmalı. */
  function defs() {
    const gloss = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
      const a = k * Math.PI / 4, ux = Math.cos(a) / 2, uy = Math.sin(a) / 2;
      return '<linearGradient id="bz-gl-' + k + '" x1="' + r1(0.5 + ux) + '" y1="' + r1(0.5 + uy) + '" x2="' + r1(0.5 - ux) + '" y2="' + r1(0.5 - uy) + '">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".46"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/>' +
        '<stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".13"/></linearGradient>';
    }).join('');
    return '<svg class="bz-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' + COLOR_IDS.map((id) =>
      '<pattern id="bz-st-' + id + '" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="12" height="12" fill="' + COLORS[id].tint + '"/><rect width="6" height="12" fill="' + COLORS[id].fill + '"/></pattern>').join('') + gloss + '</defs></svg>';
  }

  Bilsem.Shapes = {
    STIL, INK, COLORS, COLOR_IDS, SHAPES, SIZE_NAMES, FILL_NAMES, CUBE_TONES, TFS, GLYPHS, tone,
    fig, figAt, figSvg, key, name, svg, text, label, mark, emoji, badge, tile, qtile, ghost, board, block, swatch, swatchOpt,
    arrow, dash, rope, turn, mirrorLine, waterLine, eye, Grid, randObj, objKey, objDraw, objSvg, objTile, gridSvg, cubes, isoCube, defs, r1,
  };

  if (typeof module !== 'undefined') module.exports = Bilsem;
})(typeof window !== 'undefined' ? window : globalThis);
