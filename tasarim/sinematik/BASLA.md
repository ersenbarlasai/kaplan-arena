# Kaplan Arena sinematik paketi

## Claude'ye gönderilecek kısa mesaj

```text
E:\PROJELER\KaplanArena\tasarim\sinematik\CLAUDE-SINEMATIK-PROMPTU.md dosyasını oku ve uygula. Aynı klasördeki sahne panosunu, sahne-plani.json dosyasını, bütün sahne/katman varlıklarını ve SES-VE-SUNO.md briefini kullan. Suno besteleri artık girdiler/ içinde; dosya listesi ve gerçek süreler için girdiler/MUZIK-TESLIMI.md dosyasını oku. Mevcut uygulama değişikliklerini koru. Açılış filmi ve sakin ara döngüsünü üret; yalnız etkin sahnede sesli oynatılacak şekilde admin kontrollerine entegre et. Canlıya yayınlama veya push yapma.
```

## Hazır olanlar

- Güncel kayıt paketi: `ses-gercek/` altında 8 kaynak kayıt ve 9 hazır WAV, CC0 kaynak/lisans listesi, Claude teslim notu ve `DINLE.html`. Filmde fiziksel sesler için bu paket eski sentetik taslaklardan önce tercih edilir.

- 10 sıralı açılış planı + 1 ayrı ara manzarası (8 yeni raster, 3 mevcut sahne kopyası; 01 ve 10 bilinçli aynı resim).
- Şeffaf kaplan rehber, 12 düzenlenebilir arma, 3 joker/kilit SVG, 7 yeni efekt/bayrak/çerçeve SVG katmanı.
- 6 özgün sentetik WAV efekt taslağı; gerçek hayvan/saha kaydı değildir.
- 60 saniye/30 fps açılış ve 30 saniyelik ara için makine okunur plan; her planda kamera ve image-to-video yönlendirmesi.
- Detaylı Türkçe yönetmenlik/uygulama promptu; ayrı Suno müzik briefleri ve künye.
- Görsel pano, üretim promptları, dosya boyut/kanal/hash envanteri, ses teknik denetim kaydı.

## Bu paketin sınırı

Hazır MP4, hareketli düello veya bitmiş kesintisiz video loop'u bu hazırlığın çıktısı değildir; video/kurgu Claude görevidir. PNG'ler durağan kaynak karelerdir. Kaynaklar yaklaşık 1672×941; çıktı hedefi 1080p, doğal 4K değildir. Suno besteleri girdiler/ içine indirildi; gerçek sürelerden hedef kurgu sürelerine düzenleme gerekir. Ses taslaklarının özellikle sentetik kükremesi dinlenerek değerlendirilmelidir. Uygulama kodu bu hazırlıkta değiştirilmedi.

## Dizinler

- sahneler/: durağan ana kareler.
- katmanlar/: tekrar kullanılabilir PNG ve SVG.
- ses-taslaklari/: 48 kHz WAV ve sayısal kontrol.
- onizleme/sahne-panosi.jpg: tek bakışta akış.
- referanslar/: onaylı ekran konsepti.
- girdiler/: üretilmiş Suno besteleri, teknik envanter, teslim notu ve isteğe bağlı gerçek kükreme için yer.
- sahne-plani.json: kesin zaman çizelgesi ve metinler.
- URETIM-PROMPTLARI.md: yerleşik imagegen raster promptları.
- hazirla.py: SVG, sentetik ses, pano ve manifesti yeniden üretir; uygulama kodunu değiştirmez. Python, Pillow, NumPy ve SciPy gerekir.

Fontlar projede assets/fonts altında mevcut; bu paket kaynakları çoğaltmaz. Yol ve lisanslarını Claude güncel kaynak üzerinden kullanmalıdır. Statik sahne ve künye her zaman video hata/eksik dosya fallback'i olarak korunur.
