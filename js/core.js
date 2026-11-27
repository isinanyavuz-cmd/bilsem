/* Çekirdek: rastgele sayı üreteci, kategori listesi, soru yardımcıları */
(function (root) {
  'use strict';
  const Bilsem = root.Bilsem = root.Bilsem || {};

  /* Tohumlu rastgele sayı üreteci (mulberry32): aynı tohum aynı soruyu üretir. */
  function RNG(seed) { this.s = (seed >>> 0) || 0x9e3779b9; }
  RNG.prototype.next = function () {
    let t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.int = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  RNG.prototype.sample = function (arr, n) { return this.shuffle(arr).slice(0, n); };
  Bilsem.RNG = RNG;

  Bilsem.AREAS = [
    { id: 'gorsel', name: 'Şekil Bulmacaları', formal: 'Görsel akıl yürütme' },
    { id: 'uzamsal', name: 'Yön ve Döndürme', formal: 'Uzamsal düşünme' },
    { id: 'sayisal', name: 'Sayı Bulmacaları', formal: 'Sayısal akıl yürütme' },
    { id: 'dikkat', name: 'Dikkat ve Hafıza', formal: 'Dikkat ve görsel hafıza' },
    { id: 'sozel', name: 'Mantık Yürütme', formal: 'Mantıksal çıkarım' },
  ];

  Bilsem.CATS = [
    { id: 'pattern', core: true, area: 'gorsel', name: 'Şekil Örüntüsü', desc: 'Sıradaki şekli bul', tip: 'Şekillerin hangi sırayla tekrar ettiğine bak. Rengi, şekli ve yönü ayrı ayrı kontrol et.' },
    { id: 'matrix', core: true, area: 'gorsel', name: 'Şekil Tablosu', desc: 'Boş kutuyu tamamla', tip: 'Önce satırlara, sonra sütunlara bak. Her satırda ne aynı kalıyor, ne değişiyor?' },
    { id: 'analogy', core: true, area: 'gorsel', name: 'Şekil Benzetmesi', desc: 'Aynı kuralı uygula', tip: 'İlk şekil ikinciye dönüşürken ne değişti? Aynı değişikliği üçüncü şekle uygula.' },
    { id: 'fillgap', core: true, area: 'gorsel', name: 'Desen Tamamlama', desc: 'Kopan parçayı bul', tip: 'Boşluğun çevresine bak. Desen tekrar ediyorsa aynı parçayı başka yerde ara; simetrikse karşı tarafa bak.' },
    { id: 'overlay', area: 'gorsel', name: 'Şeffaf Kâğıt', desc: 'Üst üste koyunca ne görünür?', tip: 'Bir karede herhangi bir kâğıtta siyah varsa üst üste koyunca o kare siyah olur. Çevrilecek kâğıdı önce çevir.' },
    { id: 'sym', core: true, area: 'gorsel', name: 'Simetri', desc: 'Aynadaki yarıyı tamamla', tip: 'Ayna çizgisine yakın kare, öbür yanda da çizgiye yakın olur. Simetri ekseni sayarken şekli kafanda katla.' },
    { id: 'odd', core: true, area: 'gorsel', name: 'Farklı Olan', desc: 'Kurala uymayanı bul', tip: 'Üç şeklin ortak bir özelliği var. O özelliği taşımayan şekli ara.' },
    { id: 'rotate', core: true, area: 'uzamsal', name: 'Döndürme', desc: 'Şekli kafanda çevir', tip: 'Şeklin bir köşesini seç ve dönünce nereye gideceğini düşün.' },
    { id: 'mirror', core: true, area: 'uzamsal', name: 'Ayna Görüntüsü', desc: 'Yansımayı bul', tip: 'Aynada sağ ile sol yer değiştirir. Aynaya yakın olan parça yine aynaya yakın kalır.' },
    { id: 'cubes', core: true, area: 'uzamsal', name: 'Küp Sayma', desc: 'Gizli küpleri unutma', tip: 'Kat kat say. Üstteki küplerin altında da küp olduğunu unutma.' },
    { id: 'stack', area: 'uzamsal', name: 'Üst Üste Çizgiler', desc: 'Hangi çizgi üstte, hangisi altta?', tip: 'İki çizginin kesiştiği yere bak: kesintisiz devam eden üstte, arkadan geçen alttadır. Çizgileri ikişer ikişer karşılaştır.' },
    { id: 'roll', core: true, area: 'uzamsal', name: 'Küp Yönü', desc: 'Küp yatınca hangi yüz üstte?', tip: 'Karşılıklı yüzleri not al. Küp yan yatınca üst yüz yana gider, karşısındaki yüz üste çıkar.' },
    { id: 'view', core: true, area: 'uzamsal', name: 'Küp Görünümü', desc: 'Gözün gördüğünü bul', tip: 'Gözün baktığı yönde her sütunun en yüksek kulesine bak. Arkadaki alçak kuleler görünmez.' },
    { id: 'net', area: 'uzamsal', name: 'Küp Açılımı', desc: 'Katlayınca küp olur mu?', tip: 'Açılımı kafanda katla: hiçbir kare başka bir karenin üstüne binmemeli. Dörtlü sıranın iki yanına birer kare gelir.' },
    { id: 'fold', core: true, area: 'uzamsal', name: 'Katlama', desc: 'Açılınca delikler nerede?', tip: 'Katlama çizgisi bir ayna gibidir. Katlanmış kâğıttaki her delik, açılınca çizginin öbür yanında da çıkar.' },
    { id: 'numseq', core: true, area: 'sayisal', name: 'Sayı Örüntüsü', desc: 'Sayıların kuralını bul', tip: 'Yan yana iki sayının farkına bak. Fark hep aynı mı, yoksa değişiyor mu?' },
    { id: 'fruit', area: 'sayisal', name: 'Meyveli İşlem', desc: 'Her meyve bir sayı', tip: 'Önce aynı meyveden oluşan satırı çöz. Bulduğun sayıyı diğer satırda yerine koy.' },
    { id: 'code', core: true, area: 'sayisal', name: 'Şifre Çözme', desc: 'Şekilleri sayıya çevir', tip: 'Tablodan her şeklin sayısını sırayla bul. Renge de şekle de dikkat et.' },
    { id: 'machine', area: 'sayisal', name: 'Sayı Makinesi', desc: 'Makinenin kuralını bul', tip: 'Giren sayı ile çıkan sayıyı karşılaştır. Makine ekliyor mu, çıkarıyor mu, yoksa katını mı alıyor?' },
    { id: 'same', area: 'dikkat', name: 'Aynısını Bul', desc: 'Tıpatıp aynısı hangisi?', tip: 'Parça parça karşılaştır: önce üst satır, sonra orta, sonra alt.' },
    { id: 'count', area: 'dikkat', name: 'Şekil Sayma', desc: 'Dikkatle say', tip: 'Saydığın şekli aklında işaretle. Soldan sağa, satır satır ilerle.' },
    { id: 'memory', core: true, area: 'dikkat', name: 'Görsel Hafıza', desc: 'Bak, aklında tut, hatırla', tip: 'Resimleri kendi kendine bir hikâye gibi söyle: "köpek topu kovalıyor".' },
    { id: 'shadow', core: true, area: 'dikkat', name: 'Gölge Bulma', desc: 'Resmin gölgesi hangisi?', tip: 'Renkleri unut, yalnızca dış çizgiye bak. Parçaların yerini, yönünü ve boyunu tek tek kontrol et.' },
    { id: 'sudoku', area: 'sozel', name: 'Mini Sudoku', desc: 'Her renk bir kez', tip: 'Soru işaretinin satırına ve sütununa bak: orada olan renkler olamaz. Kutudaki renkleri de ele.' },
    { id: 'cipher', core: true, area: 'sozel', name: 'Harf Şifresi', desc: 'Şifre kuralını bul', tip: 'Örnekte her harfin yerine hangi harfin yazıldığına bak. Aynı kuralı alfabeyi sayarak yeni kelimeye uygula.' },
    { id: 'equiv', core: true, area: 'sayisal', name: 'Eşitlik', desc: 'Şekillerle denge kur', tip: 'Her şekle bir sayı değeri ver ve eşitlikleri tutturmaya çalış. Sonra son eşitliğin sol tarafının değerini bul.' },
    { id: 'path', area: 'sozel', name: 'Ok Yolu', desc: 'Okları takip et', tip: 'Parmağını başlangıç karesine koy ve her ok için bir kare ilerle.' },
    { id: 'balance', area: 'sozel', name: 'Terazi', desc: 'Hangisi daha ağır?', tip: 'Terazinin aşağı inen kefesi daha ağırdır. Şekilleri ağırdan hafife doğru sıraya diz.' },
  ];
  Bilsem.catById = function (id) { return Bilsem.CATS.find((c) => c.id === id); };
  Bilsem.LEVELS = [1, 2, 3, 4];
  Bilsem.LEVEL_NAMES = ['', 'Kolay', 'Orta', 'Zor', 'En Zor'];

  /* Soru üreticileri buraya kaydolur: GEN[tip] = function (rng, seviye) -> soru */
  Bilsem.GEN = {};

  const Q = Bilsem.Q = {};

  /* Şık anahtarını karşılaştırılabilir parçalara ayırır: konumlu liste ya da (";" varsa) küme. */
  function keyParts(k, asSet) {
    if (asSet) return { set: k.slice(1).split(';').filter(Boolean) };
    if (k.includes('|')) return { pos: k.split('|') };
    if (k.includes('+')) return { pos: k.split('+') };
    if (k.includes('/')) return { pos: k.split('/') };
    return { pos: Array.from(k) };
  }
  function partDist(a, b) {
    let d = 0;
    if (a.set) { a.set.forEach((t) => { if (!b.set.includes(t)) d++; }); b.set.forEach((t) => { if (!a.set.includes(t)) d++; }); return d; }
    for (let i = 0; i < Math.max(a.pos.length, b.pos.length); i++) if (a.pos[i] !== b.pos[i]) d++;
    return d;
  }
  /* Doğru şıkkın sırası: kaç şık ondan kesin olarak "daha merkezde" (diğerlerine toplamda daha yakın)
     ve (küme anahtarlarında) kaç şık ondan daha çok öğe içeriyor. */
  Q.ranks = function (keys, ai) {
    const asSet = keys.some((k) => k.includes(';'));
    const P = keys.map((k) => keyParts(k, asSet));
    const sums = P.map((a, i) => P.reduce((s, b, j) => s + (i === j ? 0 : partDist(a, b)), 0));
    const r = sums.filter((v) => v < sums[ai]).length;
    const size = asSet ? P.filter((p) => p.set.length > P[ai].set.length).length : null;
    // doğru şık öbür üçünün her öğesini içeriyor mu ("hepsini kapsayan şık")
    const sup = asSet && P.every((p, j) => j === ai || p.set.every((t) => P[ai].set.includes(t)));
    return { center: r, size: size, sup: sup, flat: new Set(sums).size === 1 };
  };

  /* Doğru şık + çeldiriciler -> karıştırılmış şıklar. Aynı anahtarlı çeldiriciler atılır.
     Sızıntı önleme: çeldirici adayları üçten fazlaysa (ilk 8 aday), doğru şıkkın "merkezlik" sırası (ve küme
     şıklarında öğe sayısı sırası) her soruda rastgele seçilen bir hedefe en yakın olacak üçlü seçilir. Böylece
     "diğerlerine en çok benzeyen", "en farklı olan" ya da "en çok deliği olan" ya da "ötekilerin hepsini kapsayan"
     şıkkı seçmek şanstan iyi sonuç vermez. Hedefi tutturan üçlüler arasında üreticinin öncelik sırası (listedeki yer) korunur.
     o.need = { ok: (şık) => bool, count }: seçilen üçlüde bu koşulu sağlayan en az count çeldirici bulunur. */
  Q.finish = function (rng, q, correct, distractors, n, o) {
    n = n || 4;
    const need = o && o.need;
    const seen = new Set([correct.key]);
    const cand = [];
    for (const d of distractors) {
      if (cand.length === (n === 4 ? 8 : n - 1)) break;
      if (!d || seen.has(d.key)) continue;
      seen.add(d.key);
      cand.push(d);
    }
    if (cand.length < n - 1) throw new Error('yetersiz çeldirici');
    let picked = need ? cand.filter((d) => need.ok(d)).slice(0, need.count).concat(cand.filter((d) => !need.ok(d))).slice(0, n - 1) : cand.slice(0, n - 1);
    if (n === 4 && cand.length > 3) {
      const tc = rng.int(0, 3), ts = rng.int(0, 3), supOk = rng.chance(0.2);
      let best = Infinity;
      for (let a = 0; a < cand.length; a++) for (let b = a + 1; b < cand.length; b++) for (let c = b + 1; c < cand.length; c++) {
        if (need && [a, b, c].filter((i) => need.ok(cand[i])).length < need.count) continue;
        const R = Q.ranks([correct.key, cand[a].key, cand[b].key, cand[c].key], 0);
        if (R.flat && a + b + c > 3) continue;
        const cost = (Math.abs(R.center - tc) + (R.size == null ? 0 : Math.abs(R.size - ts)) + (R.sup && !supOk ? 2 : 0)) * 100 + a + b + c;
        if (cost < best) { best = cost; picked = [cand[a], cand[b], cand[c]]; }
      }
    }
    const opts = rng.shuffle([correct].concat(picked));
    q.options = opts;
    q.answer = opts.indexOf(correct);
    return q;
  };

  Q.num = function (v) { return { html: '<span class="opt-num">' + v + '</span>', key: 'n' + v, value: v }; };
  Q.text = function (t) { return { html: '<span class="opt-text">' + t + '</span>', key: 't' + t }; };
  Q.emoji = function (e) { return { html: '<span class="opt-emoji">' + e + '</span>', key: 'e' + e }; };

  /* Sayısal şıklar: küçükten büyüğe sıralı; doğru cevabın sırası rastgele. */
  Q.finishNum = function (rng, q, correct, o) {
    o = o || {};
    const min = o.min == null ? 0 : o.min, max = o.max == null ? Infinity : o.max;
    if (max - min < 3) throw new Error('sayı aralığı dar');
    // doğru cevaptan küçük kaç şık olacağı baştan seçilir; böylece yeri tahmin edilemez
    let below = Math.min(rng.int(0, 3), correct - min);
    if (3 - below > max - correct) below = 3 - (max - correct);
    const lows = [], highs = [];
    rng.shuffle(o.prefer || []).forEach((v) => {
      if (!Number.isInteger(v) || v < min || v > max || v === correct) return;
      if (v < correct && lows.length < below && lows.indexOf(v) < 0) lows.push(v);
      if (v > correct && highs.length < 3 - below && highs.indexOf(v) < 0) highs.push(v);
    });
    for (let k = 1; lows.length < below; k++) if (lows.indexOf(correct - k) < 0) lows.push(correct - k);
    for (let k = 1; highs.length < 3 - below; k++) if (highs.indexOf(correct + k) < 0) highs.push(correct + k);
    const arr = lows.concat([correct], highs).sort((a, b) => a - b);
    q.options = arr.map(Q.num);
    q.answer = arr.indexOf(correct);
    return q;
  };

  Q.validate = function (q) {
    if (!q || !q.prompt || !Array.isArray(q.options)) throw new Error('eksik soru');
    if (q.options.length < 3 || q.options.length > 4) throw new Error('şık sayısı hatalı');
    if (!(q.answer >= 0 && q.answer < q.options.length)) throw new Error('cevap hatalı');
    const keys = new Set(q.options.map((o) => o.key));
    if (keys.size !== q.options.length) throw new Error('aynı şık iki kez');
    if (!q.explain) throw new Error('açıklama yok');
    return q;
  };

  /* Bir soru üretir; üretici nadiren tıkanırsa yeniden dener. */
  Bilsem.generate = function (type, level, rng) {
    const gen = Bilsem.GEN[type];
    if (!gen) throw new Error('bilinmeyen soru tipi: ' + type);
    let last;
    for (let i = 0; i < 80; i++) {
      try {
        const q = gen(rng, level);
        q.type = type;
        q.level = level;
        if (q.stem == null) q.stem = '';
        return Q.validate(q);
      } catch (e) { last = e; }
    }
    throw last;
  };

  if (typeof module !== 'undefined') module.exports = Bilsem;
})(typeof window !== 'undefined' ? window : globalThis);
