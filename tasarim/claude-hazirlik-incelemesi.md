# Claude uygulaması için hazırlık incelemesi

25 Kasım 2026 — kaynak okuması; henüz çalışma zamanı testi yapılmadı.

## Güncel bulgular

- Uygulama düz HTML/CSS/JavaScript; ana arayüz, yönetim ve telefon görünümü kaplan-arena.html içinde. Yeni bir çatıya geçiş gerekmiyor.
- OKU-BENI.txt ve kaplan-arena.html içinde kaydedilmemiş mevcut değişiklikler var. Claude bunları başlangıç kabul etmeli, geri almamalı.
- Joker kayıtları, aynı soruda tek joker kontrolü, telefonda iki şık seçimi, iki dokunuşla joker onayı, +20/ceza sonuçları, ses ve tanıtım kaynakta mevcut. Önceki tasarım-kararlari.md içindeki öğrenci tarafının eksik olduğuna ilişkin gözlem eskimiş; yeni uygulama mevcut davranışı koruyup onaylanan kararlara uyarlamalı.
- jokerIntro yaklaşık 3,1 saniyelik kaplama oluşturuyor; sayacı durdurmuyor ve eşzamanlı tanıtımda önceki kaplamayı kaldırıyor.
- Telefonda şık seçimi anında gönderiliyor, süre içinde değiştirilebiliyor. Konseptteki gönder düğmesiyle farklılık kullanıcıyla netleştirilmeli.
- Mevcut ceza cevapsız soruyu da kapsıyor; toplam sıfırın altına düşmüyor. Yönetici jokeri cevap açıklanmadan geri alabiliyor. Çifte Puan normal tahmin sorusunda kullanılabiliyor; eşitlik akışı ayrı.
- Otomatik akış: süre sonunda 1,5 saniye sonra cevap açıklama, ardından 4 saniyelik otomatik puanlama, puan tablosundan 5 saniye sonra sonraki soru. Yeni animasyonlar bunlarla çakışmamalı.
- İki onaylı konsept PNG var; yazısız sahneler, kaplan/armalar ve ayrı arayüz varlıkları henüz yok. Tam konsept görseli uygulamanın arka planı yerine konmamalı.
- Yerel PowerShell sunucusu yalnız ana HTML ve API yollarını sunuyor; yeni harici görsel/font/ses yolları mevcut haliyle 404 alır. Çift tıklayarak açılma, Vercel ve yerel ağ biçimleri birlikte planlanmalı.
- Karşılama, soru yönetimi, ayarlar, yedekleme, onay kutuları, kura, katılım, normal soru, tahmin, puan tablosu, etap sonu, eşitlik, şampiyonluk, erken bitiş, kilit/bağlantı hata ve bekleme durumları bütün olarak kapsanmalı.
- Varsayılan sınıf sayısı 11; konseptteki dört sınıf yalnız örnek. Harita, armalar ve puan şeritleri gerçek sınıf sayısına uyarlanmalı. Mevcut sınıf adları, sorular ve ayarlar değiştirilmemeli.
- Karşılama künyesinde 2 mentör ve 8 öğrenci var; tamamı okunur ve kırpılmadan gösterilmeli.

## Netleşen kararlar

1. Kullanıcı onayı: Joker tanıtımı sırasında bütün sınıflar için ortak sayaç ve cevap kabulü birlikte durur. Tanıtım bitince kalan süreyle devam edilir. Aynı anda gelen jokerler tek kısa gösterimde sunulur; art arda ek duraklama yaratılmaz. Uygulama, telefonlar ve ana ekran için aynı duraklatma durumunu kullanmalı; yalnız animasyonun yerel olarak kapanması cevap kabulünü başlatmamalıdır.
2. Kullanıcı onayı: Jokerli soruda yanlış veya cevapsız sonuçta 10 puan düşülür; toplam sıfırın altına inmez. Ana ekran ve telefon gerçek puan değişimini gösterir.
3. Kullanıcı onayı: Şık seçmek tek başına cevap göndermez. Öğrenci “Cevabı Gönder” düğmesiyle gönderir; süre bitene kadar değiştirip yeniden gönderebilir. Çift Cevap jokerinde göndermek için iki farklı şık zorunludur. Gönderilmeyen seçimler cevap sayılmaz. Taslak seçim ve gönderilmiş cevap ayrı tutulmalı; soru değişince taslak temizlenmelidir. Yeniden gönderim tamamlanana kadar son başarıyla gönderilen cevap geçerlidir.
4. Kullanıcı onayı: Joker yalnız soru süresi devam ederken ve ilgili sınıf o soruya henüz cevap göndermemişken etkinleştirilebilir. Etki ve cezayı açıklayan onaydan sonra hak tüketilir; etkinleştirilmiş joker geri alınamaz. Telefonsuz sınıflar için yönetici aynı koşullarla joker etkinleştirebilir. Soru açıklanmadan, süre dolduktan sonra veya ilk başarılı cevap gönderiminden sonra joker kullanılamaz. Bekleyen joker isteği ve cevap gönderimi arasındaki yarış koşulu ortak yetkili durum üzerinden ele alınmalı; istemci düğmesini kapatmak tek başına yeterli kabul edilmemelidir. Teknik uygulama ayrıntısı geliştiriciye aittir.
5. Kullanıcı onayı: Çift Cevap yalnız şıklı sorularda kullanılabilir. Çifte Puan normal tahmin sorularında da kullanılabilir; en yakın cevabı veren sınıf 20 puan alır, kazanamazsa 10 puan ceza uygulanır (sıfır alt sınırı geçerlidir). Eşitlik sorularında iki joker de kapalıdır; bu sorular yalnızca eşitliği çözer. Mevcut eşit uzaklıktaki tahminleri kazanan sayma davranışı kullanıcı farklı bir karar vermedikçe korunur.
6. Kullanıcı onayı: Yarışma gösterimi admin kontrolündedir. Süre dolunca cevap kabulü kilitlenir; doğru cevap otomatik açıklanmaz. Admin “Cevabı Açıkla” ile doğru cevabı, ardından “Puanları Göster” ile hesaplanan sonuçları gösterir. Hesaplama sistem tarafından yapılır; gösterim zamanını admin belirler. Sonraki soruya geçiş yalnız admin tarafından yapılır; otomatik soru geçişi, otomatik cevap açıklama, 4 saniyelik otomatik puanlama ve 5 saniyelik geçiş geri sayımı kaldırılır. Puan/sonuç ekranı admin ilerletene kadar kalır; sunucu konuşmaları için zaman baskısı oluşturulmaz. Yeni sorunun hangi adımda görünür olup süresinin başlayacağı ayrıca netleştirilecek.

7. Kullanıcı onayı: Admin “Sonraki Soru” dediğinde önce “Hazır mısınız?” ekranı açılır. Admin “Soruyu Göster” dediğinde soru ana ekran ve telefonlara yayımlanır, ortak süre başlar. Hazırlık aşamasında soru/şıklar telefonlara gönderilmez, cevap ve joker kabul edilmez; süre işlemez. İlk soru da aynı hazırlık düzenini kullanır.

8. Kullanıcı onayı: Program açılışında hikâyeyi ve eksiksiz kulüp künyesini gösteren karşılama ekranı bulunur. “Yolculuğa Başla” ana menüyü açar; devam eden yarışmada “Yarışmaya Devam Et” seçeneği vardır ve kayıtlar sıfırlanmaz. Admin aralarda karşılama ekranına dönebilir; bu sırada süre ve cevap kabulü birlikte duraklar. Devam, önceki aşamayı ve kalan süreyi korur. Telefonda da ara/bekleme durumu açıkça gösterilmeli; karşılama ekranına dönüş yarışmayı bitirmemelidir.

9. Kullanıcı onayı: Onaylı sanat yönüne bağlı ayrı görsel paketi asistan tarafından hazırlanacak ve Claude’ye kodlama promptuyla birlikte verilecek. Yazısız orman, kale ve arena sahneleri; özgün kaplan rehber; sınıf armaları ve joker simgeleri ayrı kullanılabilir dosyalar olacak. Metin ve düğmeler gerçek HTML arayüz öğeleri olarak uygulanacak. Birleşik konsept görüntüleri yalnız referanstır. Hazırlık tamamlandı: varliklar/ altında 4 yazısız sahne, şeffaf kaplan rehber, 12 arma ve 3 joker/kilit SVG'si var. Boyutlar, PNG bütünlüğü, kaplanın alfa kanalı ve SVG XML yapıları doğrulandı; kullanım yerleri VARLIKLAR.md içinde. Yerel fontlar ve ses uygulaması Claude görevleridir. Sınıf adları görsellere kalıcı gömülmemeli, gerçek ayarlardan gösterilmelidir.

10. Kullanıcı onayı: Aynı bilgisayarın kendi ekranında admin paneli, genişletilmiş masaüstüyle projeksiyonda ayrı sahne penceresi kullanılır. İlave monitör gerekmez; projeksiyon ikinci ekrandır (Windows Win+P → Genişlet). Önce önerilen seyirciye görünen alt yönetim şeridi tercih edilmedi. Sahne ekranında yönetim düğmeleri, cevap anahtarı, puan düzenleme, soru yönetimi ve teknik bilgiler görünmez. Admin “Sahne Ekranını Aç” eylemiyle ayrı pencere açabilmeli; pencere kullanıcı tarafından projeksiyona taşınıp tam ekrana alınabilmelidir. Sahne yalnız görüntüleyicidir; ikinci yarışma/host kilidi edinmemeli, süreyi veya puanı yönetmemeli. Mevcut tek aktif yarışma kuralı korunur. Sahne kapanması admin yarışmasını bitirmemeli; yeniden açılınca son durumu göstermelidir. Yeniden bağlanma, görünür durum ve bağlantı kaybı davranışının teknik çözümü Claude tarafından planlanmalıdır. Sahne açılışındaki ekran seçimi/tam ekran için tarayıcı izinlerini atlayan otomatik taşıma varsayılmamalıdır.

11. Kullanıcı onayı: Joker tanıtımları, sayaç uyarıları ve kutlama sesleri yalnız sahne penceresinden çalar ve bilgisayara bağlı salon hoparlörüne gider. Telefonlar ve admin paneli sessizdir. Admin panelinde ses aç/kapat ve ses seviyesi kontrolü bulunur. Tarayıcının ses başlatma için kullanıcı etkileşimi gereksinimi sahne açılışında açık bir ses etkinleştirme/test adımıyla karşılanmalı; otomatik çalmanın garanti olduğu varsayılmamalıdır. Tekrar bağlanma veya yeniden render eski sesleri yeniden çalmamalı; ses olayları tekilleştirilmelidir.

12. Kullanıcı onayı: Soru yönetimi, soru düzenleme, ayarlar ve yedekleme aynı renkleri ve görsel kimliği taşımalı; yoğun sahne illüstrasyonları yerine sade, okunaklı, hızlı kullanılabilen yönetim düzeni uygulanmalıdır. Mevcut sorular, sınıf listeleri, kayıtlar, yedek içe/dışa aktarma ve devam eden yarışma verileri korunur. Önceden var olan kaydedilmemiş değişiklikler geri alınmaz. Konseptteki örnek sınıflar gerçek liste yerine yazılmaz.

13. Kullanıcı onayı: İnternet üzerinden site ve telefon katılımı, internetsiz aynı yerel ağda yerel sunucuyla telefon katılımı ve telefonsuz admin yönetimi korunacak. Ayrı admin/sahne görünümü bu kullanım biçimlerinde çalışacak. Görsel, yazı tipi ve ses dosyaları projeyle dağıtılacak; internetsiz kullanımda harici CDN/font/ses servisine bağımlılık olmayacak. Mevcut çift tıklayarak HTML açma yolu da başlangıç gereksinimidir; yeni sahne iletişimi ve varlık yolları file://, yerel HTTP ve Vercel için doğrulanmalı. Yerel PowerShell sunucusunda yeni statik dosyalar güvenli ve doğru içerik türleriyle sunulmalı; istenen yollar proje sınırları dışında dosya okumamalıdır.

14. Kullanıcı onayı: Aktif soruda sahne penceresi kapanırsa veya uygulamanın algılayabildiği sahne bağlantısı kaybolursa ortak süre ve cevap kabulü birlikte duraklar; admin uyarılır. Sahne yeniden açılınca aynı soru ve kalan süre gösterilir; devamı admin başlatır. Tek bir öğrencinin telefon bağlantısının kopması bütün yarışmayı durdurmaz. Projeksiyon kablosu, fiziksel görüntü veya salon sesinin gerçekten çalıştığı yazılımdan garanti edilemez; uygulama yalnız algılayabildiği pencere/iletişim durumunu izler. Telefon yeniden bağlandığında yetkili güncel soru, son gönderilmiş cevap ve joker hakları geri gelmeli; puan veya haklar yeniden uygulanmamalıdır.

15. Kullanıcı onayı: Her sınıfa aynı sanat dünyasına ait, renk ve simgesi farklı bir arma atanır; sınıf adı yanında açıkça yazılır. Ayrım yalnız renge dayanmaz. Arma eşleşmesi kura, telefon, puan tablosu, joker tanıtımı ve final boyunca sabittir; finale geçerken, yenilemede veya yeniden bağlanmada değişmez. Gerçek sınıf listesi dinamiktir; taslaktaki dört sınıfla sınırlanmaz. Yeni sınıf eklenmesi var olan sınıfların arma eşleşmelerini değiştirmemelidir.

16. Kullanıcı onayı: Karşılama ve etap geçişlerinde hafif sis ve ışık hareketleri; jokerlerde kısa, güçlü tanıtım; finalde daha gösterişli kutlama kullanılacak. Soru okunurken arka plan sakin kalacak. Admin panelinde hareketleri azaltma seçeneği bulunacak. Azaltılmış hareket seçeneğinde durum, sonuç ve joker bilgisi kaybolmayacak; animasyon devre dışı olsa da ortak duraklatma ve admin kontrollü akış korunacak. Sistem azaltılmış hareket tercihi de dikkate alınmalı; yoğun yanıp sönme kullanılmamalıdır.

17. Kullanıcı onayı: Admin süre dolmadan “Cevabı Açıkla” eylemini kullanabilir. Erken açıklama için onay istenir; onaylanınca süre durur, bütün sınıfların cevapları kilitlenir ve doğru cevap açıklanır. Tüm sınıfların erken cevaplaması otomatik açıklama veya geçiş başlatmaz; kararı admin verir. Süre sonu ve erken açıklama aynı kilitlenmiş soru durumuna geçmelidir.

18. Kullanıcı onayı: Admin için onaylı “Soruyu İptal Et” eylemi bulunur. İptal edilen sorudan hiçbir sınıf puan veya ceza almaz; o soruda tüketilmiş jokerler iade edilir. Puanlar gösterilmişse yalnız o sorunun uygulanmış gerçek puan etkisi geri alınır (sıfır alt sınırının etkisi dahil); diğer soruların sonuçları ve jokerleri korunur. Aynı iptal tekrar puan/joker iadesi yaratmaz. İptal durumu sahne ve telefonlara aktarılır, cevap kabulü kapanır. Sonraki soruya admin geçer. İptal davranışı önce aktif/en son soru için uygulanmalı; geçmiş soruları sınırsız yeniden hesaplayan ayrı bir özellik kullanıcı talebi olmadan eklenmemelidir.

19. Kullanıcı onayı: Claude uygulamayı yerelde tamamlayacak; admin, sahne ve telefon ekranlarını birlikte test edecek. Jokerler, duraklatma, yeniden bağlanma ve soru iptalini doğrulayacak; ekran görüntüleriyle teslim edecek. Canlı siteye yayınlama bu teslimin kapsamında değildir. Gerçek Redis/Vercel veya fiziksel projeksiyonla doğrulanmayan davranışlar doğrulanmış gibi raporlanmayacak.

20. Kullanıcı onayı: “Cevabı Açıkla” önce doğru şıkkı altın ışıkla vurgular; doğru cevaplayan sınıfların armaları kısa aralıklarla tek tek gelir, sonunda birlikte görünür. Girişlerde kısa ses/ışık izi olabilir; Çifte Puanla doğru bilen sınıfta ×2 mührü parlar. Bu aşamada puan eklenmez veya puan farkı gösterilmez; admin “Puanları Göster” dediğinde gerçek puanlar animasyonla güncellenir. Kimse doğru bilmediyse “Bu soruda doğru cevap gelmedi” görünür. Azaltılmış harekette armalar doğrudan birlikte gösterilir. Sahneye özgü ses ve manuel ilerleme kuralları geçerlidir. Güncel prompt bu gösterimin test ve yeniden bağlantı davranışını da tanımlar.

## İnceleme başlıkları (geçmiş kontrol listesi)
 

1. Joker tanıtımında ortak sayacın ve cevap kabulünün davranışı; eşzamanlı jokerlerin gösterimi.
2. Ceza için sıfır alt sınırı ve cevapsız jokerli sorunun sonucu.
3. Cevap gönderme, değiştirme ve çift cevapta tek seçimle süre dolması.
4. Joker etkinleştirme son zamanı, onayı, geri alma ve yönetici müdahalesi.
5. Normal tahmin ve eşitlik sorularında joker uygunluğu.
6. Mevcut otomatik ilerlemenin korunması ve sunucu kontrolü.
7. Karşılama açılışı, devam eden yarışmaya dönüş ve künye yerleşimi.
8. Görsel varlıkların hazırlanması ve onaylı taslağa bağlılık; mevcut resmi logonun kullanımı.
9. Ana ekran/projeksiyon ve telefon hedefleri; uzun soru/cevap ve çok sınıf yerleşimi.
10. Sesin hangi cihazdan çıkacağı, ses kontrolü ve hareket yoğunluğu.
11. Yönetim ekranlarının kapsamı, internet/yerel mod ve dosyadan açma gereksinimi.
12. Claude teslimatı, test/ekran görüntüsü beklentileri ve yayınlama sınırı.

Bu liste kullanıcıya toplu soru olarak verilmez. Yanıtlar geldikçe kaydedilir; son prompt ancak kararlar tamamlanınca hazırlanır. Onaylı kurallar tekrar sorulmaz. Ayrıntıların teknik çözümü kullanıcıya bırakılmaz; kullanıcı yalnız davranış ve görünüm kararlarını verir.
