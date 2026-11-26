# Claude için tek parça son görev

GÜNCEL HAREKETLİ VİDEO TESLİMİ: OpenArt klipleri artık hazır. Önce `E:\PROJELER\KaplanArena\tasarim\sinematik\videolar-openart\CLAUDE-VIDEO-TESLIMI.md` dosyasını oku ve `secilen/` altındaki 11 gerçek video klibini kullan. Aşağıdaki statik görselleri hareketlendirme tarifi bu kliplerin üretiminden önce yazılmıştır; video kaynak seçiminde güncel teslim belgesi önceliklidir. FilmCraft montajı, ses miksajı, uygulama entegrasyonu, test, commit/push ve rapor kapsamı aynen devam eder. Kaynaklar 1920×1072 / 24 fps'dir; nihai sekansa uyarla. 05-kilic-temasi seçilen kopyası düzeltilmiş v02'dir.

Kaplan Arena projesinde aşağıdaki işi şimdi başlat ve doğrulanmış teslimata kadar tamamla. Proje: `E:\PROJELER\KaplanArena`. Kurgu ve montaj uygulaması: `C:\Program Files\FilmCraft\`. Bu mesaj son kullanıcı talimatıdır; eski belgelerdeki commit/push yapmama talimatını geçersiz kılar. İlgili değişiklikleri tamamlayıp test ettikten sonra commit ve normal push yapman açıkça yetkilidir. Yeniden başlangıç onayı isteme. Gereksiz kapsam genişletme; mevcut kullanıcı çalışmalarını koru.

## 1. Önce mevcut durumu incele

Depodaki AGENTS.md talimatlarını, git durumunu, mevcut kodu ve aşağıdaki dosyaları oku. Geçmiş raporları mevcut davranışın kanıtı sayma; güncel çalışmayı doğrula. Önceden yapılmış doğru cevap gösterimi ve tasarım değişikliklerini silme.

- `tasarim/tasarim-kararlari.md`
- `tasarim/claude-hazirlik-incelemesi.md`
- `tasarim/CLAUDE-UYGULAMA-PROMPTU.md`
- `tasarim/TESLIM-RAPORU.md`
- `tasarim/DOGRU-BILENLER-TEST-RAPORU.md`
- `tasarim/sinematik/CLAUDE-SINEMATIK-PROMPTU.md`
- `tasarim/sinematik/sahne-plani.json`
- `tasarim/sinematik/BASLA.md`
- `tasarim/sinematik/girdiler/MUZIK-TESLIMI.md`
- `tasarim/sinematik/ses-gercek/CLAUDE-EFEKT-TESLIMI.md`
- `tasarim/sinematik/ses-gercek/efekt-esleme.json`
- `tasarim/sinematik/ses-gercek/KUKREME-KULLANICI-NOTU.md`
- `tasarim/sinematik/ses-gercek/KAYNAK-LISANS.md`

Bu mesaj güncel kapsamı, mevcut karar belgeleri ayrıntıları belirler. Gerçek bir çelişki varsa koddan ve son kullanıcı kararlarından yararlan; çözülemeyen zorunlu bir bilgi dışında çalışmayı durdurma.

## 2. FilmCraft ile gerçek kurgu üret

`C:\Program Files\FilmCraft\filmcraft-cli.exe` kuruludur. `--help`, `commands`, `describe`, `probe`, `inspect`, `render`, `export` ile gerçek komut şemalarını keşfet; komut veya özellik uydurma. PowerShell'de boşluk içeren exe yolunu çağrı operatörü `&` ile kullan. CLI başsız çalışabilir; gerekirse FilmCraft arayüzünü kullan. Kurgu, katmanlama, geçiş, ses otomasyonu ve nihai dışa aktarımı FilmCraft içinde yap. Başka editörle üretip FilmCraft kullanılmış gibi sunma. Yardımcı araçları yalnızca dosya inceleme, teknik doğrulama ve uygulama kodlamasında kullanabilirsin.

Düzenlenebilir `.fcproj` projelerini `tasarim/sinematik/filmcraft/` altında, kaynak bağları taşınabilir şekilde sakla. Yeniden açıp bütün medyanın çevrimiçi olduğunu doğrula. Nihai renderda eksik medya yer tutucusuna izin veren `--allow-offline` kullanma. Gerçek bir FilmCraft engeli varsa kanıtını ve tamamlanan kısmı kaydet; eksik çıktıyı tamamlanmış sayma.

İki çıktı üret: 60 saniye açılış ve dikişsiz dönen 30 saniye ara filmi. Her ikisi 1920×1080, 30 fps, H.264 MP4 ve uyumlu ses içersin. Web çıktıları `tasarim/sinematik/ciktilar/acilis-60sn.mp4` ve `tasarim/sinematik/ciktilar/ara-30sn-loop.mp4` olsun. Uygulama bu gerçek dosyaları kullansın. Mevcut resimler statik karelerdir; bunları bitmiş video diye sunma. Kaynaklar yaklaşık 1672×941 olduğundan ölçeklenmiş 1080p çıktıyı doğal 4K diye tanımlama.

## 3. Görsel kurgu ve zaman akışı

14–15 yaş öğrencilerine uygun, epik ama zarif bir fantastik turnuva: koyu petrol/orman yeşili, eskitilmiş altın, sıcak kaplan tonları, resimsel oyun dünyası. Mevcut kaplan rehberinin ve resmi okul logosunun kimliğini koru. Yeni aslan karakteri ekleme. Kan, yaralanma, korkutucu şiddet kullanma; karşılaşmalar törensel olsun.

Hazır görseller `tasarim/sinematik/sahneler/`, şeffaf/SVG katmanlar `tasarim/sinematik/katmanlar/`, diğer varlıklar `tasarim/varliklar/` içinde. Kompozisyonu bozmayan kamera hareketi, kontrollü paralaks, sis, ışık ve parçacık kullan. Düz slayt geçişleriyle yetinme; statik resimden gerçekçi uzuv hareketi çıkardığını da iddia etme. Kılıç ve kalkan temaslarını kadraj, kısa kesme, ışık, kıvılcım ve sesle ikna edici biçimde kur. Aşırı flaş ve sürekli sarsıntı kullanma.

60 saniyelik akış:

| Süre | Sahne |
| --- | --- |
| 0–6 | 01-dunya-kesfi.png: vadi, sis ve uzak dünya |
| 6–12 | 02-kaplan-yolculuk.png: kaplan rehberle yolculuk |
| 12–18 | 03-kale-kapisi.png: ışık sızan kadim kapı |
| 18–24 | 04-turnuva-karsilasma.png: törensel karşılaşma |
| 24–27 | 05-kilic-temasi.png: kılıç temasının doruğu |
| 27–31 | 06-kalkan-temasi.png: kalkan darbesi |
| 31–38 | 07-arenaya-giris.png: arenaya giriş |
| 38–44 | 08-arena-ihtisam.png: arenanın ihtişamı |
| 44–48 | 09-kaplan-kukreme.png: kükreme doruğu |
| 48–60 | 10-final-kunye.png: başlık ve ekip künyesi |

Başlık: “Kaplan Arena — Efsaneye Yolculuk”. Düzenleyen: “Kaplan Okulları Yapayzeka Kulübü”. Türkçe metinleri ayrı, net tipografi katmanlarıyla yerleştir. Son künyeyi en geç 50. saniyede tamamen görünür yap; en az 10 saniye rahat okunabilsin. Projektörde okunurluğu gerçek 1080p karelerle kontrol et.

Mentörler: Ersen BARLAS, Alp Han KOÇDEMİR.

Kulüp öğrencileri: Emre Burak Tölegen, Burak Yoğurtçu, Halil Mert ACAR, Yekta Efe Konuk, Çınar Arda, Yusuf Emir Kuş, Ömer Araf Boncuk, Emir Karatay.

30 saniyelik ara filmi `ara-arena-sakin.png` üzerinde dingin, yaşayan arena olsun. İlk ve son görüntü hareketini ve sesi dikişsiz eşleştir; en az üç ardışık döngüyü kontrol et. Kılıç/kalkan/kükreme gibi sert olayları ara döngüsünde tekrar tekrar kullanma. Konuşmalar için sakin ses seviyesi sağla.

## 4. Müzik ve özellikle efektlerin duyulurluğu

Yeni Suno üretimi gerekmiyor. Hazır gerçek dosyaları kullan:

- `tasarim/sinematik/girdiler/acilis-muzik.wav`: yaklaşık 58,8 saniye. Açılışı 60 saniyeye doğal giriş/çıkış ve kuyrukla tamamla; sert kesme veya gelişigüzel hız değişimi yapma.
- `tasarim/sinematik/girdiler/ara-muzik.wav`: yaklaşık 74,96 saniye. Uyumlu 30 saniyelik bölüm seç, müzikal ve dalga biçimi sürekliliğini kur; dosya kendiliğinden hazır döngü değildir.
- Fiziksel kayıtlardan hazırlanan efektler: `tasarim/sinematik/ses-gercek/hazir/`.
- Ana kükreme KESİNLİKLE `kukreme-kullanici.wav` olsun. Kullanıcının `C:\Users\barlas\Downloads\kukre.mp3` dosyasından hazırlanmıştır. Eski sentetik ve önceki hayvan kükremelerini aynı anda çalma; yedek olarak koru.
- `kilic-temas-kayit-foley.wav`, `kilic-suruntu-gercek.wav`, `kalkan-vurus-kayit-foley.wav`, `kapi-acilis-kayit-foley.wav`, `kapi-gicirti-gercek.wav`, `zincir-gercek.wav`, `savurma-gercek.wav` dosyalarını sahne olaylarına göre kullan. Aynı olaya gereksiz bütün alternatifleri bindirme.

Efektler bu işin temel parçasıdır: finalde müziğin altında kaybolmaları kabul edilmez. Kılıç teması, kalkan darbesi, ağır kapı, zincir ve özellikle kükreme normal dinleme seviyesinde açıkça seçilsin. Temas seslerini görüntüdeki temas anına kare hassasiyetinde bağla; kükremeyi yaklaşık 44,3. saniyede sahneyle uyumlu başlat. Kükreme öncesi kısa gerilim boşluğu, ardından güçlü ama kontrollü vurgu oluştur.

Müzik, fiziksel efekt ve atmosfer için ayrı düzenlenebilir ses katmanları oluştur. Vurgu anlarında müziği otomasyonla başlangıç olarak yaklaşık 3–6 dB azaltıp kulağa göre ayarla; yumuşak iniş/dönüş yap. Bütün filmi gereksiz yüksek sesli yaparak duyulurluk sağlamaya çalışma. Efekt ataklarını koru; sert tiz, aşırı bas, clipping ve rahatsız edici ani sıçramaları önle. Kaynağın gerçek karakterini gereksiz pitch değişimi ve ağır efektle bozma. Ana kükremenin ihtişamını uygun boşluk, seviye, alan ve kontrollü kuyrukla destekle.

Başlangıç hedefi açılış için yaklaşık −16 LUFS integrated, en fazla −1 dBTP olsun; nihai ölçümleri raporla. Ara filmi konuşma altında daha sakin tut. FilmCraft ölçümleri yetersizse çıktı üzerinde bağımsız ölçüm yapabilirsin. Efektleri önce tek başına, sonra müzikle beraber kontrol et. Dinleme yapamıyorsan yapmış gibi yazma; teknik ölçüm ile işitsel onayı ayrı belirt. Her önemli efekt için zaman kodu, kaynak dosya ve müzik kısma bilgisini rapora koy. Kullanıcıya açılışın özellikle 12–31 ve 44–48 saniyelerini kontrol ettir.

Kaynak ve lisans belgelerini koru. Metal kayıtlarından yapılan kılıç/kalkan foleylerini gerçek düello kaydı diye sunma. Kullanıcının sağladığı kükremenin bağımsız lisansı belgelenmiş değildir; CC0 kaynaklar listesine otomatik katma. Mevcut kullanıcı kullanım kararını uygula ve kaynak notunu koru.

## 5. Uygulamaya eksiksiz entegre et

Mevcut modüler `app/` yapısında çalış. Karşılama, açılışı oynat, atla/durdur ve ara filmi işlemleri admin kontrolünde olsun. Açılış kendiliğinden yarışmayı başlatmasın; ara filmi döngüsü ve video bitişi kendiliğinden oyunu sürdürmesin. Aktif oyun sırasında karşılama/ara filmine geçiş süreyi ve cevap kabulünü ortak duraklatsın. Dönüş yalnızca adminin açık devam komutuyla olsun; puanlar, cevaplar ve jokerler korunsun.

Ses yalnızca aktif projeksiyon/sahne ekranından çıksın. Admin ve öğrenci telefonları sessiz kalsın. Tek bilgisayarda genişletilmiş masaüstüyle admin ve salt gösterim sahnesi çalışsın. Medya öğesi yeniden renderlarda baştan başlamasın; yinelenen video/ses ve dinleyici oluşmasın. Tarayıcı otomatik oynatma engelini kullanıcı etkileşimiyle düzgün çöz. Tek merkezden ses aç/kapat ve ana seviye kontrolü olsun. Azaltılmış hareket tercihi, yükleme/hata durumu ve video bulunamazsa statik karşılama yedeği sağla. Türkçe künyeyi statik ekranda da koru.

İnternet/Vercel, yerel PowerShell sunucusu, telefonsuz kullanım ve desteklenen çift tıklama `file://` akışını doğrula; gerekirse `kaplan-sunucu.ps1` MIME/statik dosya desteğini güncelle. Eksik dosyayı sessiz başarı gibi gösterme. Yalnız admin otorite olsun; sahne kendi başına puan/süre hesaplamasın.

Mevcut kuralları bozma: soru açma, cevap açıklama, puan gösterme ve sonraki soruya geçiş tamamen adminde; süre bitince yalnız cevaplar kilitlenir. Doğru bilenlerin mevcut efektli gösterimini koru. Her sınıfın yarışma boyunca bir çift cevap ve bir çifte puan jokeri vardır; aynı soruda birlikte kullanılamaz. Onaylı joker yanlışında/cevapsızlıkta −10, puan tabanı sıfır; çift cevapta iki seçenekte doğru varsa +10, çifte puanda doğruysa +20. Jokerler mevcut uygunluk, ortak duraklama ve iptal edilen soruda geri alma kurallarını korusun. Yeni video özelliği jokeri tüketmesin veya tekrar kullanılabilir hale getirmesin. Sahne bağlantı kaybı ve yeniden bağlanma akışını da koru.

## 6. Test, teslimat ve Git

Önce kısa uygulama planını dosyaya yaz, ardından işi yap. Mevcut test altyapısını keşfet; olmayan npm komutları uydurma. Çekirdek testleri ve mevcut ilgili E2E senaryolarını çalıştır; yeni medya akışına anlamlı senaryolar ekle. Admin, öğrenci ve sahne senkronu; duraklat/devam; video atlama/bitiş; sessiz telefonlar; yinelenmeyen ses; video hatası; yeniden bağlanma ve mevcut joker/puan kuralları kontrol edilsin. Otomatik testin fiziksel projeksiyon veya duyma kontrolünün yerine geçtiğini iddia etme.

Her MP4'ü baştan sona decode ederek hata, süre, çözünürlük, fps, ses, tepe ve loudness değerlerini kontrol et. Kritik sahneleri ve künyeyi render kareleriyle incele. Ara döngüsünü üç tur kontrol et. FilmCraft projelerini yeniden açarak eksik kaynakları denetle. Web dosyalarını kaliteyi bozmadan optimize et; kaynakları, lisansları ve düzenlenebilir projeleri koru. Runtime dosyaları temiz checkout'ta erişilebilir olsun. Render önbelleklerini, geçici dosyaları, kimlik bilgilerini ve gereksiz dev dosyaları Git'e ekleme; GitHub dosya sınırlarına takılma. LFS gerekiyorsa mevcut yapılandırmayı ve barındırma uyumunu doğrula; sırf push geçsin diye çalışmayan medya bağlantısı bırakma.

`tasarim/sinematik/FILMCRAFT-TESLIM-RAPORU.md` oluştur: değişen dosyalar, gerçek video/proje yolları, yeniden üretim adımları, efekt zamanları ve miksaj, kaynak/lisans durumu, test komutları ve sonuçları, ölçümler, ekran görüntüleri, kalan gerçek sınırlar ve kullanıcı için kısa kontrol adımları. Bir işi yapmadıysan açıkça yaz.

Tüm ilgili değişiklikleri inceleyip yalnız bu görev ve önceki onaylı ilgili Kaplan Arena çalışmaları için uygun dosyaları commit et. Mevcut branch ve remote'u doğrula; beklenen origin `https://github.com/ersenbarlasai/kaplan-arena.git`, inceleme sırasında branch `main` idi. Mevcut farklı bir çalışma düzeni varsa koru. Uzak değişiklikleri kontrol ederek normal push yap; force push, reset veya kullanıcı çalışmalarını silme yapma. Ayrı bir manuel production deploy talep edilmiyor. Push mevcut otomatik dağıtımı tetiklerse raporda gözlenen durumu belirt; kontrol etmeden yayında deme. Kimlik doğrulama/push engelini gizleme; yerel commit ve engeli bildir. Testler başarısızken işi tamamlandı diye sunma.

Son mesajda commit SHA, branch, push sonucu, teslim raporu ve oynatılabilir iki video bağlantısını ver. Push sonrasındaki nihai Git durumunu da kontrol et; commit kendi SHA'sını içermek zorunda değildir. Kullanıcının dosyaları bulabilmesi için mutlak yollar kullan.

## 7. Kullanım limiti ve kaldığın yerden devam

`tasarim/sinematik/CLAUDE-DEVAM-DURUMU.md` dosyasını her ana aşama sonunda güncelle: tamamlananlar, sıradaki somut adım, proje/export yolları, kullanılan komutlar, süren renderların durumu ve gerçek engeller. Limit yaklaşırken kaydedilmemiş FilmCraft projesini ve kodu kaydet; güvenli checkpoint bırak. Limit nedeniyle projeyi baştan başlatma, aynı renderı kontrol etmeden tekrar üretme.

Çalıştığın Claude ortamı limit sıfırlanınca otomatik yeniden denemeyi/devamı destekliyorsa sıfırlama geldiğinde bu dosyayı okuyup hemen devam et; yeniden kullanıcı onayı isteme. Otomatik uyanma desteklenmiyorsa bunu açıkça bildir ve sonraki devam mesajında checkpoint'ten sürdür. Metin talimatının tek başına otomatik yeniden başlatma sağlayabildiğini iddia etme. Limitleri aşmaya çalışma, başka hesap veya ücretli API kullanımına kendiliğinden geçme.

Şimdi incelemeyi başlat; yalnız plan veya öneri vererek bitirme. Hedef, FilmCraft'ta üretilmiş ve uygulamaya bağlanmış gerçek videolar, belirgin duyulan efektler, doğrulanmış kod, commit/push ve kontrol raporudur.
