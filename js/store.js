/* İlerleme kaydı: yıldızlar, günlük seri, kategori istatistikleri, sayı hafızası rekorları */
(function (root) {
  'use strict';
  const Bilsem = root.Bilsem = root.Bilsem || {};
  const KEY = 'bilsem.v3';
  const OLD_KEYS = ['bilsem.v2', 'zekakasifi.v1'];     // kademeler değişmeden önceki kayıtlar
  const OWNER_KEY = 'bilsem.owner';                    // bu cihazdaki kaydın sahibi olan hesap (uid)

  function lsGet(k) { try { return root.localStorage ? root.localStorage.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (root.localStorage) root.localStorage.setItem(k, v); } catch (e) { /* kayıt kapalı olabilir */ } }
  function lsDel(k) { try { if (root.localStorage) root.localStorage.removeItem(k); } catch (e) { /* önemli değil */ } }

  const spanBlank = () => ({ plays: 0, best: { 1: { both: 0, fwd: 0, bwd: 0 }, 2: { both: 0, fwd: 0, bwd: 0 }, 3: { both: 0, fwd: 0, bwd: 0 } } });
  function blank() {
    return { v: 3, settings: { sound: true, len: 10, spanStart: 3, spanLevel: 1, spanTypeTimed: true, pin: null }, cats: {}, days: {}, exams: [], span: spanBlank(), profile: { avatar: null }, ts: 0, sts: 0, shash: '', epoch: 0 };
  }

  /* Sayı hafızası kaydını bugünkü biçime getirir: rekorlar düzeye göre tutulur ve en çok MAX basamaktır.
     Düzeyler gelmeden önceki rekorlar (yazma süresi sınırsızdı) Kolay düzeye yazılır. */
  function normalizeSpan(sp, max) {
    const out = spanBlank(), cap = (v) => Math.max(0, Math.min(max, v || 0));
    if (!sp) return out;
    out.plays = sp.plays || 0;
    if (sp.best) {
      [1, 2, 3].forEach((l) => ['both', 'fwd', 'bwd'].forEach((m) => { out.best[l][m] = cap(sp.best[l] && sp.best[l][m]); }));
    } else ['both', 'fwd', 'bwd'].forEach((m) => { out.best[1][m] = cap(sp[m]); });
    return out;
  }

  /* Eski kayıtları bugünkü dört kademeye taşır (1 Kolay, 2 Orta, 3 Zor, 4 En Zor).
     v1 (ilk sürüm: kolay, orta, zor): eski orta = 1. kademe, eski zor = 2. kademe; eski kolayın karşılığı yok.
     v2 (üç kademe): her kademe bir yukarı kayar; altına yeni 1. kademe eklenir.
     Hiç çözülmemiş konular 1. kademeden başlar. */
  function migrate(d) {
    if (!d || (d.v !== 1 && d.v !== 2)) return d;
    Object.keys(d.cats || {}).forEach((k) => {
      const c = d.cats[k], st = c.stars || [0, 0, 0], sk = c.skill || 1;
      if (d.v === 1) { c.stars = [st[1] || 0, st[2] || 0, 0, 0]; c.skill = sk - 1; }
      else { c.stars = [0, st[0] || 0, st[1] || 0, st[2] || 0]; c.skill = sk + 1; }
      c.skill = c.seen ? Math.max(1, Math.min(4.9, Math.round(c.skill * 100) / 100)) : 1;
    });
    d.v = 3;
    return d;
  }

  function dayKey(d) {
    d = d || new Date();
    const p = (n) => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function addDays(key, n) {
    const p = key.split('-').map(Number);
    return dayKey(new Date(p[0], p[1] - 1, p[2] + n));
  }

  /* 10 soruda 9+ doğru: 3 yıldız, 7+: 2 yıldız, 5+: 1 yıldız */
  function starsFor(correct, total) {
    if (!total) return 0;
    const r = correct / total;
    return r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.5 ? 1 : 0;
  }

  /* Beceri puanı 1 ile 4.9 arasında gezer; tam kısmı önerilen kademedir. */
  function nextSkill(skill, level, ok) {
    const cur = Math.floor(skill);
    const d = ok ? (level >= cur ? 0.15 : 0.05) : (level <= cur ? -0.2 : -0.05);
    return Math.max(1, Math.min(4.9, Math.round((skill + d) * 100) / 100));
  }

  /* Bugün (ya da bugün henüz oynanmadıysa dün) biten kesintisiz gün sayısı */
  function streak(days, today) {
    let k = today;
    if (!(days[k] && days[k].n > 0)) k = addDays(k, -1);
    let n = 0;
    while (days[k] && days[k].n > 0) { n++; k = addDays(k, -1); }
    return n;
  }

  /* Veli şifresi açık metin olarak saklanmaz, kısa bir özeti saklanır. Bu yalnızca şifrenin kayıtta
     okunup geçilmesini zorlaştırır; gerçek bir güvenlik önlemi değildir (FNV-1a, iki tur). */
  function pinHash(pin) {
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    const s = 'bilsem-veli:' + String(pin);
    for (let i = 0; i < s.length; i++) {
      h1 = Math.imul(h1 ^ s.charCodeAt(i), 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ s.charCodeAt(s.length - 1 - i), 0x01000193) >>> 0;
    }
    return 'p1:' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }
  function textHash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    return h.toString(16) + ':' + s.length;
  }
  const PIN_RE = /^[0-9]{4,12}$/;

  /* Ham metni bugünkü biçimde bir kayda çevirir; geçersizse null. */
  function parse(raw) {
    try {
      const d = migrate(typeof raw === 'string' ? JSON.parse(raw) : raw), b = blank();
      if (d && d.v === 3) {
        const Sp = Bilsem.Span;
        const out = Object.assign(b, d, { settings: Object.assign(b.settings, d.settings), span: normalizeSpan(d.span, Sp.MAX) });
        const set = out.settings;
        set.spanStart = Math.max(Sp.MIN, Math.min(Sp.MAX, set.spanStart));
        set.spanLevel = Sp.levelOf(set.spanLevel).id;
        set.spanTypeTimed = set.spanTypeTimed !== false;
        /* Kaldırılmış (ya da bilinmeyen) kategorilerin kayıtları toplamlara karışmasın diye atılır. */
        const cats = {};
        Object.keys(out.cats || {}).forEach((k) => { if (Bilsem.catById(k)) cats[k] = out.cats[k]; });
        out.cats = cats;
        out.ts = Number(out.ts) || 0;
        out.sts = Number(out.sts) || 0;
        out.shash = typeof out.shash === 'string' ? out.shash : '';
        out.epoch = Number(out.epoch) || 0;
        return out;
      }
    } catch (e) { /* bozuk kayıt */ }
    return null;
  }

  /* İki cihazın kaydını birleştirir (saf; iki kayıt da parse edilmiş olmalı).
     İlerleme yalnızca artar: her konuda daha çok soru çözülmüş kayıt alınır, yıldızlar ve rekorlar en
     büyüğüdür, günler gün gün birleşir, deneme sonuçları birleşip yinelenenler atılır. Ayarlar ve profil
     en son değiştiren cihazdan gelir (sts). İlerleme bir cihazda sıfırlandıysa (epoch) sıfırlamadan önceki kayıt
     birleştirilmez; sıfırlanan taraf kazanır.
     Not: iki cihaz aynı konuda ayrı ayrı çalıştıysa o konunun sayaçları toplanmaz, büyük olan alınır;
     böylece aynı çalışma iki kez sayılmaz, ama bir cihazdaki birkaç soru istatistiklere girmeyebilir. */
  function merge(a, b) {
    if (a.epoch !== b.epoch) return JSON.parse(JSON.stringify(a.epoch > b.epoch ? a : b));
    const newer = (b.ts || 0) > (a.ts || 0) ? b : a;
    const out = JSON.parse(JSON.stringify(newer));
    const older = newer === a ? b : a;
    // ayarlar ve profil (veli şifresi dâhil) yalnızca kendileri en son değişen cihazdan gelir (sts);
    // öbür cihazda sonradan soru çözülmesi eski ayarları geri getirmez
    const setSrc = (older.sts || 0) > (out.sts || 0) ? older : null;
    if (setSrc) {
      out.settings = JSON.parse(JSON.stringify(setSrc.settings));
      out.profile = JSON.parse(JSON.stringify(setSrc.profile));
      out.sts = setSrc.sts; out.shash = setSrc.shash;
    }
    // konular
    Object.keys(older.cats).forEach((k) => {
      const o = older.cats[k], n = out.cats[k];
      if (!n) { out.cats[k] = JSON.parse(JSON.stringify(o)); return; }
      const base = (o.seen || 0) > (n.seen || 0) ? JSON.parse(JSON.stringify(o)) : n;
      base.stars = [0, 1, 2, 3].map((i) => Math.max((o.stars || [])[i] || 0, (n.stars || [])[i] || 0));
      out.cats[k] = base;
    });
    // günler
    Object.keys(older.days).forEach((k) => {
      const o = older.days[k], n = out.days[k];
      if (!n) { out.days[k] = Object.assign({}, o); return; }
      const base = (o.n || 0) > (n.n || 0) ? Object.assign({}, o) : n;
      base.daily = !!(o.daily || n.daily);
      const st = Math.max(o.stars || 0, n.stars || 0);
      if (st || 'stars' in o || 'stars' in n) base.stars = st;
      out.days[k] = base;
    });
    // denemeler
    const seen = {}, exams = [];
    older.exams.concat(out.exams).forEach((e) => { const k = JSON.stringify(e); if (!seen[k]) { seen[k] = 1; exams.push(e); } });
    exams.sort((x, y) => (x.at || 0) - (y.at || 0) || String(x.date).localeCompare(String(y.date)));
    out.exams = exams.slice(-30);
    // sayı hafızası
    out.span.plays = Math.max(older.span.plays || 0, out.span.plays || 0);
    Object.keys(out.span.best).forEach((l) => Object.keys(out.span.best[l]).forEach((m) => {
      out.span.best[l][m] = Math.max(out.span.best[l][m] || 0, (older.span.best[l] || {})[m] || 0);
    }));
    out.ts = Math.max(a.ts || 0, b.ts || 0);
    return out;
  }

  const Store = {
    data: blank(),
    /* Ham metindeki kaydı (bugünkü ya da eski biçim) okur. Geçerliyse true döner ve veriyi yükler. */
    hydrate(raw) {
      const d = parse(raw);
      if (d) this.data = d;
      return !!d;
    },
    /* Bu cihazdaki yerel kaydı okur (bugünkü ya da eski anahtar). */
    localRaw() {
      return [KEY].concat(OLD_KEYS).map(lsGet).find(Boolean) || null;
    },
    load() {
      const raw = this.localRaw();
      if (raw) this.hydrate(raw);
      return this.data;
    },
    /* Kaydı bu cihazda saklar ve (giriş yapılmışsa) hesabın bulut kaydına gönderir. */
    save() {
      this.data.ts = Date.now();
      const h = textHash(JSON.stringify([this.data.settings, this.data.profile]));
      if (h !== this.data.shash) { this.data.shash = h; this.data.sts = this.data.ts; }   // ayarlar değişti
      lsSet(KEY, JSON.stringify(this.data));
      if (root.BilsemSync) root.BilsemSync.push(this.data);
    },
    /* Hesap açıldığında ya da giriş yapıldığında çağrılır. cloudRaw bulut kaydının metnidir; yoksa null.
       (Bulut okunamadıysa bu fonksiyon çağrılmaz; aksi hâlde boş bir kayıt buluttaki ilerlemenin üzerine yazılırdı.)
       - Bulutta kayıt varsa onu kullanır (yalnızca bu cihaza yazılır, buluta geri gönderilmez).
       - Bulutta yoksa ve bu cihaz henüz bir hesaba bağlanmamışsa, bu cihazdaki ilerlemeyi ilk hesaba aktarır.
       - Aksi hâlde yeni, boş bir kayıtla başlar. */
    attach(uid, cloudRaw, offline) {
      const owner = lsGet(OWNER_KEY), localRaw = this.localRaw();
      const mine = owner === uid ? parse(localRaw) : null;     // bu cihazda aynı hesabın kaydı
      const cloud = cloudRaw ? parse(cloudRaw) : null;
      let source;
      if (offline) {
        // Bulut okunamadı (internet yok): bu hesabın bu cihazdaki kaydıyla devam edilir; bağlantı gelince birleştirilir.
        if (!mine) return 'none';
        this.data = mine;
        return 'local';
      }
      if (cloud && mine) {
        this.data = merge(cloud, mine);
        source = JSON.stringify(this.data) === JSON.stringify(cloud) ? 'cloud' : 'merged';
      } else if (cloud) { this.data = cloud; source = 'cloud'; }
      else if (mine) { this.data = mine; source = 'local'; }
      else if (!owner && localRaw && this.hydrate(localRaw)) source = 'adopted';
      else { this.data = blank(); source = 'blank'; }
      lsSet(OWNER_KEY, uid);
      lsSet(KEY, JSON.stringify(this.data));
      if (source !== 'cloud' && root.BilsemSync) root.BilsemSync.push(this.data);
      return source;
    },
    /* Bulut kaydını bu cihazdakiyle birleştirir (eşitleme sırasında). Birleşen kaydı döndürür. */
    mergeCloud(cloudRaw) {
      const cloud = cloudRaw ? parse(cloudRaw) : null;
      if (cloud) {
        this.data = merge(this.data, cloud);
        lsSet(KEY, JSON.stringify(this.data));
      }
      return this.data;
    },
    /* Çıkışta bu cihazdaki ilerlemeyi siler; ortak kullanılan bir cihazda bir sonraki çocuk onu görmesin. */
    detach() {
      this.data = blank();
      [KEY].concat(OLD_KEYS, [OWNER_KEY]).forEach(lsDel);
    },
    /* Veli şifresi: 4–12 rakam. Hesabın kaydında (ayarlarda) durur; her cihazda aynıdır ve ilerleme sıfırlanınca silinmez. */
    hasPin() { return typeof this.data.settings.pin === 'string' && this.data.settings.pin.length > 0; },
    validPin(pin) { return PIN_RE.test(String(pin || '')); },
    checkPin(pin) { return this.hasPin() && pinHash(String(pin || '').trim()) === this.data.settings.pin; },
    setPin(pin) {
      pin = String(pin || '').trim();
      if (!PIN_RE.test(pin)) return false;
      this.data.settings.pin = pinHash(pin);
      this.save();
      return true;
    },
    reset() {
      const s = this.data.settings;
      this.data = blank();
      this.data.settings = s;
      this.data.epoch = Date.now();   // öbür cihazlardaki eski ilerleme birleştirilirken geri gelmesin
      OLD_KEYS.forEach(lsDel);
      this.save();
    },
    cat(id) {
      const c = this.data.cats;
      if (!c[id]) c[id] = { stars: [0, 0, 0, 0], seen: 0, ok: 0, ms: 0, recent: [], skill: 1 };
      return c[id];
    },
    day(key) {
      const d = this.data.days;
      key = key || dayKey();
      if (!d[key]) d[key] = { n: 0, ok: 0, daily: false };
      return d[key];
    },
    recordAnswer(id, level, ok, ms) {
      const c = this.cat(id);
      c.seen++;
      if (ok) c.ok++;
      c.ms += Math.max(0, Math.min(ms || 0, 120000));
      c.recent.push(ok ? 1 : 0);
      if (c.recent.length > 20) c.recent.shift();
      c.skill = nextSkill(c.skill, level, ok);
      const d = this.day();
      d.n++;
      if (ok) d.ok++;
    },
    setStars(id, level, stars) {
      const c = this.cat(id);
      if (stars > c.stars[level - 1]) c.stars[level - 1] = stars;
    },
    workLevel(id) { return Math.max(1, Math.min(4, Math.floor(this.cat(id).skill))); },
    /* Toplam yıldız: kategori yıldızları + her günün görevinden kazanılan en iyi yıldız */
    totalStars() {
      let n = 0;
      Object.keys(this.data.cats).forEach((k) => { this.data.cats[k].stars.forEach((s) => { n += s; }); });
      Object.keys(this.data.days).forEach((k) => { n += this.data.days[k].stars || 0; });
      return n;
    },
    finishDaily(stars) {
      const d = this.day();
      d.daily = true;
      d.stars = Math.max(d.stars || 0, stars);
    },
    streak() { return streak(this.data.days, dayKey()); },
    dailyDone() { const d = this.data.days[dayKey()]; return !!(d && d.daily); },
    addExam(sum) {
      this.data.exams.push(sum);
      if (this.data.exams.length > 30) this.data.exams.shift();
    },
    /* Sayı Hafızası: her sayı denemesi günlük çalışmaya sayılır; rekor, ulaşılan en uzun basamak sayısıdır. */
    spanTrial(ok) {
      const d = this.day();
      d.n++;
      if (ok) d.ok++;
    },
    spanBest(level, mode, best) {
      const r = this.data.span.best[level];
      if (best > r[mode]) { r[mode] = best; return true; }
      return false;
    },
    spanPlayed() { this.data.span.plays++; },
    /* Günün görevi: az çalışılan ve zorlanılan kategoriler daha sık gelir. */
    dailyPlan(rng, n) {
      const pool = Bilsem.CATS.map((c) => {
        const s = this.cat(c.id);
        const recent = s.recent.slice(-10);
        const acc = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0.5;
        return { id: c.id, w: (1 + (1 - acc) * 2 + (s.seen < 5 ? 1 : 0)) * (c.core ? 2 : 1) };   // asıl konular iki kat ağırlıklı
      });
      const plan = [];
      while (plan.length < n && pool.length) {
        let r = rng.next() * pool.reduce((a, p) => a + p.w, 0), i = 0;
        while (i < pool.length - 1 && r >= pool[i].w) { r -= pool[i].w; i++; }
        const p = pool.splice(i, 1)[0];
        plan.push({ type: p.id, level: this.workLevel(p.id) });
      }
      return plan;
    },
  };

  /* Deneme sınavı planı (saf: rastgele sayı üreteci dışarıdan gelir).
     Kademe sıraya göre: ilk %20 Kolay, sonraki %40 Orta, son %40 Zor; En Zor yalnızca elle seçilirse gelir. */
  function examLevel(k, n) { return k * 5 < n ? 1 : k * 5 < n * 3 ? 2 : 3; }
  /* Konu seçimi: asıl (core) konular yaklaşık iki kat sık gelir. n yeterliyse her asıl konu bir kez garantidir;
     kalan yerler torbadan çekilir (asıl konu 2, diğerleri 1 kopya; garanti edilen kopyalar torbadan düşülür).
     Art arda aynı konu gelmez. */
  function examCats(rng, n) {
    const core = Bilsem.CATS.filter((c) => c.core).map((c) => c.id), all = Bilsem.CATS.map((c) => c.id);
    const picks = core.length <= n ? core.slice() : rng.sample(core, n);
    let rest = core.length <= n ? rng.shuffle(all) : [];
    while (picks.length < n) {
      if (!rest.length) rest = rng.shuffle(all.concat(core));
      picks.push(rest.pop());
    }
    let seq = null;
    for (let t = 0; t < 200; t++) {
      seq = rng.shuffle(picks);
      if (seq.every((id, i) => !i || id !== seq[i - 1])) return seq;
    }
    return seq;
  }

  Bilsem.Store = Store;
  Bilsem.Exam = { examLevel: examLevel, examCats: examCats };
  Bilsem.StoreUtil = { dayKey: dayKey, addDays: addDays, starsFor: starsFor, nextSkill: nextSkill, streak: streak, migrate: migrate, blank: blank, normalizeSpan: normalizeSpan, parse: parse, merge: merge };

  if (typeof module !== 'undefined') module.exports = Bilsem;
})(typeof window !== 'undefined' ? window : globalThis);
