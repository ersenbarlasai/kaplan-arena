# Kaplan Arena görsel paketi

## Raster sahneler (yerleşik imagegen)

- karsilama.png — 1672×941; başlık, yolculuk haritası ve künye arka planı. Orman-kale-arena yolculuğunu gösterir. Kaplan rehberi ayrı katman olarak yerleştirilir.
- orman.png — 1672×941; 1. etap Orman Geçidi.
- kale.png — 1672×941; 2. etap Kadim Kale.
- arena.png — 1672×941; final Kaplan Arenası ve şampiyonluk. Podyum ve isimler HTML/SVG ile eklenir.
- kaplan-rehber.png — 1024×1536 RGBA; şeffaf arka planlı özgün rehber. Resmi okul logosu değildir. Kenarlarda hafif yarı şeffaf renkli ışık vardır; koyu sahneyle birlikte değerlendirilmelidir.

Görseller yaklaşık 16:9'dur; 4:3 projeksiyonda arka plan kırpılabilir, metin ve kontroller kırpılamaz. İllüstrasyonlar dokunulabilir arayüzün yerine kullanılmaz. Soru levhası ve künye yeterli opaklıkta olmalıdır. Telefonlarda dekor azaltılır; kaplan soru alanını işgal etmez. Rasterları üretimde gerekirse optimize et, kaynak PNG'leri koru.

## Kodla çizilmiş SVG varlıklar

12 ayrı kalkan: arma-pusula, arma-yildiz, arma-yaprak, arma-alev, arma-dag, arma-gunes, arma-ay, arma-kitap, arma-kanat, arma-simsek, arma-kristal, arma-kopru.svg. İsim yoktur; sınıf adı gerçek veriden yanında gösterilir. Aynı sınıfın kalıcı arma kimliği uygulama durumunda tutulur. 12'den çok sınıfı kırpma; aynı çizim dilinde simge/renk varyasyonuyla genişlet. SVG'ler düzenlenebilir; resmi logo değildir.

Joker SVG'leri: joker-cift-cevap.svg, joker-cifte-puan.svg, joker-kilit.svg. Etiketler HTML ile; durum yalnız renkle anlatılmaz.

## Yazı ve ses

Bu pakette font veya ses dosyası yoktur. Claude Türkçe glifleri tam içeren, dağıtım lisansı uygun yerel başlık/gövde fontlarını ve lisanslarını eklemeli; dış font CDN bağımlılığını kaldırmalıdır. Mevcut Web Audio seslerini sahnede üretmek tercih edilebilir; dış ses kullanılırsa dosyası ve lisansı projede olmalıdır. Bunlar uygulama görevleridir; hazır dosyalar gibi raporlanmamalıdır.

## İzlenebilirlik

URETIM-PROMPTLARI.md raster üretim promptlarını, gorsel-kontrol.json boyut/kanal/şeffaflık ölçümlerini içerir. İki konsept PNG üst dizindedir; bunlar görsel referanstır. oneri.html eski mor tasarım araştırmasıdır, güncel görsel hedef değildir.
