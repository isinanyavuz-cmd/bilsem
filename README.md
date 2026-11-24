# Enes BİLSEM'e Hazırlanıyor

2. ve 3. sınıf için BİLSEM genel zihinsel yetenek sınavına hazırlık uygulaması.
30 soru türü, her biri dört kademede (Kolay, Orta, Zor, En Zor), ayrıca bir Sayı Hafızası
bölümü. Sorular hazır bir havuzdan gelmez; her seferinde yeniden üretilir, bu
yüzden ezberlenemez.

## Yayın

GitHub Pages ile ana daldan yayınlanır: `https://isinanyavuz-cmd.github.io/bilsem/`.
Uygulama daha önce Kod Pilotu deposunda (`codepilot/bilsem/`, eski adıyla `codegame`) duruyordu; ikisi de aynı
`isinanyavuz-cmd.github.io` adresinde yayınlandığı için hesapta kayıtlı ilerleme yeni
adreste de görünür.

## Açmak

Kurulum yok: `index.html` dosyasını tarayıcıda aç. Tablet, telefon ve
bilgisayarda çalışır; dokunma, fare ve klavye (1–4 ya da A–D, Enter) desteklenir.

Tek dosya hâlinde taşımak için:

```
node tools/tek-dosya.js enes-bilsem.html
```

## Hesaplar ve giriş

Uygulamaya girmek için hesap gerekir. E-posta ve şifre ile hesap açılır; Google ya da Apple ile de
giriş yapılabilir. İlerleme hesapta saklanır, hangi cihazla girilirse aynı ilerleme görünür. Altyapı
Firebase'dir (Authentication + Firestore); GitHub Pages'ta sunucu gerekmez.

Dosyalar: `js/auth.js` (giriş ve bulut senkronu), `js/firebase-config.js` (Firebase yapılandırması),
`firestore.rules` (veri güvenlik kuralları). Kurulum bir kez yapılır:

1. [Firebase konsolunda](https://console.firebase.google.com) yeni bir proje oluştur.
2. **Authentication → Sign-in method**: "E-posta/Şifre" yöntemini aç. "Google" yöntemini aç (destek e-postası seç).
3. **Authentication → Settings → Authorized domains**: `isinanyavuz-cmd.github.io` alan adını ekle.
   Eklenmezse giriş "yetkili alan adı değil" hatası verir.
4. **Apple** için: Apple Developer Program üyeliği (yıllık ücretli) ve Apple tarafında bir Services ID,
   alan adı doğrulaması ve yönlendirme adresi gerekir. Firebase'in "Apple" yöntemi ayarlarında
   istenen değerleri Apple geliştirici hesabından alıp girilir. Apple girişi bu adımlar yapılmadan çalışmaz.
5. **Firestore Database**: veritabanını oluştur (üretim modunda). **Kurallar** sekmesine `firestore.rules`
   dosyasının içeriğini yapıştırıp yayınla.
6. **Proje ayarları → Uygulamalar → Web uygulaması**: çıkan yapılandırmayı `js/firebase-config.js`
   içindeki `window.BILSEM_FIREBASE` değerine yaz. Bu değerler herkese açıktır; güvenlik kurallarla sağlanır.
7. `node tools/surum.js` çalıştırıp değişikliği gönder.

Firebase SDK'sı `js/vendor/firebase.js` içinde tek dosya olarak gelir (CDN kullanılmaz; iki ayrı Firebase kopyası yüklenirse giriş çalışmaz).
Yeniden üretmek için `tools/firebase-entry.js` dosyasını `firebase` ve `esbuild` ile paketleyin:
`npx esbuild tools/firebase-entry.js --bundle --format=esm --minify --target=es2020 --outfile=js/vendor/firebase.js`

Yapılandırma girilmeden uygulama giriş ekranında "ayarlanmadı" uyarısı gösterir. Şifre sıfırlama, hesabın e-posta adresine
gönderilen bağlantıyla yapılır ("Şifremi unuttum"). Bağlantının Türkçe görünmesi için Firebase'de
Authentication → Templates bölümünden "Şifre sıfırlama" metnini düzenleyebilirsiniz.
Tek dosya sürümü (`tools/tek-dosya.js`) giriş modülünü içermez; hesap girişi yalnızca yayındaki sürümde çalışır.

## Çalışma biçimleri

| Biçim | Ne yapar |
|---|---|
| Günün Görevi | Farklı konulardan 10 soru. Az çalışılan ve zorlanılan konular daha sık gelir. |
| Konu alıştırması | Seçilen konu ve kademede 5, 10 ya da 15 soru. Her cevaptan sonra açıklama gösterilir. |
| Tekrar oyna | Her çalışmanın sonunda "Tekrar oyna" önce kademeyi sorar. Günün Görevi ve Deneme Sınavı tek bir kademeyle ya da karışık oynanabilir. |
| Deneme Sınavı | 20, 40 ya da 60 soru; süreli; cevaplar sınav bitince gösterilir. |
| Sayı Hafızası | Sayı bir süre görünür ve kapanır; süre bitmeden klavyeyle düzden ve tersten yazılır. 3 basamaktan 7 basamağa kadar uzar, üç yanlışta oyun biter. Süre (hem görünme hem her yazım için): Kolay basamak sayısının iki katı, Orta basamak sayısı, Zor basamak sayısının üçte ikisi kadar saniye. Yazma süresi isteğe bağlıdır (veli panelinden): "Süresiz" seçilirse sayı yine süreyle görünür ama yazarken süre yoktur. |
| Veli paneli | Şifreyle açılır (321321). Konu konu doğru oranı, ortalama süre, son 7 gün, öneriler, ayarlar. |

Resmî sınavın soru sayısı ve süresi her yıl MEB kılavuzunda duyurulur; deneme
uzunluğu bu yüzden seçilebilir bırakıldı.

## Soru türleri

| Alan | Türler |
|---|---|
| Şekil Bulmacaları | Şekil Örüntüsü, Şekil Tablosu, Şekil Benzetmesi, Farklı Olan, Desen Tamamlama, Şeffaf Kâğıt, Simetri |
| Döndür ve Hayal Et | Döndürme, Ayna Görüntüsü, Küp Sayma, Üst Üste Çizgiler, Küp Devirme, Küp Görünümü, Küp Açılımı, Katla ve Deş |
| Sayı Bulmacaları | Sayı Örüntüsü, Meyve İşlemleri, Şifre Çözme, Sayı Makinesi, Sihirli Kare |
| Dikkat ve Hafıza | Aynısını Bul, Şekil Sayma, Görsel Hafıza, Gölge Bulma |
| Mantık Yürütme | Sıralama, Ok Yolu, Terazi, Kim Hangisi?, Yalancı mı Doğrucu mu?, Mini Sudoku |

## Kademeler

Her soru türünün dört kademesi var: 1 Kolay, 2 Orta, 3 Zor, 4 En Zor. Örnekler:

| Tür | Kolay | Orta | Zor | En Zor |
|---|---|---|---|---|
| Şekil Örüntüsü | yinelenen birim, dönen şekil, artan sayı | iki özellik birlikte değişir | dönüş + renk + boyut; halkada dolaşan kare | iki kare farklı hızlarda dolaşır |
| Şekil Tablosu | satır bir özelliği, sütun başka bir özelliği belirler | her satır ve sütunda her şekil ve renk | üç özellik; sayıların toplamı; üst üste koyma | ortak kareler silinir; dört özellik |
| Döndürme | 3×3 şekil; sağa ya da sola bir ya da iki kez çeyrek tur | 4×4 şekil; bir, iki ya da üç kez çeyrek tur | 5×5 şekil, tek karesi kaymış çeldiriciler | iki adım: dönüş ve yansıma |
| Üst Üste Çizgiler | kesişen 4 düz çizgi; en üstteki, en alttaki | 5 düz çizgi; alttan ya da üstten ikinci | 5 dalgalı, zikzak ya da kavisli çizgi; herhangi bir sıra | 6 karışık çizgi; "hemen üstündeki", "altından kaç çizgi geçiyor" |
| Küp Sayma | 6–10 küp | 3×3 taban, 10–17 küp | 4×4 taban, 16–26 küp | büyük küpe tamamlama; 26–40 küp |
| Sayı Örüntüsü | sabit artış ve azalış, iki adımın sırayla yinelenmesi | büyüyen artış, 2 katı, iç içe iki dizi | önceki iki sayının toplamı, 2 katı + k | önceki üç sayının toplamı, ×2 ve +k sırayla |
| Sayı Makinesi | ekleme, çıkarma, 2 katı | 2 katı ± 1, 3 katı | 3 katı ± 1, kendisiyle çarpma, yarısı | iki sayı girer, bir sayı çıkar |
| Terazi | 4 şekil, en ağır ya da en hafif | 4–5 şekil sıralanır | 6 şekil, "kaç şekil daha ağır?" | dengede duran terazilerle "kaç tane eder?" |
| Ok Yolu | 5×5 alan, 5–6 ok | 5×5 alan, 6–8 ok, yol seçme | 6×6 alan, tekrar sayılı oklar | baktığı yöne göre komut alan robot |
| Kim Hangisi? | 3 kişi, 2 ipucu | 3–4 kişi, "değil" ipuçları | 4 kişi, en az sayıda ipucu | "ne … ne …" ve "ya … ya da …" ipuçları |
| Desen Tamamlama | 6×6 desende 2×2 boşluk; 2 renkli yinelenen kalıp | 3 renkli ya da 3×3 kalıp | çapraz çizgiler; ortadan aynalanmış desen | 6×6 çeyrek tur simetrisi; 8×8 desende 3×3 boşluk, aynalama ya da çeyrek tur |
| Şeffaf Kâğıt | 3×3, iki kâğıt | 4×4, iki kâğıt | 3×3, kâğıdın biri çevrilir | 4×4, iki ya da üç kâğıt; çeyrek, yarım tur ya da ters yöne çevirme |
| Küp Devirme | alt yüz ya da bir devirme sonrası üst yüz (karşılıklı yüzlerden) | bir devirme; üst, sağ ya da sol yüz | iki devirme | üç devirme |
| Küp Görünümü | 2×2 taban, soldan bakış | 3×2 taban; soldan ya da sağdan | 3×3 taban | 4×3 taban, 4 kata kadar |
| Küp Açılımı | hangi açılım küp olur? (bariz yanlış çeldiriciler) | aynısı, inandırıcı çeldiricilerle | verilen renkli açılımda karşı yüzün rengi | 7 kareden hangisi çıkarılırsa açılım olur (Kangaroo tarzı) |
| Katla ve Deş | 4×4 kâğıt, bir katlama, 1 delik | 6×6 kâğıt, bir katlama, 2 delik | iki katlama (dikey sonra yatay), 1–2 delik | 6×6, iki katlama, 2–3 delik |
| Simetri | 4×4, dikey ayna çizgisi, yarıyı tamamla | 6×6, dikey ya da yatay çizgi | 5×5, çapraz ayna çizgisi | kaç simetri ekseni var? (0–4; yalnızca dönme simetrisi olan şekiller de var) |
| Sihirli Kare | 3×3, 1–11 arası sayılar, toplam verilir, 1 gizli | daha büyük sayılar, toplam verilir | toplam verilmez, 2 gizli sayı | toplam verilmez, 3 gizli sayı |
| Yalancı mı Doğrucu mu? | 3 çocuk; "X doğru/yalan söylüyor", "hepimiz yalanız" | 3 çocuk; "ben ve X yalan söylüyoruz" gibi ikili ifadeler | 4 çocuk; "aramızda tam bir yalancı var" | 4 çocuk; tüm ifade türleri |
| Mini Sudoku | 3×3, 3 renk, 4 boş kare | 4×4, her satır ve sütunda 4 renk | 4×4, 2×2 kutular da | 4×4 kutulu, çok az ipucu |

3. sınıf için eklenen beş türde (Desen Tamamlama, Şeffaf Kâğıt, Küp Devirme, Küp Görünümü, Küp Açılımı) En Zor kademe 3. sınıf düzeyindedir; Kolay kademe 2. sınıfa da uygundur. Sınıf seçimi yoktur: tüm türler tek havuzda, kademeler ilerlemeye göre otomatik önerilir.
Yalancı mı Doğrucu mu?, Sihirli Kare ve Mini Sudoku'da bulmacanın tek çözümlü olduğu üretimde denetlenir. Cevaplar kuraldan hesaplanır: Küp Devirme'de küp gerçekten yuvarlanır, Küp Açılımı'nda açılım gerçekten katlanır (altıgenlerden tam 11 küp açılımı çıkar).

Öncüllü sorularda (Kim Hangisi?, Sıralama) soru cümlesi öncüllerin altında gösterilir.

Sayı Hafızası'nın düzeyleri ayrıdır (Kolay, Orta, Zor) ve yalnızca süreyi belirler.

Eski kayıt varsa ilk açılışta taşınır: üç kademeli kayıttaki her kademe bir yukarı kayar
ve altına yeni Kolay kademe eklenir; hiç çözülmemiş konular Kolay'dan başlar.

## Geliştirme

```
node --test
```

Bir CSS ya da JS dosyası değişince, yayına göndermeden önce sürüm damgalarını yenile:

```
node tools/surum.js
```

Bu, `index.html` içindeki dosya adreslerine içerik damgası ekler (`js/app.js?v=…`). Dosya
değişince adresi de değişir; tarayıcı eski kopyayı kullanamaz ve sayfayı yenilemek yeter.
Damgalar eskiyse testler hata verir. Ana sayfanın altındaki "Sürüm" kodu, açık olan
sürümün hangisi olduğunu gösterir.

Testler her soru türünü her seviyede yüzlerce kez üretip şunları denetler:
şıklar birbirinden farklı mı, tek doğru cevap var mı, açıklama dolu mu, doğru
cevap hep aynı şıkka mı düşüyor. Küp sayma, ok yolu, sıralama, terazi ve
"Kim Hangisi?" gibi türlerde cevabın gerçekten doğru olduğu ayrıca hesaplanır.

| Dosya | Görev |
|---|---|
| `js/core.js` | Tohumlu rastgele sayı üreteci, kategori listesi, şık yardımcıları |
| `js/shapes.js` | Şekil, kareli şekil ve küp çizimleri (SVG metni; DOM gerekmez) |
| `js/gen-*.js` | Soru üreticileri: `Bilsem.GEN[tür](rng, kademe)`; kademe 1–4 |
| `js/gen-sinif3.js` | 3. sınıf türleri: Desen Tamamlama, Şeffaf Kâğıt, Küp Devirme, Küp Görünümü, Küp Açılımı, Katla ve Deş |
| `js/span.js` | Sayı Hafızası: sayı üretimi ve oyun kuralları |
| `js/store.js` | Yıldızlar, gün serisi, konu istatistikleri, rekorlar (`localStorage`) |
| `js/app.js` | Arayüz |

Yeni bir soru türü eklemek için: `core.js` içindeki `CATS` listesine satır ekle,
bir `gen-*.js` dosyasında `B.GEN.yeniTur` üreticisini yaz, `app.js` içindeki
`ICONS` nesnesine simgesini ekle. Üretici şu biçimde bir nesne döndürür:

```js
{
  prompt: 'Soru metni',
  stem: '<svg …>',              // soru görseli (HTML metni)
  options: [{ html, key }],     // 3–4 şık; key aynı görünen şıkları ayıklamak için
  answer: 2,                    // doğru şıkkın sırası
  explain: 'Neden bu cevap?',
  memo: { html, seconds },      // isteğe bağlı: önce gösterilip gizlenen resim
  layout: 'wide',               // isteğe bağlı: geniş şıklar
}
```
