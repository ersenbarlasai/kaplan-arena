# Claude — rastgele sorular, gerçek eleme ve tur sonu kutlamaları

Proje: `E:\PROJELER\KaplanArena`. Aşağıdaki düzenlemeleri şimdi incele, kodla, test et ve tamamla. Kullanıcı bu akışı açıkça onayladı: dört takımda **4 → 3 → 2 → şampiyon**, üç kampüs pilotunda **3 → 3 → 2 → şampiyon**. Üç arena sırası korunacak: Orman Geçidi, Kadim Kale, Kaplan Arenası. Her turun aktif takımları aynı soruları aynı anda yanıtlayacak. Final kesinlikle iki takımla oynanacak. Bu belge yeni yarışmalar için eski iki grup/ilk ikilerden dört finalist ve üç takımda bütün etaplarda elemesiz devam kararlarının yerine geçer. Mevcut sinematik entegrasyonunu ve kullanıcı çalışmalarını koru; gereksiz onay isteyerek durma.

## 1. Güncel kaynakta doğrulanmış nedenler

- `app/admin-actions.js`: `drawGo()` takımları s1/s2 gruplarına ayırıyor; `advance()` iki grubun kazananlarını birleştiriyor.
- `app/core.js`: `stageOutcome()` final dışında `cutoff(..., 2)` çağırıyor. İkişer takımlı iki grupta iki takımın da yükselmesi nedeniyle dört takımın tamamı finale gidiyor. Bu sadece görünüm sorunu değildir.
- Üç takımlı `shared` modunda ilk iki etapta `all:true` ve eleme yok; yeni onaylanan akışta ikinci etap sonunda bir takım elenecek.
- `app/admin.js` içindeki `currentQ()`, `currentQk()` ve ilgili yerler soruyu `S.questions[key][g.qIndex]` ile alıyor; `ACT.next()` sıradaki indekse ilerliyor. Mevcut `shuffle()` yalnız takım kurasında kullanılıyor. Yarışma çapında kalıcı soru tüketimi yok.
- `app/player.js`: takım, isim/aktif dizin üzerinden bulunuyor; `players/<etap>/<index>` sahiplik kaydı istemciden yazılıyor. Katılım engeli yalnız buton gizleyerek çözülemez. `api/ka.js` genel `fn:set` yoluna biçim/boyut kontrolü yapıyor, eleme/katılım yetkisini kontrol etmiyor. LAN'da `kaplan-sunucu.ps1` veri yazma yolu ayrıca incelenmeli.
- `app/stageview.js`: `stageEnd` tablo/metin çiziyor; `champion` zaten kupa benzeri şampiyon ekranı ve konfeti canvas'ı içeriyor. `app/stage.js` DOM yeniden kurulduğunda konfeti tekrar başlayabiliyor. `app/audio.js` şampiyonluk için kısa sentez ses dizisi çalıyor; bu, istenen arka plan müziği değildir.

Kod değişmiş olabilir; güncel durum ve varsa AGENTS.md talimatlarını okuyup tekrar doğrula. Eski raporları güncel test sonucu sayma. Önce bu hataları gösteren regresyon senaryolarını oluştur.

## 2. Gerçek eleme akışı

Yeni yarışmalarda iki bağımsız grup oynatma. Katılımcılara kararlı `teamId` ver; isim ve ekrandaki sıralama kimlik yerine geçmesin. Yarışma kaydında başlangıç kadrosu, kurallar/format, tur katılımcıları, aktif/elenmiş durumları, sonuç geçmişi ve tur yükselme kontenjanları saklansın. Ayarlardaki listeyi değiştirmek açık yarışmayı etkilemesin.

- Dört takım: Orman'da dört takım birlikte oynar; ilk üç Kale'ye, Kale'nin ilk ikisi Arena finaline gider. Final sonucunda tek şampiyon belirlenir.
- Üç takım: Orman'da üç takım birlikte oynar ve üçü de Kale'ye gider. Kale sonunda ilk iki Arena finaline gider. Orman'da eleme olmaması hata değil, kullanıcının onayladığı pilot kuralıdır; yine tur kazananı duyurulur.
- Daha fazla takım desteğini bozma. Üç arena için önerilen kontenjan: ilk turdan `max(3, ceil(başlangıçTakımSayısı / 2))` takım, ikinci turdan iki takım, finalden bir şampiyon. Dört ve üç takım için yukarıdaki kesin sonuçlar geçerlidir. Bu genelleştirme uygulama kararıdır; yeni yarışma öncesi kontenjanları admin ekranında açıkça gösterip kayda sabitle. Sahte takım/bay-pass finalist üretme.
- Mevcut soru bankaları s1, s2, final, tie olarak kalabilir; s1/s2 artık aynı anda yarışan aktif kadronun sıralı arenalarıdır. Mevcut soru içeriğini silme.
- Önceki toplam puan biriktirme davranışı yeni ortak eleme akışında korunsun; etap başında toplamları sıfırlama. Yükselme ve şampiyonluk toplam puana göre belirlensin. Tur kazananını ayrıca o turdaki net puan değişiminden hesapla; etap başı toplamın snapshot'ını tut. Böylece tur performansı ve genel sıralama birbirine karışmaz. Ekranda ikisini açık etiketle.
- Yükselme sınırında eşitlik varsa yalnız o kontenjan için eşit takımlarla yedek tahmin soruları çözülmeden eleme kesinleşmesin. Final birinciliği eşitse aynı güvenli yöntem kullanılsın. Salt tur ödülü için eşitlik varsa “Turun ortak kazananları” gösterilebilir; gereksiz ek soru veya rastgele kazanan yaratma. Tur performansı kazananı olmak kümülatif eleme kuralını geçersiz kılmaz.
- Takım başına bir çift cevap ve bir çifte puan hakkı tüm yarışmada birer kez; tur geçişi, yeniden giriş veya sıralama değişimi jokerleri yenilemesin. Mevcut +10 / +20, jokerli yanlış/cevapsızda −10 ve sıfır tabanı korunsun.
- Tur sonuçlarını idempotent olarak kesinleştir: aynı admin komutu/çift tıklama iki kez eleme veya iki kez yükselme yapmasın. Tur başlatma, tur bitirme, sonuç açıklama ve sonraki tur geçişi açık admin komutlarıyla ilerlesin.
- Elenenler bir daha aktif kadroya alınmasın; puanları ve elendikleri tur arşivde kalsın. Şampiyon podyumunda üçüncülük gösterilecekse sadece finalist dizisinden üçüncü öğe arama; kesinleşmiş eleme geçmişinden doğru takımı bul veya yalnız birinci/ikinci göster. Üçüncülük maçı varmış gibi sonuç üretme.
- Eski devam eden kayıtları sessizce yeni kurala dönüştürme veya puan silme. Güvenli şema göçü, yedekleme ve format snapshot'ı uygula. Eski formatla devam eden yarışmada admini açıkça bilgilendir; yeni kurala geçiş yeni yarışma başlatıldığında uygulanmalı. Eski testlerin hatalı dört finalist beklentisini yeni yarışmalar için koruma.

## 3. Rastgele ve aynı yarışmada tekrarsız soru

Sorular adminin “Soruyu Göster” komutuyla açılmaya devam edecek; rastgelelik otomatik geçiş anlamına gelmez.

- Yarışma başında kullanılacak soru bankası/sıralama snapshot'ını oluştur. Her tur için uygun bankadaki kullanılabilir soruları Fisher–Yates veya eşdeğer doğru karıştırmayla sırala ve bu sırayı kalıcı yarışma kaydına yaz. Her render/yenilemede yeniden rastgele seçme, rastgele `sort` comparator kullanma. Testlerde rastgelelik bağımlılığı enjekte edilebilsin.
- Sorunun kalıcı kimliği ve yarışma çapında `asked` kaydı olsun. Aynı içerik farklı bankalarda veya farklı id ile içe aktarılmışsa içerik temelli kanonik kimlikle tekrarını engelle; sadece dizi indeksi/id karşılaştırması yeterli değildir. Türkçe metni, boşlukları ve biçim farklarını tutarlı normalize et; cevabı açıklanmadan istemciye sızdırma.
- Soru yalnız admin tarafından gerçekten gösterildiğinde tüketilmiş sayılsın; hazırlıkta görünen yönetim kaydı sorulmuş sayılmaz. Gösterme ve tüketim tek tutarlı/idempotent geçiş olsun. Aynı soru tüm aktif takımlara bir defa birlikte sorulur; takım başına ayrı tüketim yapılmaz.
- Sorulduktan sonra iptal edilen soru puan/joker iadesi alsa da aynı yarışmada tekrar havuza dönmesin. Geri alma ve history snapshot geri yükleme `asked` geçmişini geriye götürmesin; önceki soruya inceleme için dönülebilir ama yeniden oynatılıp puanlanamaz. Yenileme, bağlantı kaybı, tur geçişi ve yedekten devam sıralamayı ve tüketimi korusun.
- Eşitlik soru havuzunu da karıştır ve gösterilince tüket. Aynı soruyu farklı eşitlikte veya normal turda tekrar getirme. Havuz tükenirse eski soruları döndürme, sessizce yeni örnek soru ekleme veya rastgele finalist seçme. Admini bilgilendir; yeni benzersiz yedek soru girişi veya kontrollü bekleme sağla. Yeni soru bankası düzenlemesi açık sırayı kendiliğinden değiştirmesin.
- Aktif sorunun içeriği yarışma snapshot'ından gelsin; Soru Yönetimi'nde düzenleme/silme, aktif sorunun id/cevap/puanlarını kaydırmasın. `qIndex` sıra numarası olabilir; bütün soru erişimi, iptal, puanlama, eşitlik, telefon ve sahne modelleri tek resolver kullanmalı. Sadece `currentQ()` değiştirip doğrudan indeks erişimlerini bırakma.
- Soru sayısı ve ilerleme göstergesi deduplikasyon sonrası gerçek oynanacak listeyi yansıtsın. Hiç kullanılabilir sorusu olmayan tur başlamasın. Yeni yarışmanın `asked` kaydı sıfırdan oluşsun; önceki yarışma tüketimi yeni yarışmayı engellemesin.

## 4. Elenen takımın geri katılmasını gerçekten engelle

Elenen takımın ekranda seçeneklerden çıkarılması gerekli ama yeterli değil. Tek otoritede saklanan aktiflik durumunu, takım oturumunu ve tur uygunluğunu doğrula.

- Tur sonucu kesinleşince takım kalıcı `eliminated` durumuna geçsin; yeni tur modelinde aktif kadroda olmasın. Telefon “Bu turda elendiniz; yarışmaya devam edemezsiniz” görsün. İzleyici görünümü sunulabilir, fakat aktif takım olarak katılamaz, cevap/joker gönderemez.
- Yenileme, tekrar kod girme, farklı sekme/tarayıcı veya telefon ile aynı takım kimliğini kullanma eleme durumunu kaldırmasın. Eski cevap/joker isteklerini, önceki turdan gecikmiş yazmaları ve eski dizinle yanlış takıma giden istekleri reddet. Yeniden bağlanan aktif takımın hakları korunsun.
- Ortak altı haneli yarışma kodu takım kimliğini ispatlamaz. Takıma özel kaptan katılım anahtarı/oturum yetkisi veya mevcut mimariye uygun eşdeğer yöntem kur. Elenen cihaz sırf listeden başka takım adı seçerek o takımın kaptanlığını ele geçiremesin. Takım değiştirme/yeni cihaz devri ancak adminin o aktif takım için açık yetkilendirmesiyle olsun; elenen takımı otomatik diriltmesin.
- `api/ka.js` ve LAN yazma yolunda katılım/cevap/joker istekleri etkin yarışma, tur, teamId, cihaz/oturum, açık cevap penceresi ve aktiflik açısından doğrulansın. Yarışmanın yetkili admini dışında state/eleme/puan değiştirmeye izin verme. Özel katılım anahtarlarını herkese yayımlanan state/GET yanıtına koyma. Genel path/set yolunu kullanarak yeni kontrollerin etrafından dolaşılamasın. Redis ve bellek/LAN davranışları tutarlı olsun; çakışan sahiplik taleplerini atomik veya eşdeğer güvenli şekilde çöz.
- Adminin cevap ve joker kabul katmanı da aynı uygunluk kontrolünü yapsın. Sunucuya ulaşmış geçersiz kayıtlar bile puana veya jokere dönüşmesin. Telefonsuz kullanımda admin listeleri de yalnız aktif kadroyu içersin. Mevcut yarışma kilidi ve sahnenin salt gösterim rolünü koru.

## 5. Her tur sonunda animasyon ve kazanan açıklaması

Yeni görsel üretmek gerekmiyor. Görsel/ses kullanım planı `E:\PROJELER\KaplanArena\tasarim\TUR-SONU-GOSTERI-PLANI.md` içinde. Hazır orman/kale/arena arka planları, takım armaları, altın ışık/parçacık katmanları ve müzikler kullanılacak. Dinamik kazanan adını raster görsele gömme; uygulama katmanında çiz. Mevcut genel tasarım ve künye korunsun.

- Admin “Tur Sonucunu Açıkla” dediğinde yaklaşık 6–8 saniyelik gösteri başlasın: arena başlığı, altın ışık/arma girişi, tur kazananı veya ortak kazananları, puan özeti ve yükselen/elenen takımlar net biçimde açıklansın. Finalde doğru şampiyon gösterisine bağlansın.
- Sonuç/eşitlik kesinleşmeden kazanan ya da elenen ilan etme. Gösteri soru açmasın, yarışma sayacını çalıştırmasın veya sonraki tura otomatik geçmesin. Animasyon bitince sonuç ekranında beklesin. Admin “Atla” ile son sonucu görebilsin; yalnız “Sonraki Tura Geç” ile ilerlesin.
- Kalıcı olay kimliği, admin başlangıç zamanı ve gösteri süresi kullan. State güncellemesi, puan tablosu renderı veya sahne yeniden bağlanması gösteriyi/sesi baştan tetiklemesin. Yeni sahne kalan gösteri zamanından katılsın veya son sonucu göstersin. İstenirse açık “Gösteriyi Tekrar Oynat” ayrı yeni olay üretsin, puan/eleme değişmesin.
- Azaltılmış harekette sakin arma/başlık ve sonuç görünümü kullan; ses kapalıysa sessiz. Admin önizlemesi ve telefonlar ses çalmasın. Zamanlayıcılar, canvas ve dinleyiciler gösteri/ekran bittiğinde temizlensin.

## 6. Şampiyonlukta gerçek müzik ve konfeti

- Kullanıcının istediği şampiyonluk ekranında arkada müzik çalsın; mevcut kısa `champion()` ses dizisini arka plan müziği sayma. Mevcut Suno açılış müziğinin uygun zafer bölümünden FilmCraft'ta kontrollü giriş/çıkışlı ayrı bir dosya hazırla veya mevcut onaylı müzikle eşdeğer çözüm uygula. Yeni ücretli müzik üretimi gerekmiyor.
- Dosyayı runtime `assets/` altında uygun MIME/önbellek sürümüyle sun. Yeni ses uzantıları için web, LAN ve `tests/e2e/server.js` statik dosya desteğini doğrula. Sadece tasarım klasörüne koyup üretimde 404 bırakma.
- Şampiyonun adı/arması açılırken kısa vurgu ve görünür konfeti patlaması, devamında daha hafif düşen parçacıklar olsun. İki takımlı final podyumu doğru çizilsin. Efekt kazanan adını kapatmasın ve epileptik flaş üretmesin. Konfeti tekrar renderlarda durmadan baştan patlamasın; master volume/mute, ses sahnesi devri ve reduced-motion çalışsın.
- Müzik yalnız aktif ses sahnesinde, merkezi ses ayarına bağlı, tek kalıcı medya öğesiyle çalsın; admin/telefonlardan ikinci ses çıkmasın. Şampiyonluk ekranında güvenli düşük seviyede devam/döngü, çıkışta fade-out olsun. Karşılama/ara/video müziğiyle çakışmasın. Sayfa yenileme, ikinci sahne ve tarayıcı autoplay engelinde hata/çoklu ses oluşmasın; ses etkinleştirme mevcut kullanıcı etkileşimiyle çözülsün.

## 7. Zorunlu test ve teslim

Mevcut test altyapısını keşfet. Anlamlı çekirdek testleri, gerçek admin/telefon/sahne E2E ve API/LAN kabul testleri yaz. Sadece UI butonunun gizlenmesini test edip eleme engeli tamamlandı deme.

Kontrol listesi:

1. Dört takımın aynı soruyla başlaması, Orman sonrası üç, Kale sonrası iki, finalde tek şampiyon; elenenin hiçbir üst tur kadrosunda görünmemesi.
2. Üç kampüste 3 → 3 → 2 → şampiyon; ilk tur elemesiz fakat tur kazananı açıklamalı.
3. Daha kalabalık başlangıçta kontenjanlar, eşitlik sınırı ve tek şampiyon; iki takımlı finalde eksik üçüncü takım yüzünden hata olmaması.
4. Karıştırılmış sıra, bütün yarışmada benzersizlik; farklı bankada farklı id'li aynı içerik; tie havuzu, havuz tükenmesi, tekrar import, yenileme ve yedekten devam.
5. İptal/geri al/reload ile sorulmuş sorunun yeniden oynanmaması; aktif sorunun bankayı düzenlemekten etkilenmemesi; ikinci kez puan yazılmaması.
6. Elenen takımın mevcut/yeni cihaz ve eski sekme ile yeniden claim/cevap/joker denemesi, doğrudan API ve LAN yazması; bunların reddi ve puan/aktif kadronun değişmemesi. Başka aktif takımın kimliğine sadece isim seçerek geçememesi; meşru aktif kaptanın yeniden bağlanabilmesi.
7. Final kesiminde eşitlik çözülmeden sonuç/kazanan gösterilmemesi; sınır eşitliğini çözen sorunun tekrar çıkmaması.
8. Tur gösterisi bir kez, admin atlama, yenileme/bağlantı dönüşü, ayrı replay; otomatik soru/tur geçişi olmaması.
9. Şampiyonlukta gerçek müzik dosyasının yüklenmesi/çalma isteği, konfeti patlaması, tek ses sahnesi, mute/volume, reduced-motion, ekran çıkışında cleanup. Gerçek dinleme yapılmadıysa işitsel testi geçti deme.
10. Mevcut joker cezaları ve yarışma boyunca tüketimi, manuel soru geçişi, ortak duraklama, doğru bilenler gösterimi, yeni OpenArt/FilmCraft videoları ve internet/LAN/telefonsuz/file:// regresyonları.

Admin 1366×768, sahne 1920×1080, dar telefon ekranı için tur sonu, elenme ve şampiyonluk ekran görüntüleri al. Yeni müzik dosyasının gerçek decode/süre/seviye kontrolünü yap; mevcut onaylı kaynakları koru.

`tasarim/ELEME-SORU-KUTLAMA-TESLIM-RAPORU.md` oluştur: doğrulanan kök nedenler, kesin yeni kurallar, değişen dosyalar, soru/kimlik/veri göçü, katılım engelinin uygulandığı katmanlar, test komutları ve gerçek sonuçlar, müzik/efekt yolları, ekran görüntüleri, kalan sınırlar ve kullanıcı deneme adımları. İlgili eski belgeleri yeni kararla tutarlı hale getir; geçmiş kayıtları onaylanmamış varsayımlarla ezme.

Kullanıcının önceki commit/push yetkisi geçerlidir. Testlerden sonra ilgili değişiklikleri gözden geçir, uygun commit oluştur, mevcut remote/branch'e normal push yap. İlgisiz değişiklikleri ekleme/silme, force push yapma. Başarısız testi veya push engelini gizleme. Son mesajda rapor yolu, commit SHA, push sonucu ve gerçek kullanıcı kontrol adımlarını ver; doğrulamadan yayında deme. Limit yaklaşırsa kaydedilmiş ilerleme dosyasına checkpoint bırak ve ortam destekliyorsa sıfırlama sonrası kaldığın yerden sürdür.
