# Kaplan Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Kullanıcı uygulayıcı olarak Claude'yi seçti; bu hazırlık oturumunda uygulama yapılmaz.

**Goal:** Onaylanmış tasarımı veri kaybı olmadan admin, sahne ve telefon arayüzlerine uygulamak.

**Architecture:** Admin tek yetkili yarışma durumu ve saat sahibidir. Sahne salt gösterim, telefon ise doğrulanmış komut istemcisidir. Mevcut HTML/JS ve API temeli korunur; çok pencere iletişimi çalışma kiplerine göre doğrulanır.

**Tech Stack:** HTML, CSS, JavaScript, Web Audio, mevcut Node/Vercel API ve PowerShell yerel sunucusu.

**Spec:** `CLAUDE-UYGULAMA-PROMPTU.md`; karar dayanağı `claude-hazirlik-incelemesi.md` 1–20.

## Global Constraints

- Mevcut kullanıcı değişiklikleri, sorular, ayarlar ve kayıtlar korunur; canlıya yayın/push yok.
- Tam manuel açıklama/puan/sonraki soru; soru yalnız admin gösterince başlar.
- Sınıf başına yarışma boyunca birer joker; aynı soruda tek joker; sıfır puan alt sınırı.
- Sadece sahne ses üretir; internet, LAN ve dosya kipleri korunur.
- Künye ve Türkçe yazım promptta verilen biçimdedir.

## Review Focus

- Tekrarlanan komutlar ve bağlantı yenilenmesi puan/hakları çoğaltmamalı.
- Aynı anda cevap/joker ve süre sonu yetkili durumdan doğrulanmalı.
- Birden çok duraklatma nedeni varken tanıtımın bitmesi oyunu başlatmamalı.
- Eski kayıtlar ve 11'den fazla sınıf veri/arma kaybetmemeli.
- file:// ve çevrimdışı LAN varlık/iletişim yolları HTTP varsayımına dayanmamalı.

## Görev 1 — Durum ve komut sınırları

**Dosyalar:** kaplan-arena.html, gerektiğinde api/ka.js; davranış testleri yeni tests/ altında. Çıktı: soru aşaması, idempotent komut kimliği, kalan süre ve duraklatma nedenlerinin açık modeli. İletişimde kullanılacak tam alan/komut şemasını uygulamadan önce kısa bir teknik notta sabitle.

- [ ] Mevcut verilerle başlangıç ve eski kayıt göçü testini ekle/çalıştır.
- [ ] Manuel aşama geçişleri ve komut tekrarında tek uygulama testini önce başarısız göster.
- [ ] Ortak yetkili durum modelini uygula; mevcut kayıtları göç ettir.
- [ ] Aynı testleri çalıştır; örnek verilerle kullanıcı kaydını değiştirmediğini doğrula.

## Görev 2 — Admin/sahne ve duraklatma

**Dosyalar:** kaplan-arena.html, gerekiyorsa küçük yerel modüller. Tüketir: Görev 1 durum/komut şeması. Üretir: salt görüntüleyici sahne, bağlantı izleme ve ortak duraklatma.

- [ ] İkinci host kilidi alınmaması, sahne kopması ve birden çok duraklatma nedeni testlerini ekle.
- [ ] Sahne kipini başlangıçta ayır; pencere açma, yeniden bağlanma ve admin devamını uygula.
- [ ] Gerçek iki pencereyle test et; doğru cevap/gelecek soru sızıntısı olmadığını denetle.

## Görev 3 — Cevap, joker, puan ve iptal

**Dosyalar:** kaplan-arena.html, gerektiğinde api/ka.js. Tüketir: yetkili komut şeması ve duraklatma. Üretir: doğrulanmış cevap/joker komutları, gerçek delta kaydı ve geri alınabilir soru iptali.

- [ ] Promptun tüm puan/joker tablosunu testle; ilk gönderim/joker yarışı ve süre sınırını kapsa.
- [ ] Taslak/gönderilmiş cevap ayrımı, manuel gönder, kesin hak tüketimi ve ortak tanıtım gruplamasını uygula.
- [ ] İptali gerçek delta ile tersine çevir; tekrar iptal ve sıfır sınırı testlerini geçir.
- [ ] İki öğrenciyle aynı anda joker/cevap göndererek test et; önceki sorunun verilerinin değişmediğini doğrula.

## Görev 4 — Bütün arayüzler ve yerel medya

**Dosyalar:** kaplan-arena.html ve uygun dağıtım varlık dizini; kaynak tasarim/varliklar korunur. Tüketir: Görev 1–3 durumları. Üretir: onaylı karşılama, harita, sahne/öğrenci/admin görünümleri, sabit armalar ve sahne sesi.

- [ ] Konseptleri görsel olarak aç; bütün görünüm durumlarını prompt listesiyle eşleştir.
- [ ] Verilen raster/SVG'lerle tasarımı uygula; yerel font/lisans ve sahne ses kontrolünü ekle.
- [ ] 4:3, 16:9 ve iki telefon boyutunda uzun metin/11+ sınıf/künye kontrolü yap; görüntüleri kaydet.
- [ ] Yeniden bağlantıda eski ses çalmaması ve telefon/admin sessizliği testlerini geçir.
- [ ] Doğru bilenlerin tek tek arma girişi ve birlikte sonuç görünümünü uygula; tek/çok/hiç kazanan, çift cevap, ×2, azaltılmış hareket ve tahmin kazananlarını doğrula. Açıklama aşamasında puan değişmediğini, “Puanları Göster” ile yalnız bir kez güncellendiğini ve yeniden bağlantıda giriş sesinin tekrarlanmadığını test et; sahne görüntüsünü kaydet.

## Görev 5 — Çalışma kipleri ve teslim

**Dosyalar:** kaplan-sunucu.ps1, gerektiğinde vercel.json, .vercelignore, index.html, katil/index.html, OKU-BENI.txt; test ve teslim raporu. Tüketir: önceki görevlerin uygulaması ve yerel varlıkları.

- [ ] Yerel statik varlıkların 200/doğru MIME, proje dışı ve gizli dosyaların reddi testlerini ekle.
- [ ] LAN sunucusunu güncelle; file://, internetli yerel deneme ve çevrimdışı varlık/sahne iletişimini çalıştırarak doğrula.
- [ ] Çok istemcili uçtan uca manuel yarışma, joker, ara, kopma, iptal, final ve yedekleme senaryosunu tamamla.
- [ ] Kullanım belgesini güncelle; komut/sonuç ve sınırları, ekran görüntülerini teslim et. Fiziksel projeksiyon/canlı Redis testi yapılmadıysa açıkça belirt; yayınlama yapma.

Claude gerekli kesin fonksiyon arayüzlerini güncel kodu okuduktan sonra yerel teknik notta belirler; bu plan değişmiş kaynak satırlarına veya var olmayan test altyapısına dayanarak sahte kesinlik üretmez. Her görevin doğrulaması geçmeden ilgili davranışı tamamlandı diye raporlama.
