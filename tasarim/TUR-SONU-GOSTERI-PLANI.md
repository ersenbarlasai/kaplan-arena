# Tur sonu ve şampiyonluk — Claude için görsel/ses planı

Onaylanan turnuva: 4 → 3 → 2 → şampiyon; üç kampüs pilotunda 3 → 3 → 2 → şampiyon. Uygulama ayrıntıları CLAUDE-ELEME-SORU-VE-KUTLAMA-PROMPTU.md içinde. Bu dosya gösteri tarifidir; uygulamada animasyonların yapıldığı iddiası değildir.

## Kullanılacak hazır kaynaklar

- Arena arka planları: `E:\PROJELER\KaplanArena\tasarim\varliklar\orman.png`, `kale.png`, `arena.png`. Uygulamadaki mevcut optimize runtime eşlerini tercih et.
- Takım armaları: aynı klasörde `arma-*.svg`; mevcut kalıcı takım/arma eşleşmesini kullan.
- Işık/çerçeve katmanları: `E:\PROJELER\KaplanArena\tasarim\sinematik\katmanlar\isik-huzmeleri.svg`, `altin-toz.svg`, `baslik-cerceve.svg`. İşlevine uygun olanı kullan; gereksiz bütün katmanları üst üste bindirme.
- Hareketli arena alternatifleri: `E:\PROJELER\KaplanArena\tasarim\sinematik\videolar-openart\secilen\08-arena-ihtisam.mp4` ve `ara-arena-sakin.mp4`. Arkada hareketli klip kullanılırsa sessiz olsun; etkin tek sahnede ayrı gösteri müziğiyle karışmasın. Okunurluk için koyu yumuşak örtü kullan. Genel oyun arka planını değiştirmek zorunlu değil.
- Müzik kaynakları: `E:\PROJELER\KaplanArena\tasarim\sinematik\girdiler\acilis-muzik.wav` ve `ara-muzik.wav`. Hazır Suno kaynaklarıdır. Şampiyonluk için açılışın uygun zafer bölümünü FilmCraft'ta seç; kesin zaman aralığını dinlemeden seçilmiş sayma. Yeni ücretli üretim gerekmez.
- Kısa vurgu: `E:\PROJELER\KaplanArena\tasarim\sinematik\ses-taslaklari\baslik-vurgusu-01.wav` stilize taslaktır; mevcut oyun SFX'i veya uygunsa bu kullanılabilir. Gerçek kılıç/kükreme sesi şampiyonluk müziğinin yerine geçmez.

Yeni raster görsele gerek yoktur. Kazanan adı, puanı ve arma uygulamada dinamik çizilmeli. Kupa/defne gerekiyorsa mevcut ikon/stil sisteminde SVG veya CSS ile oluşturulabilir; var olan arma sisteminden farklı bir görsel dil icat etme. Konfeti mevcut canvas üzerinden genişletilebilir.

## Tur sonu gösterisi — yaklaşık 7 saniye

0–1 sn: arena arka planı üzerinde mevcut soru görünümü kapanır; “Orman Geçidi Tamamlandı” veya ilgili tur başlığı yumuşak giriş yapar. Zamanlayıcı/cevap kabulü kapalıdır.

1–2,5 sn: altın ışık ve kazanan takımın arması ölçek/opacity ile girer. Arma etrafında kısa halka/parçacık vurgusu; sert flaş yok.

2,5–4,5 sn: “TURUN KAZANANI” ve takım adı, o tur net kazanımı, ayrı etiketli genel toplam gösterilir. Tur net puanı eşitse ortak kazananlar birlikte gösterilir. Yükselme sınırı çözülmeden elenen açıklanmaz.

4,5–7 sn: yükselen takımlar ve elenen takım(lar) okunur satırlarda görünür. Üç takımın ilk turunda “Üç takım da Kadim Kale'ye ilerliyor” denir. Katılan takımları küçük düşüren dil/animasyon kullanma.

7 sn sonrası: gösteri son tablosunda bekler. Admin “Sonraki Tura Geç” demeden ekran ve oyun ilerlemez. Atla son tabloya gider. Gösteri tekrarı yalnız admin komutuyla yeni olay kimliğidir; eleme ve puan yeniden hesaplanmaz.

## Şampiyonluk gösterisi

Adminin kesinleşmiş final sonucu açıklamasıyla tek olay başlar. Önce kısa arma/ışık girişi, sonra “ŞAMPİYON” ve kazanan takım adı; tam bu açıklama anında soldan/sağdan görünür konfeti patlaması. Sonrasında yaklaşık 6–8 saniye hafif parçacık düşüşü; sürekli yeniden patlama yok. Şampiyon adı ve genel puan açık kalır. İkinci takım altta daha küçük gösterilebilir; sahte üçüncü finalist çizilmez.

Gerçek müzik fade-in ile başlar, tek ses sahnesinde düşük/orta arka plan seviyesinde devam eder; açıklama vurgusu kaybolmasın. Şampiyonluk ekranından çıkarken fade-out/stop yapılır. Merkezi ses seviyesi/mute aynı anda hem müziği hem SFX'i yönetir; reduced-motion'da konfeti yerine sakin ışık ve arma kalır. Müzik ayrıca ses ayarına bağlıdır, hareket tercihi sesi kendiliğinden kapatmaz.

## Teknik gösteri sözleşmesi

Kalıcı eventId + yarışma/tur kimliği + admin başlangıç zamanı kullan. Yeniden render, sahne yenileme ve geç bağlanma eski gösteriyi/sesi baştan başlatmaz. Görsel sayaç sunum içindir; soru süresi/eleme kararını değiştirmez. Animasyonun süresi bitince sadece sonuç görünümüne yerleşir. Sesli medya öğesi DOM yeniden çiziminde yok edilip tekrar başlatılmaz. Tüm canvas, RAF, timeout ve dinleyiciler temizlenir.

Projeksiyon 1920×1080, admin 1366×768 ve dar telefonda isim/puan taşması kontrol edilsin. Telefon tur kazananı ve kendi aktif/elenmiş durumunu sade ve sessiz görür. Nihai test raporunda görsel inceleme, teknik ses kontrolü ve gerçekten yapılmış dinleme ayrı belirtilir.
