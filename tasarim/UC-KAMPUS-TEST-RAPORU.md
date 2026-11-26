# Üç Kampüs — Ortak Yarışma: uygulama ve test raporu

Tarih: 26 Kasım 2026 · Depo: `E:\PROJELER\KaplanArena` · Dal: `main`

## 1. Kök neden

Üç takımlı pilot üç ayrı kabul engeline ve iki gruplu turnuva akışına takılıyordu:

| Yer | Sorun |
|---|---|
| `app/admin-actions.js` `ACT.saveSettings()` | `classes.length < 4` ayarı reddediyordu ("En az 4 sınıf girin"). |
| `app/admin-ui.js` `controlBar()` | Aynı koşulla "Kurayı Çek" düğmesi kapanıyordu. |
| `app/shared.js` `validateImport()` | Takım listesi yalnız `>= 4` ise alınıyordu; üç takımlı yedekte liste **sessizce atlanıyor**, eski liste kalıyordu. |
| `ACT.drawGo/drawOk/startStage/advance`, `finishStage()` | Akış iki gruplu turnuvaydı: liste s1/s2'ye bölünüyor, her etap başında puan sıfırlanıyor, ara etaplarda ilk 2 seçiliyor, finalistler birleştiriliyordu. Yalnız 4'ü 3 yapmak üç kampüsü 2+1 gruba bölerdi. |
| `app/admin-ui.js`, `app/stageview.js`, `app/player.js` | "İlk 2 finale", "4 sınıf", "puanlar sıfırdan", iki grup ifadeleri sabitti. |

Değişiklik öncesi temel ölçüm: yeni E2E testi (`tests/e2e/uckampus.js`) eski kodda **0/18** kontrol geçti ve üç takımlı ayar reddedildiği için 11 sınıflık varsayılanla iki gruplu kura açıldı (çıktı: değişiklik öncesi çalıştırma, aşağıda §5). Yeni birim testleri eski kodda **5/5 başarısızdı** (17 eski test geçiyordu).

## 2. Mod ve puan kuralı

**Üç Kampüs — Ortak Yarışma** (`g.mode = 'shared'`), Ayarlar'da **tam 3** takım varken yeni yarışma başlatılınca kendiliğinden seçilir:

- Kura ve eleme yok. Üç takım doğrudan **ortak katılım** ekranına gelir ve Orman Geçidi → Kadim Kale → Kaplan Arenası boyunca aynı anda yarışır. Her etap kendi soru bankasını kullanır (s1 → s2 → final).
- Puanlar yarışma başında sıfırdır; **yeni soruda ve yeni etapta sıfırlanmaz**, üç etap boyunca birikir. Tek puan kaynağı `g.teams.all` (etaplar arasında kopya yok).
- İlk iki etap sonunda eleme ve eşitlik sorusu çalışmaz; üç takım toplam puanıyla devam eder.
- Son etap sonunda en yüksek toplam şampiyondur. Birincilik eşitse **yalnız eşit liderler** mevcut yedek tahmin sorusu mekanizmasıyla yarışır; normal toplamlar değişmez, sıralamada eşitliği kazanan önce gösterilir. Yine eşitlik/tüm adayların cevapsızlığı mevcut güvenli tekrar/admin akışıyla sürer. İkinci/üçüncü eşitliği soru üretmez.
- Jokerler (Çift Cevap, Çifte Puan) bütün yarışmada takım başına birer kez; etap geçişi hakları yenilemez. Ceza −10 (sıfır tabanı), doğru Çift Cevap +10, doğru Çifte Puan +20, aynı soruda tek joker — değişmedi.
- Mod ve katılımcılar (`g.mode`, `g.roster`) başlangıçta kayda sabitlenir. Açık yarışmada Ayarlar'daki liste değişikliği yarışmayı dönüştürmez (panelde belirtilir).
- Modu olmayan eski kayıtlar ve süren turnuvalar **turnuva** olarak açılır; ayardaki takım sayısına bakılmaz.
- **4 ve daha fazla** takımda mevcut iki gruplu turnuva (kura, ilk 2 finale, finalde puanlar sıfırdan) aynen korunur.
- Ayarlar, yarışma başlatma ve yedek içe aktarma aynı kontrolü kullanır (`KaplanCore.normRoster/rosterError`): satır/virgülle bölme, boşluk sadeleştirme, en az 3 benzersiz (Türkçe büyük/küçük harf duyarsız) boş olmayan ad. 2 ve altı reddedilir; hatalı yedek bütünüyle reddedilir (eski liste sessizce kalmaz). Yeni bir üst sınır eklenmedi.

Kural, yeni yarışmadan önce Ana Menü'deki **"Mod: Üç Kampüs — Ortak Yarışma"** kartında ve Ayarlar'da açıkça yazılıdır.

## 3. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `app/core.js` | `normRoster`, `rosterError`, `modeFor`, `isShared`, `teamsOf`, `cutoff`, `stageOutcome`; göçte `teams.all` armaları; ret metni "takımın/sınıfın". |
| `app/shared.js` | `validateImport` aynı liste doğrulaması (hatada istisna); `syncEmblems` `teams.all` ve `roster`. |
| `app/admin.js` | `curTeams()` = `teamsOf`; `shared()/gameMode()/nextRoster()/nextMode()/noun()/plKey()`; durum yüküne `mode`, `pk`, `next`; sahiplik yolu `players/all` (ortak); etap sonu `stageOutcome`; ortak etap sonu notu/rozetleri; eşitlik sonucu sıralaması; şampiyon `curTeams()`. |
| `app/admin-actions.js` | `newGameYes` listeyi doğrular, modu/rosteri sabitler, ortakta doğrudan katılım; `drawGo` roster ve ≥4 koruması; `startStage` yalnız turnuvada sıfırlar; `advance` ortak akış; `saveSettings` ortak doğrulama. |
| `app/admin-ui.js` | Mod kartı ve yol haritası; başlat düğmesi geçersiz listede kapalı; katılım/etap sonu bilgi satırları; "Kaplan Arenası'na Geç"; takım/sınıf adlandırması; Ayarlar açıklaması ve canlı mod satırı. |
| `app/stageview.js` | Ortak katılım başlığı/kuralı, katılımda toplam puan, "Toplam puanlar · eleme yok", takım adlandırması; puan satırında joker rozeti + değişim tek sütunda (jokerli satırda ızgara kayması giderildi). |
| `app/player.js` | Sahiplik yolu `state.pk`; takım seçimi metni; ortak etap sonu kartı (toplam, sıra, sıradaki durak); final eşitlik metinleri. |
| `app/style.css` | Mod kartı, katılım listesi (3 satır), puan sütunu. |
| `tests/core.test.js` | 5 yeni birim testi. |
| `tests/e2e/uckampus.js` | Yeni uçtan uca test (63 kontrol), sonuç `tests/e2e/son-rapor-uc-kampus.json`. |
| `.gitignore` | `uc-kampus/*.png` test çıktıları yok sayılır (WebP tutulur). |
| `OKU-BENI.txt`, `tasarim/TEKNIK-NOT.md` | Modlar, pilot adımları, veri şeması. Eski turnuva kuralları korunarak yazıldı. |

Sunucu/API (`api/ka.js`, `kaplan-sunucu.ps1`, `tests/e2e/server.js`) yol doğrulaması `players/all/<i>` yolunu zaten kabul ediyor; değişiklik gerekmedi. Sinematik dosyalarına dokunulmadı.

## 4. Test komutları

```
node --test tests/core.test.js
NODE_PATH=<puppeteer-core node_modules> node tests/e2e/uckampus.js
NODE_PATH=<puppeteer-core node_modules> node tests/e2e/run.js
NODE_PATH=<puppeteer-core node_modules> node tests/e2e/modes.js
NODE_PATH=<puppeteer-core node_modules> node tests/e2e/correct.js
NODE_PATH=<puppeteer-core node_modules> node tests/e2e/media.js
```

(Depoda `package.json`/npm betiği yoktur; puppeteer-core depo dışında kuruludur.)

## 5. Gerçek sonuçlar

### Değişiklikten önce (aynı testler, eski kod)

- `node --test tests/core.test.js`: 17 geçti, **5 yeni test başarısız** (işlevler yoktu).
- `tests/e2e/uckampus.js`: **0/18**, senaryo 18. adımda durdu. Kanıtlar:
  - Ayarlar üç takımı reddetti: `"En az 4 sınıf girin."`, liste 11 sınıf kaldı.
  - Üç takımlı yedek: `"Sorular içe aktarıldı."` mesajı verildi ama takım listesi **sessizce** eski 11 sınıf kaldı; iki takımlı ve tekrar adlı yedek de hata vermeden "içe aktarıldı" dedi.
  - "Yarışmayı Başlat" modsuz yarışma açtı; sahne "Kura · 11 sınıf iki etaba ayrılacak" gösterdi; telefonlarda takım seçimi hiç çıkmadı (kura beklendi).

### Değişiklikten sonra (26 Kasım 2026, yerel taklit sunucusu)

| Komut | Sonuç | Kayıt |
|---|---|---|
| `node --test tests/core.test.js` | **22/22** | — |
| `tests/e2e/uckampus.js` (yeni) | **63/63** | `tests/e2e/son-rapor-uc-kampus.json` |
| `tests/e2e/run.js` (11 sınıf turnuva, 2 telefon) | **65/65** | `tests/e2e/son-rapor.json` |
| `tests/e2e/modes.js` (file://, PowerShell LAN sunucusu) | **30/30** | `tests/e2e/son-rapor-kipler.json` |
| `tests/e2e/correct.js` (Doğru Bilenler) | **39/39** | `tests/e2e/son-rapor-dogru-bilenler.json` |
| `tests/e2e/media.js` (sinematik: açılış/ara, ses yalnız sahnede, ortak duraklatma, fallback, file://, PS, Range) | **43/43** | `tests/e2e/son-rapor-medya.json` |

`uckampus.js` neyi doğruluyor (istenen 8 madde):

1. Ayarlarda üç takım (satır/virgül/boşluk temizliğiyle) kaydı; iki takım, boş satırlarla iki takım ve büyük/küçük harf farklı tekrar ad reddi (liste değişmez); dışa aktarılan yedekte üç takım; üç takımlı yedeğin içe aktarılması; iki takımlı/tekrar adlı yedeğin hata vermesi ve eski liste ile soruların değişmemesi.
2. Gerçek admin akışıyla başlatma (`newGameYes`): `mode: 'shared'`, `teams.all` üç takım, `s1/s2` boş, kura yok, doğrudan ortak katılım. Üç ayrı tarayıcı bağlamında üç telefon aynı kodla ayrı takım seçti; telefon durumunda `teams.length === 3`, `mode: 'shared'`. Üç telefon aynı soruyu gördü ve cevap gönderdi.
3. Üç soru bankası boyunca: 1. etap 20/10/0 → 2. etap 20/20/20 → final 30/30/20; etap ve final başında sıfırlanma yok.
4. 1. etapta kullanılan Çifte Puan 2. etapta telefonda "KULLANILDI" ve doğrudan istek "daha önce kullanıldı" ile reddedildi. Geri Al tam bir kez geri aldı, tekrar puanlama çift uygulanmadı, soru iptali +10'u bir kez geri aldı, ikinci iptal etkisiz.
5. 2. etap sonunda üçlü eşitlikte eşitlik sorusu çıkmadı; finalde 30/30/20'de yalnız A ve B eşitlik sorusuna girdi, C "yalnız … cevaplıyor" gördü; A kazandı, toplamlar 30/30/20 kaldı, sonuç tablosunda A önce; şampiyon ekranı ve telefonlar ("ŞAMPİYONSUNUZ" / "Şampiyon: Kampüs A"). Tek liderde doğrudan şampiyon ve 2./3. eşitliğinin soru üretmemesi birim testinde.
6. Admin sayfası etap sonunda yenilendi: mod, katılımcılar, puanlar, aşama korundu; sahne yeniden bağlandı. 2. etapta telefonlar yeniden seçim yapmadan bağlı kaldı (`players/all`). Telefon B soru açıkken yenilendi; aynı takım ve gönderilmiş cevap korundu. Açık yarışmada Ayarlar'a 5 sınıf yazıldı: mod ve katılımcılar değişmedi, ayarlar ekranı bunu belirtti. Yanlış cihazdan (sahip olmayan `dev`) gönderilen ve daha geç zamanlı cevap sayılmadı.
7. Modsuz eski kayıt (ayarda 3 takım varken) turnuva olarak açıldı (`curTeams` = s1) ve etap sonu ilk 2 mantığıyla hesaplandı; 4 takımla yeni yarışma turnuva modunda kura ile açıldı, kura 2+2 böldü, sahnede "İlk 2 sınıf finale çıkar" korundu. `run.js` 11 sınıflı turnuvanın tamamını (final ve puan sıfırlama dahil) ayrıca geçti.
8. Manuel geçiş (her adım admin düğmesiyle), ortak süre (admin ve üç telefon kalan süre farkı < 1,5 sn; üç telefon aynı sunucu bitiş anını aldı), Doğru Bilenler gösterimi, file:// telefonsuz üç takımlı ortak yarışma (admin puan girdi). Sinematik testleri (`media.js`) değişmeden geçti.

Not: `correct.js` önceki teslimde bir kez FilmCraft dışa aktarımı yükü altında zamanlama nedeniyle düşmüştü; bu çalıştırmalarda yük yoktu ve iki koşuda da geçti.

## 6. Ekran görüntüleri

`tasarim/ekran-goruntuleri/uc-kampus/` (E2E testi PNG üretir; depoda WebP kopyaları tutulur, PNG'ler `.gitignore`'da):

- Admin 1366: `admin-ayarlar-uc-takim-1366.webp`, `admin-menu-uc-kampus-1366.webp`, `admin-puan-1366.webp`, `admin-sampiyon-1366.webp`
- Sahne 1920×1080: `sahne-katilim-1920.webp`, `sahne-dogru-bilenler-1920.webp`, `sahne-puan-tablosu-1920.webp`, `sahne-etap1-sonu-1920.webp`, `sahne-etap2-katilim-1920.webp`, `sahne-final-esitlik-1920.webp`, `sahne-sampiyon-1920.webp`
- Telefon (360/390/412 genişlik): `telefon-takim-secimi-360.webp`, `telefon-takim-secimi-390.webp`, `telefon-soru-360.webp`, `telefon-etap-sonu-412.webp`, `telefon-sampiyon-390.webp`

Görsel denetimde fark edilen ve düzeltilen: puan tablosunda jokerli satırda rozet + puan değişimi ayrı ızgara hücrelerine düştüğü için satır kayıyor, puan alt satıra iniyordu (turnuvada da vardı). İkisi tek sütunda toplandı; yeni görüntüde üç satır hizalı.

## 7. Bilinen sınırlar

- Testler yerel taklit sunucusuyla (`tests/e2e/server.js`, bellek kipi `/api/ka`) koşuldu. **Gerçek üç kampüs arasında internet üzerinden fiziksel deneme yapılmadı**; otomatik testler bunun yerine geçmez. Pilot öncesi üç kampüste birer telefonla kısa bir prova önerilir.
- Ortak süre, sunucu esaslı bitiş anıyla (`deadline`) yayımlanır; telefonlar durumu yoklamayla aldığından geçici gecikme (yüzlerce ms) olabilir. Kabul ölçütü gönderim zamanıdır.
- Mod yalnız takım sayısından seçilir: tam 3 → ortak, 4+ → turnuva. 4+ takımla ortak yarışma seçeneği bu görevde istenmediği için eklenmedi.
- Gerçek kampüs adları verilmediği için kalıcı ad eklenmedi; testlerde "Kampüs A/B/C" kullanıldı. Varsayılan liste (11 sınıf) değişmedi.

## 8. Üç kampüs pilotunu başlatma

1. Yönetim panelini açın (internet: `https://kaplan-arena.vercel.app`). Uzak kampüsler aynı adresten katıldığı için yerel ağ (LAN) adresi gerekmez.
2. **Ayarlar** → "Takımlar / sınıflar" alanına üç kampüs adını her satıra bir ad olarak yazın → **Ayarları Kaydet**. Alttaki satır "Üç Kampüs — Ortak Yarışma" demelidir.
3. **Soru Yönetimi**'nde 1. Etap, 2. Etap, Final ve Eşitlik (Yedek) sorularını kontrol edin.
4. **Ana Menü**'de "Mod: Üç Kampüs — Ortak Yarışma" kartını ve puan kuralını okuyun → **Yarışmayı Başlat**.
5. **Sahne Ekranını Aç** → projeksiyona taşıyın → sesi etkinleştirin. İsterseniz karşılamada açılış filmi.
6. Ortak katılım ekranındaki QR/kodu üç kampüse iletin; her kaptan kendi takımını seçer (panelde "3/3 telefon bağlı").
7. **Etabı Başlat** → her soru: Soruyu Göster → Cevabı Açıkla → Puanları Göster → Sonraki Soru.
8. Etap sonu: üç takım toplam puanıyla devam eder → "Kadim Kale'ye Geç" / "Kaplan Arenası'na Geç". Final sonunda birincilik eşitse "Eşitlik Sorusuna Geç", değilse "Şampiyonu Göster".
