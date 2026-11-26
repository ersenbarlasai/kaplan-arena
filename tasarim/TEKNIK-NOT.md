# Kaplan Arena — uygulama teknik notu

Bu not, `CLAUDE-UYGULAMA-PROMPTU.md` uygulanmadan önce durum, komut ve pencere iletişimi şemasını sabitler.
Kaynak: güncel `kaplan-arena.html` (joker eklentili, commit edilmemiş kullanıcı değişiklikleri başlangıç kabul edildi).

## Dosya düzeni

| Yol | Görev |
|---|---|
| `kaplan-arena.html` | Kabuk: meta, logo verisi (LOGO), QR kütüphanesi, modül yükleme. Çift tıklamayla açılır. |
| `app/core.js` | DOM'suz saf mantık (UMD): puan/ceza, saat ve pencereler, cevap/joker doğrulama, iptal, arma, göç. Node testleri bunu `require` eder. |
| `app/link.js` | Admin ↔ sahne pencere iletişimi. |
| `app/audio.js` | Web Audio ile çevrimdışı sahne sesleri. |
| `app/main.js` | Admin, sahne ve telefon arayüzleri, ağ ve kalıcı veri. |
| `app/style.css` | Tüm görünüm. |
| `assets/fonts/` | Yerel fontlar (woff2 + `fonts.css` gömülü kopya) ve OFL lisansları. |
| `assets/img/`, `assets/arma/`, `assets/joker/` | Dağıtım varlıkları (kaynaklar `tasarim/varliklar` altında korunur). |
| `tests/` | `node --test` birim testleri; `tests/e2e/` tarayıcı otomasyonu. |

`<script src>` ve `<link href>` göreli yollar file://, yerel PowerShell sunucusu ve Vercel'de aynıdır. Fontlar `fonts.css` içinde data: URI olarak da bulunur; böylece file:// altında font yükleme kısıtı oluşmaz.

## Başlatma kipleri

URL `?sahne` → `stageInit()` (ağ, kilit ve host başlatılmaz). `?pin`/`?katil` veya yerel ağ IP'si → `playerInit()`. Diğer → `hostInit()`. Ayrım `hostInit`'ten önce yapılır; sahne tek-yarışma kilidi almaz.

## Kalıcı durum (localStorage `kaplan-arena-v1`, `schema: 2`)

Eski kayıtlar yüklenirken `KaplanCore.migrate()` uygulanır; sorular, sınıflar, ayarlar ve devam eden yarışma korunur, örnek verilerle ezilmez.

```
S.schema = 2
S.settings += { volume: 0..100, reduceMotion: bool, emblems: {sınıfAdı: n} }
S.game += {
  mode: 'shared' | 'tournament' | undefined    // yeni yarışmada sabitlenir; undefined (eski kayıt) = turnuva
  roster: [ad, ...]                            // başlangıçtaki katılımcı listesi (ayar değişikliği etkilemez)
  teams.all: [{ name, score }]                 // yalnız 'shared': üç etabın tek puan kaynağı (kopya yok)
  phase: 'ready' | 'open' | 'locked' | 'revealed' | 'cancelled'   // view === 'question' iken
  clock: { total, left, runAt, reasons: [] }   // ms; runAt = çalışmaya başladığı sunucu zamanı (null = duruyor)
  win:   [[başla, bitir|null], ...]           // bu soruda cevap kabul pencereleri (sunucu zamanı)
  jokers: { sınıfAdı: { double: qk|null, x2: qk|null } }   // tüm yarışma, etapta yenilenmez
  jdone: { qk: { i: istekZamanı } }            // işlenmiş joker istekleri (tekrar işlemez)
  jrej:  { i: { t, why } }                     // bu sorudaki ret nedenleri (telefona)
  intro: { id, pauseAt, until, items: [{ i, name, j }] } | null
  scored: { qk: { delta: {i: gerçekDeğişim}, jk: {i: j}, winners, detail } }   // tek uygulama kaydı
  cancelled: { qk: { reverted: {i: d}, refund: [[ad, j]] } }
  frozen: { qk: { i: { v, t } } }              // açıklamada dondurulan kabul edilmiş cevaplar
  evId, events: [{ id, kind, at, data }]       // sahne ses/tanıtım olayları (son 20)
  brk: bool                                    // karşılamaya dönüldü (ara)
}
```

Duraklatma nedenleri: `admin` (elle/yeniden yükleme/sahne kaybı sonrası), `joker` (tanıtım), `stage` (sahne kaybı), `break` (karşılama). Saat yalnız `phase === 'open'`, `reasons` boş ve `left > 0` iken çalışır. Bir neden kalkınca diğerleri sürüyorsa saat başlamaz. Sahne kaybında `stage` + `admin` eklenir: sahne dönünce yalnız `stage` kalkar, devamı admin verir. Karşılamaya dönüşte `break` + `admin` eklenir.

## Aşamalar (tam manuel)

`ready` (Hazır mısınız; soru gönderilmez) → `Soruyu Göster` → `open` (saat çalışır) → süre sıfır veya onaylı `Cevabı Açıkla` → `locked` → `revealed` (cevap görünür, puan görünmez) → `Puanları Göster` → `view: 'scoreboard'` (puan bir kez uygulanır, `scored[qk]`) → `Sonraki Soru` → yeni `ready`. Otomatik açıklama, otomatik puanlama, otomatik sonraki soru ve klavye kısayolları kaldırıldı. Erken açıklama onayla `locked`'dan geçmeden doğrudan `revealed` olur; ikisi aynı kilitli cevap durumunu kullanır.

## Telefon komutları (KV, mevcut `/api/ka` ve yerel sunucu)

- Cevap: `games/<pin>/answers/<qk>/<i>/<sid>` = `{ v, t, dev }` — her gönderim ayrı anahtar; sonuncusu silinmez. `sid = s<t><rastgele>`.
- Joker: `games/<pin>/jreq/<qk>/<i>` = `{ j, t, dev }`.
- Sahiplik: `games/<pin>/players/<pk>/<i>` = `{ dev }`; `pk` turnuvada etap anahtarı (mevcut model), ortak yarışmada `all` (cihaz-takım eşleşmesi etap geçişinde korunur). Telefon `pk`'yi durumdan (`state.pk`) okur. Admin yalnız güncel sahibin komutunu sayar.

Admin (yetkili taraf) kabul kuralları:
- Cevap: `t` bu sorunun açık penceresi içinde (±250 ms tolerans), biçim geçerli (şıklı: tek harf; Çift Cevap: iki farklı harf; tahmin: sayı), cihaz sahip. Geçerli gönderimlerin en sonuncusu sayılır. Açıklamada dondurulur.
- Joker: soru normal (eşitlik değil), Çift Cevap yalnız şıklı, `t` açık pencerede (duraklama anından sonra değil), hak tüketilmemiş, sınıf bu soruda joker kullanmamış, sınıfın `t`'den önce kabul edilmiş cevabı yok, cihaz sahip. Kabul edilince hak hemen tüketilir; geri alma yolu yoktur. Ret nedeni `jrej`'e yazılır.
- Tekilleştirme: `jdone[qk][i] = t` ile aynı istek ikinci kez işlenmez; puan `scored[qk]` ile bir kez uygulanır; iptal `cancelled[qk]` ile bir kez işlenir.

Joker tanıtımı: ilk kabulde `pauseAt = şimdi`, açık pencere kapanır, `joker` nedeni eklenir, `until = pauseAt + 3500 ms`. Bu tanıtım sürerken gelen ve `t ≤ pauseAt` olan geçerli istekler aynı tanıtıma eklenir (gruplama penceresi: duraklama anı öncesi gönderilmiş, tanıtım bitmeden ulaşan istekler; en çok 3,5 sn). Tanıtım uzatılmaz; liste eklenerek güncellenir. Süre bitince yalnız `joker` nedeni kalkar.

## Yarışma modları

`KaplanCore.normRoster()` adları satır/virgülle böler, boşlukları sadeleştirir; `rosterError()` en az 3 benzersiz (Türkçe büyük/küçük harf duyarsız) ad ister. Aynı kontrol Ayarlar'da, yeni yarışma başlatırken ve yedek içe aktarmada kullanılır; hatalı yedek bütünüyle reddedilir. `modeFor(n)`: 3 → `shared`, 4+ → `tournament`. Mod `ACT.newGameYes()` içinde `g.mode`/`g.roster`'a yazılır; `curTeams()` = `KaplanCore.teamsOf(g, etap)`.

- `shared` (Üç Kampüs — Ortak Yarışma): kura yok, doğrudan ortak katılım; `startStage` puan sıfırlamaz; `stageOutcome` ara etaplarda herkesi sırayla devam ettirir (eşitlik sorusu yok), finalde `cutoff(…, 1)` ile yalnız lider eşitliği eşitlik sorusuna gider; `advance` etap sırasını s1 → s2 → final izler, her etap kendi soru bankasını kullanır. Soru anahtarı (`qk`) etap anahtarını içerdiği için cevaplar etaplar arasında karışmaz.
- `tournament`: mevcut davranış (kura 2 grup, ilk 2 finale, finalde puanlar sıfırdan). `drawGo` başlangıç listesini (`g.roster`) kullanır.

## Puan

Normal doğru +10; Çift Cevap (iki seçimden biri doğru) +10; Çifte Puan doğru +20; jokerli yanlış/cevapsız −10, toplam en az 0 (5 puandan düşüş −5 kaydedilir). Tahminde en yakın ve eşit uzaklıktakiler kazanır. İptal, `scored[qk].delta`'daki gerçek değişimin tersini uygular ve `qk` ile tüketilmiş jokerleri iade eder.

## Admin → sahne iletişimi (`app/link.js`)

Sahne `window.open(... '?sahne', 'kaplanSahne')` ile kullanıcı tıklamasıyla açılır. Birincil yol `postMessage`: sahne her saniye `window.opener`'a `hello/ping {stageId, soundOn}` gönderir; admin `event.source`'u sahne penceresi olarak tutar (admin yenilense de sahnenin opener'ı aynı sekmeyi gösterir). Admin her değişimde `{type:'model', seq, model}` ve olaylar için `{type:'ev', ...}` gönderir. HTTP altında elle açılmış sahne için `BroadcastChannel('kaplan-sahne')` yedeği vardır (file:// altında opak köken nedeniyle güvenilmez; orada sahne düğmeyle açılmalıdır). 3 sn ping gelmezse ya da `stageWin.closed` olursa sahne kayıp sayılır.

Sahne modeli `stageModel()` yalnız gösterilecek veriyi taşır: `ready`'de soru/şık yok; doğru cevap yalnız `revealed` ve sonrasında; puan değişimleri yalnız puan ekranında; QR/kod yalnız menü/kura/katılımda; yönetim verisi yok. Saat sahnede `endsAt` (aynı makinenin yerel saati) ile yerel geri sayılır.

Ses: yalnız etkin ses sahnesi (`soundStage`, sesi en son etkinleştiren sahne) çalar. Olaylar `id` ile tekilleşir; sahne bağlanınca o anki `evId`'yi taban alır ve daha eskileri çalmaz. Admin ve telefon ses üretmez.

## Uygulama sırasında eklenen kararlar

- **Açıklamada geç ulaşan cevaplar:** Admin cevapları ~0,7 sn'de bir yoklar. "Cevabı Açıkla"da hemen yeni bir yoklama tetiklenir ve kabul edilen cevaplar 1,5 ve 3 sn sonra (puanlar gösterilmediyse ve admin elle düzeltmediyse) yeniden dondurulur. Ölçüt gönderim zamanıdır (`t` pencere içinde), ulaşma zamanı değil.
- **Tek yoklama döngüsü:** Ek tetiklemeler yoklama döngüsünü çoğaltmaz (`busy` bayrağı).
- **Arma senkronu (`syncEmblems`):** Ayarlar/içe aktarma/yeni yarışmada güncel sınıf listesinde ya da süren yarışmada olan sınıfların eşleşmesi korunur; listeden çıkanların arması serbest kalır; yeni sınıf en küçük boş numarayı alır.
- **Sayfa kapanışında yazma yok:** Admin her değişiklikte ve saat çalışırken saniyede bir kaydeder; kapanışta ayrıca yazmaz (aynı kökenden açık eski bir sekmenin yeni veriyi ezmemesi için).
- **Arma öğesi:** `<kb-arma>` özel öğesiyle çizilir; genel `span` kuralları boyutunu bozmaz.

## Doğrulama planı

1. `node --test tests/` — puan/ceza tablosu, saat/pencere, cevap seçimi, joker kabul/ret, gruplama, iptal ve tekrar iptal, göç ve arma kalıcılığı.
2. Tarayıcı otomasyonu (Chrome + puppeteer-core, proje dışında kurulu): admin + sahne + iki öğrenci; manuel akış, jokerler, duraklatma, sahne kapatma/açma, telefon kopması, iptal, ses tekilleştirme, file:// ve LAN sunucusu.
3. Ekran görüntüleri: 1920×1080, 1366×768, 1024×768 sahne; 360×800, 390×844 telefon; `tasarim/ekran-goruntuleri/`.
4. Vercel/Redis ve fiziksel projeksiyon bu teslimde test edilmez; raporda ayrıca belirtilir.
