# Claude için hareketli video teslimi — güncel görev

Proje: `E:\PROJELER\KaplanArena`. OpenArt üretimleri tamamlandı: 11 özgün sahne + 1 kılıç düzeltmesi, toplam 12 orijinal MP4 indirildi. Montaj için seçilmiş 11 klip hazır. Bu dosya, eski sabit görsel/pan-zoom kurgu tarifinin yerine gerçek video kliplerini koyar. Diğer yarışma kuralları ve `tasarim/CLAUDE-SON-GOREV-FILMCRAFT.md` içindeki FilmCraft, entegrasyon, test, commit/push ve rapor kapsamı yürürlüktedir.

## Dosyaları buradan al

- Ana kaynak klasörü: `E:\PROJELER\KaplanArena\tasarim\sinematik\videolar-openart\secilen\`
- Klip listesi, hashler, gerçek teknik bilgiler: aynı üst klasörde `secilen-klipler.json`.
- Tam üretim girdileri, promptlar, OpenArt kimlikleri ve orijinaller: `uretim-manifest.json` ve `ham/`.
- İzleme sayfası: `IZLE.html`. Bütün videolar yerel dosyalardan açılır; internet gerektirmez.
- İncelenen kareler ve FFprobe çıktıları: `onizleme/`; ayrıntılı sınırlamalar: `KALITE-KONTROL.md`.

`secilen/05-kilic-temasi.mp4`, düzeltilmiş v02'nin hash doğrulanmış kopyasıdır. Bozulan ilk sürüm yalnız `ham/05-kilic-temasi.mp4` olarak korunur; bunu yanlışlıkla montaja alma. Seçim teknik kontrol ve örnek kare incelemesine dayanır; bütün kliplerin tam hareketli nihai edit onayı anlamına gelmez.

Gerçek kaynakların hepsi 1920×1072, 24 fps, H.264 ve sessizdir. İstekte 1080p seçilmiş olsa da gerçek 1080 yüksekliği varsayma. FilmCraft'ta 1920×1080 / 30 fps sekansa kompozisyonu bozmadan uyarla; ses senkronunu gerçek karelerle kontrol et. Kaynaklar zaten yapay zekâ üretimidir; kare/çözünürlük dönüştürmeyi yeni görüntü kalitesi kazanımı gibi sunma. Ham orijinalleri koru. Seçilen set yaklaşık 85,458 saniyedir; bu, montaj payı olan kaynak süresidir, final film süresi değildir.

## FilmCraft kurgu planı

Bütün kurgu, montaj, renk, ses otomasyonu ve nihai dışa aktarım `C:\Program Files\FilmCraft\` ile yapılacak. Kurulu `filmcraft-cli.exe` yardım/commands/describe komutlarından gerçek şemaları öğren; düzenlenebilir `.fcproj` kaydet. Nihai renderda eksik medya yer tutucularına izin verme.

| Final zaman | Seçilen klip | Kaynak süresi yaklaşık |
| --- | --- | --- |
| 0–6 sn | 01-dunya-kesfi.mp4 | 7,042 sn |
| 6–12 sn | 02-kaplan-yolculuk.mp4 | 7,042 sn |
| 12–18 sn | 03-kale-kapisi.mp4 | 7,042 sn |
| 18–24 sn | 04-turnuva-karsilasma.mp4 | 7,042 sn |
| 24–27 sn | 05-kilic-temasi.mp4 — v02 | 4,042 sn |
| 27–31 sn | 06-kalkan-temasi.mp4 | 5,042 sn |
| 31–38 sn | 07-arenaya-giris.mp4 | 8,042 sn |
| 38–44 sn | 08-arena-ihtisam.mp4 | 7,042 sn |
| 44–48 sn | 09-kaplan-kukreme.mp4 | 5,042 sn |
| 48–60 sn | 10-final-kunye.mp4 | 13,042 sn |
| Ayrı 30 sn ara filmi | ara-arena-sakin.mp4 | 15,042 sn |

Bu zaman çizelgesini ana iskelet olarak koru; kliplerin en düzgün bölümlerini seç ve temas seslerini gerçek karelere göre hizala. Geçişler toplamı 60 saniyeyi uzatmasın veya temasları crossfade altında görünmez kılmasın. Kaplan kimliği, petrol/altın resimsel stil, üç arena hikâyesi ve yaşa uygun törensel karşılaşma korunsun. Açılışın son 10 saniyesinde tüm künye okunur olsun.

Önemli edit notları:

- 03 kapısı tamamen açılmıyor; dar aralık açılıp sonradan kapanmaya yaklaşıyor. Açılma/ışık kısmını seç; tamamen açılan kapı diye sunma, kapının içinden geçişi zorla üretme. Gerekirse bu sahneyi gizemli kapı tanıtımı olarak kurgula.
- 05 için v02'deki sade, temas halinde basınç/titreşim/kıvılcım hareketini kullan. Bu sürüm yeni büyük savuruş içermez; tek güçlü yakın plan vurgu olarak kurgula. İlk sürümün sonundaki bıçak eğilmesini kullanma.
- 06'da kalkan teması yaklaşık kaynak 2. saniye civarında; nihai ses konumunu tam kareyi bularak belirle. Kamera ilerlediği için ön plandaki gözlemci kadrajdan çıkabiliyor.
- 09'da çene/baş hareketi var; ses dosyasını gerçek açık çene süresine bağla. Promptta istenen 0,8 saniyeyi gerçekleşmiş hareket zamanı kabul etme. Görsel kaplandır, aslan karakterine dönüştürme.
- 10 metinsiz arka plandır; künye henüz bu MP4'ün içinde değildir. Hafif bakış/kamera kaymasını ve metin okunurluğunu kontrol et.
- Ara klibinin ilk/son kareleri incelendi ve yakın kompozisyon görüldü; bu tek başına kusursuz döngü kanıtı değildir. Sabit kamera isteğine rağmen hafif iç kadraj/ışık hareketi var. FilmCraft'ta uygun kesim ve kısa örtüşmeyle 30 saniyelik sakin döngü oluştur, en az üç ardışık turu gerçek oynatımda kontrol et. Sert kükreme/darbe ara döngüsüne girmez. Yapay bir ileri/geri hareket göze çarpıyorsa reverse döngüye başvurma.

## Müzik, efekt ve künye

Müzik: `E:\PROJELER\KaplanArena\tasarim\sinematik\girdiler\acilis-muzik.wav` ve `ara-muzik.wav`. Açılış müziği yaklaşık 58,8 saniye; 60 saniyeye doğal giriş/çıkışla uyarla. Ara müziği yaklaşık 74,96 saniye; uyumlu bölümü döngüle. Hazır 30 saniyelik loop olduğunu varsayma.

Efektler: `E:\PROJELER\KaplanArena\tasarim\sinematik\ses-gercek\hazir\`. Ana kükreme kesinlikle `kukreme-kullanici.wav`. Kılıç/kalkan/kapı/zincir/savurma seslerini güncel gerçek video hareketlerine yeniden bağla. Eski sabit `audio_cues` zamanlarını doğrulamadan kullanma; ayrı müzik ve efekt katmanları oluştur. Darbe ve kükremede müziği yumuşak otomasyonla yaklaşık 3–6 dB kısarak başla, kulağa göre ayarla; efektler normal dinlemede belirgin olsun. Tüm filmi gereksiz yüksek yapma. Açılış hedefi yaklaşık −16 LUFS-I ve en fazla −1 dBTP; gerçek ölçümü raporla. İşitsel kontrol yapmadıysan yapmış gibi yazma. Ara filmi konuşma için sakin tut.

Başlık “Kaplan Arena — Efsaneye Yolculuk”. Düzenleyen “Kaplan Okulları Yapayzeka Kulübü”. Mentörler: Ersen BARLAS, Alp Han KOÇDEMİR. Kulüp öğrencileri: Emre Burak Tölegen, Burak Yoğurtçu, Halil Mert ACAR, Yekta Efe Konuk, Çınar Arda, Yusuf Emir Kuş, Ömer Araf Boncuk, Emir Karatay. Türkçe isimleri ve mevcut resmi okul logosunu koru; metni FilmCraft katmanı olarak ekle. Yapay zekâ kliplerinde yazı üretilmedi.

## Entegrasyon ve tamamlanma ölçütü

Bu paket nihai kurgu veya uygulama entegrasyonu değildir; bunları şimdi tamamla. Mevcut son görev promptundaki admin/sahne/telefon kurallarını, üç kampüs için yapılmış düzeltmeleri ve kullanıcı çalışmalarını koru. Açılış bitişi/atlama ve ara videosu kendiliğinden yarışmayı başlatmasın veya sürdürmesin; ortak duraklama ve açık admin devamı korunsun. Ses yalnız aktif sahneden gelsin. Web/LAN/telefonsuz/file:// akışları, yükleme hatası ve statik yedek kontrol edilsin. Modüler uygulamada gerçek final MP4'ler kullanılsın; eksik dosyayı tamamlandı sayma.

Nihai çıktılar `tasarim/sinematik/ciktilar/acilis-60sn.mp4` ve `ara-30sn-loop.mp4`; düzenlenebilir FilmCraft projeleri `tasarim/sinematik/filmcraft/` altında olsun. Video decode, süre/fps, ses, loop, künye ve uygulama testlerini yap. Raporla; kullanıcı yetkisi doğrultusunda ilgili değişiklikleri gözden geçirip commit ve normal push yap. İlgisiz değişiklikleri silme/dahil etme, force push yapma. Kontrol etmeden yayında deme.

Üretim hesabı kontrolü: başlangıç 3.200, nihai 530 kredi; toplam gerçek bakiye farkı 2.670 kredi. 12 klip indirildi, 11 tercih edilen klip seçildi. Ek OpenArt üretimi bu paketin teslimi için gerekmiyor; gerekiyorsa kullanıcı bütçesini ve kalan krediyi gözet. Son raporunda kaynak paketin hazır olmasıyla nihai video/entegrasyonun tamamlanmasını açıkça ayır.
