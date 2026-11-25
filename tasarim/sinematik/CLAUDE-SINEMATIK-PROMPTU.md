# Claude — Kaplan Arena açılış filmi ve ara döngüsünü üret

**Son kükreme tercihi (26 Kasım):** Kullanıcının sağladığı `ses-gercek/hazir/kukreme-kullanici.wav` kullanılacak. `ses-gercek/KUKREME-KULLANICI-NOTU.md` önceki kükreme önerilerinin önüne geçer. Görsel kaplan kalır, ses kullanıcının seçtiği aslan kükremesidir; kaynak türü/lisansı bağımsız doğrulanmış veya CC0 diye etiketlenmez.

Proje: `E:\PROJELER\KaplanArena`.
Hazır paket: `tasarim/sinematik/`.

**26 Kasım 2026 ses güncellemesi:** Kayıt temelli gerçek ses paketi `ses-gercek/` içinde hazır. Önce `ses-gercek/CLAUDE-EFEKT-TESLIMI.md`, `KAYNAK-LISANS.md` ve `efekt-esleme.json` dosyalarını oku. Sentetik kükreme ve fiziksel efekt taslakları yerine `ses-gercek/hazir/` içindeki uygun WAV'ları tercih et. Kaplan alan kaydıdır; metal/kalkan ve ağır kapı sürümleri kayıt temelli foleydir. Bunları dinleyip temas karesine göre miksle. Aşağıdaki eski taslak bilgileri yalnız yedek kaynak açıklamasıdır; artık gerçek kaplan kaydının bulunmadığı varsayımı geçerli değildir.

Bu bir yeni tasarım arayışı değil, hazırlanmış sanat yönünden kurgu ve animasyon üretme görevidir. Kullanıcı video/kurguyu senin yapmanı istiyor. Önce paketi incele, kullandığın gerçek video/animasyon araçlarına göre uygulanabilir üretim yolunu seç, sonra çalışır çıktıları hazırla. Yalnız fikir veya storyboard teslim edip bırakma. Uygulamanın çalışan yarışma mantığını yeniden yazma; mevcut kullanıcı değişikliklerini koru. Canlıya yayın/push yapma.

## 1. Oku ve gör

- `onizleme/sahne-panosi.jpg`: sahnelerin sıralı görsel panosu.
- `sahne-plani.json`: zamanlar, kare aralıkları, kaynak yolları, image-to-video promptları ve ses işaretleri. Zamanlar 30 fps'de bitiş karesi hariç aralıklarla tanımlı.
- `sahneler/`: 10 açılış planı + 1 ara görüntüsü. 01 ve 10 aynı dünya manzarasını bilinçli yeniden kullanır.
- `katmanlar/`: şeffaf kaplan rehber, 12 arma, joker SVG'leri, sis/ışık/toz/kıvılcım/bayrak/çerçeve katmanları.
- `SES-VE-SUNO.md`, `ses-taslaklari/`, `girdiler/BEKLENEN-GIRDILER.md`.
- `../ana-ekranlar-konsept.png`: onaylı görsel kimlik.
- Güncel uygulama dosyaları: `app/stageview.js`, `app/stage.js`, `app/audio.js`, `app/admin-ui.js`, `app/admin-actions.js`, `app/admin.js`, `app/style.css` ve bunların kullandığı model/iletişim modülleri. Paket hazırlanırken artık modüler uygulama vardı; eski tek HTML uygulaması varsayımıyla kodlama.

Önce git durumunu kontrol et. Aktif değişiklikler var, geri alma veya temizleme yapma. Sinematik görevinde mevcut sorular, jokerler, admin/sahne iletişimi, cevap açıklama, puan, duraklatma ve doğru bilenler akışları korunacak.

## 2. Hedef

İki farklı çıktı:

1. **60 saniyelik açılış filmi:** 1920×1080, 30 fps, orman → kale → kısa turnuva karşılaşmaları → arena → kaplan kükremesi → başlık ve kulüp künyesi.
2. **30 saniyelik ara döngüsü:** aynı dünyada sakin arena, çok hafif hareket, konuşmayı bastırmayan ses. Görüntü ve sesin tekrar sınırı kesintisiz olmalı; açılış filmi aralarda sürekli baştan oynatılmayacak.

Sanat: 14–15 yaş için olgun resimli indie macera; petrol/çam yeşili, eskitilmiş altın, sıcak taş ve parşömen. Resimlerin painterly görünümünü koru. Gerçekçi savaş filmi veya neon oyun fragmanına dönüştürme. Turnuva karşılaşmaları kısa gösteri niteliğinde; yaralanma yok. Kaplan aynı karakter: turuncu/siyah çizgiler, petrol yeşili pelerin ve altın yaprak işlemeleri. Aynı kaplanı araya başka yüz/giysiyle sokma. Resmi okul logosu uydurma.

## 3. Üretim yolu ve kalite

Paketteki PNG'ler **durağan ana karelerdir**, hazır hareketli klip veya ayrıştırılmış karakter rig'i değildir. Tam gerçek hareket gerekiyorsa erişebildiğin image-to-video aracında her planı ayrı üret; `sahne-plani.json` içindeki İngilizce promptları kullan. Hareketli sonuçlarda karakter/kapı/kılıç geometrisini kontrol et. Gerekirse 3–7 saniyelik kliplerden iyi aralıkları seç. Kötü ağız/kol/kapı deformasyonunu sırf hareket var diye kabul etme.

Alternatif olarak 2.5D kompozit: hafif kamera, hazırlanmış sis/ışık/toz ve tipografiyle motion-comic yapılabilir. Bu yaklaşımda resimde gömülü kılıçları bağımsız rig gibi oynatıp kolları koparma; küçük zoom ve temas vurgusu kullan. Kılıç düellosu gerçekten animasyonlanmadıysa raporda bunu doğru adlandır. Erişilebilir araç yoksa ücretli/bağlantısız servis varmış gibi davranma; eldeki araçla en iyi yerel taslağı üret ve gerçek hareket için eksik adımı somut belirt. Kullanıcı kurgu görevini sana verdi; yalnız aracı yok diye bütün teslimi bırakma.

Kaynaklar yaklaşık 1672×941. 1920×1080 çıktı için ölçülü upscale uygulanabilir; doğal 4K kaynak iddia etme. Overscan az; 1.00–1.06 civarı kamera ölçeği genellikle yeterli. Kaynağı gererek yeni görüş açısı üretme; boş kenar ve kesilen kulak/kılıç/kalkan oluşturma. Renk ve pozlama sahneler arasında eşlenmeli.

## 4. 60 saniyelik yönetmenlik ve kurgu

### 00:00–00:06 — Dünya çağırıyor

Kaynak: `sahneler/01-dunya-kesfi.png`.

Siyah başlangıçtan yaklaşık 0,7 saniyelik yumuşak açılış. Sabah sisi içindeki orman vadisi, uzak kale ve arena görülür. Kamera çok yavaş yaklaşır; sis ve birkaç ışık zerresi ayrı hareket eder. Ön planda en küçük parallax, gökyüzünde en az hareket. 00:01–00:05 arasında üstte küçük ama projeksiyonda okunur “Kaplan Okulları Yapayzeka Kulübü sunar”. Yazı resme gömülmez. Müzik hafif uğultu/yaylı ile başlar; bu bölümde kükreme veya kılıç sesi yok.

### 00:06–00:12 — Rehber ve yolculuk

Kaynak: `02-kaplan-yolculuk.png`.

Kaplan solda, hedef kale sağda. Önceki manzaradan benzer kompozisyona match dissolve; her kesimde yeni bir efekt kullanma. Pelerin ve yapraklarda az hareket; kamera patikanın yönüne doğru ilerler. Tam yürüyüş animasyonu üretemiyorsan sabit karakteri zemin üzerinde kaydırma. Kaplanı çoğaltma. Enstrüman katmanları burada genişler, ritim hazırlığı başlar.

### 00:12–00:18 — Kadim kapı

Kaynak: `03-kale-kapisi.png`.

Alçak açıyla kapıya yaklaşma, iki meşalede hafif alev hareketi. Altın merkez çizgisi yavaş güçlenir. Yaklaşık 00:13'te taş/ahşap kapı gürültüsü. Kapıyı gerçekten iki kanat ve menteşe geometrisiyle açabilirsen son 2 saniyede küçük açılma yap. Tek düz PNG'yi ikiye kesip ortasını uzatarak sahte tünel üretme. Açılma kalitesi yetmiyorsa ışık çizgisi → avlu kesmesi kullan. Tam beyaz flaş yok; altın ışık doğal geçiştir.

### 00:18–00:24 — Turnuva hazırlığı ve karşılaşma

Kaynak: `04-turnuva-karsilasma.png`.

Teal ve altın pelerinli iki yetişkin zırhlı turnuva muhafızı. Geniş plan, en fazla küçük kamera yayı. Bir kontrollü kılıç teması ve geri toplama; sonsuz dövüş döngüsü değil. Kapalı miğferler, kalkanlar ve zemin tutarlı. Kalkan/giysi desenleri arasında küçük farklar yaratıcı kurgu stilidir; farklı kılıç tutuşunu tek kesintisiz hareketin devamı gibi zorlamadan ayrı gösteri planları olarak kes. Müzik ritmi burada yükselsin. Metal sesi gerçekten temas anına gelsin; JSON'daki 00:22 yalnız başlangıç kurgu işaretidir, klibin temas karesine hizala.

### 00:24–00:27 — Kılıçların sesi

Kaynak: `05-kilic-temasi.png`.

Kılıç temasının yakın planı. Metalik vurgu, küçük sıcak kıvılcım, çok hafif birkaç karelik sarsıntı; ardından dinginleşme. Kıvılcımı temas noktasına yerleştir; tüm ekranı rastgele patlatma. Animasyonda kılıçlar birbirinden geçmesin, el/parmak sayısı değişmesin. Müzikte kısa vurgu, efekt kuyruğuna küçük alan.

### 00:27–00:31 — Kalkanın direnci

Kaynak: `06-kalkan-temasi.png`.

Ön solda zırhlı gözlemci, arka planda iki turnuva muhafızı; bu resimde üç figür olması kasıtlıdır, üçüncü figürü hareketli kol sanma. Altın kalkandaki temas kısa ve okunur. Bir tok kalkan sesi, birkaç kıvılcım. Kılıç kalkanı delmez; yara/kan yok. Bu plan mücadele montajını bitirir. Sesi arena planının üzerine taşıyarak ritmi genişletebilirsin.

### 00:31–00:38 — Arenanın eşiği

Kaynak: `07-arenaya-giris.png`.

Karanlık teal kemerden aydınlık arenaya doğru çok yavaş ileri kamera. Küçük kaplan rehberin bir iki sakin adımı olabilir; büyük sıçrama/koşu yok. Pelerinin altın yaprakları korunur. Işık huzmeleri, toz ve mimari derinlik görsel doruğa hazırlasın. Hafif geçiş sesi, müzikte yükselen yaylılar ve bakır üflemeliler.

### 00:38–00:44 — Arena ortaya çıkıyor

Kaynak: `08-arena-ihtisam.png`.

Geniş boş arena; hafif yükselen kamera veya yumuşak yaklaşma. Bayraklar ve ışıkla mekânın ihtişamı. Rastgele gerçek insan kalabalığı veya okul öğrencilerinin yüzlerini üretme. İstersen kalabalık hissi yalnız çok düşük uzak atmosfer sesi olabilir; isim/sınıf tezahüratı yok. Müzik en güçlü bölgeye yaklaşır. Bu bölümde açıklama metni gösterip görüntüyü doldurma.

### 00:44–00:48 — Kaplanın çağrısı

Kaynak: `09-kaplan-kukreme.png`.

Kaplan sağda, başlık için sol alan boş. Yaklaşık 00:44,3'te kısa kükreme. Müzik burada efekt duyulacak kadar kısılır; ani korkutma değil görkemli bir vurgu. Gerçek ağız animasyonu tutarsızsa sabit güçlü portre + ses ve az kamera kullan; ağzı bozma. 00:45 civarı sol alanda “KAPLAN ARENA”, altında “Efsaneye Yolculuk” görünmeye başlayabilir. Alevli harfler veya sürekli titreşim yerine altın yüzey üzerinde bir ışık geçişi.

### 00:48–01:00 — Başlık ve kulüp künyesi

Kaynak: `10-final-kunye.png`; ayrı `katmanlar/kaplan-rehber.png` ve `baslik-cerceve.svg` isteğe bağlı.

Başlığı ekranın üst/orta güvenli alanına taşıyan yumuşak geçiş. Altta yeterince opak koyu petrol künye alanı; tamamı en geç 00:50'de yerleşmiş olsun ve son 10 saniye okunabilsin. Uzun kayan jenerik veya isimlerin hızlı tek tek akışı yok. 2 mentör ve 8 öğrenci birlikte okunmalı. 00:48'de yumuşak başlık vurgusu; müzik son bölümde çözülür, efektler biter. Son kare sabit karşılama ekranına geçiş için kullanılabilir.

Künye, tam şu sıra ve yazımla:

**Düzenleyen:** Kaplan Okulları Yapayzeka Kulübü

**Mentörler:** Ersen BARLAS; Alp Han KOÇDEMİR

**Kulüp Öğrencileri:** Emre Burak Tölegen; Burak Yoğurtçu; Halil Mert ACAR; Yekta Efe Konuk; Çınar Arda; Yusuf Emir Kuş; Ömer Araf Boncuk; Emir Karatay

Başlık/künye 1920×1080'de yaklaşık yüzde 8 kenar güvenli alanında kalmalı. 4:3 perde için metni kesmek yerine videoyu contain/letterbox göster veya ayrı 4:3 yerleşim üret. Soru verileri ve bu jenerik isimleri birbirine karışmasın. Yerel Türkçe fontlar `assets/fonts` altında zaten var; güncel CSS ve lisansları kullan. Tüm yazılar compositing/DOM katmanlarıdır, PNG içine kalıcı gömülü değildir; render video sürümünde doğal olarak görüntüye işlenebilir, düzenlenebilir proje kaynağı korunur.

## 5. Ara bekleme: gerçek kesintisiz döngü

Kaynak: `sahneler/ara-arena-sakin.png`, süre 30 saniye.

Kamera sabit veya tam periyodik; bir yönde sürekli zoom yapıp başa sıçratma. Çok yavaş sis, hafif bayrak hareketi, az ışık tozu. Hareket fazları 30 saniyede başlangıca dönsün. Rastgele parçacık doğumlarını döngü sınırında görünür kesme; deterministik faz veya uygun uç örtüşmesi kullan. Sadece ilk/son kareyi benzetmek hız ve ses sürekliliği için yeterli değildir; en az 3 döngü izle/dinle.

Çarpışma, kükreme, vurmalı patlama, ani yakın plan yok. Ortada “KAPLAN ARENA”, altında “Efsaneye Yolculuk” ve küçük “Birazdan devam ediyoruz”. Künye istenirse sabit alt bölümde okunur kalır; introda olduğu için arada saniyeler içinde tekrar tekrar animasyonla girmez. Konuşma için müzik düşük yoğunlukta. “Konuşma modu”nda sinematik müziğini kıs; zorunlu mikrofon analizi kurma, manuel düğme yeterli. Mevcut genel ses ayarını aşma.

Açılış filmi 60 saniye sonunda sakin karşılama son karesine/döngüye geçebilir; **yarışmayı veya ilk soruyu otomatik başlatamaz**. Açılış yeniden oynatılabilir; aralarda varsayılan sakin döngü, bütün fragmanı otomatik tekrar oynatma yok.

## 6. Müzik ve ses

`SES-VE-SUNO.md` ana müzik ve ara müziği brieflerini içerir. **Gerçek Suno besteleri artık üretildi ve indirildi:** `girdiler/acilis-muzik.wav` (58,8 saniye, 48 kHz stereo; MP3 kopyası da var) ve `girdiler/ara-muzik.mp3` (yaklaşık 74,96 saniye). Ara bestesinin WAV sürümü varsa onu tercih et; `girdiler/MUZIK-TESLIMI.md` ve `muzik-envanter.json` güncel dosya listesi/ölçümler için kaynak olsun. Dosyaların varlığını doğrula; önceki “müzik henüz yok” notları tarihsel kalmıştır. Açılış 60 saniyelik kurguya müzikal kapanış/reverb kuyruğuyla yerleştirilmeli; kısa fark için tüm parçayı kaba esnetme. Ara bestesi hazır 30 saniyelik loop değildir; 30 saniyelik uyumlu aralık seçip sınırını dinleyerek düzenle. SFX/kükreme bestelerden ayrı katmanlardır. Teknik doğrulama yapıldı, fakat dinleme karşılaştırması ve final miks onayı verilmedi. Müzik kaynaklarını değiştirmek tek yapılandırmadan mümkün olsun.

Altı WAV özgün prosedürel sentez taslağıdır: kılıç, kalkan, whoosh, kapı gürültüsü, başlık vurgusu ve stilize kükreme. Gerçek saha kaydı veya profesyonel nihai foley değildir. Özellikle `kaplan-kukreme-STILIZE-TASLAK.wav` robotik/stilize duyulabilir; uygun değilse gerçek lisanslı kaplan sesiyle değiştir, bunu raporla. İlk dinlemede kaliteyi değerlendir; dosya adı güzel diye körlemesine final miksine alma. Kullanılan dış seslerin lisans/kaynak bilgisi teslimde yer alsın. Eksik dış hesap/harcama için kendiliğinden satın alma yapma.

Ses efekti ve müzik ayrı kanallar; finalde master + clean video + ayrı müzik/SFX renderları üretilebilir. Aşırı bas veya ses yüksekliğini epiklik yerine koyma. Efekt anlarında müziği yaklaşık 3–6 dB duck et, sonra doğal geri getir; bunlar başlangıç miks önerisidir, dinleyerek ayarla. Video çıktısında yaklaşık −16 LUFS integrated ve en fazla −1 dBTP hedefle; bu değerler fiziksel salon ses seviyesini garanti etmez. Mevcut salon ses kontrolüyle test gerek. Konuşmalı ara müziği açılıştan belirgin düşük olmalı.

Video dosyasında miksli ses varsa ayrıca aynı müziği/SFX'i Web Audio'dan çalıp ikiye katlama. Tek ses sahibi ve medya saati kullan. Admin önizlemesi ve telefonlar her zaman sessiz. Tam ekran/ses autoplay izni kullanıcı etkileşimiyle alınır; izin verilmezse video sessiz çalışır, uygulama hata vermez.

## 7. Uygulamaya bağlama

Admin panelinde “Açılış Filmini Oynat”, “Ara Döngüsü”, “Durdur / Karşılamaya Dön”, “Atla” kontrolleri. Video perdesinde admin düğmeleri görünmez. Açılış videosu sadece kullanıcı/admin başlatınca tam sesli oynar; yenilemede veya yeniden bağlanmada yüksek sesle baştan otomatik başlamaz.

Ara veya açılış, aktif yarışma sırasında seçildiyse mevcut ortak duraklatma sistemini kullan: süre ve bütün cevap kabulü birlikte durur. Medyanın bitmesi veya Atla oyunu kendiliğinden başlatmaz; adminin devam eylemi gerekir. Önceki soru/puan/jokerler korunur. Adminin video önizlemesi ses üretmez ve yarışma modelinin her renderında sahne videosunu yeniden başlatmaz.

Sahne renderının innerHTML yenilemesi video elementini her sayaç/model güncellemesinde sıfırlamasın. Sinematik için sabit medya kapsayıcısı veya eşdeğer kararlı yaşam döngüsü kur; oynatma oturumu kimliğiyle güncelle. Sahne tekrar bağlanınca güvenli mevcut görünüm/ara durumuna dön; eski kükreme/film baştan çalmasın. Sahne sesi sahipliği değişirse önceki penceredeki medya da susturulur. Kaçak RAF, ses düğümü, timeout, video decode yükü bırakma.

Videolar yerel varlık olarak dağıtılır. Vercel/LAN/file:// yolları korunur. Mevcut PowerShell statik sunucusunda video MIME ve byte-range davranışını kontrol et; gerekirse güvenli aralık isteklerini destekle. Büyük master dosyalarını uygulamaya zorunlu yükleme; uygun web kopyası üret. preload/erişim başarısızsa mevcut resimli karşılama fallback'i kullan. İnternetsiz okul ağında dış video CDN/iframe bağımlılığı yok. Medya üretimini deploy etmeden önce yerelde test et.

Hareketleri azaltma açıkken epik dövüş klibini zorunlu oynatma; sabit karşılama veya sakin sürüm kullanılabilir. Sessiz kullanım birinci sınıf desteklenir; metinler ses olmadan da anlaşılır.

## 8. Teslim ve kontrol

Seçtiğin kurgu kaynağını/senaryosunu, değiştirilebilir metinleri, referans dosya yollarını ve yeniden render komutunu bırak. Erişebildiğin araçla en az:

- `ciktilar/kaplan-arena-acilis-1080p.mp4` — 60 s, 1920×1080, 30 fps, H.264/yuv420p; ses varsa AAC 48 kHz; faststart.
- `ciktilar/kaplan-arena-ara-1080p.mp4` — 30 s; gerçek döngü denetimi yapılmış.
- Gerekirse `.webm` ve daha hafif web kopyaları; MP4'ü tek tarayıcıya özel codec ile üretme.
- Müzik eksikse sessiz/efekt taslaklı çıktıyı dürüstçe adlandır; “Suno bestesi tamamlandı” deme.
- Açılış 00:02, 00:15, 00:25, 00:35, 00:46, 00:55 kareleri ve ara döngüsünden önizleme görselleri.
- Kısa rapor: gerçek video tekniği (image-to-video / 2.5D / karışık), hangi seslerin taslak olduğu, eksik girdiler, kullanılan lisanslar, çalıştırma/render ve test komutları.

Kontroller: 60 s/1800 kare ve 30 s/900 kare; kesmelerde siyah/boş kare yok; yanlış kol/kılıç/kapı/ağız bozulması yok; kliplerde yazı uydurulmamış; bütün Türkçe isimler doğru ve en az son 10 saniye okunur; 4:3'te metin kaybı yok; ses clipping yok; 3 ara döngüsünde görüntü ve ses atlaması yok. Admin/sahne/telefon birlikte denenir; sinematik açıkken cevap kabulü kapalı, ses yalnız etkin sahnede, Atla/bitiş otomatik soru başlatmıyor, tekrar render/bağlanma filmi ve sesini yeniden başlatmıyor, eksik video veya ses dosyasında güvenli fallback var.

Tamamlanmamış videoyu veya test edilmemiş loop'u bitmiş diye teslim etme. Uygulama zaten başka değişiklikler içerdiğinden yalnız bu sinematik için gereken alanları düzenle ve mevcut işlevleri bozmadığını doğrula.
