# Kaynaklar ve kullanım izinleri

**Ek kullanıcı dosyası:** `kaynaklar/kukreme-kullanici.mp3` ve `hazir/kukreme-kullanici.wav`, kullanıcının seçtiği yeni kükremedir. Bu dosya aşağıdaki CC0 listesine dahil değildir; kaynak/lisans belirtilmedi. Kullanım kararı ve ayrıntılar `KUKREME-KULLANICI-NOTU.md` içindedir.

Kontrol tarihi: 26 Kasım 2026. Bu pakette kullanılan kaynaklar ilgili sayfalarda **CC0 1.0 / public domain** olarak sunuluyor. Kaynak sayfaları ve yaratıcılar aşağıda, dosya hash'leri envanterde. CC0 kullanma, düzenleme ve projeye dağıtma için uygundur; atıf zorunlu olmasa da izlenebilirlik için bu listeyi projeyle tut.

## 1. Kaplan — lauramellis

- Eser: Tiger Roar.
- Asıl kayıt/künye: https://freesound.org/people/lauramellis/sounds/263115/
- Kayıt açıklaması: Louisville Zoo, Kentucky'de alınmış tek kaplan çağrısı; kaynak kaplanın alt türünü belirtmiyor.
- Lisans: CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- İndirilen kopya: https://github.com/nature-tycoon/second-growth/blob/main/assets/sounds/field-tiger-1.m4a
- Bu kopyanın kaynak ve dönüşüm kaydı: https://github.com/nature-tycoon/second-growth/blob/main/assets/sounds/field-sources.json
- Lisans beyanı: https://github.com/nature-tycoon/second-growth/blob/main/assets/sounds/LICENSES.md
- Yerel kaynak: kaynaklar/kaplan-lauramellis-CC0-turev.m4a.
- Önemli biçim bilgisi: 1,6 saniyelik, daha önce kesilmiş/filtrelenmiş/normalize edilmiş 32 kHz mono AAC türev kullanıldı. Özgün 24-bit WAV veya yeni stüdyo kaydı değildir. Bu pakette sentetik kükremeyle karıştırılmadı; hazır sürümde ek perde değiştirme yapılmadı.

## 2. Ahşap kapı — stib

- Eser: Door Creak.
- Asıl sayfa: https://freesound.org/people/stib/sounds/346267/
- Lisans: CC0 1.0.
- Köken: kayıtçının ahşap çalışma odası kapısının açılıp kapanması; Zoom H1 XY mikrofonları belirtiliyor.
- Kamuya açık kopya/künye: https://www.panor.tech/sound/r/297/
- Ses URL: https://www.panor.tech/soundscape/api/soundscapes/297/public-media/audio
- Yerel kaynak: kaynaklar/kapi-stib-fs346267.m4a.
- Kopya sıkıştırılmış M4A'dır; özgün WAV diye sunulmaz. Hazır klasöründeki alternatif 4 saniyelik kesit, ilk belirgin hareketten otomatik seçildi.

## 3. Metal, kapı ve savurma — Joseph SARDIN / BigSoundBank

Genel lisans açıklaması: https://bigsoundbank.com/licenses.html

Her indirme sayfasında CC0 ve ücretsiz kullanım ifadesi ayrıca kontrol edildi. Sayfalar lisanslar/ altında HTML olarak saklandı. Bunlar gerçek nesne/foley kökenli seslerdir; kılıç/kalkan karışımları bu kayıtların kompozitleridir.

| Yerel kaynak | Sayfa | Köken / rol |
|---|---|---|
| kilic-suruntu-BigSoundBank.mp3 | https://bigsoundbank.com/sword-s0129.html | Metal/kılıç yüzeylerinin kayma-sürtünme foleyi; tek başına düello kaydı değil |
| savurma-BigSoundBank.mp3 | https://bigsoundbank.com/sword-through-the-air-s0128.html | Havayı kesen savurma foleyi |
| celik-carpisma-BigSoundBank.mp3 | https://bigsoundbank.com/fall-2-sheet-steel-bars-1-s1776.html | İki çelik parçanın zemine çarpması; kılıç ve kalkan teması için gerçek metal katmanı |
| kapi-hareket-BigSoundBank.mp3 | https://bigsoundbank.com/wooden-barn-door-s0538.html | Ağır ahşap ahır kapısının açılıp kapanması |
| kapi-gicirti-BigSoundBank.mp3 | https://bigsoundbank.com/creaking-barn-door-s0539.html | Kapı gıcırtısını canlandıran fiziksel foley |
| zincir-BigSoundBank.mp3 | https://bigsoundbank.com/heavy-chain-s0359.html | Hareket eden ağır zincir |

İndirme URL'leri `kaynaklar-indirme.json` içinde. Bunlar MP3 kaynaklardır. 48 kHz/24-bit WAV'a dönüştürülmeleri, özgün kayıptan önceki ayrıntıyı geri getirmez veya kaynakları kayıpsız master yapmaz.

## Uyarlamalar

`hazirla-sesler.py` yeniden üretim tarifidir. `hazir-sesler.json` her hazır sesin kaynaklarını ve gerçek kesit başlangıcını gösterir. İşlemler kısa kesme, kenar fade, baş boşluğu için seviye ayarı ve bazı seslerde hafif filtre/katmanlamadır. Hiçbir hazır ses osilatör/noise sentezinden üretilmedi. Kalkan ve kale kapısı için yapılan düzenleme bir sahneye uygun foleydir; doğrudan tarihî kale veya kılıç-kalkan karşılaşması kaydı olduğu iddia edilmez.

## İsteğe bağlı kısa atıf

```text
Kayıt temelli sesler: lauramellis (Tiger Roar), stib (Door Creak), Joseph SARDIN / BigSoundBank (metal, ahşap kapı, zincir ve savurma), CC0 1.0. Kaplan kaydı için kamuya açık türev: nature-tycoon/second-growth; kapı kopyası: Panor Soundscape. Kesit ve ses düzenlemesi: Kaplan Arena projesi. Ayrıntılı kaynaklar KAYNAK-LISANS.md içindedir. Kayıtçılar projeyi destekliyor/onaylıyor anlamı çıkarılmamalıdır.
```

CC0 metni: https://creativecommons.org/publicdomain/zero/1.0/

Araştırmada görülen AI/sentez ses katalogları bu kayıt paketine dahil edilmedi. Kaynakların kökeni sağlayıcı/kayıtçı beyanlarına dayanır; bağımsız saha doğrulaması veya final dinleme/miks onayı yapıldığı iddia edilmez.
