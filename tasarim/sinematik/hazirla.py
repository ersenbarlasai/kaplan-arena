"""Sinematik paketinin SVG, ses taslagi, manifest ve onizlemelerini yeniden uretir.
Raster illustasyonlari degistirmez. Uygulama kodunu degistirmez.
"""
from pathlib import Path
import hashlib, json, math, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent
LAYERS = ROOT / 'katmanlar'
AUDIO = ROOT / 'ses-taslaklari'
for d in [LAYERS, AUDIO, ROOT/'onizleme']:
    d.mkdir(exist_ok=True)

def svg(name, body, view='0 0 1920 1080'):
    (LAYERS/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">{body}</svg>', encoding='utf-8')

svg('isik-huzmeleri.svg', '<defs><linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffe3a0" stop-opacity=".35"/><stop offset="1" stop-color="#ffe3a0" stop-opacity="0"/></linearGradient></defs><g fill="url(#l)"><path d="M1350 0 850 1080h400L1450 0Z"/><path d="M1540 0 1340 1080h260L1600 0Z"/><path d="M1180 0 200 1080h330L1240 0Z"/></g>')
svg('sis-seridi.svg', '<defs><filter id="b"><feGaussianBlur stdDeviation="40"/></filter></defs><g fill="#bdcfc0" opacity=".14" filter="url(#b)"><ellipse cx="120" cy="860" rx="500" ry="85"/><ellipse cx="840" cy="950" rx="630" ry="95"/><ellipse cx="1660" cy="815" rx="540" ry="80"/></g>')
rng = np.random.default_rng(20261125)
particles=''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="#f2cf88" opacity="{o:.2f}"/>' for x,y,r,o in zip(rng.uniform(80,1840,65),rng.uniform(50,1030,65),rng.uniform(1,3.5,65),rng.uniform(.12,.6,65)))
svg('altin-toz.svg',particles)
burst=''.join(f'<path d="M{640+math.cos(a)*18:.1f} {360+math.sin(a)*18:.1f}l{math.cos(a)*r:.1f} {math.sin(a)*r:.1f}"/>' for a,r in zip(rng.uniform(0,math.tau,24),rng.uniform(35,130,24)))
svg('temas-kivilcim.svg',f'<g stroke="#ffcf72" stroke-width="3" stroke-linecap="round">{burst}</g><circle cx="640" cy="360" r="9" fill="#fff3c6"/>','0 0 1280 720')
for name,color in [('teal','#16534f'),('altin','#a76d27')]:
    svg(f'bayrak-{name}.svg',f'<path d="M25 15h270v395L160 485 25 410Z" fill="{color}" stroke="#d5b16c" stroke-width="5"/><path d="M42 32h236v368l-118 65-118-65Z" fill="none" stroke="#d5b16c" stroke-width="2"/><path d="M8 12h304" stroke="#bd9654" stroke-width="10"/>','0 0 320 500')
svg('baslik-cerceve.svg','<g fill="none" stroke="#d6b56d"><path d="M220 390h570m340 0h570M220 600h570m340 0h570" stroke-width="2"/><path d="m960 365 25 25-25 25-25-25Zm0 210 25 25-25 25-25-25Z" stroke-width="3"/></g>')

def filtered(noise, lo, hi, sr):
    return sosfilt(butter(3,[lo,hi],btype='bandpass',fs=sr,output='sos'),noise)

SR=48000
audio_report=[]
def write_wav(name, signal):
    signal=np.asarray(signal,dtype=float)
    signal=np.nan_to_num(signal)
    n=len(signal)
    fade=min(int(.018*SR),n//4)
    signal[:fade]*=np.linspace(0,1,fade)
    signal[-fade:]*=np.linspace(1,0,fade)
    peak=float(np.max(np.abs(signal)))
    if peak: signal*=.36/peak
    # Stereo centered; editor can pan by shot.
    pcm=(np.column_stack([signal,signal])*32767).astype('<i2')
    with wave.open(str(AUDIO/name),'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
    audio_report.append({'file':name,'duration':round(n/SR,3),'sample_rate':SR,'channels':2,'peak_dbfs':round(20*math.log10(.36),2),'origin':'procedural synthesized draft, not field recording'})

def metal(name, freqs, dur, decay):
    t=np.arange(int(dur*SR))/SR
    s=sum((1/(i+1))*np.sin(math.tau*f*t)*np.exp(-t*(decay+i*.7)) for i,f in enumerate(freqs))
    s+=filtered(rng.normal(size=len(t)),1700,12000,SR)*np.exp(-t*35)*.7
    s*=np.minimum(t/.003,1)
    write_wav(name,s)
metal('kilic-metal-01.wav',[1130,1737,2640,3491,5077],1.6,4.2)
metal('kalkan-vurus-01.wav',[117,211,347,589,1009],1.5,4.8)
t=np.arange(int(1.2*SR))/SR
write_wav('gecis-whoosh-01.wav',filtered(rng.normal(size=len(t)),400,8500,SR)*np.sin(np.pi*t/1.2)**3)
t=np.arange(int(3.5*SR))/SR
en=np.minimum(t/.4,1)*np.minimum((3.5-t)/.8,1)
write_wav('kapi-gurultu-01.wav',(filtered(rng.normal(size=len(t)),35,420,SR)*.6+np.sin(math.tau*(57*t+2*np.sin(t*8)))*.15)*en)
t=np.arange(int(3*SR))/SR
s=sum(np.sin(math.tau*f*t)*np.exp(-t*(1.7+i*.3))*.4/(i+1) for i,f in enumerate([110,220,330,440,660]))
write_wav('baslik-vurgusu-01.wav',s*np.minimum(t/.025,1))
t=np.arange(int(2.8*SR))/SR
f=81+22*np.sin(np.pi*t/2.8)-17*t/2.8
phase=math.tau*np.cumsum(f)/SR
growl=sum(np.sin(phase*k)/k for k in range(1,15))
growl=filtered(growl,110,2200,SR)
breath=filtered(rng.normal(size=len(t)),250,1700,SR)
en=np.sin(np.pi*t/2.8)**.8
write_wav('kaplan-kukreme-STILIZE-TASLAK.wav',(growl*.55+breath*.5)*(1+.18*np.sin(math.tau*23*t))*en)
(AUDIO/'ses-kontrol.json').write_text(json.dumps(audio_report,ensure_ascii=False,indent=2),encoding='utf-8')

rows=[
('01',0,6,'01-dunya-kesfi.png','Dunya / orman vadisi','Slow push 1.00 to 1.05; light fog','A world of ancient teal forests, warm dawn and a distant castle and arena. Very slow dolly forward, mist drifts gently, stable architecture. No new people, text or abrupt zoom.'),
('02',6,12,'02-kaplan-yolculuk.png','Kaplanin yolculugu','Slow right pan; cloak subtle','Keep the same orange tiger guide, teal gold leaf-trim cloak and anatomy. Camera slowly advances from behind, cloak and leaves move softly, tiger makes one small deliberate step. Preserve valley geometry; no face morph, no weapons.'),
('03',12,18,'03-kale-kapisi.png','Kale kapisi','Push in; light seam, then cut','Monumental double wooden gates slowly open inward by a small angle, warm light through the seam, soft low fog, slight camera push. Preserve arch and both door leaves, no melting hinges or new text. If geometry cannot be preserved do not force opening; use light seam and cut.'),
('04',18,24,'04-turnuva-karsilasma.png','Turnuva karsilasmasi','Short 4 percent push, one clear action','Two adult armored sentinels in ceremonial sparring exchange one controlled blade contact and recover stance. Preserve armor, two bodies and one sword/shield each; no extra limbs, no injuries or blood. Slow camera arc less than 5 degrees, warm courtyard light. No repeated frantic combat.'),
('05',24,27,'05-kilic-temasi.png','Kilic temasi','Brief impact pulse on contact','Close shot of two gauntleted hands and two crossed steel blades. One short contact with tiny sparks and slight recoil; locked camera, coherent blades and grips, no extra hands. No explosion or flashing white screen.'),
('06',27,31,'06-kalkan-temasi.png','Kalkan temasi','Short lateral move; one contact','A staged ceremonial sword strike meets the gold shield once and recoils; keep foreground armored observer stationary and background two sparring sentinels coherent. No injury, blood, additional people or weapons, no shield penetration. Small sparks at contact only.'),
('07',31,38,'07-arenaya-giris.png','Arenaya giris','Gentle camera forward toward center','Rear view of the same small cloaked tiger guide approaching the sunlit arena. One or two calm steps, gentle forward dolly, warm dust, preserve tiger stripe/cloak identity and architectural arches. No running, no new crowd or characters.'),
('08',38,44,'08-arena-ihtisam.png','Arenanin ihtisami','Slow upward reveal, gold particles','Empty grand ancient arena in warm sunrise, very slow camera rise and forward drift, gentle blank banner movement and floating dust. Keep architecture stable. No battle, text, podium or new subjects.'),
('09',44,48,'09-kaplan-kukreme.png','Kaplan kukremesi','Subtle push, title cue at 44.5','Same tiger portrait on right, proud brief natural roar then relax jaw, preserve teeth, jaw and stripe anatomy, slight cloak motion, camera almost locked. Leave left negative space clean. No attack or horror, no text. If mouth animation fails keep still portrait and use sound cue rather than deform face.'),
('10',48,60,'10-final-kunye.png','Baslik ve kulup kunyesi','Settle into readable final card','Calm illustrated valley background, almost locked camera and minimal mist; no new objects, no text, no tiger. All title and credits will be added as real composited typography outside this clip.'),
]
shots=[]
for sid,start,end,file,title,motion,i2v in rows:
    shots.append({'id':sid,'start_s':start,'end_s':end,'duration_s':end-start,'start_frame_30fps':start*30,'end_frame_exclusive_30fps':end*30,'image':'sahneler/'+file,'title':title,'motion_2_5d':motion,'image_to_video_prompt':i2v,'text_baked_into_image':False})
manifest={'version':1,'status':'prepared stills, SVG layers and synthesized audio drafts; no finished video; see girdiler/muzik-envanter.json for current music', 'opening':{'duration_s':60,'fps':30,'width':1920,'height':1080,'shots':shots},'intermission':{'duration_s':30,'fps':30,'image':'sahneler/ara-arena-sakin.png','motion':'Periodic subtle fog/banner/dust; camera locked or exactly periodic; no combat or roar','image_to_video_prompt':'A locked-off empty ancient arena at blue hour, very subtle blank banner and mist motion, steady lanterns. No people, roar, blade action, text, flash or camera drift. Match first and final motion phase for a loop. Verify loop after rendering; a still image does not ensure a seamless clip.'},'credits':{'organizer':'Kaplan Okulları Yapayzeka Kulübü','mentors':['Ersen BARLAS','Alp Han KOÇDEMİR'],'students':['Emre Burak Tölegen','Burak Yoğurtçu','Halil Mert ACAR','Yekta Efe Konuk','Çınar Arda','Yusuf Emir Kuş','Ömer Araf Boncuk','Emir Karatay']},'audio_cues':[{'at_s':13,'asset':'ses-taslaklari/kapi-gurultu-01.wav'},{'at_s':22,'asset':'ses-taslaklari/kilic-metal-01.wav'},{'at_s':24.2,'asset':'ses-taslaklari/kilic-metal-01.wav'},{'at_s':28,'asset':'ses-taslaklari/kalkan-vurus-01.wav'},{'at_s':31,'asset':'ses-taslaklari/gecis-whoosh-01.wav'},{'at_s':44.3,'asset':'ses-taslaklari/kaplan-kukreme-STILIZE-TASLAK.wav','note':'synthetic stylized draft; evaluate by ear or replace with licensed real tiger roar'},{'at_s':48,'asset':'ses-taslaklari/baslik-vurgusu-01.wav'}]}
manifest['music'] = {'opening':'girdiler/acilis-muzik.wav','intermission':'girdiler/ara-muzik.wav','handoff':'girdiler/MUZIK-TESLIMI.md','loop_ready':False}
if (ROOT/'ses-gercek'/'efekt-esleme.json').exists():
    sfxmap = json.loads((ROOT/'ses-gercek'/'efekt-esleme.json').read_text(encoding='utf-8'))
    for cue in manifest.get('audio_cues', []):
        if cue['asset'] in sfxmap:
            cue['previous_draft'] = cue['asset']
            cue['asset'] = sfxmap[cue['asset']]
            cue['note'] = 'Recorded source / recorded-object Foley; see ses-gercek/CLAUDE-EFEKT-TESLIMI.md; final listening required.'
    manifest['recorded_sfx_handoff'] = 'ses-gercek/CLAUDE-EFEKT-TESLIMI.md'
(ROOT/'sahne-plani.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
items=shots+[{'id':'ARA','image':'sahneler/ara-arena-sakin.png','title':'30 sn sakin dongu','start_s':0,'end_s':30}]
fontpath=Path('C:/Windows/Fonts/segoeui.ttf')
font=ImageFont.truetype(str(fontpath),22) if fontpath.exists() else ImageFont.load_default()
cw,ch=640,405
board=Image.new('RGB',(cw*3,ch*4),'#0d292b')
draw=ImageDraw.Draw(board)
for i,item in enumerate(items):
    im=Image.open(ROOT/item['image']).convert('RGB')
    im.thumbnail((cw-12,353))
    x=(i%3)*cw; y=(i//3)*ch
    board.paste(im,(x+(cw-im.width)//2,y))
    draw.text((x+12,y+358),f"{item['id']} | {item['start_s']:02d}-{item['end_s']:02d} sn | {item['title']}",font=font,fill='#f3ddb1')
board.save(ROOT/'onizleme'/'sahne-panosi.jpg',quality=92)

checks=[]
for p in sorted((ROOT/'sahneler').glob('*.png')):
    with Image.open(p) as im:
        checks.append({'file':str(p.relative_to(ROOT)).replace('\\','/'),'size':list(im.size),'mode':im.mode,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(ROOT/'gorsel-envanter.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(shots)} acilis sahnesi + 1 ara sahnesi, {len(audio_report)} WAV taslagi, SVG katmanlari ve pano hazir.')
