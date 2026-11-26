# FilmCraft teslim raporu — Kaplan Arena açılış filmi ve ara döngüsü (hareketli video sürümü)

Tarih: 26 Kasım 2026 · Araç: FilmCraft 0.20.1 (`C:\Program Files\FilmCraft\filmcraft-cli.exe`, başsız motor + MCP stdio)

Bu sürüm, önceki sabit görsel / pan-zoom kurgusunun yerine OpenArt'ta üretilmiş **gerçek hareketli video kliplerini** kullanır (`videolar-openart/CLAUDE-VIDEO-TESLIMI.md`). Önceki sürüm git geçmişinde (`67748b4`) duruyor.

## 0. Kaynak paket ile bu teslimin ayrımı

- **Kaynak paket (OpenArt, bu teslimden önce hazırdı):** `videolar-openart/` — 12 orijinal klip `ham/`, montaj için seçilmiş 11 klip `secilen/` (hash doğrulanmış kopyalar), `secilen-klipler.json`, `uretim-manifest.json`, `KALITE-KONTROL.md`, `IZLE.html`. Kaynak paket, kurgulanmış film değildir. Bu teslimde ek OpenArt üretimi yapılmadı (kalan 530 kredi kullanılmadı).
- **Bu teslim (FilmCraft kurgusu, miks, dışa aktarım, uygulama entegrasyonu):** aşağıdaki çıktılar, projeler, ölçümler ve testler.

## 1. Çıktılar

| Dosya | Süre / kare | Görüntü | Ses | Boyut |
|---|---|---|---|---|
| `ciktilar/acilis-60sn.mp4` | 60.000 s / 1800 kare | H.264 High, 1920×1080, 30 fps, yuv420p, ~6109 kbps (CRF 22) | AAC 48000 Hz stereo, 320 kbps | 48.2 MB |
| `ciktilar/ara-30sn-loop.mp4` | 30.000 s / 900 kare | H.264 High, 1920×1080, 30 fps, yuv420p, ~2765 kbps (CRF 20) | AAC 44100 Hz stereo, 256 kbps | 11.3 MB |

Uygulama bu dosyaların bayt-bayt aynı kopyalarını kullanır: `assets/sinematik/acilis-60sn.mp4`, `assets/sinematik/ara-30sn-loop.mp4`; `ara-poster.webp` FilmCraft'ın ara projesinden 0 s karesi (`filmcraft/poster.js`).

**Kaynak uyarlaması (kalite kazancı değildir):** OpenArt dosyaları 1080p istenmiş olsa da gerçekte **1920×1072, 24 fps, sessiz**. Sekans 1920×1080 / 30 fps. Kare boyu %100,75 ölçekle doldurulur (1072 → 1080; iki yandan ~7 px kırpılır, kadraj bozulmaz). 24 → 30 fps dönüşümü FilmCraft'ın kare örneklemesiyle (frame sampling) yapılır: ara kare üretilmez, bazı kaynak kareleri iki kez gösterilir. Bu işlemler görüntü kalitesini artırmaz; çıktı, yapay zekâ üretimi kaynakların 1080p sekansa uyarlanmış hâlidir. Orijinaller (`ham/`, `secilen/`) değiştirilmedi.

## 2. Düzenlenebilir FilmCraft projeleri

- `filmcraft/kaplan-arena-acilis.fcproj` — sekans "Acilis 60sn" 1920×1080, 30 fps, 48 kHz; 21 medya (10 video klibi, logo, müzik, 9 SFX).
- `filmcraft/kaplan-arena-ara.fcproj` — sekans "Ara 30sn dongu"; 2 medya.
- Medya yolları proje dosyasına göre **göreli** (`../videolar-openart/secilen/…`, `../girdiler/…`, `../ses-gercek/hazir/…`, `katmanlar-png/logo-dark.png`). Projeler kaydedildikten sonra yeniden açıldı: `media.status` her öğe için `online`, `media.findMissing` boş. Dışa aktarım bu projelerden yapıldı; FilmCraft `offlineMedia: []` bildirdi. `--allow-offline` kullanılmadı.
- `filmcraft/kur.js`: projeleri FilmCraft komutlarıyla (`timeline.place` + `sourceIn`, `clip.speedDuration`, `effects.setParam` anahtar kare, `sequence.applyVideoTransition`, `graphics.*`, `mixer.*`, `clip.audioGain` …) kuran yeniden üretilebilir betik. `filmcraft/disa-aktar.sh [acilis|ara]`: FilmCraft `export`. `filmcraft/dogrula.py`, `dongu-oynat.js`, `sfx-senkron.js`: yalnız ölçüm. `*-zaman-cizelgesi.json`: kurulan zaman çizelgesi ve olay zamanları.
- Kurgu, geçiş, renk/vinyet, metin, ses otomasyonu ve son dışa aktarım FilmCraft'ta yapıldı. ffmpeg/Python yalnız ölçüm ve inceleme panoları için kullanıldı.

### Açılış zaman çizelgesi (V1)

Kaynak giriş noktaları 24 fps kare ızgarasında seçildi; olay zamanları kare kare (1/24 s) incelemeyle bulundu.

| Final | Klip | Kaynak aralığı | Kurgu |
|---|---|---|---|
| 0–6 | 01-dunya-kesfi | 0,50–6,50 s | siyahtan 0,9 s açılış |
| 6–12 | 02-kaplan-yolculuk | 0,50–6,50 s | 20 kare çapraz geçiş (orta) |
| 12–18 | 03-kale-kapisi | 0,00–5,10 s, **%85 hız** | 16 kare geçiş (çıkan klipte). Kapı **yalnız aralanır**; en geniş aralık ~17,0 s; kapanmaya başlamadan (kaynak 5,1 s) kesilir. Gizemli kapı tanıtımı olarak kurgulandı; tamamen açılan kapı ya da kapıdan geçiş gösterilmez. |
| 18–24 | 04-turnuva-karsilasma | 0,50–6,50 s | kesme; kılıçlar **20,208 s** (kaynak kare 65) kesişir |
| 24–27 | 05-kilic-temasi (**v02**) | 0,25–3,25 s | kesme temas anında (**24,000 s**); basınç/titreşim, kıvılcım parlaması 25,65 s'de tepe. İlk sürümün bükülen bıçağı (`ham/05-kilic-temasi.mp4`) kullanılmadı. |
| 27–31 | 06-kalkan-temasi | 1,00–5,00 s | kesme; kılıç kalkana **28,000 s** (kaynak kare 48), ikinci kılıç çarpışması **30,750 s** (kare 114). Ön plandaki gözlemci kadrajdan çıkar (kaynakta öyle). |
| 31–38 | 07-arenaya-giris | 0,50–7,50 s | **kesme** + savurma (geçiş, 30,75 s çarpışmasını örtmesin diye çapraz geçiş kaldırıldı) |
| 38–44 | 08-arena-ihtisam | 0,50–6,50 s | 24 kare çapraz geçiş (orta) |
| 44–48 | 09-kaplan-kukreme | 0,875–4,875 s | kesme; çene baştan açık, kükreme **44,033 s**; çene 46,875 s'de kapanmaya başlar. Görsel kaplan, aslana dönüştürülmedi. |
| 48–60 | 10-final-kunye | 0,50–12,50 s | 14 kare geçiş (giren klipte); başlık, logo, künye FilmCraft katmanı |

Geçişler toplam süreyi uzatmaz (sekans 1800 kare). Temas planları (04→05→06→07) ve kükreme kesmeyle; hiçbir temas çapraz geçiş altında değildir.

**Başlık ve künye (FilmCraft grafik katmanları; kliplerde yazı yok):** "KAPLAN ARENA / Efsaneye Yolculuk" 47,9 s'de belirir (Cinzel Black + Marcellus SC, koyu yumuşak zemin üzerinde). Resmî Kaplan Okulları logosu (`app/logo.js` içindeki koyu zemin sürümü, değiştirilmeden PNG'ye çıkarıldı) 48,6–49,5 s'de belirir. Künye paneli 48,3–49,4 s'de yerleşir ve **49,4–60 s (10,6 s)** tam okunur: "Düzenleyen: Kaplan Okulları Yapayzeka Kulübü"; Mentörler: Ersen BARLAS · Alp Han KOÇDEMİR; Kulüp öğrencileri: Emre Burak Tölegen · Burak Yoğurtçu · Halil Mert ACAR · Yekta Efe Konuk · Çınar Arda · Yusuf Emir Kuş · Ömer Araf Boncuk · Emir Karatay. Son 10 saniyenin tamamında künye ekrandadır (`onizleme/acilis-kareler.jpg`: 49,5 / 55 / 59,9 s). 10'daki hafif kamera kayması metni etkilemiyor; panel %88 opak.

Önceki sürümdeki sis/ışık/toz/kıvılcım PNG katmanları ve 2.5D kamera hareketi bu sürümde kullanılmadı (hareket ve kıvılcım artık kliplerin kendisinde). `katmanlar-png/` dosyaları geçmiş için yerinde duruyor.

### Ara döngüsü (30 s)

`ara-arena-sakin.mp4` (15,04 s) **%90 hızda** iki tur: kaynak 1,5–15,0 s → her tur 15,000 s (450 kare). Her turun son 50 karesinde (1,667 s) ikinci izde kaynak 0–1,5 s opaklık 0→100 ile üstten açılır; tur sınırında ve 30 s → 0 sarmasında görüntü kaynak 1,5 s'den kesintisiz sürer (sınırdaki kaynak adımı 0,03 s, normal oynatımla aynı). Geri oynatma (reverse) kullanılmadı. Kükreme/darbe sesi yok. Sabit "KAPLAN ARENA / Efsaneye Yolculuk / Birazdan devam ediyoruz" yazısı ve vinyet. Müzik: `ara-muzik.wav` 14,9–44,9 s + 2 s eşit güçlü sarma geçişi (hazır loop varsayılmadı).

## 3. Ses

İzler: A1 Müzik (`girdiler/acilis-muzik.wav`, −2 dB), A2 SFX Temas, A3 SFX Savurma, A4 SFX Sürtünme-Zincir, A5 SFX Kapı, A6 SFX Kapı gıcırtı, A7 SFX Kükreme-Başlık; S1 "Arena yankısı (ambiyans)" submix (Convolution Reverb, %100 ıslak; efektlerden −13/−11 dB, müzikten −20 dB gönderim); Mix: Hard Limiter (−2,0 dB). Ayrı ortam kaydı pakette yok; ambiyans katmanı bu yankı submix'idir.

Müzik 58,8 s; esnetilmedi. Parça 57,3–58,8 s'de kendi içinde söner; 58,8–60 s'yi yankı kuyruğu ve sabit künye doldurur.

### Efekt işaretleri (eski sabit zamanlar kullanılmadı; hepsi gerçek video karelerine yeniden bağlandı)

| Zaman | Olay (görüntü) | Kaynak (`ses-gercek/hazir/`) | Hizalama | Kazanç | Müzik ducking (A1) |
|---|---|---|---|---|---|
| 11,6 | zincir gerilir (kapı aralanmadan) | zincir-gercek.wav | yüksek bölüm 13,9–15,0 s | −2 dB | 11,6→12,0 s −3 dB |
| 13,83 | kapı aralanır (03 kaynak 1,5 s) | kapi-gicirti-gercek.wav | aralanmayla | +2 dB | 13,6→13,9 s −5 dB, 17,6 s'ye kadar |
| 13,73 | kapı ahşap/metal hareketi | kapi-acilis-kayit-foley.wav | tepe (3,26 s) **17,0 s** = en geniş aralık | +5 dB | 18,4 s'de 0 |
| **20,208** | turnuva kılıç kesişmesi (04 kare 65) | kilic-temas-kayit-foley.wav (+ savurma) | transient olay karesine | +6 dB | 19,76→20,0 −4 dB, 20,8'e kadar |
| **24,000** | kılıç teması, yakın plan (05 v02) | kilic-temas + savurma + 2× kilic-suruntu | kesmede darbe; sürtünme parlamaya doğru (25,2 s) | +8 / +3 / +4 dB | 23,55→23,8 −6 dB, 25,95'e kadar |
| **28,000** | kalkan teması (06 kare 48) | kalkan-vurus-kayit-foley.wav (+ savurma) | transient olay karesine | +11 dB | 27,55→27,8 −6 dB, 28,8'e kadar |
| **30,750** | ikinci kılıç çarpışması (06 kare 114) | kilic-temas-kayit-foley.wav (+ savurma) | transient olay karesine | +7 dB | 30,3→30,55 −5 dB, 31,3'e kadar |
| 31,0 | 06 → 07 kesmesi | savurma-gercek.wav | tepe kesmede | +2 dB | — |
| **44,033** | kükreme (09; çene açık 44,0–46,9 s) | **kukreme-kullanici.wav** | transient kesmeden bir kare sonra; yüksek bölüm 44,13–45,81 s, kayıt 46,33 s'de biter, yankı kuyruğu çene kapanırken söner | +4 dB | 43,4→43,85 −6 dB, 46,3'e kadar; 47,2'de −1,5 |
| 48,0 | başlık | ses-taslaklari/baslik-vurgusu-01.wav (sentetik tasarım sesi) | | +1 dB | 47,7→47,95 −4 dB, 49,4'te 0 |

Kükreme için prompttaki 0,8 s kabul edilmedi; çenenin gerçek açık kaldığı süre (44,0–~46,9 s) kare kare ölçüldü ve 2,46 s'lik kayıt bu aralığa yerleştirildi. Eski kükremeler (kaplan-kukreme-gercek, STILIZE taslak) kullanılmadı. Metal sesleri gerçek metal kayıtlarından **foley**dir; gerçek düello kaydı olarak sunulmaz.

FilmCraft ses kliplerini sekans karesinin başına (1/30 s) yerleştiriyor; temas seslerinde kare içi fark kaynak girişinden düşülerek telafi edildi (`kur.js` `sfx()`).

## 4. Teknik ölçümler

Kaynak: `filmcraft/dogrulama-sonuclari.json`, `sfx-senkron-sonucu.json`, `dongu-oynatim-sonucu.json`.

- Tam decode (ffmpeg `-f null`): açılış **hatasız**, ara **hatasız**. Açılış görüntüsü tam 1800 kare, 30/1 fps; ara 900 kare.
- Açılış: entegre **−16,1 LUFS**, true peak **−1,4 dBTP** (hedef ≈ −16 LUFS, ≤ −1 dBTP), LRA 6,0 LU, örnek tepe −1,39 dBFS. Ses kabı 60,01 s (AAC son çerçeve).
- Ara: entegre **−20,0 LUFS** (açılıştan 4 LU sakin), true peak −9,4 dBTP, LRA 1,2 LU; 44,1 kHz'de ses tam 1 323 000 örnek = 30,000 s.
- Efekt belirginliği (100 ms pencere, olay − öncesindeki müzik ortancası; nihai miks):

| Olay | Zaman | Öncesi (dB) | Olay (dB) | Fark |
|---|---|---|---|---|
| Kapı aralanması (zincir + gıcırtı) | 13,76 s | −26,2 | −9,6 | **+16,6 dB** |
| Kapı en geniş aralık | 17,0 s | −25,7 | −17,0 | **+8,7 dB** |
| Turnuva kılıç kesişmesi | 20,208 s | −21,9 | −15,1 | **+6,8 dB** |
| Kılıç teması (yakın plan, kesme) | 24,0 s | −22,2 | −12,1 | **+10,0 dB** |
| Kalkan teması | 28,0 s | −23,1 | −13,1 | **+9,9 dB** |
| İkinci kılıç çarpışması | 30,75 s | −24,2 | −12,6 | **+11,5 dB** |
| Kükreme | 44,033 s | −23,7 | −14,0 | **+9,7 dB** |
| Başlık vurgusu | 48,0 s | −22,4 | −13,3 | **+9,1 dB** |

- **Kare senkronu** (`sfx-senkron.js`: FilmCraft'tan yalnız temas izi, müzik ve yankı kapalı, WAV; proje kaydedilmeden): turnuva 20,208 → transient **+6 ms**, kılıç 24,000 → **+6 ms**, kalkan 28,000 → **+6 ms**, ikinci çarpışma 30,750 → **+6 ms** (bir kare 33,3 ms).
- **Ara döngüsü, ses:** dosya kendisiyle 3 kez uç uca: sınır sıçraması 0,00307 (gövdede tipik %99 fark 0,01378), sınırda sessizlik **yok**.
- **Ara döngüsü, görüntü (FilmCraft kodlamasız kareleri):** 29,967 → 0 sarma farkı 0,708 = iç tur sınırı (14,967 → 15) ile aynı; normal ardışık farklar 0,44–0,87. Kodlanmış dosyada en büyük farklar 60 karelik H.264 anahtar karelerinde (~1,0); sarma (kare 0 da anahtar kare) bu düzeyde, 1,06.
- **Ara döngüsü, gerçek oynatım** (`dongu-oynat.js`: Chrome `<video loop>`, gerçek hız, 3 ardışık tur): 3 sarmada mediaTime 29,967 → 0,000; sarmadaki kare aralığı 33,3 / 33,3 / 33,4 ms (normal ortanca 33,4 ms); atlanan kare 0; 2701 kare sunuldu. Chrome döngü başında 0'a arama yaptığı için her turda bir `waiting` olayı veriyor; görünür etkisi ölçülmedi (kare aralığı normal).
- **Kaynakta görülen sınırlama:** `ara-arena-sakin.mp4`'ün kendisinde ~1,17 s aralıklı (28 kare) küçük hareket sıçramaları var (kare farkı 1,3–1,55, ortalama 0,53); üretimden gelir, döngü kurgusundan değil. Sabit kamera istenmiş olsa da hafif iç kadraj/ışık hareketi var (paket notunda da yazılı). Açılış kliplerinde de yapay zekâ üretimine özgü küçük geometri/hareket tutarsızlıkları olabilir; tam anatomi/fizik incelemesi yapılmadı.

## 5. Dinleme / izleme durumu

- **Yapılan:** teknik ölçüm (yukarıda), kare kare görsel inceleme (temas/kükreme/kapı için 1/24 s'lik panolar, `onizleme/acilis-kareler.jpg`, `onizleme/ara-*.jpg`), transient senkronunun sayısal ölçümü, ara döngüsünün örnek ve kare düzeyinde analizi ve Chrome'da 3 tur gerçek hızda otomatik oynatım ölçümü.
- **Yapılmadı:** insan kulağıyla dinleme ve gözle tam hareketli izleme. Sesi duyamam; "kulakla onaylandı" iddiası yoktur. Lütfen salon hoparlöründe ve perdede özellikle **00:12–00:31** (kapı, turnuva, kılıç, kalkan) ve **00:44–00:48** (kükreme) aralıklarını izleyip dinleyin; ara döngüsünü en az 3 tur izleyin. Yapay zekâ kliplerinin tam hareket kalitesi (ayak teması, uzuv geometrisi) gözle onaylanmalıdır.

## 6. Uygulama entegrasyonu

Uygulama kodu bu teslimde değişmedi; yalnız `assets/sinematik/` altındaki iki MP4 ve poster yenilendi (yollar `app/shared.js` `CINE` içinde aynı). Davranış önceki teslimdeki gibi:

- Karşılama ekranında "Açılış Filmini Oynat", "Ara Döngüsü", "Atla" (açılış oynarken), "Durdur / Karşılamaya Dön"; üst çubukta "Ara Döngüsü". Aktif yarışmada ortak duraklatma (`break` + `admin`): süre ve cevap kabulü durur; film bitişi/Atla/döngü yarışmayı başlatmaz ve sürdürmez; devam yalnız admin komutuyla. Üç kampüs ortak yarışma düzeltmeleri korunur.
- Video ve sesi yalnız etkin ses sahnesinde; admin önizlemesi ve telefonlar sessiz/videosuz. Yükleme sırasında, hata ya da eksik dosyada sabit karşılama (statik yedek). Yenileme/yeniden bağlanmada açılış baştan çalmaz. Hareketleri azaltma açıksa açılış oynatılmaz.
- Web (Vercel), LAN (PowerShell sunucusu, 1 MB'lık byte-range parçalar), telefonsuz ve file:// akışları korunur.

## 7. Testler (26 Kasım 2026, yeni videolarla)

| Paket | Sonuç |
|---|---|
| Birim (`node --test tests/core.test.js`) | 22/22 |
| `tests/e2e/media.js` (sinematik: sahnede sesli oynatım, Atla/Durdur, ortak duraklatma, eksik dosya, reduced motion, file://, PowerShell Range, Vercel benzeri 206) | 43/43 |
| `tests/e2e/modes.js` (file://, PowerShell sunucusu, güvenlik) | 30/30 |
| `tests/e2e/uckampus.js` (üç kampüs ortak yarışma) | 63/63 |
| `filmcraft/dongu-oynat.js` (ara, 3 tur gerçek oynatım) | geçti |
| `filmcraft/sfx-senkron.js` (temas senkronu ≤ 15 ms) | geçti (4/4, +6 ms) |

## 8. Kaynak ve lisans

`ses-gercek/KAYNAK-LISANS.md`, `lisanslar/`, `kaynaklar-indirme.json`, `girdiler/MUZIK-TESLIMI.md` korunur. Video klipleri: kullanıcının OpenArt hesabında üretildi (`videolar-openart/uretim-manifest.json`: istemler, OpenArt kimlikleri, SHA256). Metal/kapı/zincir/savurma: BigSoundBank ve Freesound (stib) CC0 kaynaklarından foley. Müzikler: kullanıcının Suno oturumunda üretilen iki parça. **Kükreme (`kukreme-kullanici`) kullanıcının sağladığı dosyadır; kaynağı/lisansı belgelenmemiştir, CC0 değildir** (KUKREME-KULLANICI-NOTU.md). Başlık vurgusu sentetik tasarım sesidir. Logo: `app/logo.js` içindeki resmî logo, değiştirilmeden.

## 9. Son durum

- Push ve Vercel doğrulaması sonrası güncellenir.
