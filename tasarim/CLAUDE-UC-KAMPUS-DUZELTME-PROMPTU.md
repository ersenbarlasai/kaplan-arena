# Üç kampüsün aynı anda yarışması — Claude görev promptu

Proje: `E:\PROJELER\KaplanArena`. İlk pilotta üç kampüs, üç ayrı takım olarak aynı anda birbirleriyle yarışacak. Mevcut uygulamayı buna uygun hale getir; yalnız öneri yazmakla kalma, kodla ve doğrula. Önce varsa geçerli AGENTS.md talimatlarını ve güncel Git durumunu oku. Kullanıcının mevcut çalışmalarını ve sinematik entegrasyonunu koru.

## İncelemede doğrulanan kök neden

Mevcut kodda üç ayrı kabul engeli var:

1. `app/admin-actions.js`, `ACT.saveSettings()`: `classes.length < 4` ayarları reddediyor.
2. `app/admin-ui.js`, `controlBar()`: aynı koşulla kura düğmesi kapatılıyor.
3. `app/shared.js`, `validateImport()`: yalnız `classes.length >= 4` ise takım listesini içeri alıyor; üç takımlı yedekte liste sessizce atlanabiliyor.

Bunların ötesinde temel akış iki gruplu turnuva: `ACT.drawGo()` listeyi s1/s2 olarak bölüyor, `drawOk()` ayrı takım listeleri oluşturuyor, `startStage()` etap başında puanları sıfırlıyor, `advance()` her grubun finalistlerini birleştiriyor. `app/admin.js` içindeki etap sonucu hesaplama final dışında ilk ikiyi seçiyor. `app/admin-ui.js` ve `app/stageview.js` iki grup, ilk iki ve dört finalist ifadeleri gösteriyor. Sadece 4'ü 3 yapmak üç kampüsü 2+1 gruba ayırır; istenen çözüm değildir. Satırlar zamanla değişebileceğinden güncel kaynakta tekrar doğrula.

## İstenen davranış

Üç takım için açıkça tanımlanmış “Üç Kampüs — Ortak Yarışma” modu ekle. Bu görevde pilot kuralı: üç takımın tamamı Orman Geçidi, Kadim Kale ve Kaplan Arenası boyunca aynı anda yarışır; eleme olmaz, puanlar üç etap boyunca birikir. Son etap sonunda toplam puan şampiyonu belirler. Dört ve üzeri takımlı mevcut iki gruplu turnuvayı koru. Böylece pilot için üç takım tanımlamak yeterli olsun; sahte dördüncü takım veya tek kişilik grup gerektirmesin.

Bu puan biriktirme kuralını yeni yarışma öncesi yöneticiye açıkça göster. Üç takım varsa mod kendiliğinden seçilsin, fakat başlayan yarışmanın modu ve katılımcıları yarışma kaydına sabitlensin. Ayar değişikliği açık yarışmayı dönüştürmesin. Eski kayıtları ve devam eden turnuvaları yalnız mevcut ayar sayısına bakıp yeni moda geçirme. Modu olmayan eski kayıtlar mevcut turnuva davranışıyla açılsın; yeni üç takımlı yarışmalar yeni modla oluşsun. Ayarlarda en az üç benzersiz, boş olmayan takım adı iste; iki ve altını reddet. İsimleri boşluk/satır/virgül temizliğiyle tutarlı doğrula; aynı kontrolü UI, başlatma ve yedek içe aktarmaya uygula. İlgisiz yeni üst sınır koyma.

### Akış ve veri bütünlüğü

- Üç takım ortak katılım ekranına gelsin. Kura korunacaksa sadece tanıtım/sıra belirlesin; takımları gruplara ayırmasın. Etiketler bunu doğru anlatsın.
- Her etap kendi mevcut soru bankasını kullansın: s1 → s2 → final. Soru Yönetimi, örnek sorular ve yedek yapısı çalışsın. Arena görsellerini ve hikâye sırasını koru; hiçbir etabı soru kaybına yol açacak şekilde atlama.
- Üç takım aynı aktif soruyu ve aynı sunucu esaslı süreyi görsün. Cevaplar, cihaz sahipliği ve bağlantı bilgileri etap geçişinde yanlış kampüse bağlanmasın. İsim/sıra eşlemesini kararlı kimliklerle veya eşdeğer güvenli yöntemle koru.
- Yarışma başında puanlar sıfırdır; yeni soru veya yeni arena başında sıfırlanmaz. Birden fazla takım dizisi kullanılıyorsa kopyalar arasında puan kaybı/çift uygulama oluşturma. Tercihen tek tutarlı katılımcı/puan kaynağı kullan; mevcut turnuva uyumluluğunu koru.
- İlk iki etapta eleme ve finale çıkma eşitlik sorusu çalıştırma; üç takımın tamamı devam eder. Son etapta birincilik eşitse yalnız eşit liderlerle mevcut yedek tahmin sorusu mekanizmasını kullan. Eşitlik sorusu puan sıralamasında eşitliği çözsün; normal toplamları gelişigüzel değiştirmesin. Yine eşitlik veya tüm adayların cevapsızlığı durumunda mevcut güvenli tekrar/admin akışı korunsun. İkinci/üçüncü eşitliğinde şampiyonluk eşitliği üretme.
- Takım başına çift cevap ve çifte puan jokerleri bütün yarışmada birer kezdir; arena geçişi hakları yenilemesin. Yanlış/cevapsız joker cezası −10 ve sıfır tabanı, doğru çift cevap +10, doğru çifte puan +20 olarak kalsın. Aynı soruda iki joker kullanılamasın.
- Yanlış soruyu iptal etme, geri alma, tekrar puan hesaplama ve yeniden yükleme toplam puanları/jokerleri doğru ve yalnız bir kez geri alsın. Etap geçişinden önce/sonra kayıt ve yeniden açma puanları korusun.
- Soru gösterme, cevap açıklama, puan ekranı ve sonraki soruya/etaba geçiş tamamen admin kontrolünde kalsın. Süre dolunca yalnız cevaplar kilitlensin. Sahne salt gösterimdir; admin dışında süre/puan otoritesi oluşmasın.

### Ekranlar ve ağ

Admin, sahne/projeksiyon ve üç öğrenci cihazında takım sayısı ve mod doğru görünsün. Yeni modda “sınıf” yerine gerekli alanlarda “takım / kampüs” gibi kapsayıcı ifadeler kullan; mevcut sınıf yarışması kullanımını bozma. Gerçek kampüs adları verilmediğinden kalıcı ad uydurma; testlerde Kampüs A/B/C kullanabilirsin.

Yeni modda “ilk 2 finale”, “4 finalist”, iki ayrı grup ve “finalde puanlar sıfırdan” ifadeleri görünmesin. Etap sonucu üç takımın toplam puanlarını ve tümünün devam edeceğini göstersin. Şampiyon, doğru bilenler animasyonları, armalar, joker tanıtımı ve üçlü puan tablosu düzgün yerleşsin. 1920×1080 projeksiyon, 1366×768 admin ve dar telefon ekranında kontrol et.

`app/shared.js`, `app/core.js`, `app/admin-actions.js`, `app/admin-ui.js`, `app/admin.js`, `app/stageview.js`, `app/player.js`, `app/net.js` ve gerekiyorsa sunucu/API doğrulamalarını incele. Dosya adlarını güncel depoya göre doğrula. UI'daki üç takım desteğinin ağ yüküne ve telefon katılımına da yansıdığını test et. Üç telefon aynı yarışma koduyla ayrı takım seçerek aynı anda yanıtlayabilsin. Ortak duraklama, bağlantı kaybı/yeniden bağlanma ve yanlış cihazdan cevap reddi çalışsın. İnternet, LAN, telefonsuz ve desteklenen file:// akışlarını koru. Farklı kampüslerin uzaktan internetle katılımı için LAN adresi gerektirme; internet testi yerel taklit sunucusundaysa gerçek kampüsler arası bağlantıyı test ettim deme.

Sinematik açılış/ara videoları, sesin yalnız sahnede çıkması, video sırasında ortak duraklama, açık admin komutuyla dönüş ve statik yedek davranışları etkilenmesin. Bu görev için videoları yeniden üretmek gerekmez.

## Zorunlu doğrulama

Önce mevcut engelleri gösteren anlamlı regresyon testleri ekle; değişiklikten sonra geçtiklerini doğrula. Depoda gerçek Node testleri ve `tests/e2e/` altında Puppeteer altyapısı var; mevcut komutları keşfet, olmayan npm scriptleri uydurma.

1. Ayarlardan üç takım kaydetme, üç takımlı yedeği içe/dışa aktarma, iki takımı/boş ve tekrar isimleri reddetme; hatalı içe aktarmada sessizce eski listeyi bırakmama.
2. Gerçek admin akışıyla yeni üç takımlı yarışma başlatma; 2+1 gruba ayrılmama; üç telefonun aynı soruyu görüp cevap göndermesi.
3. Üç soru bankasının tamamı boyunca üç takımın devamı; örneğin ilk etap 20/10/0, ikinci etap ek puanlarıyla toplamların korunması; son etap öncesi sıfırlanmama.
4. İlk etapta kullanılan jokerin ikinci/üçüncü etapta tüketilmiş kalması; soru iptali/geri alma ve mükerrer puanlamada toplamların doğruluğu.
5. İlk iki etap eşitliğinde gereksiz eleme sorusu çıkmaması; final lider eşitliğinin çözülmesi; tek liderde doğrudan şampiyon sonucu.
6. Sayfa yenileme, checkpoint'ten yükleme, cihaz yeniden bağlanması ve açık yarışma sırasında ayar değişikliğinin modu/katılımcıları bozmaması.
7. Dört ve daha fazla takımlı mevcut grup/eleme/final ve final puanı sıfırlama davranışının korunması; eski kayıtların güvenli yüklenmesi.
8. Manuel geçiş, ortak süre, doğru bilenler gösterimi ve mevcut sinematik testlerinin geçmesi.

Testler için yalnız model nesnesini elle kurmakla yetinme; üç takımlı gerçek başlatma yolunu da E2E ile doğrula. Ekran görüntüleri ve gerçek sonuçları kaydet. Otomatik testlerin gerçek üç kampüste fiziksel denemenin yerine geçtiğini iddia etme.

## Teslimat

Kısa planı yazıp hemen uygula. `tasarim/UC-KAMPUS-TEST-RAPORU.md` dosyasına kök nedeni, mod/puan kuralını, değişen dosyaları, test komutları ve gerçek sonuçlarını, ekran görüntülerini, bilinen sınırları ve kullanıcı için üç kampüs pilotunu başlatma adımlarını yaz. İlgili tasarım/kurulum belgelerini yeni moda göre güncelle; eski turnuva kurallarını silme.

Önceki son kullanıcı talimatındaki commit/push yetkisi bu görev için de geçerlidir: testler başarılı olduktan sonra ilgili değişiklikleri incele, uygun commit oluştur ve doğrulanmış remote/branch'e normal push yap. İlgisiz çalışmaları dahil etme veya silme; force push/reset yapma. Push engelini ve başarısız testi gizleme. Son mesajda raporun mutlak yolunu, commit SHA'sını, push sonucunu ve kalan kontrol adımlarını ver. Ayrı manuel production deploy yapma; mevcut otomatik dağıtım durumunu doğrulamadan yayında deme.

Kullanım limiti yaklaşırsa planı, tamamlanan işleri ve sıradaki adımı `tasarim/CLAUDE-UC-KAMPUS-DEVAM.md` dosyasına kaydet. Ortam otomatik devamı destekliyorsa limit sıfırlanınca checkpoint'ten sürdür; desteklemiyorsa bunu açıkça belirt. Yeni onay istemeden yetkilendirilmiş işi tamamla.
