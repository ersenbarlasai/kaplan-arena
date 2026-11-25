# FilmCraft uygulama planı (kısa)

Tarih: 26 Kasım 2026 · FilmCraft 0.20.1 (`C:\Program Files\FilmCraft\filmcraft-cli.exe`)

## Keşifte doğrulananlar

- CLI: `commands`, `describe`, `probe`, `inspect`, `render`, `export`, `run`, `mcp`. Projeyi tek süreçte sürmek için `filmcraft-cli mcp` (stdio JSON-RPC: `command_run`, `sequence_inspect`, `render_frame`) kullanılıyor; komut kimlikleri ve parametreler `commands`/`describe` çıktısından alındı.
- PNG/WAV içe aktarma çalışıyor; **SVG içe aktarılamıyor** (`probe`: "unrecognised format"). Bu yüzden `katmanlar/*.svg` aynı çizimle şeffaf PNG'ye çevrildi (`filmcraft/katmanlar-png/`, Chrome ile birebir rasterizasyon). Ara döngüsü için 1920 px periyotlu sis bandı aynı elips tanımlarından üretildi.
- Motion (scale/position) keyframe, opacity + Screen karışımı, grafik metin/şekil katmanları, video/ses geçişleri, mixer otomasyonu, submix + send, track insert (Convolution Reverb, Hard Limiter), dışa aktarmada loudness normalizasyonu (hedef LUFS + true peak) FilmCraft içinde çalışıyor.
- `.fcproj` JSON; medya yolu proje dosyasına göre göreli yazılınca FilmCraft onu çevrimiçi buluyor (test edildi).
- Fontlar: Cinzel Black, Marcellus SC, Segoe UI sistemde kurulu; Türkçe karakterler doğru çiziliyor (test karesi).

## Adımlar

1. **Açılış (60 s)** `filmcraft/kaplan-arena-acilis.fcproj`: V1 sahne fotoğrafları (2.5D itme/kaydırma, temas anlarında 1–6 karelik darbe ve sarsıntı), V2 sis/ışık/toz katmanları, V3 kıvılcım ve kapı ışık aralığı, V4–V6 başlık + künye grafikleri, en üstte vinyet ayar katmanı. A1 müzik, A2 temas SFX, A3 hareket SFX, S1 "Arena yankısı" (ambiyans/yankı submix), Mix'te Hard Limiter. Müzik ducking'i A1 hacim otomasyonu.
2. **Ara (30 s)** `filmcraft/kaplan-arena-ara.fcproj`: sabit kamera, periyodik sis bandı (sabit hız, 30 s'de tam bir periyot), periyodik toz ve ışık nefesi, sabit yazılar. Ses: `ara-muzik.wav` kaynak 14,9–44,9 s + 2 s eşit güçlü sarma crossfade.
3. Projeyi kaydet → medya yollarını göreli yap → yeniden aç, `media.status` hepsi `online` → FilmCraft `export` (offline medyada çıkış kodu 1; `--allow-offline` kullanılmıyor).
4. ffprobe/ffmpeg yalnız **doğrulama** için: tam decode, süre/kare, çözünürlük, fps, ses, EBU R128, true peak, efekt anlarında kısa dönem loudness, döngü sınırı (3 tur) ve anahtar kareler.
5. Uygulama: `assets/sinematik/` web kopyaları, admin kontrolleri, sahnede sabit `<video>` katmanı, ortak duraklatma, fallback, PS sunucusunda mp4 + byte-range.
6. Testler, `FILMCRAFT-TESLIM-RAPORU.md`, commit + normal push.
