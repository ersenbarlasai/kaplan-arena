# Kaplan Arena — teslim raporu

Görev: `tasarim/CLAUDE-UYGULAMA-PROMPTU.md` (karar dayanağı `claude-hazirlik-incelemesi.md` 1–19). Canlıya yayın, push veya uzak veri sıfırlama yapılmadı. Değişiklikler commit edilmedi.

## Ne yapıldı

**Üç yüz birlikte:**
- **Admin paneli (yetkili durum ve saat sahibi):** Sade yönetim düzeni ve canlı sahne önizlemesi.
- **Ayrı sahne penceresi (salt görüntüleyici):** Projeksiyon için.
- **Öğrenci telefonu (doğrulanan komut istemcisi):** Cevap ve joker isteklerini gönderir.

**Sahne:**
- "Sahne Ekranını Aç" kullanıcı tıklamasıyla açılıyor.
- `postMessage` ile bağlanıyor, file:// dahil; HTTP'de `BroadcastChannel` yedeği var.
- Kilit almıyor, ağa bağlanmıyor.
- Bağlantı koparsa açık sorudaki süre ve cevap kabulü duruyor; sahne geri gelince devamı admin veriyor.
- Sahneye yalnız gösterilecek veri gidiyor:
  - hazırlıkta soru yok,
  - cevap anahtarı yalnız açıklamada,
  - puan değişimleri yalnız puan ekranında,
  - QR yalnız menü/kura/katılımda.

**Tam manuel akış:** Hazır mısınız → Soruyu Göster → (süre, sıfırda kilit) → Cevabı Açıkla (erken açıklamada onay) → Puanları Göster → Sonraki Soru.
- Otomatik açıklama, 4 sn otomatik puanlama, 5 sn otomatik geçiş ve klavye kısayolları kaldırıldı.
- Puan `scored[qk]` ile bir kez uygulanıyor.
- Eşitlik ve etap sonu da admin ilerletmesiyle yürüyor.

**Cevaplar:**
- Taslak ile gönderim ayrı; "Cevabı Gönder" düğmesi var.
- Yeniden gönderilebilir; son geçerli gönderim sayılıyor; ağ hatasında "gönderilemedi" deniyor.
- Çift Cevap'ta iki farklı şık zorunlu.
- Her gönderim ayrı anahtarda saklanıyor; yeni taslak eskisini silmiyor.
- Admin kabulü pencere zamanına (süre içinde gönderilme), biçime ve sınıfın sahibi olan cihaza göre yapıyor.

**Jokerler:**
- Haklar tüm yarışma için geçerli; aynı soruda tek joker.
- Yalnız süre işlerken ve ilk cevaptan önce kullanılabiliyor.
- Onaydan sonra geri alınamıyor (eski "tekrar tıklayıp geri alma" yolu kaldırıldı).
- Telefonsuz sınıf için admin aynı koşullarla kullanabiliyor.
- Kabul, ret ve tekilleştirme yetkili tarafta (`app/core.js`).
- Tanıtım sırasında ortak duraklama var (3,5 sn).
- Gruplama: duraklama anından önce gönderilip tanıtım bitmeden ulaşan istekler aynı tanıtıma ekleniyor; tanıtım uzamıyor.
- Başka bir duraklatma nedeni varken tanıtımın bitmesi saati başlatmıyor.

**Puan:**
- Normal doğru +10, Çift Cevap +10, Çifte Puan +20.
- Jokerli yanlış/cevapsız −10; toplam en az 0; gerçek değişim kaydediliyor (5 puandan −5).

**Soru iptali:**
- Gerçek değişim geri alınıyor ve o sorunun jokerleri iade ediliyor.
- Tekrar iptal etkisiz; önceki sorular değişmiyor.
- Sahnede ve telefonda "Soru iptal edildi" gösteriliyor.

**Ara (karşılamaya dönüş):** Süre ve cevap kabulü duruyor, telefonda "Ara verildi" görünüyor. Dönüş yarışmayı bitirmiyor; kalan süre korunuyor, devamı admin veriyor.

**Görsel sistem "Efsaneye Yolculuk":**
- Varlıklar `tasarim/varliklar`'dan geldi: sahneler webp olarak optimize edildi, kaplan rehber, 12 arma ve joker SVG'leri `assets/` altında; kaynaklar korunuyor.
- Okul logosu, mevcut LOGO verisinden kullanılıyor.
- Ekranlar: karşılama (künye eksiksiz), harita, kura, katılım, hazırlık, şıklı/tahmin soru, kilit, açıklama, puan, etap sonu, eşitlik, şampiyonluk, erken bitiş, iptal, duraklama, joker tanıtımı.
- Telefonun bütün durumları ve admin soru yönetimi/ayarları da yeni görünümde.
- 12'den çok sınıf için arma renk tonu kaydırılarak ve sıra işaretiyle çoğaltılıyor; eşleşme kalıcı.

**Ses (Web Audio, çevrimdışı):**
- Yalnız etkin ses sahnesinde çalıyor: joker, son 5 saniye, süre sonu, açıklama, puan, kutlama.
- Sahnede etkinleştirme/test adımı var.
- Admin panelinde aç/kapat, seviye ve sahnede ses testi var.
- Olaylar kimlikle tekilleşiyor; yeniden bağlanmada eski sesler çalmıyor.

**Hareket azaltma:** Admin ayarı ve işletim sistemi tercihi birlikte dikkate alınıyor. Azaltılmış harekette bilgi kaybı olmuyor.

**Yerel fontlar:**
- Cinzel, Alegreya ve Alegreya Sans (SIL OFL 1.1); lisanslar `assets/fonts/OFL-*.txt`.
- `fonts.css` içinde data: URI olarak gömülü; file:// altında da yükleniyor.
- Dış font servisine bağımlılık kaldırıldı.

**Kalıcı veri:**
- Şema 2, geriye uyumlu göç yapılıyor.
- Göç öncesi kaydın kopyası `kaplan-arena-v1-yedek-sema1`'de.
- Sorular, ayarlar, yedekler ve süren yarışma korunuyor.

**LAN sunucusu (`kaplan-sunucu.ps1`):**
- `app/` ve `assets/` beyaz listeyle, doğru MIME türüyle sunuluyor.
- Proje dışı yollar, gizli dosyalar ve `..` reddediliyor.
- `KAPLAN_NO_BROWSER=1` test anahtarı eklendi.

**Dağıtım:** `.vercelignore` tasarım kaynaklarını ve testleri dışarıda bırakıyor. `vercel.json` önbellek başlıkları güncellendi.

## Dosyalar

| Yol | Açıklama |
|---|---|
| `kaplan-arena.html` | Kabuk: modülleri yükler (çift tıklama korunuyor) |
| `app/core.js` | Saf yarışma mantığı (Node ile test edilir) |
| `app/shared.js`, `app/net.js` | Ortak tanımlar, kalıcı kayıt, ağ ve tek yarışma kilidi |
| `app/link.js`, `app/audio.js` | Sahne iletişimi, sahne sesi |
| `app/stageview.js`, `app/stage.js` | Sahne çizimi ve sahne penceresi |
| `app/admin.js`, `app/admin-actions.js`, `app/admin-ui.js` | Admin |
| `app/player.js` | Telefon |
| `app/boot.js` | Başlatma kipinin seçimi |
| `app/style.css` | Görünüm |
| `app/logo.js`, `app/qr.js` | Mevcut logo verisi ve QR kütüphanesi (taşındı) |
| `assets/` | Görseller, armalar, joker simgeleri, fontlar ve lisanslar |
| `tests/core.test.js` | Birim testleri |
| `tests/e2e/server.js`, `tests/e2e/run.js`, `tests/e2e/modes.js` | Test sunucusu (bellek kipi) ve tarayıcı senaryoları |
| `tasarim/TEKNIK-NOT.md` | Durum, komut ve iletişim şeması |
| `tasarim/ekran-goruntuleri/` | 52 ekran görüntüsü |

Ayrıca güncellenenler: `kaplan-sunucu.ps1`, `.vercelignore`, `vercel.json`, `index.html`, `katil/index.html`, `OKU-BENI.txt`. `api/ka.js` değişmedi; yeni komutlar mevcut yol yapısına uyuyor.

## Komutlar ve sonuçlar (son çalıştırma)

```
node --test tests/*.test.js                       → 17/17 geçti
NODE_PATH=<puppeteer-core> node tests/e2e/run.js   → 65/65 geçti   (tests/e2e/son-rapor.json)
NODE_PATH=<puppeteer-core> node tests/e2e/modes.js → 30/30 geçti   (tests/e2e/son-rapor-kipler.json)
```

`puppeteer-core` projeye eklenmedi; proje dışında kurulu, sistemdeki Chrome'u kullanıyor. `run.js` üç kez art arda 65/65 geçti.

### Kanıtlanan durumlar

**Hazırlık ve akış (`run.js`):**
- Hazırlıkta telefon, sahne ve KV durumunda soru yok; süre işlemiyor.
- "Soruyu Göster" ile tek ortak süre başlıyor; sıfırda `locked` oluyor; otomatik açıklama ya da ilerleme yok.
- Puan ekranı kendiliğinden geçmiyor; sonraki soru hazırlıkla açılıyor.

**Puan ve jokerler:**
- Normal doğru +10.
- Çift Cevap iki farklı seçimle +10; tek seçimle gönderilemiyor.
- Çifte Puan doğru +20; yanlışta −10 (10→0); 0 puanda ceza 0; jokerli cevapsız sınıfta da ceza.
- Tahminde en yakın kazanıyor. 5 puanda −5 birim testinde kanıtlandı.
- İlk cevaptan sonra istenen joker ve aynı soruda ikinci joker reddediliyor; reddedilen istek hakkı tüketmiyor.
- Hak yarışma boyunca geçerli; finalde korunuyor (iade edilen hak finalde kullanıldı); admin jokeri geri alamıyor.
- Tekrar puan gösterme puanı çoğaltmıyor.

**Cevap kabulü:**
- Duraklama sırasında ve süre bittikten sonra doğrudan API'ye yazılan cevaplar sayılmıyor.
- Süre içinde gönderilip açıklamayla aynı anda ulaşan cevap sayılıyor.

**Joker tanıtımı ve duraklatma:**
- Ortak duraklama telefona yayımlanıyor; eşzamanlı iki joker tek tanıtımda birleşiyor.
- Tanıtım sonunda saat başka neden yoksa devam ediyor; varsa başlamıyor (birim testi).

**Sahne ve telefon kopması:**
- Sahne kapanınca süre duruyor ve telefona yayımlanıyor.
- Yeniden açılınca kalan süre aynı kalıyor ve devam admin onayında.
- Yeniden açılan sahne eski sesleri çalmıyor; ses tanıtım başına bir kez çalıyor.
- Sahne hiçbir API isteği yapmıyor (kilit yok); admin ve telefon ses üretmiyor.
- Telefon kopması yarışmayı durdurmuyor; yeniden bağlanan telefonda mühürlü jokerler görünüyor.

**İptal ve ara:**
- İptal gerçek değişimi geri alıyor ve jokeri iade ediyor; tekrar iptal etkisiz; önceki sorunun jokeri korunuyor.
- Ara süreyi durduruyor, dönüşte kalan süre korunuyor.

**Eşitlik ve sonuç ekranları:**
- 2. etapta beş sınıflı eşitlik çözüldü; eşitlikte joker yok.
- Şampiyonluk ve erken bitiş sahnede görüldü.

**Kayıt, yedek ve sınıflar:**
- Eski kayıt göçü veriyi koruyor; yedek kopya alınıyor.
- Yedek dışa/içe aktarma arma eşleşmelerini koruyor.
- 13–14 sınıf ve uzun Türkçe adlar 4:3'te taşmıyor.
- Künyenin tamamı 1024×768'de kırpılmıyor.

**Çalışma kipleri (`modes.js`):**
- **file://, internetsiz (Vercel istekleri engellendi):**
  - Yerel fontlar Türkçe gliflerle yüklendi; görseller yüklendi.
  - "Telefon bağlantısı yok" gösteriliyor, kod/QR gösterilmiyor.
  - Ayrı sahne `postMessage` ile bağlandı; telefonsuz yarışma ve puanlama çalıştı.
- **PowerShell yerel sunucu:**
  - 8 statik yol doğru MIME türüyle 200 döndü.
  - 10 saldırı/sızma yolu 403/404 ile reddedildi: `.env.local`, `.git`, `..`, kodlu `..`, `tasarim/`, `api/`, `.ps1`, gizli dosya.
  - Yerel ağ kipinde admin + sahne + telefonla cevap ve puan akışı çalıştı.

## Ekran görüntüleri

`tasarim/ekran-goruntuleri/` (52 dosya, depoda WebP; testler yeniden çalışınca PNG üretir):
- **Sahne 1920×1080:** karşılama, harita, kura, katılım, hazırlık, uzun şıklı soru, şıklı ve tahmin açıklama, puan, tek ve çift joker tanıtımı, iptal, ara, etap sonu, eşitlik, şampiyonluk, erken bitiş.
- **Sahne 1366×768 ve 1024×768:** karşılama, 13 sınıflı harita, uzun adlı katılım, soru, puan tablosu.
- **Telefon 390×844 / 360×800:** katılım, sınıf seçimi, hazır, hazırlık, tahmin gönderildi, joker onayı, Çift Cevap, duraklama, süre doldu, joker cezası, doğru cevap, Çifte Puan, sonuç, iptal, ara, şampiyon.
- **Admin 1366:** karşılama, ana menü, hazırlık, sahne kaybı, puan ekranı, soru yönetimi, ayarlar, telefonsuz puanlama.

Konseptle karşılaştırıldı ve testte bulunan sapmalar düzeltildi: arma boyutu, podyum taşması, sonuç kartı sırası, önizleme etiketi, soru ekranındaki arka plan koyuluğu.

## Doğrulanamayanlar

- **Vercel ve canlı Upstash Redis:** Yeni sürüm canlıya yüklenmedi; canlı API ile test edilmedi. Testler aynı `api/ka.js` dosyasını bellek kipinde kullandı.
- **Fiziksel projeksiyon:** Win+P/Genişlet, salon hoparlörü ve sesin gerçekten duyulduğu doğrulanmadı. Otomasyon yalnız ses çağrılarını ve Web Audio durumunu ölçtü.
- **Gerçek telefonlar:** Kanıtlar masaüstü Chrome'un mobil öykünmesinden. iOS Safari ve Android Chrome'da elle deneme yapılmadı.
- **Yönetici izinli BASLAT.bat:** Yerel sunucu yönetici izni olmadan (yalnız localhost) sınandı. Aynı Wi-Fi'deki gerçek cihazlardan IP adresiyle erişim denenmedi.
- **Diğer tarayıcılar:** Firefox/Edge'de file:// davranışı ve `BroadcastChannel` yedeği denenmedi. Bütün testler Chrome'da.
- **Birden çok sahne penceresi:** Ses sahnesi seçimi kodda var (sesi en son etkinleştiren sahne); iki sahneli senaryo otomasyonla sınanmadı.

## Kalan riskler ve sınırlar

- **Açık API:** Mevcut `/api/ka` kimlik doğrulaması yapmıyor; yarışma koduna ait bütün kayıtlar o kodu bilen herkese açık.
  - Bir telefon diğer sınıfların gönderdiği ham cevapları ağ verisinde görebilir.
  - Sınıf sahipliği cihaz kimliğine dayanıyor ve bu kimlik gizli değil; bilgili bir öğrenci başka sınıf adına komut yazabilir.
  - Admin, zamanı, biçimi ve güncel sahibi doğruluyor; ama kriptografik imza yok. Yerel ağ (http) güvenli bağlam olmadığı için WebCrypto imzası her kipte kullanılamıyor; bu, kapsam dışı bir ürün geliştirmesi olarak bırakıldı.
  - Cevap anahtarı açıklamadan önce hiçbir yere yazılmıyor.
- **Saat eşitliği:** Cevap kabulü sunucu saatine göre düzeltilmiş istemci zaman damgasıyla yapılıyor (±250 ms tolerans). Saati çok kaymış ve uzun gecikmeli bir telefon sınırdaki cevaplarda etkilenebilir.
- **Açılır pencere engeli:** "Sahne Ekranını Aç" tarayıcının açılır pencere ayarına bağlı; engellenirse panel uyarıyor.
- **Aynı kökende iki admin sekmesi:** Her biri bütün kaydı yazdığı için açık bırakılan eski bir sekme yenisinin verisini ezebilir. Tek admin sekmesi kullanılmalı (OKU-BENI).
- **4:3 projeksiyon:** Arka plan görselleri kenarlardan kırpılıyor; metin ve kontroller kırpılmıyor (test edildi).
- **Görsel sapma:** Harita ekranı ayrı bir harita illüstrasyonu olmadığı için karşılama manzarası üzerine HTML düğümleriyle çizildi. Karşılamadaki "Yolculuğa Başla" düğmesi yalnız admin panelinde; sahnede yönetim düğmesi yok.
