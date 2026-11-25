# Claude — Kaplan Arena tasarımını uygula

Ek sinematik görev: Kullanıcının son talebi için `sinematik/CLAUDE-SINEMATIK-PROMPTU.md` ve `sinematik/BASLA.md` dosyalarını da oku. Hazır sahne/katman/ses taslağı paketiyle 60 saniyelik açılış ve sakin ara döngüsü isteniyor. Ayrı admin/sahne, tek ses sahibi, manuel soru başlatma ve ortak duraklatma kuralları video gösteriminde de korunur. Bu ek görev mevcut durağan karşılama fallback'ini kaldırmaz.

Bu görev uygulama görevidir. Tasarım ve aşağıdaki davranışlar kullanıcı tarafından onaylandı. Yeniden genel tasarım soruları sormadan mevcut projede çalış; gerçek bir çelişki/engelle karşılaşırsan somut bulguyla belirt. Hedef yalnız güzel bir ana ekran değil, admin + projeksiyon sahnesi + öğrenci telefonunun birlikte çalışan tamamlanmış deneyimidir. Canlıya yayınlama, push veya uzak veri sıfırlama yapma.

## 1. Başlangıç ve kaynaklar

Proje: `E:\PROJELER\KaplanArena`.

Önce varsa AGENTS.md talimatlarını, git durumunu ve güncel kodu oku. kaplan-arena.html ile OKU-BENI.txt içinde mevcut kullanıcı değişiklikleri var; bunları geri alma. .env.local içeriğini çıktılara, ekran görüntülerine veya dokümanlara koyma. Yeni framework veya kapsamlı yeniden yazım gerekmez; düz HTML/CSS/JS yapısını koru. Gerekli ayrıştırmayı küçük, gerekçeli modüllerle yapabilirsin; dosyadan açılma desteğini bozma.

Şunları mutlaka aç ve incele:

- `tasarim/ana-ekranlar-konsept.png` ve `tasarim/ogrenci-ekranlari-konsept.png`: onaylanmış görsel hedefler.
- `tasarim/tasarim-kararlari.md`: sanat yönü ve künye.
- `tasarim/claude-hazirlik-incelemesi.md`: 1–19 numaralı kullanıcı kararları. Eski kontrol listesi yeni karar değildir.
- `tasarim/varliklar/VARLIKLAR.md` ve bütün görsel varlıklar.
- `kaplan-arena.html`, `api/ka.js`, `katil/index.html`, `kaplan-sunucu.ps1`, `BASLAT.bat`, `index.html`, `vercel.json`, `.vercelignore`, `OKU-BENI.txt`.

Bu prompt ve kayıtlı kullanıcı kararları, eski kaynak yorumlarının veya eski tasarım önerilerinin önüne geçer. `tasarim/oneri.html` eski mor tasarımdır; görsel hedef olarak kullanma. Göreve başlarken değişiklik alanlarını ve doğrulama planını kısaca belirt, sonra uygula. Yalnız plan sunup bırakma.

## 2. Görsel hedef

14–15 yaş için “Efsaneye Yolculuk”: resimli sinematik indie macera, petrol/orman yeşili, sıcak parşömen, eskitilmiş altın, ölçülü kaplan turuncusu. Çocukça/chibi maskot, mor-neon genel oyun şablonu, emoji ikonları ve jenerik dashboard kartlarına dönüştürme. Konseptteki çerçeve, yazı hiyerarşisi, sıcak ışık ve illüstrasyon hissini koru.

Harita ve etaplar: Orman Geçidi → Kadim Kale → Kaplan Arenası. Gerçek etap anahtarları s1/s2/final ve mevcut kura/finale çıkma kuralları korunur. Bütün metinler Türkçe. Soru, seçenek, sınıf ve puanlar resme gömülmez; gerçek DOM metnidir. Görsel dosyalarını kullan; birleşik konsept PNG'yi çalışan ekran yerine koyma. Yerel Türkçe karakter destekli fontlar ve lisanslarını ekle; dış font servisine bağımlılığı kaldır. Resmi okul logosu gerekiyorsa mevcut LOGO verisini koru; yeni resmi logo uydurma. Özgün rehber/armalar oyun öğeleridir.

Sahnede geniş parşömen soru kartı, sakin dekor, yüksek kontrast, okunaklı büyük yazılar. Admin yönetimi aynı renklerde ama sade. Telefonda geniş dokunma alanları, dikey şıklar, okunur durumlar ve kalan jokerler. Ağır WebGL gerekmez. Animasyonlar karşılama/etapta hafif, jokerde kısa güçlü, finalde kutlamalı; soru okunurken sakin. Hareket azaltma kontrolü ve işletim sistemi tercihi desteklenir. Hareket azaltılması kural ve bilgi kaybına yol açmaz.

## 3. Ayrı admin ve sahne

Aynı bilgisayarda admin paneli, projeksiyonda ayrı salt görüntüleyici pencere kullanılır. Windows Win+P → Genişlet; ek monitör gerekmez. “Sahne Ekranını Aç” eylemi kullanıcı etkileşimiyle pencere açar; admin pencereyi projeksiyona taşır ve tam ekran yapar. Tarayıcı kısıtlarını atlayarak otomatik monitör seçimi/taşıma garantisi verme.

Sahne admin komutlarının güvenilir güncel izdüşümüdür; host kilidi almaz, yarışma başlatmaz, süre/puan hesaplamaz, cevap kabulünü yönetmez. Başlatma kipini hostInit'ten önce ayır; sahne açılması mevcut tek aktif yarışma korumasına takılmasın. Güncel durumu yeniden açıldığında almalı, eski sürüm veya ses olaylarını tekrar uygulamamalıdır. Uygun yerel pencere iletişimini ve gerekli fallback'i seç, file:// desteğini doğrula; salt BroadcastChannel veya localStorage'ın file:// altında her yerde aynı davranacağını varsayma. Sahneye gizli cevap anahtarı, yönetim kontrolleri veya henüz açılmamış soru gönderme. Katılım QR/kodu yalnız uygun katılım görünümünde gösterilebilir.

Aktif soruda sahne kapandıysa veya algılanabilir iletişim kaybı varsa süre ve bütün cevap kabulü durur, admin uyarılır. Geri gelince aynı soru/kalan süre gösterilir; admin devam ettirir. Tek telefonun bağlantı kaybı yarışmayı durdurmaz. Fiziksel kablo/perdede görüntü denetimini garanti etme. Birden fazla sahne görünümünün sesleri çoğaltmasını engelle; bir etkin ses sahnesi belirle.

## 4. Açılış ve künye

Karşılama ekranında yazısız yolculuk manzarası + kaplan rehber, “Kaplan Okulları Yapayzeka Kulübü sunar”, “KAPLAN ARENA”, “Efsaneye Yolculuk”, “Yolculuğa Başla” bulunur. Alt künye tamamen okunur; 2 mentör ve 8 öğrenci kırpılmaz. İsimleri tam bu sıra/yazımla kullan:

Mentörler: Ersen BARLAS; Alp Han KOÇDEMİR.

Kulüp öğrencileri: Emre Burak Tölegen; Burak Yoğurtçu; Halil Mert ACAR; Yekta Efe Konuk; Çınar Arda; Yusuf Emir Kuş; Ömer Araf Boncuk; Emir Karatay.

Açılış karşılama → ana menü. Devam eden yarışmada “Yarışmaya Devam Et” bulunur; veriler sıfırlanmaz. Admin arada karşılama ekranına dönebilir; süre/cevap kabulü durur, telefonlar ara/bekleme gösterir. Dönüş yarışı bitirmez veya kalan süreyi sıfırlamaz; admin devam ettirir.

## 5. Tam manuel gösterim akışı

Her soruda (ilk soru dahil): hazırlık “Hazır mısınız?” → admin “Soruyu Göster” → ana sahne/telefonlarda soru ve ortak sayaç → süre sonunda cevap kabulü kilitlenir → admin “Cevabı Açıkla” → admin “Puanları Göster” → admin “Sonraki Soru” → yeni hazırlık.

Hazırlıkta soru/şık/cevap anahtarı telefonlara veya sahneye sızmaz. Sonraki soruya geçmek süreyi başlatmaz. Admin isterse süre bitmeden “Cevabı Açıkla” der; onaydan sonra süre ve cevaplar kilitlenir. Tüm sınıfların erken cevaplaması otomatik geçiş/açıklama başlatmaz.

Otomatik cevap açıklama, 4 saniyelik otomatik puanlama, 5 saniyelik sonraki soru ve ilişkili zamanlayıcı/kısayol yan etkilerini kaldır. Doğru cevap gösterilirken sınıf puan sonuçları ayrıca “Puanları Göster” denmeden açılmasın; telefonda da aynı gösterim aşaması uygulanmalı. Puanı sistem hesaplar, admin gösterim zamanını seçer. Tekrarlanan tıklama/yenileme/senkronizasyon aynı sorunun puanını yeniden uygulamaz. Eşitlik ve etap sonu da adminin ilerletmesiyle yürür. Mevcut puan düzeltme yetkisi ve güvenli geri alma davranışını koru, yeni hak tüketimiyle tutarlı hale getir.

### Doğru bilenler gösterimi — ek kullanıcı onayı

Admin “Cevabı Açıkla” dediğinde önce doğru şık altın ışıkla belirginleşir. Ardından doğru cevaplayan sınıfların armaları ve adları kısa aralıklarla tek tek sahneye gelir; sonunda bütün doğru bilenler birlikte görünür ve admin ilerletene kadar kalır. Giriş sırası cevap hızına göre bir sıralama/ödül anlamı taşımasın; mevcut sınıf sırası gibi kararlı bir sıra kullan. Çift Cevapta seçimlerden biri doğru olan sınıf da gösterilir. Çifte Puanla doğru bilenin armasında ×2 mührü parlar. Tahmin sorusunda doğru şık yerine doğru sayısal değer vurgulanır, mevcut en yakın cevabı veren kazanan sınıflar aynı gösterime dahil edilir; sonuç hesaplanmadan kazanan uydurulmaz.

Her arma girişinde kısa ışık izi ve yalnız sahnede ölçülü ses kullanılabilir. Telefonlar/admin ses üretmez; ses kapalı ve azaltılmış hareket tercihleri geçerlidir. Hareket azaltıldığında armalar doğrudan birlikte görünür. Sınıf sayısı fazla olduğunda adları/armaları kırpma veya okunamayacak kadar küçültme; uygun çok satırlı yerleşim ve kısa toplam giriş süresi kullan. Bu bir doğruluk gösterimidir, henüz puan uygulaması/gösterimi değildir. Telefon doğru/yanlış durumunu görebilir fakat +10/+20/−10 ve toplam puan değişimi “Puanları Göster” öncesinde açılmaz. Kimse kazanmadıysa “Bu soruda doğru cevap gelmedi” gösterilir; sahte kutlama yapılmaz.

Admin “Puanları Göster” dediğinde gerçek puan değişimleri ve toplamlar animasyonla güncellenir; puanlar yalnız bir kez uygulanır. Animasyon bitişi kendiliğinden sonraki aşamayı başlatmaz. Yenileme/bağlantı dönüşü aynı gösterimin giriş seslerini tekrar çaldırmaz; güncel birleşik sonuç görünür. Admin animasyon sırasında ilerlerse eski animasyon/ses zamanlayıcıları yeni ekrana taşmaz. Soruyu iptal etmek gösterimi de iptal eder. Eşitlik soruları puan/joker üretmeden mevcut eşitlik sonucu akışını korur.

Doğrulama: tek/çok/hiç doğru bilen, çift cevapla doğru, ×2 ile doğru, birden fazla en yakın tahmin, azaltılmış hareket, ses kapalı, gösterim sırasında yenileme/iptal/erken ilerleme; “Puanları Göster” öncesi puan değişmemesi ve sonrası yalnız bir uygulama. Yeni gösterimin sahne ekran görüntüsünü teslim et.

## 6. Cevaplar ve jokerler

Şık seçimi taslaktır; “Cevabı Gönder” ile gönderilir. Süre devam ederken değiştirip yeniden gönderilebilir. Son başarılı gönderim geçerlidir; ağ hatasında gönderildi deme. Yeniden gönderilmeyen yeni taslak eski gönderimi silmez. Çift Cevap için tam iki farklı şık gerekir; tek taslak cevap sayılmaz. Taslaklar soru değişiminde temizlenir. Yeniden bağlantıda gönderilmiş cevap ve haklar geri gelir.

Her sınıfta tüm yarışma boyunca 1 Çift Cevap ve 1 Çifte Puan; etap/final geçişinde yenilenmez. Aynı soruda aynı sınıf tek joker kullanabilir; farklı sınıflar aynı soruda kendi jokerlerini kullanabilir.

- Çift Cevap yalnız şıklı soru: iki seçimden biri doğruysa +10; ikisi yanlışsa ceza.
- Çifte Puan normal şıklı ve normal tahmin sorusu: kazanırsa +20; kazanamazsa ceza. Tahminde mevcut en yakın ve eşit uzaklıkta kazanan kuralları korunur.
- Jokerli yanlış veya cevapsız soruda −10; toplam en az 0. 5 puandan düşüş −5 olarak gösterilir, −10 uygulanmış gibi raporlanmaz.
- Eşitlik sorularında joker yok; yalnız eşitlik çözülür.
- Joker yalnız süre çalışırken, soru açıkken, sınıf o soruya henüz ilk cevabını göndermemişken kullanılabilir. Duraklatmada, süre bitiminde veya açıklama sonrasında kullanılamaz.
- Etki ve ceza anlaşılır onayla gösterilir; istek yetkili tarafta kabul edilince hak tüketilir. Kabul edilmiş joker geri alınamaz. Eski admin tekrar tıklayarak geri alma yolunu kaldır. Admin telefonsuz sınıf için aynı koşullarla kullanabilir.
- Joker seçilince diğer joker bu soruda kilitli; tüketilen joker yarışmanın kalanında mühürlü görünür. Hak tüketimini, ilk cevap/joker yarış koşullarını ve tekrar gönderimi yalnız CSS düğme engeliyle koruma; yetkili kabul/ret ve tekilleştirme uygula. Süre dışı, eski soruya ait veya yetkisiz sınıf komutunu geçerli sayma. Mevcut oyuncu/sınıf sahipliği modelini incele; yeni ayrı bir hesap sistemi ekleme.

Joker tanıtımında bütün sınıflar için süre ve cevap kabulü birlikte durur; ekranlar ortak duraklatma durumunu kullanır. Kalan süre korunur. Aynı anda kabul edilen jokerler tek kısa gösterimde sınıf + joker olarak sunulur; peş peşe süreyi uzatmasın ve son gelen öncekinin bilgisini silmesin. Kısa gruplama penceresinin teknik süresini belirle ve test et. Yeni joker istekleri duraklatmada kullanılamaz; duraklama öncesi gerçekten aynı anda geçerli kabul edilenler birleştirilir. Admin/sahne kaybı gibi başka duraklatma nedeni varsa tanıtımın bitmesi oyunu kendiliğinden devam ettirmez.

## 7. Soru iptali

Admin aktif/en son soru için onayla “Soruyu İptal Et” kullanabilir. Soru puan/cezası uygulanmaz; uygulandıysa yalnız gerçek uygulanmış değişim geri alınır. O soruda tüketilen jokerler iade edilir. Önceki sorular etkilenmez. İşlem tekrarlanırsa ikinci iade olmaz. Sıfır sınırına takılan cezanın tersini nominal 10 ile değil gerçek delta ile al. Sahne ve telefonlar “Soru iptal edildi” durumunu gösterir, cevap/joker kabulü kapanır; sonraki soruya admin geçer. Geçmiş soruları sınırsız düzenleyen yeni bir sistem yapma.

## 8. Bütün ekranlar ve varlıklar

Karşılama, menü/harita, kura, katılım, hazırlık, şıklı soru, tahmin, kilitlenmiş cevap bekleme, cevap açıklama, puan tablosu, etap sonucu, eşitlik, şampiyonluk ve erken bitişi tamamla. Telefonda katılım/sınıf seçimi, sınıf dolu/devralma, bekleme, hazırlık, normal/çift cevap/çifte puan, gönderildi/gönderilemedi, süre doldu, joker bekleniyor/reddedildi, sonuç, final/elendi, ara ve bağlantı hatası durumlarını kapsa. Admin soru yönetimi, düzenleme, ayarlar, yedekleme ve onay ekranları aynı sade görsel sistemde olsun.

Her sınıfa simgesi ve rengi farklı arma; adı yanında gerçek veri olarak yazılır. Eşleme kaydedilir ve final/yenileme/yeni sınıf eklemede var olan sınıflar için değişmez. 12 arma SVG başlangıç paketidir; gerçek sınıf sayısını 4 veya 12 ile sınırlama. Konseptteki sınıf/puan/soru örneklerini gerçek ayarlar yerine yazma. Mevcut varsayılan sınıf sayısı 11; bunu ve uzun adları test et.

Görseller `tasarim/varliklar` altında: karsilama.png, orman.png, kale.png, arena.png, kaplan-rehber.png, arma-*.svg, joker-*.svg. Gerektiğinde dağıtım varlık dizinine kopyala; tüm referansları gerçek dosyalarla bağla. Yeni yazısız raster hazırlaman gerekmiyor. Yerel fontlar/uygun lisans ve ses uygulaması senin görevin. Ses Web Audio ile çevrimdışı üretilebilir.

## 9. Ses ve çalışma biçimleri

Ses yalnız etkin sahne penceresinde çalar; admin ve telefon sessizdir. Joker, son saniye/süre sonu ve kutlama sesleri için ana ses seviyesi ve kapatma kontrolü admin panelinde bulunur. Kullanıcı etkileşimiyle sahnede ses etkinleştirme/test adımı olsun; engellenmiş autoplay yarışmayı bozmasın. Ses için veri güncellemelerini olay kimliğiyle tekilleştir; yeniden bağlanınca eski sesleri çalma.

Vercel internetli telefon katılımı, aynı LAN'da internetsiz PowerShell sunucusu, telefonsuz kullanım ve mevcut HTML dosyasına çift tıklama akışlarını koru. Dosya modu internetsizse telefon katılımı varmış gibi gösterme. Ayrı sahne bağlantısını hepsinde doğrula. Yerel sunucu yeni görsel/font/ses dosyalarını doğru MIME ile güvenli biçimde sunmalı; path traversal veya .env/.git erişimi açma. Dağıtım ayarlarını buna göre gözden geçir. HTML file:// kökeninde font/iletişim kısıtları varsa kendi kendine çalışan uygun fallback sağla ve dene; sessizce kullanım biçimini kaldırma.

Yerelde çalışma mevcut soruları, yedeklemeleri, ayarları ve yarışma durumunu kaybetmemeli. Kalıcı veri şeması değişirse sürümlü, geriye uyumlu göç yap; eski kaydı örnek verilerle ezme. QR, altı haneli kod, tek aktif yarışma kilidi ve yeniden devam özelliklerini koru. Backend sırlarını ve cevap anahtarlarını öğrenci/sahne durumuna açma. Mevcut genel API risklerini incelerken kapsamı ayrı bir ürün geliştirmesine dönüştürme; değişikliğin getirdiği kabul/ret doğrulamasını tamamla, kalan sınırları açık raporla.

## 10. Doğrulama ve teslim

Sadece statik HTML görünümüne bakıp tamamlandı deme. Uygulamayı yerelde çalıştır, bir admin + ayrı sahne + birden fazla öğrenci bağlamını birlikte kullan. Testlerde gerçek okul verilerini ve canlı Redis'i değiştirme.

En az şu durumları otomasyon/entegrasyon kontrolleriyle kanıtla:

- Hazırlıkta gizli soru yok; admin açınca tek ortak süre; sıfırda cevap kilidi; manuel açıklama/puan/sonraki soru; otomatik ilerleme yok.
- Normal doğru +10; Çift Cevap iki farklı seçim, biri doğru +10; ikisi yanlış −10; Çifte Puan doğru +20; jokerli cevapsız ceza; 0 ve 5 puanda gerçek düşüş; tahmin/eşitlik uygunluğu.
- Gönder düğmesi, yeniden gönderim, başarısız gönderim, tek seçimle Çift Cevap gönderememe; ilk gönderimden sonra joker reddi.
- Aynı soruda ikinci joker reddi, yarışma boyunca bir hak, finalde hak korunması, geri alamama; eşzamanlı istek/cevap ve süre sonu sınırları; tekrar tıklama puanı/hakkı çoğaltmaz.
- Ortak joker duraklaması, eşzamanlı tanıtım, cevabın duraklamada reddi, başka duraklatma varken otomatik devam olmaması.
- Sahne ikinci host kilidi almaz; sahne kaybı/yeniden açma, adminin devamı, telefon kopması; puan ve haklar yeniden uygulanmaz.
- İptal öncesi/sonrası puan, gerçek delta geri alma, joker iadesi ve tekrar iptal; önceki sorular değişmez.
- Sahne/telefon erken cevap anahtarı görmez, ses yalnız etkin sahnede; yeniden açma eski sesleri tetiklemez.
- Eski kayıt/yedek göçü, içe/dışa aktarma, uzun Türkçe adlar, 11 ve daha çok sınıf.

Görsel kontrol: 1920×1080 ve 1366×768 sahne, 1024×768 (4:3) projeksiyon, 360×800 ve 390×844 telefon. Uzun soru/şıklar ve tüm künye kırpılmamalı; zorla küçültülmüş okunamaz yazıyla sığdırma. Sahnede admin düğmesi ve kaydırma gereksinimi olmamalı; telefonda gerektiğinde düzgün dikey kaydırma kullanılabilir. Bütün temel ekranların görüntülerini kaydet, konseptle karşılaştır, bariz sapmaları düzelt.

Yerel LAN statik varlıkları ve API, dosyadan açma ve çok pencere akışını gerçekten dene. Vercel/Redis veya fiziksel projeksiyon test edilmediyse test edildi deme. Test raporunda komutlar, sonuçlar, doğrulanamayanlar ve kalan riskler ayrı olsun. Kod dosyaları, varlıklar, gerekli yerel font/lisanslar, güncel OKU-BENI.txt (Win+P/Genişlet, sahne açma/ses testi, manuel akış ve joker kuralları), ekran görüntüleri ve kısa teslim raporu bırak. Canlıya deploy/push yapma.

Sonuç: Onaylı sanat yönüne görsel olarak yakın, üç yüzü birlikte çalışan ve mevcut verileri koruyan yerel yarışma uygulaması. Kısmi maket, sahte düğmeler veya “sonra bağlanacak” kritik akış bırakma.
