# FilmCraft teslim raporu — Kaplan Arena açılış filmi ve ara döngüsü

Tarih: 26 Kasım 2026 · Araç: FilmCraft 0.20.1 (`C:\Program Files\FilmCraft\filmcraft-cli.exe`, başsız motor + MCP stdio)

## 1. Çıktılar

| Dosya | Süre / kare | Görüntü | Ses | Boyut |
|---|---|---|---|---|
| `ciktilar/acilis-60sn.mp4` | 60.000 s / 1800 kare | H.264 High, 1920×1080, 30 fps, yuv420p, ~4177 kbps (CRF 20) | AAC 48000 Hz stereo, 320 kbps | 32.2 MB |
| `ciktilar/ara-30sn-loop.mp4` | 30.000 s / 900 kare | H.264 High, 1920×1080, 30 fps, yuv420p, ~1438 kbps (CRF 20) | AAC 44100 Hz stereo, 256 kbps | 6.1 MB |

Uygulama bu dosyaların bayt-bayt aynı kopyalarını kullanır: `assets/sinematik/acilis-60sn.mp4`, `assets/sinematik/ara-30sn-loop.mp4` (+ `ara-poster.webp`, FilmCraft `render` ile ilk kareden). Kaynak sahneler yaklaşık 1672×941 resimlerdir; çıktı 1080p'ye ölçeklenmiştir, doğal 4K değildir. Videolar hareketli fotoğraf/2.5D kurgudur: kamera itme/kaydırma, temas anında darbe ve sarsıntı, sis/ışık/toz katmanları, kıvılcım, kapı aralığından sızan ışık. Karakterlerde uzuv/ağız animasyonu **yoktur** ve öyle sunulmamıştır; kapı kanatları hareket ettirilmedi (plan notundaki "geometri korunamıyorsa ışık aralığı ve kes" yolu).

## 2. Düzenlenebilir FilmCraft projeleri

- `filmcraft/kaplan-arena-acilis.fcproj` — sekans "Acilis 60sn" 1920×1080, 30 fps, 48 kHz; 24 medya.
- `filmcraft/kaplan-arena-ara.fcproj` — sekans "Ara 30sn dongu"; 5 medya.
- Medya yolları proje dosyasına göre **göreli** (`../sahneler/…`, `../girdiler/…`, `../ses-gercek/hazir/…`). Projeler kaydedildikten sonra yeniden açıldı; `media.status` her öğe için `online`, `media.findMissing` boş. Dışa aktarım bu göreli projelerden yapıldı; FilmCraft `offlineMedia: []` bildirdi. `--allow-offline` kullanılmadı.
- `filmcraft/kur.js`: projeyi FilmCraft komutlarıyla (timeline.place, effects.setParam keyframe, sequence.applyVideoTransition, graphics.*, mixer.*, clip.audioGain …) kuran yeniden üretilebilir betik. `filmcraft/disa-aktar.sh`: FilmCraft `export` komutları. `filmcraft/dogrula.py`: yalnız ölçüm. `*-zaman-cizelgesi.json`: kurulan zaman çizelgesinin özeti.
- FilmCraft SVG içe aktarmıyor (`probe`: "unrecognised format"). `katmanlar/*.svg` çizimleri aynen şeffaf PNG'ye çevrildi (`filmcraft/svg-png.js`, Chrome raster). Ara döngüsündeki 3840 px sis bandı, `sis-seridi.svg` ile aynı elipslerin 1920 px periyotla tekrarıdır. Kurgu, katmanlama, geçiş, ses otomasyonu ve son dışa aktarım FilmCraft'ta yapıldı; ffmpeg yalnız doğrulama/ölçüm için kullanıldı.

### Açılış zaman çizelgesi (V1)

| Süre | Plan | Hareket / kurgu |
|---|---|---|
| 0–6 | 01-dunya-kesfi | siyahtan 0,9 s açılış, %1→%6 itme, sis |
| 6–12 | 02-kaplan-yolculuk | 20 kare çapraz geçiş, sağa kaydırma (±70 px) |
| 12–18 | 03-kale-kapisi | 16 kare geçiş, %1→%7,5 itme; 13,0 s'de kapı aralığında ışık doğar, 17,07 s'de parlar |
| 18–24 | 04-turnuva-karsilasma | kesme, %3→%7,5 itme; **22,000 s (kare 660)** temas: darbe + sarsıntı + kıvılcım |
| 24–27 | 05-kilic-temasi | kesme; **24,200 s (kare 726)** temas |
| 27–31 | 06-kalkan-temasi | kesme, yanal kaydırma; **28,000 s (kare 840)** kalkan teması |
| 31–38 | 07-arenaya-giris | 10 kare geçiş + savurma; ileri itme, ışık huzmeleri, toz |
| 38–44 | 08-arena-ihtisam | 24 kare geçiş; yukarı açılış (±50 px), huzme ve toz |
| 44–48 | 09-kaplan-kukreme | kesme; kükreme 44,3 s; 44,9 s'de sol boşlukta "KAPLAN ARENA / Efsaneye Yolculuk" ışık süpürmesiyle |
| 48–60 | 10-final-kunye | 20 kare geçiş; başlık üst-orta güvenli alana taşınır (48,6 s), künye paneli 48,3–49,4 s'de yerleşir |

Künye (60 s'ye kadar ~10,6 s ekranda, tümü 49,4 s'de yerleşik): "Düzenleyen: Kaplan Okulları Yapayzeka Kulübü"; Mentörler: Ersen BARLAS · Alp Han KOÇDEMİR; Öğrenciler: Emre Burak Tölegen · Burak Yoğurtçu · Halil Mert ACAR · Yekta Efe Konuk · Çınar Arda · Yusuf Emir Kuş · Ömer Araf Boncuk · Emir Karatay. Metinler FilmCraft grafik katmanlarıdır (Cinzel Black, Marcellus SC, Segoe UI), %8 güvenli alan içinde. Kükreme planında yeni aslan/karakter eklenmedi; görsel kaplan aynen kaldı.

## 3. Ses

İzler: A1 Müzik (`girdiler/acilis-muzik.wav`, klip kazancı −2 dB), A2 SFX Temas, A3 SFX Savurma, A4 SFX Sürtünme-Zincir, A5 SFX Kapı, A6 SFX Kapı gıcırtı, A7 SFX Kükreme-Başlık; S1 "Arena yankısı (ambiyans)" submix (Convolution Reverb, Large Hall, %100 ıslak; efektlerden −13/−11 dB, müzikten −20 dB gönderim); Mix: Hard Limiter (−2,0 dB). Pakette ayrı bir ortam/ambiyans kaydı yok; ambiyans katmanı bu arena yankısı submix'idir, uydurma bir saha kaydı eklenmedi.

Müzik 58,8 s; kaba esnetme yapılmadı. Parça 57,3–58,8 s'de kendi içinde söner; 58,8–60 s arasını müziğin arena yankısı kuyruğu ve sabit final künyesi doldurur.

### Efekt işaretleri (zaman, kaynak, ducking)

| Zaman | Olay | Kaynak (`ses-gercek/hazir/` aksi belirtilmedikçe) | Hizalama | Klip kazancı | Müzik ducking (A1 otomasyonu) |
|---|---|---|---|---|---|
| 11,6 → 12,6 | zincir gerilir | zincir-gercek.wav | başlangıç 1,0 s sonra | −2 dB | — |
| 12,967 | kapı gıcırtısı | kapi-gicirti-gercek.wav | tepe ≈13,18 s | +2 dB | 12,6→12,95 s −5 dB, 14,4 s'ye kadar |
| 13,0 | kapı açılışı | kapi-acilis-kayit-foley.wav | ana darbe 17,07 s = ışık parlaması | +5 dB | 16,8→17,02 −5 dB, 18,3'te 0 |
| 21,733 | savurma | savurma-gercek.wav | tepe temastan ~110 ms önce | +6 dB | 21,5→21,8 −6 dB |
| **22,000** | kılıç teması 1 | kilic-temas-kayit-foley.wav | 40 ms kırpıldı; transient kare 660 | +8 dB | −6 dB, 22,8'e kadar |
| 21,967 | kılıç sürtünmesi | kilic-suruntu-gercek.wav | temas sonrası | +3 dB | — |
| **24,200** | kılıç teması 2 | kilic-temas-kayit-foley.wav | transient kare 726 | +8 dB | 23,95→25,0 −6 dB |
| 24,167 | kılıç sürtünmesi | kilic-suruntu-gercek.wav | | +3 dB | — |
| 27,733 | savurma | savurma-gercek.wav | | +6 dB | 27,45→27,75 −6 dB |
| **28,000** | kalkan teması | kalkan-vurus-kayit-foley.wav | transient kare 840 | +11 dB | 28,8'e kadar −6 dB |
| 30,833 | geçiş savurması | savurma-gercek.wav | tepe 31,0 s kesmede | +3 dB | 30,65→30,9 −4 dB |
| 43,3 → 44,15 | gerilim boşluğu | (müzik çekilir) | | | −6 dB'e rampa |
| **44,133** | kükreme | **kukreme-kullanici.wav** (kullanıcının kukre.mp3'ü) | −20 dB başlangıcı 44,296 s | +4 dB | −6 dB, 45,9'a kadar; 46,9'da geri |
| 48,0 | başlık vurgusu | ses-taslaklari/baslik-vurgusu-01.wav (sentetik tasarım sesi) | | +1 dB | 47,7→47,95 −4 dB |

Eski kükremeler (kaplan-kukreme-gercek, STILIZE taslak) kullanılmadı; aynı anda iki kükreme çalmaz. Metal sesler gerçek metal kayıtlarından **foley**dir; gerçek düello kaydı olarak sunulmaz.

## 4. Teknik ölçümler (ffprobe/ffmpeg ebur128, `filmcraft/dogrulama-sonuclari.json`)

- Tam decode (ffmpeg `-f null`): açılış **hatasız**, ara **hatasız**.
- Açılış: entegre **-16.1 LUFS**, true peak **-1.2 dBTP** (hedef ≈ −16 LUFS, ≤ −1 dBTP), LRA 5.2 LU, örnek tepe -1.23 dBFS. Ses kabı 60,01 s (AAC son çerçeve); görüntü tam 1800 kare.
- Ara: entegre **-20.0 LUFS** (açılıştan 4 LU sakin), true peak -9.4 dBTP, LRA 1.2 LU. 44,1 kHz seçildi: 48 kHz'de AAC sona 16 ms sessiz dolgu bırakıyor ve döngüde boşluk oluşturuyordu; 44,1 kHz'de ses **1323000 örnek = 30.0 s**, kap süresi 30,000 s.
- Efekt belirginliği (100 ms pencerede, olay − öncesindeki müzik ortancası; nihai miks):

| Olay | Zaman | Öncesi (dB) | Olay (dB) | Fark |
|---|---|---|---|---|
| Kapı / zincir başlangıcı | 13.0 s | -23.0 | -10.2 | **+12.8 dB** |
| Kapı ana darbe (ışık parlaması) | 17.07 s | -22.1 | -18.0 | **+4.0 dB** |
| Kılıç teması 1 | 22.0 s | -21.2 | -12.3 | **+8.9 dB** |
| Kılıç teması 2 | 24.2 s | -25.6 | -11.8 | **+13.8 dB** |
| Kalkan teması | 28.0 s | -21.1 | -13.0 | **+8.1 dB** |
| Geçiş savurması | 31.0 s | -23.7 | -12.1 | **+11.6 dB** |
| Kükreme | 44.3 s | -24.7 | -13.8 | **+10.9 dB** |
| Başlık vurgusu | 48.0 s | -22.1 | -13.2 | **+8.9 dB** |

- Kare doğruluğu (FilmCraft `run` ile yalnız temas izinin ayrı render'ı, 1 ms çözünürlük): kılıç 1 transient **kare 660 (+0 ms)**, kılıç 2 **kare 726 (+0 ms)**, kalkan **kare 840 (+5 ms)**; kükreme −20 dB başlangıcı **44,296 s**. Görsel darbe/kıvılcım aynı karelerde (`onizleme/acilis-kareler.jpg`: 22.033, 24.233, 28.033 s).
- Ara döngüsü 3 tur (dosya kendisiyle 3 kez uç uca): ses sınır sıçraması 0.00307 (gövdedeki tipik %99 fark 0.01378), sınırda sessizlik **yok**, 5 ms RMS sınır boyunca gövde düzeyinde. Görüntü: kare 899→0 farkı 0.3644; ardışık kare ortalaması 0.0199, en büyük 0.4133. Büyük farkların hepsi H.264 anahtar karelerinde (her 60 kare; 0,34–0,41); kare 0 da anahtar kare olduğundan sarma farkı bu aralıktadır. Anahtar kare dışındaki en büyük fark 0,035. Kaynak düzeyinde (FilmCraft render, 0 s ile 29,967 s) ortalama fark 0,02/255. Sis bantları 30 s'de tam bir periyot kayar; toz/ışık uçlarda sıfır hızlı periyodik; yazılar sabit.
- Not: tarayıcının `<video loop>` başa sarması örnek-kesin değildir; dosya kesintisizdir, tarayıcı birkaç ms'lik sarma gecikmesi ekleyebilir. Uygulamada döngü E2E testinde başa sarıp oynamaya devam ettiği doğrulandı.

## 5. Dinleme / izleme durumu (dürüst ayrım)

- **Yapılan:** teknik ölçüm (yukarıdaki), kare kare görsel kontrol (`onizleme/acilis-kareler.jpg`, `onizleme/acilis-02sn…55sn.jpg`, `onizleme/ara-00sn…30sn.jpg`), efekt belirginliği ve transient senkronunun sayısal ölçümü, ara döngüsünün sample ve kare düzeyinde 3 tur sınır analizi.
- **Yapılmadı:** insan kulağıyla dinleme. Ben sesi duyamam; "kulakla onaylandı" iddiası yoktur. Lütfen salon hoparlöründe özellikle **00:12–00:31** (kapı, kılıç, kalkan, savurma) ve **00:44–00:48** (kükreme) aralıklarını dinleyin; ara döngüsünü en az 3 tur dinleyin.

## 6. Uygulama entegrasyonu

- `app/shared.js` → `CINE` (dosya yolları tek yerde). `app/admin*.js` → karşılama ekranında "Açılış Filmini Oynat", "Ara Döngüsü", "Atla" (açılış oynarken), "Durdur / Karşılamaya Dön"; üst çubukta "Ara Döngüsü". Aktif yarışmada mevcut ortak duraklatma (`break` + `admin`) kullanılır: süre ve cevap kabulü durur; film bitişi/Atla/döngü yarışmayı ilerletmez; "Yarışmaya Devam Et" sonrası süre yalnız admin "devam" ile başlar. Puan/joker/soru korunur.
- `app/stage.js` → `StageCine`: `#sg` dışında tek, kalıcı `<video>`; model yenilemelerinde sıfırlanmaz; oturum kimliğiyle başlar. Ses yalnız etkin ses sahnesinde ve merkezi ses/seviye ayarına bağlı; admin önizlemesi ve telefonlar video içermez. Autoplay reddinde sessiz dener; o da olmazsa sabit karşılama. Hata/eksik dosya ve yükleme sırasında sabit karşılama (Türkçe künye) görünür. Yenileme/yeniden bağlanmada eski açılış baştan çalmaz (ara döngüsü sürer). Hareketleri azaltma açıksa açılış oynatılmaz. `object-fit: contain` ile 4:3 perdede letterbox.
- `kaplan-sunucu.ps1` → mp4 beyaz listede, `video/mp4`, byte-range (206/416). Sunucu tek iş parçacıklı olduğundan her video yanıtı en çok 1 MB; tarayıcı kalan parçaları ayrı ister, telefon API'si bekletilmez.
- `tests/e2e/server.js` → mp4 + Range (Vercel statik davranışı gibi). `OKU-BENI.txt` → SİNEMATİK paragrafı.

## 7. Testler

| Paket | Sonuç |
|---|---|
| Birim (`node --test tests/core.test.js`) | 17/17 |
| `tests/e2e/run.js` (ana akış, telefonlar, jokerler) | 65/65 |
| `tests/e2e/modes.js` (file://, PowerShell sunucusu, güvenlik) | 30/30 |
| `tests/e2e/correct.js` (Doğru Bilenler) | 39/39 |
| `tests/e2e/media.js` (yeni: sinematik) | 43/43 |

`correct.js` S5 bir kez FilmCraft dışa aktarımı aynı anda CPU'yu kullanırken zamanlama nedeniyle düştü; yüksüz tekrarda geçti (sinematik kodu bu akışa dokunmuyor).

`media.js` (autoplay bayrağı olmadan, sahnede gerçek "Sesi Etkinleştir" tıklamasıyla): açılış sahnede sesli 1920×1080/60 s oynar; admin sayfasında video yok; 6 zorla yeniden çizim/yayında video öğesi aynı kalır ve ilerler; merkezi ses kapat/aç videoyu susturur/açar; Atla ve Durdur sabit karşılamaya döner; sahne yenilenince eski açılış baştan çalmaz, ara döngüsü sürer; döngü sonda başa sarar; eksik dosyada sabit karşılama; hareketleri azaltmada açılış oynatılmaz; aktif soruda ara: süre ve cevap penceresi kapalı, kalan süre korunur, döngü sınırı/açılış bitişi yarışmayı başlatmaz, Devam sonrası süre yalnız admin "devam" ile başlar, puan/joker korunur; telefon sayfasında video yok; test sunucusunda Range→206; file:// ara ve açılış oynar; PowerShell sunucusu: açık uçlu Range → 206 ve 1 MB, dosya sonu/son-ek aralıkları, geçersiz aralık → 416, yol dışına çıkış reddi, video oynarken `/api/info` gecikmesiz, akarak oynatma ve 45. saniyeye ileri sarma; konsol hatası yok.

Vercel: `assets/` dağıtıma dahil (`.vercelignore` yalnız `tasarim/`, `tests/` vb. dışlar); push sonrası canlı adres ayrıca kontrol edildi (aşağıdaki son durum notuna bakın).

## 8. Kaynak ve lisans

`ses-gercek/KAYNAK-LISANS.md`, `lisanslar/`, `kaynaklar-indirme.json`, `girdiler/MUZIK-TESLIMI.md` korunur. Metal/kapı/zincir/savurma: BigSoundBank ve Freesound (stib) CC0 kaynaklarından foley. Müzikler: kullanıcının Suno oturumunda üretilen iki parça (MUZIK-TESLIMI.md). **Kükreme (`kukreme-kullanici`) kullanıcının sağladığı dosyadır; kaynağı/lisansı belgelenmemiştir, CC0 değildir** (KUKREME-KULLANICI-NOTU.md). Başlık vurgusu sentetik tasarım sesidir.
