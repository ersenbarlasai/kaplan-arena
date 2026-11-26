# Claude devam durumu — FilmCraft sinematik görevi

Son güncelleme: 26 Kasım 2026 (hareketli video sürümü)

## Tamamlanan

- [x] İlk teslim (sabit görsel / 2.5D kurgu): commit `67748b4`, `244674b`.
- [x] Hareketli video teslimi (`videolar-openart/CLAUDE-VIDEO-TESLIMI.md`): 11 seçilmiş OpenArt klibi kare kare incelendi (temas, kapı, çene); `filmcraft/kur.js` video kliplerle yeniden yazıldı.
- [x] `kaplan-arena-acilis.fcproj` ve `kaplan-arena-ara.fcproj`; göreli yollar, yeniden açıldı, bütün medya `online`.
- [x] Nihai export: açılış CRF 22 (48,2 MB, −16,1 LUFS, −1,4 dBTP, 1800 kare), ara CRF 20 (11,3 MB, −20 LUFS, 900 kare, ses 30,000 s). `--allow-offline` kullanılmadı.
- [x] Doğrulama: `dogrula.py`, `sfx-senkron.js` (4 temas +6 ms), `dongu-oynat.js` (Chrome 3 tur, sarma 33,3 ms).
- [x] `assets/sinematik/` kopyaları + `ara-poster.webp` (FilmCraft 0 s karesi). Uygulama kodu değişmedi.
- [x] Testler: birim 22/22, media 43/43, modes 30/30, uckampus 63/63.
- [x] Rapor: `FILMCRAFT-TESLIM-RAPORU.md`.

## Kalan

- Kullanıcının salonda gözle/kulakla onayı: 00:12–00:31, 00:44–00:48 ve ara döngüsü 3 tur. Kulakla dinleme yapılmadı (yapılamaz).

## Notlar

- Ek OpenArt üretimi yapılmadı (kalan 530 kredi kullanılmadı).
- `ham/05-kilic-temasi.mp4` (bozuk ilk sürüm) kullanılmadı; `secilen/05-kilic-temasi.mp4` = v02.
