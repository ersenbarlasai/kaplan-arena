# Müzik ve ses tasarımı

**Gerçek kayıt güncellemesi:** `ses-gercek/CLAUDE-EFEKT-TESLIMI.md` güncel SFX teslimidir. Bu paket gerçek kaplan çağrısı, kapı ve zincir kayıtları ile gerçek metal/savurma foleylerinden 9 WAV içerir. Eski sentetik efektler aşağıda arşiv açıklaması olarak kalır. Yeni kaynaklar ve CC0 bilgisi `ses-gercek/KAYNAK-LISANS.md`, dinleme sayfası `ses-gercek/DINLE.html` içindedir.

Güncelleme: Suno'da açılış ve ara besteleri üretildi ve proje klasörüne indirildi. Güncel dosya yolları için `girdiler/MUZIK-TESLIMI.md`, teknik ölçümler için `girdiler/muzik-envanter.json` dosyasını oku. Aşağıdaki metinler üretimde kullanılan yaratıcı brieflerdir; süre/BPM/bölüm taleplerinin birebir gerçekleştiği varsayılmaz. Açılış WAV'ı 58,8 saniye, ara MP3'ü yaklaşık 74,96 saniyedir; 60 saniyelik film ve 30 saniyelik loop için kurgu gerekir. Dinleme ve nihai miks değerlendirmesi Claude görevindedir.

## Açılış bestesi

**English title:** The Roar Before the Arena

**Türkçe anlamı:** Arena Öncesindeki Kükreme

**Styles prompt (İngilizce, 1.000 karakterin altında):**

```text
Instrumental cinematic fantasy adventure overture for a heroic school tournament. 120 BPM, D minor resolving toward a triumphant bright ending. Mysterious low strings and airy forest textures at first, then noble French horns, rhythmic cellos, deep orchestral drums and restrained wordless choir. Build from quiet discovery to castle gates, a short rhythmic sparring montage, then a majestic sunlit arena reveal. Main climax around 44 seconds, a brief pocket for an external tiger roar, then a strong title chord around 48 seconds and a spacious resolving tail through 60 seconds. Memorable four-note heroic motif, warm antique-gold atmosphere, powerful but not horror or aggressive metal. No lead vocal, no lyrics, no narration, no animal sounds, no sword or battle sound effects baked into the music. Clear edit points, controlled low end, natural orchestral dynamics.
```

Söz yazılmayacak; enstrümantal çıktı hedeflenir. Koro varsa anlaşılır kelime söylemez. Kükreme ve kılıç sesleri müzikten ayrı kurgulanır. Araç 60 saniyeden uzun beste verirse en iyi bölümler müzikal kesmelerle 60 saniyeye düzenlenir; bütün parçayı kaba hızlandırıp tonu bozma.

### Müzikal yapı

| Zaman | Hedef |
|---|---|
| 0–6 s | Düşük yaylı, hava, merak; sade başlangıç |
| 6–12 s | Dört notalı kahraman motifi; hafif ritim |
| 12–18 s | Kapı için yükselen beklenti, ağır vurmalı |
| 18–31 s | Kısa mücadele montajı; belirgin tempo, efektlere boşluk |
| 31–44 s | Genişleyen orkestra, arena ortaya çıkışı |
| 44–48 s | Kükreme için miks boşluğu, doruk |
| 48–60 s | Başlık akoru, künyeye sakin çözülme |

## Ara bestesi

**English title:** Embers of the Waiting Arena

**Türkçe anlamı:** Bekleyen Arenanın Korları

**Styles prompt:**

```text
Instrumental ambient fantasy intermission, calm and dignified, 80 BPM. A quiet ancient arena at blue hour, warm lanterns, drifting mist and soft banners. Low sustained strings, gentle felt piano or harp, sparse warm horn echoes, a subtle version of a four-note heroic theme. Designed as a 30-second loopable musical bed under live spoken announcements. Even dynamics, soft attacks, restrained bass, no dramatic climax, no cymbal crashes, no choir, no lyrics, no narration, no battle sounds, no tiger roar. Avoid a pronounced intro or final cadence; keep a stable harmonic atmosphere that can be edited into a seamless loop. Elegant, hopeful, spacious, related to an epic adventure without demanding attention.
```

80 BPM ve 4/4 hedefinde 10 ölçü 30 saniyedir. Gerçek BPM/faz ayrıca ölçülür. Loop noktaları aynı harmonik/ritmik fazda seçilmeli, reverb kuyruğu kesilmemeli. Gerekirse crossfade ve tail wrap uygulanır; iki kez üst üste çalan davul darbesi oluşturma. Konuşma modu müziği manuel olarak daha da kısar.

## Hazır efekt taslakları

Tümü 48 kHz, 16 bit stereo WAV; prosedürel sentez, yaklaşık −8,87 dBFS sample peak. Tek tek dosyada headroom olması toplam miksin clip etmeyeceğini garanti etmez. Bunlar kulakla nihai kalite onayı verilmiş profesyonel foley değildir; ses kontrol dosyası sadece sayısal denetimdir.

| Dosya | Süre | Kullanım |
|---|---:|---|
| kilic-metal-01.wav | 1,6 s | Kısa metalik kılıç teması; varyasyon için gain/pitch çok az değişebilir |
| kalkan-vurus-01.wav | 1,5 s | Daha tok, kısa rezonanslı kalkan vurgusu |
| gecis-whoosh-01.wav | 1,2 s | Arenaya geçişte ölçülü hava hareketi |
| kapi-gurultu-01.wav | 3,5 s | Kapı sahnesi altında düşük taş/ahşap gürültüsü |
| baslik-vurgusu-01.wav | 3 s | Başlığın altına armonik vurgu |
| kaplan-kukreme-STILIZE-TASLAK.wav | 2,8 s | Gerçek kaplan kaydı DEĞİL; stilize sentetik kükreme benzeri zamanlama taslağı. Nihai kaliteye göre değiştir |

Bir gerçek kaplan kükremesi, gerçek taş/ahşap veya uzak kalabalık kaydı istenirse lisanslı kaynak sağlanmalıdır. Bu pakette bunlar varmış gibi raporlanmaz. Efekt taslakları kullanılamıyorsa sessiz boşluk/eksik-girdi notu, kalitesiz sesi zorla yüksek çalmaktan daha uygundur.

## Miks

SFX ve müzik ayrı tutulur. Metal vuruş temas karesine hizalanır; JSON zamanları başlangıç kurgu işaretidir. Kükreme yaklaşık 44,3 s'de, başlık vurgusu 48 s'de. Efekt altında müzik 3–6 dB azaltılabilir; kulakla ayarlanır. Açılış ve ara master ses düzeyi arasında fark olmalı. Son ses sahne penceresinden tek kez çıkar. Teknik başlangıç hedefi: yaklaşık −16 LUFS-I, ≤−1 dBTP; fiziksel salon sesi admin tarafından test edilir. Sürekli çarpışma/kükreme tekrarı ara döngüsüne taşınmaz.
