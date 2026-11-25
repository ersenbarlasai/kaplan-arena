# Claude için kayıt temelli efekt teslimi

**Son kullanıcı seçimi:** Kükreme için `KUKREME-KULLANICI-NOTU.md` önceliklidir. Varsayılan artık `hazir/kukreme-kullanici.wav`; kullanıcı bunu aslan kükremesi olarak sağladı. Önceki kaplan kaydı yedektir. Yeni dosyanın lisansı diğer CC0 kaynaklarından ayrı ve belirtilmemiştir.

Paket: `E:\PROJELER\KaplanArena\tasarim\sinematik\ses-gercek`.

## Öncelikli dosyalar

| Eski taslak | Yeni tercih — hazir/ altında |
|---|---|
| kaplan-kukreme-STILIZE-TASLAK.wav | kaplan-kukreme-gercek.wav |
| kilic-metal-01.wav | kilic-temas-kayit-foley.wav |
| kalkan-vurus-01.wav | kalkan-vurus-kayit-foley.wav |
| kapi-gurultu-01.wav | kapi-acilis-kayit-foley.wav |
| gecis-whoosh-01.wav | savurma-gercek.wav |

Ek katmanlar: `kilic-suruntu-gercek.wav`, `kapi-gicirti-gercek.wav`, `kapi-gicirti-stib-alternatif.wav`, `zincir-gercek.wav`.

Başlık vurgusu sinematik bir tasarım sesidir; `../ses-taslaklari/baslik-vurgusu-01.wav` korunur ve isteğe bağlıdır. Bunu gerçek kayıt diye etiketleme. Yeni paketteki metal ve kapı foleyleri gerektiğinde başlık vurgusuna da katman olabilir.

## Kalite ve kullanım

- Kaplan, alan kaydından gelen 1,6 saniyelik gerçek çağrıdır. Kaynak zaten kısa, işlenmiş ve sıkıştırılmış kamuya açık türevdir; uzun veya kayıpsız master değildir. Daha önceki sentetik kükremeyi varsayılan olarak bununla değiştir.
- Kılıç ve kalkan sesleri fiziksel metal kayıtlarının düzenlendiği foley sürümleridir. Aynı metal kaynağını farklı filtre/katmanla kullanırlar; finalde gerekirse ayrı transient/rezonans dengesini kulakla ayarla.
- Kapı açılışı ağır ahşap kapı ve düşük seviyeli zincir karışımıdır; doğrudan kale kapısı kaydı değildir. Kaynaklar/ klasöründe tam kayıtlar var; 6 saniyelik kesit yeterli değilse oradan seç.
- Hazır WAV'lar 48 kHz, 24 bit, stereo; mono kaynaklar iki kanala kopyalanmıştır, bu gerçek stereo uzamsallık yaratmaz. Sample peak yaklaşık −6 dBFS; son miksin true peak/LUFS kontrolünü ayrıca yap.
- Kesitler otomatik enerji tespitiyle hazırlandı; kulakla final seçim onayı verilmedi. `DINLE.html` bütün hazır sesleri çevrimdışı dinletir. Kaynakları ve hazırları dinle, sahne temasına en uygun kesiti seç; kayıt kimliğini ve lisansı koru.
- Kılıç sesi temas karesine, kalkan sesi kalkan temasına gelsin. Savurma temastan önce veya sahne geçişinde kısa kullanılır. Kükreme 44. saniye civarındaki kaplan planına hizalanır; ağzın açık pozuyla kaba hizalama yetmez, gerçek klibin hareketini kontrol et.
- Efektler Suno bestelerinin içine zaten gömülü sanılmasın. Ayrı SFX kanalı, ölçülü sahne yankısı ve efekt altında müzik ducking kullan. Ara döngüsünde kükreme/çarpışma yok; bütün sesler yalnız etkin sahneden çalar.
- `efekt-esleme.json` eski-yeni yol haritasıdır. Ana `sahne-plani.json` güncel yolları kullanır. Eski taslaklar korunur; kodda ayrıca sabitlenmiş eski yollar varsa güncelle. Uygulama kodu bu paket hazırlanırken değiştirilmedi.

## Lisans ve izlenebilirlik

Tüm kullanılan kaynaklar CC0 olarak kontrol edildi. `KAYNAK-LISANS.md`, `kaynaklar-indirme.json`, `lisanslar/`, `hazir-sesler.json` ve `ses-envanter.json` dosyalarını birlikte koru. Kopyaların bazısı MP3/AAC olduğundan WAV dönüşümünü özgün kayıpsız kalite diye sunma. Yalnız kaynak sesleri yeniden paketlemek yerine bitmiş film/oyuna bağla; künye belgeye erişebilir kalsın.

## Kopyalanacak görev

```text
Gerçek kayıt temelli efekt paketi hazır: E:\PROJELER\KaplanArena\tasarim\sinematik\ses-gercek\CLAUDE-EFEKT-TESLIMI.md dosyasını oku. hazir/ altındaki 9 WAV'ı dinle; efekt-esleme.json eşlemesine göre eski sentetik kükreme, metal, kalkan, kapı ve whoosh taslaklarının yerine uygun kayıt temelli sürümleri kullan. Kaynaklar ve CC0 kayıtları aynı pakette. Kılıç/kalkanların gerçek metal kayıtlarından foley olduğunu doğru adlandır. Gerçek klip temaslarına göre senkronla, Suno müzikleriyle ayrı kanallarda miksle. Döngü, tek sahne sesi ve admin kontrolü kurallarını koru; canlıya yayınlama.
```
