# Kaplan Arena — FilmCraft çıktılarının teknik doğrulaması (yalnız ÖLÇÜM; kurgu/düzenleme yapmaz).
# Gerekli: ffmpeg/ffprobe (PATH), Python 3 + numpy + scipy + Pillow.
# Kullanım: python -P dogrula.py            → ../ciktilar/*.mp4 ölçülür, JSON özet ve önizleme kareleri yazılır.
import json, os, subprocess, sys, tempfile, warnings
import numpy as np, scipy.io.wavfile as wavfile, scipy.signal as sg
from PIL import Image, ImageChops, ImageStat, ImageDraw
warnings.filterwarnings('ignore')
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'ciktilar'))
PRE = os.path.normpath(os.path.join(HERE, '..', 'onizleme'))
TMP = tempfile.mkdtemp(prefix='kaplan-dogrula-')
FILES = {'acilis': os.path.join(OUT, 'acilis-60sn.mp4'), 'ara': os.path.join(OUT, 'ara-30sn-loop.mp4')}

def sh(args):
    return subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')

def probe(f):
    j = json.loads(sh(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', f]).stdout)
    v = next(s for s in j['streams'] if s['codec_type'] == 'video')
    a = next((s for s in j['streams'] if s['codec_type'] == 'audio'), None)
    return {
        'boyut_bayt': int(j['format']['size']), 'sure_s': float(j['format']['duration']),
        'video': {'codec': v['codec_name'], 'profil': v.get('profile'), 'genislik': v['width'], 'yukseklik': v['height'],
                  'fps': v['r_frame_rate'], 'kare': int(v.get('nb_frames', 0)), 'pix_fmt': v['pix_fmt'], 'sure_s': float(v.get('duration', 0)),
                  'bit_hizi_kbps': round(int(v.get('bit_rate', 0)) / 1000)},
        'ses': None if not a else {'codec': a['codec_name'], 'ornekleme_hz': int(a['sample_rate']), 'kanal': a['channels'],
                                   'sure_s': float(a.get('duration', 0)), 'bit_hizi_kbps': round(int(a.get('bit_rate', 0)) / 1000)},
    }

def decode_ok(f):
    r = sh(['ffmpeg', '-hide_banner', '-v', 'error', '-i', f, '-f', 'null', '-'])
    return r.returncode == 0 and not r.stderr.strip(), r.stderr.strip()[:400]

def loudness(f):
    r = sh(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    txt = r.stderr[r.stderr.rfind('Summary:'):]
    def val(key):
        for line in txt.splitlines():
            s = line.strip()
            if s.startswith(key):
                return float(s.split()[1])
        return None
    return {'entegre_LUFS': val('I:'), 'LRA_LU': val('LRA:'), 'true_peak_dBTP': val('Peak:')}

def wav(f, name):
    p = os.path.join(TMP, name + '.wav')
    sh(['ffmpeg', '-y', '-v', 'error', '-i', f, '-vn', '-acodec', 'pcm_s16le', p])
    sr, x = wavfile.read(p)
    return sr, x.astype(np.float64) / 32768

def sample_peak_db(x):
    return round(20 * np.log10(np.abs(x).max() + 1e-12), 2)

EVENTS = [('Kapı / zincir başlangıcı', 13.0, 'kapi-acilis-kayit-foley + kapi-gicirti-gercek + zincir-gercek'),
          ('Kapı ana darbe (ışık parlaması)', 17.07, 'kapi-acilis-kayit-foley (kaynak 4,07 s)'),
          ('Kılıç teması 1', 22.0, 'kilic-temas-kayit-foley (+ savurma-gercek öncesi, kilic-suruntu-gercek sonrası)'),
          ('Kılıç teması 2', 24.2, 'kilic-temas-kayit-foley (+ kilic-suruntu-gercek)'),
          ('Kalkan teması', 28.0, 'kalkan-vurus-kayit-foley (+ savurma-gercek öncesi)'),
          ('Geçiş savurması', 31.0, 'savurma-gercek'),
          ('Kükreme', 44.3, 'kukreme-kullanici'),
          ('Başlık vurgusu', 48.0, 'ses-taslaklari/baslik-vurgusu-01 (sentetik tasarım sesi)')]

def sfx(sr, x):
    m = x.mean(1)
    b, a = sg.butter(2, 80 / (sr / 2), 'high'); y = sg.lfilter(b, a, m)
    def win(t0, t1, L=0.1, hop=0.01):
        return np.array([10 * np.log10((y[int(t * sr):int((t + L) * sr)] ** 2).mean() + 1e-12) for t in np.arange(t0, t1 - L, hop)])
    res = []
    for n, t, src in EVENTS:
        pre = float(np.median(win(t - 1.2, t - 0.15))); post = float(win(t - 0.02, t + 0.35).max())
        res.append({'olay': n, 'zaman_s': t, 'kaynak': src, 'muzik_oncesi_dB': round(pre, 1), 'olay_dB': round(post, 1), 'fark_dB': round(post - pre, 1)})
    return res

def onset_in_stem(sr, x, t, span=0.12):
    # Kılıç/kalkan temasının transient'i: 1 ms pencerede enerji sıçraması (yalnız ilgili SFX izinin ayrı renderında)
    m = x.mean(1); h = max(1, sr // 1000)
    s0 = int((t - span) * sr); e = np.array([(m[i:i + h] ** 2).mean() for i in range(s0, int((t + span) * sr), h)])
    base = np.median(e[:max(10, int(0.05 * len(e)))]) + 1e-15
    hit = np.where(e > base * 30)[0]
    return None if not len(hit) else round(1000 * ((s0 + hit[0] * h) / sr - t), 1)

def loop_audio(sr, x, n=3):
    m = x.mean(1); N = len(m); c = np.concatenate([m] * n)
    d = np.abs(np.diff(m)); jump = abs(m[0] - m[-1])
    h = int(sr * 0.005)
    rms = lambda s: 20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-12)
    around = [round(rms(c[i:i + h]), 1) for i in range(N - 10 * h, N + 10 * h, h)]
    body = [rms(m[i:i + h]) for i in range(h, N - h, h)]
    return {'ornek_sayisi': N, 'sure_s': N / sr, 'sinir_sicramasi': round(float(jump), 5), 'tipik_fark_p99': round(float(np.percentile(d, 99)), 5),
            'sinir_5ms_rms_dB': around, 'govde_5ms_rms_min_dB': round(float(np.percentile(body, 1)), 1),
            'sinirda_sessizlik_var': bool(min(around) < np.percentile(body, 1) - 10)}

def frames(f, times, prefix, width=1280):
    out = []
    for t in times:
        p = os.path.join(TMP, f'{prefix}-{t:06.3f}.png')
        sh(['ffmpeg', '-y', '-v', 'error', '-ss', f'{t:.3f}', '-i', f, '-frames:v', '1', p])
        out.append(p)
    return out

def loop_video(f):
    # Son kare (899) → ilk kare (0) farkı ile ardışık karelerin tipik farkını karşılaştır.
    d = os.path.join(TMP, 'loopv'); os.makedirs(d, exist_ok=True)
    sh(['ffmpeg', '-y', '-v', 'error', '-i', f, '-vf', 'scale=480:-1', os.path.join(d, '%04d.png')])
    fs = sorted(os.listdir(d)); ims = [Image.open(os.path.join(d, x)).convert('L') for x in fs]
    diffs = [ImageStat.Stat(ImageChops.difference(ims[i], ims[i + 1])).mean[0] for i in range(len(ims) - 1)]
    wrap = ImageStat.Stat(ImageChops.difference(ims[-1], ims[0])).mean[0]
    return {'kare': len(ims), 'ardisik_fark_ort': round(float(np.mean(diffs)), 4), 'ardisik_fark_max': round(float(np.max(diffs)), 4),
            'sarma_farki_899_0': round(float(wrap), 4), 'sarma_kesintisiz': bool(wrap <= max(np.max(diffs), np.mean(diffs) * 3))}

def sheet(paths, labels, out, cols=3, w=640):
    ims = [Image.open(p).convert('RGB') for p in paths]
    h = int(w * ims[0].height / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * w, rows * (h + 26)), (8, 22, 24)); D = ImageDraw.Draw(S)
    for i, (im, lb) in enumerate(zip(ims, labels)):
        x, y = (i % cols) * w, (i // cols) * (h + 26)
        S.paste(im.resize((w, h)), (x, y)); D.text((x + 8, y + h + 6), lb, fill=(240, 214, 150))
    S.save(out, quality=86)

def main():
    rep = {}
    os.makedirs(PRE, exist_ok=True)
    for k, f in FILES.items():
        r = {'dosya': os.path.relpath(f, os.path.join(HERE, '..')).replace('\\', '/'), 'probe': probe(f)}
        ok, err = decode_ok(f); r['tam_decode_hatasiz'] = ok; r['decode_hata'] = err
        r['loudness'] = loudness(f)
        sr, x = wav(f, k); r['ornek_tepe_dBFS'] = sample_peak_db(x)
        if k == 'acilis':
            r['efektler'] = sfx(sr, x)
            times = [2, 15, 25, 35, 46, 55]
            ps = frames(f, times, 'acilis')
            for p, t in zip(ps, times): Image.open(p).convert('RGB').resize((1280, 720)).save(os.path.join(PRE, f'acilis-{t:02d}sn.jpg'), quality=84)
            extra = [13.4, 17.1, 22.033, 24.233, 28.033, 44.5, 49.5, 59.9]
            pe = frames(f, extra, 'acilis-x')
            sheet(ps + pe, [f'{t:g} s' for t in times + extra], os.path.join(PRE, 'acilis-kareler.jpg'))
        else:
            r['dongu_ses'] = loop_audio(sr, x)
            r['dongu_goruntu'] = loop_video(f)
            ps = frames(f, [0, 10, 20, 29.967], 'ara')
            for p, t in zip(ps, [0, 10, 20, 29.967]): Image.open(p).convert('RGB').resize((1280, 720)).save(os.path.join(PRE, f'ara-{int(round(t)):02d}sn.jpg'), quality=84)
        rep[k] = r
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    with open(os.path.join(HERE, 'dogrulama-sonuclari.json'), 'w', encoding='utf-8') as fh: json.dump(rep, fh, ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
