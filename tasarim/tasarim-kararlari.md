# Kaplan Arena — onaylanan tasarım kararları

Tarih: 25 Kasım 2026

Güncel uygulama gereksinimleri: `claude-hazirlik-incelemesi.md` içindeki 1–19 numaralı kullanıcı onayları bu belgenin eski öneri ve inceleme notlarının önüne geçer. Claude uygulama sözleşmesi `CLAUDE-UYGULAMA-PROMPTU.md`, görsel dosya listesi `varliklar/VARLIKLAR.md` içindedir.

## Amaç ve görsel yön

14–15 yaş öğrencileri için Kaplan Okulları Yapayzeka Kulübünün düzenlediği sınıflar arası bilgi yarışması. Onaylanan yön: “Efsaneye Yolculuk”. Resimli, sinematik bir macera dünyası; koyu petrol ve orman yeşili, sıcak parşömen, eskitilmiş altın ve kaplan turuncusu. Özgün kaplan rehber ve sınıf armaları kullanılacak. Mevcut resmi okul logosu yerine yeni bir resmi logo uydurulmayacak.

Değerlendirilen alternatifler Ejderha Arenası (daha sert turnuva atmosferi) ve Ay Işığı Akademisi (daha sakin ve gizemli atmosfer). Kullanıcı Efsaneye Yolculuk yönünü ve iki görsel taslağı onayladı.

## Ana ekranlar

- Karşılama: Orman, kale ve arenaya uzanan yolculuk tek manzarada anlatılır. “Kaplan Okulları Yapayzeka Kulübü sunar”, “Kaplan Arena”, “Efsaneye Yolculuk” ve “Yolculuğa Başla” bulunur. Altta mentörler ve kulüp öğrencileri aşağıdaki künye ile ayrı başlıklarla listelenir. İsimlerin kullanıcı tarafından verilen sırası ve büyük/küçük harf yazımı korunur.
- Ana menü: Orman Geçidi → Kadim Kale → Kaplan Arenası haritası; yarışma başlatma ve soru yönetimi.
- Katılım ve kura: QR/kod okunaklı, bağlanan sınıflar armalarla görünür; mevcut etap ve kura düzeni korunur.
- Soru: Büyük, açık renkli soru levhası; dört okunaklı cevap alanı; sayaç ve sınıf puanları. Görsel arka plan içeriğe baskın gelmez.
- Etap sonucu: İlerleyen yolculuk ve finale çıkan sınıflar.
- Final: Aydınlanan arena, şampiyon sınıfın arması ve podyum.

## Karşılama ekranı künyesi

Düzenleyen: **Kaplan Okulları Yapayzeka Kulübü**

### Mentörler

- Ersen BARLAS
- Alp Han KOÇDEMİR

### Kulüp öğrencileri

- Emre Burak Tölegen
- Burak Yoğurtçu
- Halil Mert ACAR
- Yekta Efe Konuk
- Çınar Arda
- Yusuf Emir Kuş
- Ömer Araf Boncuk
- Emir Karatay

Karşılama ekranının alt bölümünde mentörler iki isimlik bir satırda; sekiz kulüp öğrencisi geniş ekranda dengeli sütunlarda, dar ekranda alt alta gösterilir. Bütün adlar kırpılmadan okunabilmelidir. Görsel konseptteki “Ad Soyad” yer tutucuları uygulamada bu künye ile değiştirilecektir.

## Öğrenci telefonu

Kodla katılım, sınıf seçimi, hazır/bekleme, soru, cevap seçimi, joker etkinleştirme, cevabın alınması, doğru/yanlış sonucu, etap sonucu ve şampiyonluk durumları aynı görsel dili kullanır. Telefon ekranı ana projeksiyondan daha sade tutulur. Sınıf, toplam puan, süre ve kalan jokerler belirgindir. Cevap seçimleri yalnız renkle anlatılmaz.

Çift Cevap etkin olduğunda iki farklı şık seçilebilir ve birlikte gönderilir. Çifte Puan etkin olduğunda ×2 işareti görünür. Aynı soruda diğer joker kilitlenir. Kullanılmış joker mühürlenir; yanlış cevap cezası seçimden önce görünür. Taslaklardaki sınıflar ve puanlar örnektir.

## Kullanıcının onayladığı joker kuralları

- Her sınıfın yarışma boyunca bir Çift Cevap ve bir Çifte Puan hakkı vardır; etap değişince yenilenmez.
- Aynı sınıf aynı soruda iki jokeri birlikte kullanamaz.
- Çift Cevap: İki farklı seçimden en az biri doğruysa normal soru puanı; ikisi de yanlışsa toplamdan 10 puan düşülür.
- Çifte Puan: Doğruysa normal soru puanının iki katı; yanlışsa toplamdan 10 puan düşülür.
- Joker kullanımı sesli ve animasyonlu tanıtılabilir. Ana ekranda sınıf arması ve joker adı, telefonda kısa etkinleşme etkisi gösterilir.

## Uygulama incelemesi ve açık kararlar

Ana ekranlar ve öğrenci arayüzü kaplan-arena.html içinde; katil/index.html aynı dosyanın katılım kipine yönlendiriyor. api/ka.js çevrim içi senkronizasyonu sağlıyor. Tasarım değişikliği mevcut soru kayıtlarını, yedeklemeyi, bağlantıyı ve yarışma devam ettirme davranışını korumalıdır.

Son kaynak incelemesinde joker kayıtları, tek soru için tek joker kontrolü, telefonda çift cevap seçimi, +20 ve ceza sonuçları, sesli tanıtım bulunuyor. İlk incelemede öğrenci tarafında görülen eksikler güncel kaynakta değişmiş durumda. Kaynak uygulama öncesi yeniden okunmalı; mevcut kullanıcı değişiklikleri korunmalıdır.

Kullanıcı jokerli cevapsız soruda da cezayı ve toplam puanın sıfır altına inmemesini onayladı.

Kullanıcı ortak tanıtımda süre ve cevap kabulünün durmasını, ayrı admin/sahne pencerelerini, sesin yalnız sahneden çıkmasını, azaltılmış hareket seçeneğini ve tam manuel gösterim akışını onayladı. Joker ilk cevap gönderilmeden önce onayla tüketilir ve geri alınamaz. Tahmin/eşitlik kuralları ile soru iptali dahil ayrıntılar güncel uygulama sözleşmesindedir.

## Görsel taslaklar

- ana-ekranlar-konsept.png: Karşılama, ana ekran, soru, şampiyonluk.
- ogrenci-ekranlari-konsept.png: Katılım, soru, çift cevap, sonuç ve joker tanıtımı.

Bu dosyalar görsel konsepttir; çalışan uygulama veya animasyon kaydı değildir. Üretimde yazılar HTML ile oluşturulmalı, illüstrasyonlar ayrı varlıklar olmalıdır; tam ekran taslak görüntüsü arayüzün yerine kullanılmamalıdır.
