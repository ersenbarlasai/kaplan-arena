# Doğru Bilenler gösterimi — kısa test raporu

Komut: `NODE_PATH=<puppeteer-core> node tests/e2e/correct.js` → **39/39 kontrol geçti** (`tests/e2e/son-rapor-dogru-bilenler.json`).
Birim testleri: `node --test tests/*.test.js` → 17/17. Canlıya yayın/push yapılmadı.

Doğrulanan senaryolar: tek doğru (önce doğru şık altın, ~1,3 sn sonra arma girişi, tek giriş sesi);
çoklu doğru (armalar tek tek, sıra sınıf sırası — cevap hızı değil); Çift Cevap ile doğru ("2 Şık" etiketi);
Çifte Puan ile doğru (parlayan ×2 mührü); tahminde doğru sayı altın, eşit uzaklıktaki iki en yakın sınıf tahminleriyle;
hiç doğru yok ("Bu soruda doğru cevap gelmedi", kutlama/ses yok); gösterim sırasında "Puanları Göster" ve
"Soruyu İptal Et" (kalan giriş sesleri ve zamanlayıcılar durdu, otomatik geçiş yok); sahne kapatılıp yeniden açıldı
ve admin sayfası yenilendi (güncel sonuç geri geldi, animasyon/ses tekrar etmedi, puan uygulanmadı);
azaltılmış hareket (hepsi birlikte, animasyonsuz, giriş sesi yok); ses kapalı (hiç ses çalmadı, gösterim çalıştı);
11 doğru bilen 1920×1080, 1366×768, 1024×768'de kırpılmadan ve soru kartıyla çakışmadan.
Puan: gösterimde puan, +10/+20/−10 ve toplam ne sahnede ne telefonda açıklanmadı; "Puanları Göster" ile toplamlar
sayarak güncellendi; tekrar çağrı puanı çoğaltmadı. Admin ve telefon ses üretmedi.

Ekran görüntüleri: `tasarim/ekran-goruntuleri/dogru-bilenler-*.webp`, `telefon-dogru-bildiniz-x2-390.webp`,
`admin-dogru-bilenler-1366.webp`.

Doğrulanmayan: önceki genel senaryolar (`run.js`, `modes.js`) bu değişiklikten sonra yeniden çalıştırılmadı;
gerçek salon sesi/projeksiyon ve gerçek telefonlar denenmedi. Eşitlik soruları mevcut akışı korur (gösterim yok).
