# Rastgele sorular, gerçek eleme ve tur sonu kutlamaları — teslim raporu

Görev: `tasarim/CLAUDE-ELEME-SORU-VE-KUTLAMA-PROMPTU.md` · Görsel/ses planı: `tasarim/TUR-SONU-GOSTERI-PLANI.md` · Tarih: 26.11.2026

## 1. Doğrulanan kök nedenler (güncel kaynakta)

| Sorun | Kaynakta doğrulanan neden |
|---|---|
| 4 takımda 4 finalist | `drawGo()` listeyi s1/s2 gruplarına bölüyordu; `stageOutcome()` final dışında `cutoff(…, 2)` çağırıyordu. İkişer takımlı iki grupta ikisi de yükseldiği için dört takımın hepsi finale gidiyordu (`advance()` iki grubun kazananlarını birleştiriyordu). Görünüm değil, akış hatası. |
| 3 takımda hiç eleme yok | `shared` modunda `stageOutcome()` ara etaplarda `all:true` döndürüyordu. |
| Sabit sıralı, tekrar edebilen sorular | `currentQ()/currentQk()` ve `cancelYes()` soruyu doğrudan `S.questions[key][g.qIndex]` ile alıyordu; `ACT.next()` sıradaki indekse geçiyordu. `shuffle()` yalnız kurada kullanılıyordu; yarışma çapında tüketim kaydı yoktu; aynı içerik başka bankada başka id ile tekrar sorulabiliyordu. |
| Elenen takım geri katılabilir | Telefon takımı isim/dizinle buluyordu, `players/<etap>/<i>` sahipliğini istemci yazıyordu. `api/ka.js` genel `fn:set` yalnız biçim/boyut kontrolü yapıyordu: anahtarsız herkes `answers/…`, `jreq/…`, `state` yazabiliyordu. LAN `kaplan-sunucu.ps1` `/api/set` aynı şekilde açıktı. |
| Tur sonu gösterisi yok / konfeti tekrarı | `stageEnd` düz tablo; `champion` konfetisi `stage.js` her DOM yeniden kurulumunda (`data-run` yeni canvas'ta yok) yeniden başlayabiliyordu; şampiyonluk “müziği” yalnız kısa sentez dizisiydi. |

Regresyon kanıtı: yeni birim/API testleri değişiklik öncesi koda (HEAD `ed1a4ca`'daki `app/core.js` ve `api/ka.js`) karşı çalıştırıldı: **12 yeni test başarısız, 23 eski test geçti** (kontenjan, eleme akışı, plan/tekrarsızlık, kaptan katılımı, komut doğrulama, cihaz devri hepsi eski kodda yoktu/açıktı).

## 2. Kesin yeni kurallar (yeni yarışmalar, format v3 `g.mode = 'elim'`)

- Kura ve iki grup yok. Her turda o turun bütün aktif takımları aynı soruları aynı anda yanıtlar. Arena sırası: Orman Geçidi → Kadim Kale → Kaplan Arenası.
- Kontenjan (`quotasFor(n)`, başlangıçta `g.format.quotas`'a sabitlenir ve Ana Menü kural kartında yarışmadan önce gösterilir): **3 → 3 → 2 → 1**, **4 → 3 → 2 → 1**, n > 4 → `max(3, ⌈n/2⌉)` → 2 → 1 (uygulama kararı; sahte/bay-pass finalist üretilmez).
- Puanlar birikir (tur başında sıfırlanmaz). Yükselme ve şampiyonluk **toplam** puanla; **tur kazananı** tur başı toplam snapshot'ına (`rounds[r].start`) göre **net kazançla** ayrıca açıklanır; eşitse “Turun ortak kazananları”. Tur kazancı kümülatif eleme kuralını değiştirmez.
- Yükselme sınırında ve final birinciliğinde eşitlik varsa yalnız sınırdaki eşit takımlara yedek tahmin sorusu; eşitlik çözülmeden elenen/şampiyon ilan edilmez (“Tur Sonucunu Açıkla” düğmesi de doğrudan komut da reddeder).
- Jokerler (Çift Cevap, Çifte Puan) bütün yarışmada birer kez, kararlı `teamId` ile; tur geçişi, yeniden giriş, sıralama değişimi yenilemez. +10 / +20, jokerli yanlış/cevapsız −10, sıfır tabanı aynı.
- Tur sonucu idempotent: `revealRound` → `commitRound` (elenenler kalıcı `status:'out'`, `elimLog`), çift tıklama ikinci eleme yapmaz; `advance` yalnız `done.up` ile yeni tur açar, çift tıklama ikinci geçiş yapmaz. Kesinleşmeden sonra geri alma geçmişi temizlenir (eleme geri alınamaz).
- Podyum: şampiyon + diğer finalist; üçüncü yalnız Kadim Kale'de **tek** takım elendiyse kesinleşmiş eleme geçmişinden (“Kadim Kale’de tamamladı”). Üçüncülük maçı varmış gibi sonuç üretilmez.
- Eski devam eden kayıtlar (`shared`, `tournament`, modsuz) sessizce dönüştürülmez; puanları korunur, eski kuralla sürer; Ana Menü “Eski kurallarla süren yarışma” kartıyla açıkça bildirir. Şema 3; yükseltmeden önce `kaplan-arena-v1-yedek-sema<N>` kopyası alınır.

## 3. Soru planı, kimlik ve veri göçü

- Yarışma başında `buildPlan(S.questions, rnd)`: her banka (s1, s2, final, tie) kopyalanır, **Fisher–Yates** ile karıştırılır (tarayıcıda `crypto.getRandomValues`; testte `window.KA_RNG` enjekte edilir, rastgele `sort` yok), sıra `g.plan`'a yazılır; render/yenileme yeniden karıştırmaz.
- İçerik kimliği `canonKey`: NFKD + Türkçe küçük harf + aksan/noktalama/boşluk normalizasyonu + (şıklı soruda) sıralı şıklar → FNV özeti. Bankalar arası ve banka içi aynı içerik (farklı id/biçim) plandan elenir (`g.planDups`).
- Tüketim: `g.asked[cid]` yalnız **“Soruyu Göster”** anında (gösterim ve tüketim tek geçiş). Hazırlıkta görünen soru tüketilmez. İptal edilen (gösterilmiş) soru puan/joker iadesine rağmen havuza dönmez; `undo` `asked`'i birleştirir ve planı geri almaz; sorulmuş soru yeniden gösterilemez.
- Tek çözücü: `qList/qAt/curQ/currentQk` (soru, iptal, puan, eşitlik, telefon ve sahne modelleri). Aktif soru içeriği plandan gelir; Soru Yönetimi'nde düzenleme/silme açık yarışmayı etkilemez. Admin istediğinde “Yeni Soruları Ekle” (`planAppend`) yalnız yeni, sorulmamış, tekrarsız içeriği sıranın sonuna ekler.
- Eşitlik havuzu da karışık ve tüketimli (`nextUnasked(g,'tie')`); tükenirse eski soru dönmez, örnek soru eklenmez, rastgele finalist seçilmez: panel uyarır, admin yeni eşitlik sorusu ekleyip “Eklenen Soruyu Kullan” der ya da sözlü yeni soru sorup cevabı girer.
- Soru sayısı/ilerleme planın (tekrarsız) uzunluğunu gösterir; sorusu kalmamış tur başlamaz; yeni yarışmada `asked` boş başlar.

## 4. Katılım engelinin uygulandığı katmanlar

1. **Sunucu (Vercel, `api/ka.js`)**: `fn:'ctl'` admin denetim kaydı (ilk çağrıda admin anahtarı SHA-256 ile bağlanır; sonra yalnız aynı anahtar): takım kaptan kodları + aktiflik, açık soru anahtarı, kabul, joker izni, aday listesi. `fn:'join'`: takıma özel kaptan kodu ya da önceki oturum; elenen 403, bağlı takıma başka cihaz 409, cihaz başka takımda 409, 10 hatalı kod 429 (admin sıfırlar); kaptan bağı Redis Lua CAS ile atomik. `fn:'cmd'`: oturum → teamId, aktiflik, soru anahtarı eşleşmesi, kabul açık, aday, gönderim zamanı ±8/3 sn; yolu (`answers/<qk>/<tid>/<sid>`) ve cihazı sunucu yazar. Denetim kaydı olan yarışmada genel `fn:set` yalnız admin anahtarıyla (state/eleme/puan dahil). Özel kayıtlar `ka:c:<pin>`, `ka:b:<pin>` GET yanıtına girmez.
2. **LAN (`kaplan-sunucu.ps1`, sürüm 9)**: aynı kurallar `/api/ctl`, `/api/join`, `/api/cmd`; `/api/set` denetim kaydı varsa `X-Ka-Key` ister; özel kayıtlar `/api/db`'ye girmez. Tek iş parçacıklı olduğu için talep sırası atomiktir.
3. **Admin kabul katmanı**: `liveAccepted/processJokers` yalnız bu turun aktif kadrosunu (eşitlikte yalnız adayları), kararlı `teamId` yolunu, yetkili cihazı ve cevap penceresini kabul eder; sunucuya ulaşmış geçersiz kayıt puana/jokere dönüşmez. Telefonsuz kullanımda admin listeleri yalnız aktif kadroyu içerir; elenenler “Elenenler (arşiv)” satırında.
4. **Telefon**: takım seçimi + kaptan kodu; elenen telefon “Bu turda elendiniz; yarışmaya devam edemezsiniz” görür (yenileme/kodu yeniden girme değiştirmez); listede yalnız aktif takımlar.
- Cihaz devri: admin panelinde aktif takım için “Telefonu Sıfırla” (yalnız admin anahtarıyla, elenen takım için yok). Mevcut yarışma kilidi ve sahnenin salt gösterim rolü korunur.
- Kabul penceresi açıklamadan sonra da sunucuda açık kalır (yalnız aynı soru anahtarı için), çünkü süre içinde gönderilip ağda gecikmiş cevaplar mevcut “geç ulaşan cevap” özelliğiyle sayılmalı; admin yine gönderim zamanını cevap penceresiyle karşılaştırır.

## 5. Tur sonu gösterisi, şampiyonluk müziği ve konfeti

- “Tur Sonucunu Açıkla” → `g.show = { id, kind, at, dur:7000 }` kalıcı olay. Sahne: başlık (0–1 sn) → `isik-huzmeleri.svg`/`altin-toz.svg` ışık ve kazanan arması halka vurgusu (1–2,5 sn) → “TURUN KAZANANI / ORTAK KAZANANLARI”, ad, bu tur kazancı (2,5–4,5 sn) → yükselen/elenen satırları “bu tur” ve “toplam” ayrı etiketli (4,5–7 sn) → not (“Üç takım da Kadim Kale’ye ilerliyor” / “… yükseldi · … yolculuğunu burada tamamladı”). Ad/puan/arma uygulama katmanında dinamik; yeni raster yok. Kalabalıkta iki sütunlu sıkı tablo.
- Zaman ekseni: model geçen süreyi taşır, HTML taşımaz; `ShowFX` CSS animasyonlarını `--t0 = −geçen` ile kaydırır → yeniden çizim/sahne yenileme baştan başlatmaz, kalan zamandan katılır ya da son görünümü gösterir. Ses olayı (`roundEnd`) yalnız yeni olay kimliğinde bir kez çalar. Gösteri soru açmaz, saati çalıştırmaz, tur geçirmez; Atla son sonucu gösterir; “Gösteriyi Tekrar Oynat” yeni olay üretir, puan/eleme değişmez. Azaltılmış harekette sakin son görünüm; admin önizlemesi ve telefonlar sessiz.
- Şampiyonluk müziği: `assets/sinematik/sampiyon-muzik.m4a` — kaynak onaylı Suno açılış bestesi `tasarim/sinematik/girdiler/acilis-muzik.wav` (SHA-256 `f464171b…f8a2`, değiştirilmedi), **21,0–57,4 sn** kesiti (ebur128 kısa vadeli ölçümde parçanın en yüksek ve sürekli bölümü 45–57 sn; kesit oradan geriye 36,4 sn), 2 sn giriş / 3 sn çıkış fade, loudnorm −18 LUFS. Araç: ffmpeg (FilmCraft yerine eşdeğer kontrollü kesim; FilmCraft projesi değiştirilmedi). Teknik kontrol: AAC 48 kHz stereo, 36,40 sn, 741 586 bayt, tam decode hatasız, entegre −17,8 LUFS, gerçek tepe −6,8 dBFS, RMS −20,6 dB. SHA-256 `4e52e896…3537`.
- Çalma: tek kalıcı `<audio id="champ">`, yalnız etkin ses sahnesi + merkezi ses açık + seviye > 0; seviye `volume × 0,55`, ~1,5 sn giriş rampası, ekrandan çıkınca yumuşak çıkış ve durma; karşılama/ara/video müziğiyle aynı anda çalmaz (yalnız şampiyonluk ekranı). Autoplay mevcut “Sesi Etkinleştir” tıklamasıyla çözülür. Kısa `champion` sentez dizisi yalnız vurgu olarak kalır.
- Konfeti: tek kalıcı canvas (yeniden çizimde yeni yuvaya taşınır, olay başına bir kez başlar), ad açılırken (~1,1 sn) iki yandan patlama + ~8 sn hafif düşüş; ad katmanının altında, flaş yok; azaltılmış harekette çizilmez; ekran bitince RAF/canvas temizlenir.
- Statik sunum: `.m4a` (audio/mp4) Vercel varsayılanı, LAN `staticRe`/MIME ve `tests/e2e/server.js` eklendi; önbellek sürümü `CHAMP_V`.

## 6. Değişen dosyalar

`app/core.js` (format v3, tur/eleme, plan/kanonik kimlik, şema 3), `app/admin.js` (çözücü, denetim kaydı senkronu, tur sonu/şampiyon modelleri), `app/admin-actions.js` (yeni yarışma, tur başlat/bitir/açıkla/geç, gösteri, plan ekleme, cihaz sıfırlama), `app/admin-ui.js` (kural kartı, kontenjan, kaptan kodları, kontroller), `app/player.js` (kaptan kodu, sunucu komutları, elenme), `app/net.js` (`netCall`, admin anahtarı), `app/shared.js` (STAGES yönelme ekleri, CHAMP, güvenli rastgelelik, şema yedeği), `app/stageview.js` (tur sonu gösterisi, şampiyon, ShowFX, sıkı tablo), `app/stage.js` (StageChamp), `app/audio.js` (`roundEnd`), `app/style.css`, `api/ka.js`, `kaplan-sunucu.ps1`, `assets/sinematik/{sampiyon-muzik.m4a, isik-huzmeleri.svg, altin-toz.svg}`; testler `tests/core.test.js`, yeni `tests/api.test.js`, yeni `tests/e2e/eleme.js`, yeni `tests/e2e/lan-yetki.js`, güncellenen `run.js`, `modes.js`, `correct.js`, `media.js`, `uckampus.js`, `server.js`; belgeler `OKU-BENI.txt`, `tasarim/TEKNIK-NOT.md`, `tasarim/kilavuz/kilavuz.html` + `KAPLAN-ARENA-KILAVUZ.pdf` (bölüm 4, telefon katılımı, ayarlar), `.gitignore` (eleme PNG'leri).

## 7. Test komutları ve gerçek sonuçlar (26.11.2026, bu bilgisayar)

| Komut | Sonuç |
|---|---|
| `node --test tests/*.test.js` | **35/35** (çekirdek 30, API yetki 5) |
| `node tests/e2e/lan-yetki.js` (PowerShell sunucusu) | **24/24** |
| `NODE_PATH=<puppeteer-core> node tests/e2e/eleme.js` | **71/71** — 4 takım 4 → 3 → 2 → 1, ortak tur kazananı, sınır ve final eşitliği, tekrarsız eşitlik soruları, elenen takımın UI/yeni cihaz/eski oturum/başka takım/doğrudan API/genel set denemeleri, gösteri tek kez/yenileme/tekrar/Atla, şampiyon müziği/konfeti/mute/seviye/azaltılmış hareket/çıkış, eski kayıt |
| `… run.js` | **68/68** (11 takım 11 → 6 → 2 → 1; zamanlama, jokerler, iptal, sahne kaybı, geç cevap, göç, 13 takım taşma). Bir ara koşuda “Soru 3” tek kontrolü bir kez başarısız oldu (telefon C'nin tahmini kabul edilmeden açıklama; zamanlama), aynı kodla tekrar koşuda geçti; yeniden üretilemedi. |
| `… modes.js` | **31/31** (file:// telefonsuz, LAN tarayıcı + kaptan kodu) |
| `… correct.js` | **39/39** |
| `… media.js` | **53/53** |
| `… uckampus.js` | **67/67** (3 → 3 → 2 → 1, elemesiz turda tur kazananı, üçlü sınır eşitliği, elenen C, podyum) |

Raporlar: `tests/e2e/son-rapor-*.json`. Canlı Redis/Vercel testlerde kullanılmadı (bellek kipi); Upstash Lua (`BIND_LUA`, `CTL_GET_LUA`) canlıda henüz çalıştırılmadı.

## 8. Ekran görüntüleri

`tasarim/ekran-goruntuleri/eleme/` (WebP; PNG kopyaları yerelde): admin 1366×768 (`admin-menu-eleme`, `admin-katilim-kaptan-kodlari`, `admin-tur-sonu`, `admin-sampiyon`), sahne 1920×1080 (`sahne-tur-sonu-gosteri-orta`, `sahne-tur-sonu-son-tablo`, `sahne-sampiyon-konfeti`, `sahne-sampiyon-sakin`), dar telefon 360/390 (`telefon-kaptan-kodu-yanlis`, `telefon-tur-sonucu`, `telefon-elendiniz`, `telefon-sampiyon`, `telefon-elenen-sampiyon-ekrani`). Görsel inceleme yapıldı (tur sonu, şampiyon, elendiniz, admin tur sonu, 11 takım sıkı puan tablosu).

## 9. Kalan sınırlar

- **Dinleme yapılmadı.** Şampiyonluk müziğinin kesiti ölçümle seçildi; müzikal uygunluk, giriş/çıkış ve döngü ek yeri kulakla onaylanmadı. Tur sonu `roundEnd` sesi sentezdir.
- Canlı Vercel + Upstash üzerinde yeni `ctl/join/cmd` yolları push sonrası otomatik dağıtımla gelir; canlı uçta ayrıca denenmedi.
- Güncellemeden önce başlamış eski kayıtlarda denetim kaydı yoktur; o yarışmalar eski (açık) yazım davranışıyla sürer. Yeni güvenlik yeni yarışmada etkindir.
- Kaptan kodu 4 hanedir; hatalı deneme 10'da kilitlenir (admin “Telefonu Sıfırla” ile açar). Kod, kaptanlara sözlü/kâğıtla verilmelidir.
- Sunucu gönderim zamanını ±8/3 sn ile sınırlar; telefon saati değil sunucu saati kullanıldığı için normalde sorun olmaz.
- Kılavuz PDF yeniden üretildi (25 sayfa, kırık görsel yok); sayfa düzeni bu sürümde sayfa sayfa yeniden incelenmedi.

## 10. Kullanıcı deneme adımları

1. Ayarlar'a 4 takım yazın → Ana Menü kartında “4 → 3 → 2 → şampiyon” ve kontenjanları görün → Yarışmayı Başlat.
2. “Kaptan kodları” kutusundaki kodları dört telefona ayrı ayrı verin; telefonlar yarışma koduyla girip takımını seçer ve kodu girer. Yanlış kodu ve başka takım seçmeyi de deneyin.
3. Orman'da birkaç soru oynatın (sıralar karışık; aynı soru tekrar gelmez). Turu Bitir → Tur Sonucunu Açıkla: sahnede ~7 sn gösteri, sonra tabloda bekleme. Sahne penceresini yenileyin: gösteri baştan başlamamalı.
4. Elenen takım telefonunda “Bu turda elendiniz” görün; sayfayı yenileyin, kodu yeniden girin, başka takım seçin: hiçbiri katılım vermemeli.
5. Sonraki Tura Geç → Kale → final; bir eşitlik oluşturup eşitlik sorusunu deneyin. Şampiyonu Açıkla: konfeti ve müzik **salonda kulakla** kontrol edilsin (ses seviyesi, giriş/çıkış, döngü).
6. Üç kampüs için aynı adımları 3 takımla (3 → 3 → 2 → şampiyon) tekrarlayın; Orman'da kimse elenmemeli ama tur kazananı açıklanmalı.
