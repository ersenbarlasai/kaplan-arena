"""Kayit temelli efektleri hazirlar; sentez veya yeni dalga bicimi uretmez.
Kaynaklar korunur. Kesitler otomatik enerji tespitiyle secilir; final kurgu dinlemesi gerekir.
"""
from pathlib import Path
import subprocess,json,hashlib
import numpy as np
from scipy.signal import butter,sosfilt

ROOT=Path(__file__).resolve().parent
SR=48000
OUT=ROOT/'hazir'; OUT.mkdir(exist_ok=True)
records=[]
def read(name):
    p=ROOT/'kaynaklar'/name
    d=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-ar',str(SR),'-ac','2','-f','f32le','-'],capture_output=True,check=True)
    return np.frombuffer(d.stdout,dtype='<f4').reshape(-1,2).astype(np.float64)
def clip(x,seconds,method='onset'):
    n=min(len(x),int(seconds*SR))
    if n==len(x): return x.copy(),0
    mono=np.mean(x*x,axis=1)
    bins=np.array([np.mean(mono[i:i+480]) for i in range(0,len(x),480)])
    if method=='peak': at=int(np.argmax(bins))*480
    else:
        hits=np.where(bins>max(np.max(bins)*.015,1e-7))[0]
        at=int(hits[0])*480 if len(hits) else 0
    start=max(0,min(at-int(.04*SR),len(x)-n))
    return x[start:start+n].copy(),start/SR
def lowpass(x,hz): return sosfilt(butter(3,hz,fs=SR,output='sos'),x,axis=0)
def fade(x,attack=.006,release=.06):
    x=x.copy(); a=min(int(attack*SR),len(x)//3); b=min(int(release*SR),len(x)//3)
    x[:a]*=np.linspace(0,1,a)[:,None]; x[-b:]*=np.linspace(1,0,b)[:,None]
    return x
def write(name,x,sources,changes):
    x=fade(x)
    peak=float(np.max(np.abs(x)))
    if peak: x*=.5/peak
    p=OUT/name
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-c:a','pcm_s24le',str(p)],input=x.astype('<f4').tobytes(),capture_output=True,check=True)
    check=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-f','null','-'],capture_output=True)
    assert check.returncode==0
    records.append({'file':'hazir/'+name,'sources':sources,'changes':changes+['resampled to 48kHz stereo 24-bit PCM for editing; lost source fidelity is not restored','short edge fades','sample peak normalized to -6.02 dBFS'],'duration_s':round(len(x)/SR,6),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'full_decode_ok':True,'license':'CC0-1.0','selection':'automatic waveform/energy selection, not final listening approval'})

tiger=read('kaplan-lauramellis-CC0-turev.m4a')
write('kaplan-kukreme-gercek.wav',tiger,['kaplan-lauramellis-CC0-turev.m4a'],['no additional pitch or artificial roar layers; existing public derivative is 1.6 seconds'])
steel=read('celik-carpisma-BigSoundBank.mp3')
hit,offset=clip(steel,1.8,'onset')
slide=read('kilic-suruntu-BigSoundBank.mp3')
mix=hit.copy(); n=min(len(slide),len(mix)); mix[:n]+=.25*slide[:n]
write('kilic-temas-kayit-foley.wav',mix,['celik-carpisma-BigSoundBank.mp3','kilic-suruntu-BigSoundBank.mp3'],[f'steel recording excerpt starts {offset:.3f}s','layered real steel-bar impact with recorded blade scrape; NOT documentary sword-on-sword recording'])
write('kilic-suruntu-gercek.wav',slide,['kilic-suruntu-BigSoundBank.mp3'],['full recorded blade/metal scrape'])
write('kalkan-vurus-kayit-foley.wav',lowpass(hit,4500),['celik-carpisma-BigSoundBank.mp3'],[f'excerpt starts {offset:.3f}s','lowpass 4500Hz; recorded steel impact used as shield Foley, not actual shield recording'])
door,do=clip(read('kapi-hareket-BigSoundBank.mp3'),6,'onset')
chain=read('zincir-BigSoundBank.mp3')
dm=door.copy(); n=min(len(chain),len(dm)-int(.3*SR)); dm[int(.3*SR):int(.3*SR)+n]+=.12*chain[:n]
write('kapi-acilis-kayit-foley.wav',dm,['kapi-hareket-BigSoundBank.mp3','zincir-BigSoundBank.mp3'],[f'barn door excerpt starts {do:.3f}s','heavy chain mixed at low level from 0.3s; castle-gate role, not recording of an actual castle'])
cr,co=clip(read('kapi-gicirti-BigSoundBank.mp3'),3.5,'onset')
write('kapi-gicirti-gercek.wav',cr,['kapi-gicirti-BigSoundBank.mp3'],[f'recorded creak Foley excerpt starts {co:.3f}s'])
stib,so=clip(read('kapi-stib-fs346267.m4a'),4,'onset')
write('kapi-gicirti-stib-alternatif.wav',stib,['kapi-stib-fs346267.m4a'],[f'wooden edit-suite door excerpt starts {so:.3f}s; backup natural door recording'])
write('zincir-gercek.wav',chain,['zincir-BigSoundBank.mp3'],['full heavy chain movement recording'])
write('savurma-gercek.wav',read('savurma-BigSoundBank.mp3'),['savurma-BigSoundBank.mp3'],['full physically recorded sword-swish Foley'])
(ROOT/'hazir-sesler.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')

mapping={'ses-taslaklari/kaplan-kukreme-STILIZE-TASLAK.wav':'ses-gercek/hazir/kaplan-kukreme-gercek.wav','ses-taslaklari/kilic-metal-01.wav':'ses-gercek/hazir/kilic-temas-kayit-foley.wav','ses-taslaklari/kalkan-vurus-01.wav':'ses-gercek/hazir/kalkan-vurus-kayit-foley.wav','ses-taslaklari/kapi-gurultu-01.wav':'ses-gercek/hazir/kapi-acilis-kayit-foley.wav','ses-taslaklari/gecis-whoosh-01.wav':'ses-gercek/hazir/savurma-gercek.wav'}
if (OUT/'kukreme-kullanici.wav').exists():
    mapping['ses-taslaklari/kaplan-kukreme-STILIZE-TASLAK.wav']='ses-gercek/hazir/kukreme-kullanici.wav'
    mapping['ses-gercek/hazir/kaplan-kukreme-gercek.wav']='ses-gercek/hazir/kukreme-kullanici.wav'
(ROOT/'efekt-esleme.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2),encoding='utf-8')

titles=['Gerçek kaplan kükremesi','Kılıç teması — kayıt temelli foley','Kılıç / metal sürtünmesi','Kalkan vuruşu — kayıt temelli foley','Ağır kapı açılışı — kayıt temelli foley','Kapı gıcırtısı','Ahşap kapı — alternatif','Ağır zincir','Savurma']
cards=''.join(f'<article><h2>{title}</h2><p>{v["duration_s"]:.2f} sn · CC0 · 48 kHz WAV</p><audio controls preload="none" src="{v["file"]}"></audio><a href="{v["file"]}" download>WAV indir</a></article>' for title,v in zip(titles,records))
html='''<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kaplan Arena — Kayıt Temelli Efektler</title><style>body{margin:0;background:#102d30;color:#f5e9d2;font:17px/1.6 system-ui}main{max-width:1000px;margin:auto;padding:32px 20px}h1{color:#e8c176}h2{font-size:21px;margin:0}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}article{background:#193c3e;border:1px solid #7c714c;padding:20px;border-radius:12px}audio{width:100%;margin:12px 0}a{color:#ebcc8c}p{margin:8px 0}.note{padding:18px;background:#214245;margin:24px 0}</style><main><h1>Kayıt Temelli Efektler</h1><p>Kaplan Arena sinematik paketi. Otomatik oynatma yok; her kaydı aşağıdan dinleyebilirsin.</p><div class="note">Kaplan alan kaydıdır. Kılıç/kalkan ve kale kapısı sesleri gerçek nesne kayıtlarının düzenlendiği foley sürümleridir; doğrudan savaş veya kale kaydı değildir. Kaynaklar sıkıştırılmış olabilir; WAV'a dönüştürme kayıp ayrıntıyı geri getirmez. Kesitlerin final miks ve dinleme değerlendirmesi kurgu aşamasında yapılır.</div><section>'''+cards+'''</section><p><a href="KAYNAK-LISANS.md">Kaynak ve lisans listesi</a> · <a href="CLAUDE-EFEKT-TESLIMI.md">Claude teslim notu</a></p></main></html>'''
(ROOT/'DINLE.html').write_text(html,encoding='utf-8')
print(f'{len(records)} kayit temelli WAV, esleme ve yerel dinleme sayfasi hazir.')
