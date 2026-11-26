#!/usr/bin/env bash
# FilmCraft dışa aktarımı. Offline medya varsa FilmCraft çıkış kodu 1 verir; --allow-offline KULLANILMAZ.
# Hız denetimi: CRF (FilmCraft 0.20.1'de vbr2Pass hedefi kodlayıcıda uygulanmadı; CRF ile boyut/kalite dengeli).
# Açılış CRF 22: gerçek hareketli OpenArt klipleri CRF 20'de ~8 Mbit/s (63 MB) üretti; web/salon akışı için 22.
# Ara döngüsü 44,1 kHz: 30 s = 1 323 000 örnek; AAC son çerçeve dolgusu 30,000 s'yi aşmaz (48 kHz'de 16 ms sessiz kuyruk oluşuyordu).
# Kullanım: bash disa-aktar.sh [acilis|ara]   (boş = ikisi)
set -euo pipefail
cd "$(dirname "$0")"
ONLY="${1:-}"
FC="${FILMCRAFT_CLI:-/c/Program Files/FilmCraft/filmcraft-cli.exe}"
V='"bitrateMode":"crf","crf":20,"maxRenderQuality":true'
VA='"bitrateMode":"crf","crf":22,"maxRenderQuality":true'
if [ "$ONLY" != ara ]; then
  "$FC" --project kaplan-arena-acilis.fcproj export ../ciktilar/acilis-60sn.mp4 --preset "High Quality 1080p HD" --range entire \
    --settings "{${VA},\"effects\":{\"loudness\":{\"enabled\":true,\"target_lufs\":-16.0,\"true_peak_dbtp\":-1.5}}}"
fi
if [ "$ONLY" != acilis ]; then
  "$FC" --project kaplan-arena-ara.fcproj export ../ciktilar/ara-30sn-loop.mp4 --preset "High Quality 1080p HD" --range entire \
    --settings "{${V},\"audio\":{\"codec\":\"aac\",\"sample_rate\":44100,\"bitrate_kbps\":256,\"channels\":2,\"bits\":16,\"float\":false,\"flac_level\":5},\"effects\":{\"loudness\":{\"enabled\":true,\"target_lufs\":-20.0,\"true_peak_dbtp\":-1.0}}}"
fi
