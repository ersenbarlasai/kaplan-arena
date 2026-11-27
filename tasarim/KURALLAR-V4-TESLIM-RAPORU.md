# Kaplan Arenası yarışma kuralları (27.11.2026) — uygulama raporu

Kaynak: `tasarim/Kaplan_Arenasi_Yarisma_Kurallari.pdf` (Kaplan Arenası · Tahmin Yarışması · Oyun Kuralları, 2 sayfa). Bu kurallar önceki kararların (birikimli puan, jokerin yarışmada bir kez kullanılması, Çifte Puan'da −10, sıfır tabanı, 4 → 3 → 2 kontenjanının genel kuralı) yerine geçer. Yeni yarışmalar **format v4** ile açılır. Güncellemeden önce başlamış bir yarışma kendi kuralıyla sürer; sessizce dönüştürülmez.

## Kural → uygulama

| Kural (PDF) | Önceki durum | Şimdi |
|---|---|---|
| 01 · 6 takım: 4 takım Kadim Kale'ye, 2 takım finale, galip şampiyon | 6 takımda 6 → 3 → 2 | `quotasFor(6) = [4,2,1]`. Genel kural `max(3, ⌈2n/3⌉)`: 4 takım 4 → 3 → 2 ve 3 takım 3 → 3 → 2 olarak korunur. Bu genelleştirme uygulama kararıdır. |
| 01 · Her turda puanlar sıfırlanır, aktarılmaz | Puanlar birikiyordu | `rules.reset`: yeni turda katılımcıların puanı 0; önceki tur puanı `rounds[r].done.totals`'ta arşivde. Yükselme o turun puanıyla. Sahne ve telefon “tur puanı” gösterir. |
| 04 · Her tur 10 soru, 45 sn | Banka uzunluğu kadar soru | `rules.perRound = 10` (Ayarlar → “Tur başına soru sayısı”, varsayılan 10); süre ayarı varsayılanı 45 sn. İptal edilen soru sayılmaz; yerine sıradaki gelir. Ekranda “Soru k / 10”. |
| 04 · Normal doğru +10, yanlış 0; tahminde en yakın(lar) +10, diğerleri 0 | Aynı | Değişmedi. |
| 05 · Jokerler her yeni turda yenilenir; cevaptan önce seçilir | Yarışmada bir kez | `rules.jokersPerRound`: yeni turda `g.jokers` sıfırlanır (önceki tur arşivlenir). “Cevaptan sonra joker” reddi korunur. |
| 05 · Çifte Cevap: biri doğru +10, ikisi yanlış −10 | Aynı (ad: “Çift Cevap”) | Ad “Çifte Cevap” oldu; kural aynı. |
| 05 · Çift Puan: doğru +20, yanlış 0, puan kaybı yok | Yanlış −10 | `rules.x2Loss = false` → 0. Ad “Çift Puan” oldu. |
| 06 · Risk Jokeri (yalnız final): 5/10/15 riske atılır, doğruda kazanılır, yanlışta kaybedilir | Yoktu | Yeni joker `risk`. Yalnız `g.stage === 2`'de, finalde bir kez ve soru başına tek joker. Puan seçimi telefonda ve panelde (telefonsuz takım). Sunucu `ctl.risk` ve 5/10/15 değerlerini doğrular; iptalde iade edilir. Sıfır tabanı v4'te yok: kural kaybı tanımlıyor ve taban belirtmiyor (uygulama kararı). |
| 07 · Yükselmeyi/şampiyonluğu etkileyen eşitlikte yedek sorular, eşitlik bozulana kadar | Aynı | Değişmedi (karışık, tekrarsız yedek sorular). |
| 08 · Başka uygulama/sekme/ekrana geçmek yasak; sistem algılar; takım elenir | Yoktu | Telefon `visibilitychange`/`pagehide` olayını sunucuya `cmd op:'leave'` ile bildirir (sendBeacon; dönüşte aynı olay yeniden gönderilir ve tek kayıt olur). Panelde “Ekran değişikliği uyarısı” çıkar: takım, saat, sayı, soru açık mıydı. **Elemeyi admin “Kural İhlali: Takımı Ele” ile onaylar.** Elenen takım o sorudan ve sonraki turlardan puan almaz; sunucu cevap/jokerini reddeder; tur kazananı ve sıralamaya girmez. Telefon “Yarışmadan elendiniz (kural 08)” görür. |
| 03 · QR → özel kaptan giriş kodu → takım seçim ekranında kendi takım adı | Önce takım, sonra kod | Telefon önce kodu ister, sonra takım listesini gösterir. Kod seçilen takıma ait değilse sunucu reddeder: “Kod seçtiğiniz takıma ait değil”. |
| 02 · 3 öğrenci, 1 kaptan; cevabı kaptan gönderir | Aynı | Sistem kaptan telefonunu kabul eder (takım başına tek bağlı telefon). |

**Kural 08 için karar:** Sistem ekran değişikliğini kendiliğinden algılar ve bildirir. Takımı elemek için yöneticinin bir tık onayı gerekir. Bunun nedeni şu durumların da ekran değişikliği olarak görünmesi:

- kilit ekranının kendiliğinden kapanması,
- gelen arama,
- bildirim perdesinin çekilmesi.

Bu durumlarda takımı otomatik elemek haksız sonuç doğurabilir; son karar hakemindir.

## Değişen dosyalar

- **`app/core.js`:** `RULES_V4`, `LEGACY_RULES`, `rulesOf`, `quotasFor`, `makeFormat(perRound)`, `computeDelta` kural/risk desteği, `applyScore`/`cancelQuestion` taban kuralı, Risk (`RISK_STAKES`, `riskStake`, `checkJoker`), `newRound` sıfırlama ve joker yenileme, `roundOutcome`/`commitRound` ihlal desteği.
- **`app/admin.js`:** Tur içi soru sayacı (`roundPlayed`, `roundProg`, `isLastQ`), `riskOn`/`JK_KEYS`, denetim kaydında `risk`, ihlal dinleyicisi, modeller.
- **`app/admin-actions.js`:** `perRound`, Risk puanı, `dqAsk`/`dqYes`/`violDismiss`, `riskPick`, ayar kaydı.
- **`app/admin-ui.js`:** Kural kartı ve yol metni, Risk modalı, ihlal paneli, ayar alanı, puan önizlemesi `computeDelta` ile.
- **`app/player.js`:** Önce kod sonra takım, üç joker ve Risk puanı seçimi, sonuç kartları, kural 08 algılama ve uyarı, ihlal ekranı.
- **`app/shared.js`:** Joker adları ve açıklamaları, `PENALTY_TXT`.
- **`app/stageview.js`:** “Tur puanı”, Risk tanıtımı, ihlalli takım.
- **`app/style.css`**
- **`assets/joker/joker-risk.svg`:** Yeni simge.
- **Sunucular:** `api/ka.js` ve `kaplan-sunucu.ps1` (sürüm 10) — `risk`, `s`, `leave`, `viol/<tid>/v<t>`.
- **Testler:** `tests/core.test.js`, `tests/api.test.js`, `tests/e2e/{eleme,run,uckampus,correct,modes,lan-yetki}.js`.
- **Belgeler:** `OKU-BENI.txt`, `tasarim/TEKNIK-NOT.md`, `tasarim/kilavuz/kilavuz.html` ve `KAPLAN-ARENA-KILAVUZ.pdf` (bölüm 4, 6, 7, telefon katılımı), bu rapor, kaynak kurallar PDF'i.

## Testler (27.11.2026, bu bilgisayar)

| Komut | Sonuç |
|---|---|
| `node --test tests/*.test.js` | **41/41**. Yeni testlerin 8'i değişiklik öncesi koda (`7c994fe`) karşı başarısız oldu. Bunlar: 6 → 4, sıfırlama/joker yenileme, v4 puanları, Risk, ihlal, eski kural. |
| `node tests/e2e/lan-yetki.js` | **29/29** (LAN'da Risk yalnız finalde, puan doğrulaması, ekran bildirimi). |
| `… eleme.js` (6 takım, test için 3 soru/tur) | **45/45** |
| `… run.js` (11 takım: 11 → 8 → 2 → 1) | **68/68** |
| `… uckampus.js` (3 → 3 → 2) | **67/67** |
| `… correct.js` | **39/39** |
| `… modes.js` | **31/31** |
| `… media.js` | **53/53** |

`eleme.js` uçtan uca şunları doğruladı:

- 6 → 4 → 2 → 1 akışı
- Çift Puan yanlışta 0, Çifte Cevap ikisi de yanlışta −10
- Aynı turda ikinci Çift Puan'ın reddi
- 4. sırada B/E eşitliğinin yedek soruyla çözülmesi
- Yeni turda puanların 0 olması ve jokerlerin yenilenmesi
- Ekran değişikliğinin algılanıp admin onayıyla elenmesi; ihlalli takımın puan alamaması ve API'den reddi
- Finalde Risk 15 doğru (+15) ve Risk 10 yanlış (−10); ikinci soruda Risk “kullanıldı”
- Podyumda üçüncünün uydurulmaması (Kale'de iki takım elendiği için)
- Şampiyonluk müziği ve konfeti
- Eski kaydın dönüştürülmemesi

Ekran görüntüleri `tasarim/ekran-goruntuleri/eleme/` klasöründe:

- `admin-ekran-ihlali-1366`
- `telefon-kaptan-girisi-390`
- `telefon-yanlis-takim-390`
- `telefon-cift-puan-sifir-390`
- `telefon-kural-ihlali-360`
- `telefon-risk-kazandi-390`
- `telefon-final-jokerler-390`
- sahne tur sonu ve şampiyon görüntüleri

## Kalan sınırlar ve deneme adımları

- **Ekran algılama telefon tarayıcısının olaylarına dayanır.** iOS/Android'de uygulama değiştirme, sekme değiştirme ve ekran kilidi `visibilitychange` olayını tetikler. Ancak bölünmüş ekran ya da tarayıcıda kalınan bazı bildirim perdeleri algılanmayabilir. Gerçek telefonlarda (iPhone ve Android) prova edilmeli.
- **Risk Jokeri finalde puanı eksiye düşürebilir.** Kural taban belirtmediği için böyle uygulandı; isterseniz sıfır tabanı tek ayarla geri açılabilir.
- **Tur başına soru sayısı ayarı yeni yarışmada geçerli olur.** Her bölümde en az 10 soru bulunmalı; daha azsa tur mevcut soru sayısı kadar sürer.
- **Canlı Upstash'ta yazan yollar henüz denenmedi.** `ctl`, `join`, `cmd` ve `leave` ilk gerçek yarışmada doğrulanmalı.
- **Deneme:**
  1. Ayarlar'a 6 takım girin; Ana Menü'de “6 → 4 → 2 → şampiyon” kartını görün.
  2. Kaptanlar önce kodu girip kendi takımına dokunsun.
  3. Bir tur oynatın: Çift Puan'ı yanlış cevaplayın, puanın 0 kaldığını görün.
  4. Bir kaptan başka uygulamaya geçsin: panelde uyarının çıktığını görün.
  5. Kadim Kale'de puanların 0 olduğunu ve jokerlerin yenilendiğini kontrol edin.
  6. Finalde Risk Jokeri'ni 5, 10 ve 15 puanla deneyin.
