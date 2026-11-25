# Claude için Suno müzik teslimi

İki beste kullanıcının açık Suno oturumunda v6 modeliyle üretildi. Her üretim iki alternatif oluşturdu; aşağıda belirtilen birer kaynak indirildi. Dinleme karşılaştırması yapılmadı; “en iyi alternatif seçildi” iddiası yok. Dosyalar teknik olarak açıldı, gerçek süreleri ölçüldü ve tam ses çözümleme kontrolü yapıldı.

## Kullanılacak dosyalar

| İşlev | Kurgu için tercih edilen kaynak | Gerçek süre | Biçim |
|---|---|---:|---|
| Açılış | E:\PROJELER\KaplanArena\tasarim\sinematik\girdiler\acilis-muzik.wav | 58,8 s | PCM 16 bit, 48 kHz stereo |
| Ara | E:\PROJELER\KaplanArena\tasarim\sinematik\girdiler\ara-muzik.wav | 74,96 s | PCM 16 bit, 48 kHz stereo |

Aynı klasörde `acilis-muzik.mp3` ve `ara-muzik.mp3` kopyaları da var. WAV kopyaları Suno'nun WAV indirmeleridir; sırf uzantı değiştirerek oluşturulmadı. Envanter ve SHA-256 değerleri `muzik-envanter.json` içinde.

## Kaynaklar

- **The Roar Before the Arena** — Türkçe anlamı: Arena Öncesindeki Kükreme. İndirilen kaynak: https://suno.com/song/fffbde7f-2ed4-4553-b2c4-3be0c0ae18a2
- Açılışın indirilmemiş diğer alternatifi: https://suno.com/song/a1970680-4286-434e-a1b3-031bf6580a7a
- **Embers of the Waiting Arena** — Türkçe anlamı: Bekleyen Arenanın Korları. İndirilen kaynak: https://suno.com/song/4cfa2824-55e5-4ab0-a0bf-e54ca20d1dad
- Aranın indirilmemiş diğer alternatifi: https://suno.com/song/2a8928de-ecec-4008-90d9-c1e456491390

## Kurgu talimatı

1. Önce iki besteyi dinle; gerçek ritim, doruk ve kapanışı değerlendir. Promptta istenen 120/80 BPM veya 44. saniye doruğunun birebir gerçekleştiğini varsayma.
2. Açılış müziği 58,8 s; 60 saniyelik filme 1,2 saniyelik farkı görsel açılış/kapanış ve doğal ses kuyruğuyla düzenleyerek yerleştir. Bütün parçayı gereksiz esnetme; metin ve künye okuma süresi korunmalı.
3. Ara müziği 74,96 s; hazır 30 saniyelik loop değildir. Uygun harmonik/ritmik 30 saniye seç, gerekirse crossfade/tail wrap ile düzenle; en az 3 döngü dinleyip ek yerini kontrol et. Kurgu sonrası ara dosyasını ayrı üret, kaynak besteyi bozma.
4. Kılıç, kalkan, kapı, geçiş ve kükreme bestelerden ayrı ses katmanlarıdır. Güncel kayıt temelli paket `../ses-gercek/hazir/` içinde; önce `../ses-gercek/CLAUDE-EFEKT-TESLIMI.md` dosyasını oku. Gerçek kaplan alan kaydı da bu pakette var. Eski sentezler `../ses-taslaklari/` içinde yedek olarak korunur. Suno besteleri için sözsüz brief kullanıldı; gerçek çıktı ayrıca dinlenmelidir.
5. Sesin tek sahibi etkin projeksiyon sahnesidir. MP4 içinde miks varsa aynı besteyi ayrıca ikinci bir ses oynatıcısından çalma. Admin ve telefonlar sessiz kalır; ara/film bitişi yarışma süresini otomatik başlatmaz.
6. Rendera aldığın nihai müzik ve miks seviyelerini raporla. Dinleme/final miks/loop kalite onayı bu hazırlıkta verilmedi; bu adımlar senin video teslimine aittir.

## Claude'ye iletilecek kısa not

```text
Suno besteleri artık hazır. E:\PROJELER\KaplanArena\tasarim\sinematik\girdiler\MUZIK-TESLIMI.md dosyasını oku. Açılış için acilis-muzik.wav (58,8 saniye), ara için ara-muzik.wav (74,96 saniye) kullan; MP3 kopyaları aynı klasörde. Ana sinematik promptundaki 60 saniyelik açılış ve 30 saniyelik ara hedeflerine müzikal kurgu yap. Ara bestesini hazır loop sayma; kesintisizliği üç tur dinleyerek kontrol et. Efektler ve kükreme ayrı katmanlar olarak kalacak. Güncel ana görev: E:\PROJELER\KaplanArena\tasarim\sinematik\CLAUDE-SINEMATIK-PROMPTU.md.
```
