# OpenArt görselden video hazırlık incelemesi

İnceleme tarihi: 26 Kasım 2026. Bu aşama araştırmadır; video üretimi başlatılmadı, kredi harcanmadı.

## Doğrulananlar

- `sahneler/` altında 11 PNG mevcut. Açılış ve ara sahnelerinin görsel kaynakları hazırdır.
- Resmî OpenArt MCP sayfası ChatGPT eklentisi ve OAuth bağlantısını tarif ediyor: https://openart.ai/mcp/#chatgpt
- Resmî eklenti deposunun verdiği doğrudan bağlantı: https://chatgpt.com/plugins/plugin_asdk_app_6a42dbbe74c081918a592a0aad65ca26
- Bu oturumun araçlarında OpenArt üretim aracı görünmüyor. Eklenti aramasında OpenArt için sonuç dönmedi; bu, hizmetin genel olarak bulunmadığı anlamına gelmez. Yukarıdaki resmî bağlantıdan bağlantı kurulması gerekiyor.
- Resmî CLI de görselden video, yerel resim yükleme, model parametrelerini keşfetme, maliyet sorgulama ve dosya indirmeyi destekliyor: https://github.com/OpenArt-AI/cli . Mevcut PATH üzerinde `openart` bulunmadı. Kullanıcının istediği MCP bağlantısı önceliklidir; CLI'ye sessizce geçilmeyecek.
- Hesap, kullanılabilir modeller, kredi bakiyesi ve gerçek üretim fiyatları henüz doğrulanamadı. Sabit bir model, çözünürlük, süre veya maliyet garanti edilmez.

## Üretime geçiş koşulu

Kullanıcı resmî OpenArt eklenti bağlantısını açıp kendi hesabıyla giriş yapmalı. Sonra bu oturumda OpenArt araçlarının erişimi tekrar doğrulanmalı. Bağlantı ayrı bir ChatGPT sohbetinde kurulursa Codex'e kendiliğinden yansıdığı varsayılmamalı. Gerekirse OpenArt'ın resmî Codex bağlantı akışı izlenmeli. Şifre veya erişim anahtarı sohbete istenmemeli.

Bağlantı sonrası kullanılabilir modeller ve krediler okunacak; sahne başına süre/kalite ve toplam kredi gereksinimi hesaplanacak. Kullanıcının bu aşamadaki isteği önce hazır oluş durumunun bildirilmesidir; bu inceleme otomatik üretim yetkisi olarak kullanılmayacak.

## Sonraki üretim ve Claude teslimi

Sabit görsel pan/zoom kurgusu yerine gerçek görüntüden video klipleri üretilecek. Kaplanın yürüyüşü, pelerin hareketi, kapı hareketi, kontrollü kılıç/kalkan karşılaşması, arena atmosferi ve kükreme sahnesi kendi hareket tanımlarına sahip olacak. Kaplan kimliği, resimsel stil ve mimari tutarlılık korunacak. Yazı ve künye videoya yapay zekâyla çizdirilmeyecek; FilmCraft'ta net katman olarak eklenecek.

Önerilen teslim klasörleri: `videolar-openart/ham/`, `videolar-openart/secilen/`, `videolar-openart/onizleme/`. Üretim başlayınca oluşturulacak. Manifest her klibin kaynak görselini, promptunu, modelini, gerçek süresini/çözünürlüğünü, üretim kimliğini, kredi maliyetini ve kalite durumunu içerecek. Başarısız klipler seçilen klasörüne konmayacak.

Klip uzunlukları mevcut 60 saniyelik açılışın kesme paylarını karşılayacak şekilde planlanacak; model sınırlamaları nedeniyle sahne sayısıyla birebir üretim sayısı varsayılmayacak. Aynı görseli kullanan açılış/final için ayrı hareket gerekebilir. Ara sahnesi gerçek hareketli, sakin ve döngüye uygun üretilecek; kesintisiz 30 saniye desteği varsayılmayacak. Nihai 30 saniyelik döngüyü Claude FilmCraft'ta kuracak ve üç tur kontrol edecek.

Üretim sesleri varsa ayrı değerlendirilecek; mevcut Suno müzikleri ve gerçek efektlerin üstüne istemsiz ikinci müzik/kükreme bindirilmeyecek. Kılıç, kapı ve kükreme efektlerinin zamanları gerçek klip olaylarına göre yeniden hizalanacak. Claude'nin eski sabit görsel kurgu talimatı yeni klip manifestiyle güncellenecek; uygulamanın admin kontrolü ve duraklatma kuralları korunacak.

## Bağlantı sonrası doğrulama

26 Kasım 2026: OpenArt MCP araçları bu oturumda erişilebilir hale geldi. Hesap sorgusu başarılı: Starter planı, 3.200 kredi. Yukarıdaki bağlantı bekleme durumu giderilmiştir. Video üretimi henüz başlatılmadı.

Model listesi ve gerçek image2video şemaları kontrol edildi. PixVerse V6 başlangıç/isteğe bağlı bitiş karesi, 1–15 saniye, 1080p ve ses üretimini kapatma desteği sunuyor. Wan 3.0 başlangıç/bitiş karesi ve 30 saniyeye kadar üretim sunuyor. Bunlar form yetenekleridir; sonuç kalitesi henüz denenmedi.

Canlı maliyet sorguları (bir çıktı, image2video): PixVerse V6, 1080p, 8 saniye, generateAudio=false: 240 kredi. Aynı modelde 15 saniye: 450 kredi. Wan 3.0 standard, 1080p, 30 saniye sorgusu: 2.400 kredi. Fiyatlar bu konfigürasyonlar içindir; üretim anında kesinleşir. Bu nedenle tek uzun ara klibi yerine daha kısa hareketli bir döngü kaynağını FilmCraft'ta 30 saniyeye kurgulamak bütçe bakımından daha uygundur. Kesin sahne bazlı toplam, gerçek süreler belirlenip her konfigürasyon fiyatlandırılınca çıkarılacak; tekrar üretim payı ayrılacak.

MCP'nin referans aktarım talimatı, henüz sohbete eklenmemiş medyanın sohbete eklenmesini gerektiriyor; proje yoluna erişim otomatik OpenArt referansı değildir. Üretim öncesi kullanıcı `sahneler/` içindeki kaynak PNG'leri bu sohbete eklemeli; dosyalar kabul edilen içe aktarma aracıyla aktarılmalı. Alternatif olarak kullanıcı OpenArt'a önceden kaydettiği aynı referansları seçebilir. Gizli shell yüklemesi veya uydurma dosya kimliği kullanılmayacak.

Sonuç: servis/hesap erişimi ve model-maliyet araştırması hazır; kaynakların OpenArt'a kabul edilmiş referans olarak aktarılması gerekiyor. Kullanıcının önce hazır oluş bildirimi isteği korunuyor; henüz üretim veya kredi harcaması yok.
