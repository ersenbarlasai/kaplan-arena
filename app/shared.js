/* Kaplan Arena — ortak tanımlar ve kalıcı kayıt (admin, sahne ve telefon birlikte kullanır). */
document.documentElement.lang = 'tr';
const KEY = 'kaplan-arena-v1';
const SUBJECTS = ['Türkçe','Matematik','Fen Bilimleri','Sosyal Bilimler','Spor'];
const STAGES = [
  {key:'s1', name:'1. Etap', place:'Orman Geçidi', img:'orman', to:'Orman Geçidi’ne', at:'Orman Geçidi’nde'},
  {key:'s2', name:'2. Etap', place:'Kadim Kale', img:'kale', to:'Kadim Kale’ye', at:'Kadim Kale’de'},
  {key:'final', name:'Final', place:'Kaplan Arenası', img:'arena', to:'Kaplan Arenası’na', at:'Finalde'}
];
const TABS = [{key:'s1',name:'1. Etap'},{key:'s2',name:'2. Etap'},{key:'final',name:'Final'},{key:'tie',name:'Eşitlik (Yedek)'}];
const LETTERS = ['A','B','C','D'];
const DEFAULT_CLASSES = ['9A','9B','9C','10A','10B','10C','11A','11B','11C','12A','12B'];
const CREDITS = {
  org: 'Kaplan Okulları Yapayzeka Kulübü',
  mentors: ['Ersen BARLAS', 'Alp Han KOÇDEMİR'],
  students: ['Emre Burak Tölegen', 'Burak Yoğurtçu', 'Halil Mert ACAR', 'Yekta Efe Konuk', 'Çınar Arda', 'Yusuf Emir Kuş', 'Ömer Araf Boncuk', 'Emir Karatay']
};
/* Sinematik (FilmCraft çıktıları). Dosya değiştirmek için yalnız buradaki yollar güncellenir. Ses MP4 içindedir;
   yalnız etkin ses sahnesi sesli oynatır. Açılış bitince/atlanınca sabit karşılama görünür; yarışma kendiliğinden ilerlemez.
   CINE_V: /assets/ tarayıcıda 24 saat önbelleklenir; video dosyaları değişince bu sürümü artırın ki sahneler eski kopyayı
   oynatmasın (sunucular sorgu ekini yok sayar, dosya adı aynı kalır). */
const CINE_V = '2-openart';
const CINE = {
  opening:{ src:'assets/sinematik/acilis-60sn.mp4?v=' + CINE_V, dur:60, label:'Açılış filmi' },
  loop:{ src:'assets/sinematik/ara-30sn-loop.mp4?v=' + CINE_V, poster:'assets/sinematik/ara-poster.webp?v=' + CINE_V, dur:30, label:'Ara döngüsü' }
};
/* Şampiyonluk müziği: açılış bestesinin (Suno, onaylı kaynak) final bölümünden yumuşak giriş/çıkışlı ayrı kesit.
   Yalnız etkin ses sahnesi, merkezi ses ayarıyla, tek kalıcı <audio> öğesinden ve düşük seviyede döngüde çalar. */
const CHAMP_V = '1';
const CHAMP = { src:'assets/sinematik/sampiyon-muzik.m4a?v=' + CHAMP_V, level:.55 };
const JK = {
  double:{name:'Çifte Cevap', short:'2 Şık', icon:'assets/joker/joker-cift-cevap.svg', desc:'İki farklı şık işaretlenir; biri doğruysa +10, ikisi de yanlışsa −10.'},
  x2:{name:'Çift Puan', short:'×2', icon:'assets/joker/joker-cifte-puan.svg', desc:'Doğru cevap +20 puan; yanlış cevap 0 (puan kaybı yok).'},
  risk:{name:'Risk Jokeri', short:'Risk', icon:'assets/joker/joker-risk.svg', desc:'Yalnız Büyük Final: 5, 10 ya da 15 puan riske atılır; doğru cevapta kazanılır, yanlışta kaybedilir.'}
};
const JK_LOCK = 'assets/joker/joker-kilit.svg';
const PENALTY_TXT = 'Çifte Cevap yanlışsa −10 · Çift Puan yanlışsa 0 · Risk Jokeri yanlışsa seçilen puan kaybedilir.';
const REASON_TXT = {joker:'Joker tanıtımı', stage:'Sahne bağlantısı bekleniyor', break:'Ara verildi', admin:'Süre durduruldu'};

const uid = () => Math.random().toString(36).slice(2,10);
/* Güvenli rastgelelik: [0,1) (soru planı karıştırması); admin anahtarı ve kaptan kodları için kriptografik kaynak. */
function rnd01(){ try{ const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; }catch(e){ return Math.random(); } }
function randKey(n){ try{ return Array.from(crypto.getRandomValues(new Uint8Array(n || 18)), b => (b % 36).toString(36)).join(''); }catch(e){ let s = ''; while (s.length < (n || 18)) s += Math.random().toString(36).slice(2); return s.slice(0, n || 18); } }
function captainCodes(ids){ const used = new Set(), out = {}; for (const id of ids){ let c; do { c = String(1000 + rand(9000)); } while (used.has(c)); used.add(c); out[id] = c; } return out; }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n).toLocaleString('tr-TR',{maximumFractionDigits:3});
const numStr = v => typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '');
const logoImg = (kind, cls, alt) => `<img class="logo ${cls||''}" src="${LOGO[kind]}" alt="${alt==null?'Kaplan Okulları':alt}" draggable="false">`;

function parseNum(v){
  if (v == null) return null;
  let s = String(v).trim().replace(/\s/g,'');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g,'');
  const n = Number(s);
  return isFinite(n) ? n : null;
}
function rand(n){ try{ const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }catch(e){ return Math.floor(Math.random()*n); } }
function shuffle(arr){ const a = [...arr]; for (let i=a.length-1;i>0;i--){ const j = rand(i+1); [a[i],a[j]] = [a[j],a[i]]; } return a; }
function genPin(){ return String(100000 + rand(900000)); }
const pinTxt = p => String(p||'').replace(/^(\d{3})(\d{3})$/, '$1 $2');

/* ---------- armalar ----------
   Eşleşme S.settings.emblems içinde kalıcıdır (KaplanCore.assignEmblems). 12'den çok sınıfta aynı çizim
   renk tonu kaydırılarak ve küçük sıra işaretiyle çoğaltılır. */
const ROMAN = ['', 'II', 'III', 'IV', 'V', 'VI'];
/* Sınıf listesi değişince: güncel listede ya da süren yarışmada olan sınıfların eşleşmesi korunur,
   listeden çıkanların arması serbest kalır, yeni sınıf en küçük boş armayı alır. */
function syncEmblems(st){
  const s = st || S, keep = new Set(s.settings.classes);
  const g = s.game || {};
  for (const k of ['s1', 's2', 'final', 'all']) for (const t of ((g.teams || {})[k] || [])) keep.add(t.name);
  for (const n of (g.roster || [])) keep.add(n);
  const m = s.settings.emblems || (s.settings.emblems = {});
  for (const n of Object.keys(m)) if (!keep.has(n)) delete m[n];
  KaplanCore.assignEmblems(m, [...keep]);
  return m;
}
function armaHTML(n, cls, alt){
  const e = KaplanCore.emblemInfo(n == null ? 0 : n);
  const f = e.variant ? `style="filter:hue-rotate(${(e.variant*67)%360}deg) saturate(1.15)"` : '';
  return `<kb-arma class="arma ${cls||''}"><img src="assets/arma/${e.file}" alt="${esc(alt||'')}" ${f} draggable="false">${e.variant?`<i>${ROMAN[e.variant]||e.variant+1}</i>`:''}</kb-arma>`;
}

/* ---------- örnek sorular ---------- */
const D = (subject, text, options, answer) => ({id:uid(), type:'ders', subject, text, options, answer});
const T = (text, answer, unit) => ({id:uid(), type:'tahmin', text, answer, unit:unit||''});
function sampleQuestions(){
  return {
    s1: [
      T('Türkiye\'nin en uzun nehri Kızılırmak kaç kilometredir?', 1355, 'km'),
      D('Türkçe','Aşağıdaki cümlelerin hangisinde "de" bağlacının yazımı yanlıştır?',['Sen de gelecek misin?','Kitap çantanın içinde duruyor.','Ali de Ayşe de sınavı geçti.','Kardeşimde bu okula gidiyor.'],'D'),
      T('Dünya\'nın Güneş\'e ortalama uzaklığı kaç milyon kilometredir?', 149.6, 'milyon km'),
      D('Matematik','log₂64 + log₃81 işleminin sonucu kaçtır?',['8','9','10','12'],'C'),
      T('Yetişkin bir insanın vücudunda yaklaşık kaç litre kan bulunur?', 5, 'litre'),
      D('Fen Bilimleri','Periyodik tabloda atom numarası 26 olan element hangisidir?',['Bakır','Demir','Çinko','Nikel'],'B'),
      T('Mimar Sinan\'ın "ustalık eserim" dediği Selimiye Camii hangi yılda tamamlanmıştır?', 1575, ''),
      D('Sosyal Bilimler','Osmanlı Devleti\'nin ilk anayasası Kanun-i Esasi hangi padişah döneminde ilan edilmiştir?',['II. Mahmut','Abdülmecit','II. Abdülhamit','Abdülaziz'],'C'),
      T('Usain Bolt\'un 100 metre dünya rekoru kaç saniyedir?', 9.58, 'saniye'),
      D('Spor','Voleybolda bir takım, blok hariç, topa en fazla kaç kez dokunarak rakip sahaya göndermelidir?',['2','4','3','6'],'C'),
    ],
    s2: [
      T('Van Gölü\'nün yüzölçümü yaklaşık kaç kilometrekaredir?', 3713, 'km²'),
      D('Türkçe','"Çalıkuşu" romanının yazarı kimdir?',['Reşat Nuri Güntekin','Halide Edib Adıvar','Yakup Kadri Karaosmanoğlu','Ömer Seyfettin'],'A'),
      T('Işığın boşluktaki hızı saniyede yaklaşık kaç kilometredir?', 299792, 'km/sn'),
      D('Matematik','x² − 5x + 6 = 0 denkleminin köklerinin çarpımı kaçtır?',['5','−6','−5','6'],'D'),
      T('Osmanlı Devleti (1299–1922) kaç yıl sürmüştür?', 623, 'yıl'),
      D('Fen Bilimleri','Hücrede protein sentezinin gerçekleştiği organel hangisidir?',['Mitokondri','Golgi cisimciği','Ribozom','Lizozom'],'C'),
      T('Dünya\'nın en derin noktası Mariana Çukuru kaç metre derinliktedir?', 10935, 'm'),
      D('Sosyal Bilimler','Türkiye\'de kadınlara milletvekili seçme ve seçilme hakkı hangi yıl verilmiştir?',['1930','1933','1934','1946'],'C'),
      T('Galatasaray UEFA Kupası\'nı hangi yıl kazanmıştır?', 2000, ''),
      D('Spor','Olimpiyat halkalarında aşağıdaki renklerden hangisi yoktur?',['Mavi','Turuncu','Siyah','Yeşil'],'B'),
    ],
    final: [
      T('Türkiye\'nin 2024 yılı nüfusu yaklaşık kaç milyondur?', 85.7, 'milyon'),
      D('Türkçe','Mehmet Akif Ersoy\'un şiirlerini topladığı eserin adı nedir?',['Safahat','Han Duvarları','Çile','Kendi Gök Kubbemiz'],'A'),
      T('1 ile 100 arasında kaç tane asal sayı vardır?', 25, 'tane'),
      D('Matematik','Bir zar iki kez atıldığında üst yüze gelen sayıların toplamının 7 olma olasılığı kaçtır?',['1/12','1/9','1/6','7/36'],'C'),
      T('Dünya\'nın çapı yaklaşık kaç kilometredir?', 12742, 'km'),
      D('Fen Bilimleri','Ses aşağıdaki ortamların hangisinde en hızlı yayılır?',['Hava','Su','Çelik','Boşluk'],'C'),
      T('Fatih Sultan Mehmet İstanbul\'u fethettiğinde kaç yaşındaydı?', 21, 'yaş'),
      D('Sosyal Bilimler','Sakarya Meydan Muharebesi\'nden sonra TBMM, Mustafa Kemal\'e hangi rütbe ve unvanı vermiştir?',['Başkomutanlık','Mareşal rütbesi ve Gazi unvanı','Paşa unvanı','Ordu Komutanlığı'],'B'),
      T('Brezilya FIFA Dünya Kupası\'nı kaç kez kazanmıştır?', 5, 'kez'),
      D('Spor','Tenisin dört Grand Slam turnuvasından hangisi toprak kortta oynanır?',['Wimbledon','ABD Açık','Fransa Açık','Avustralya Açık'],'C'),
    ],
    tie: [
      T('İstanbul Boğazı yaklaşık kaç kilometre uzunluğundadır?', 31, 'km'),
      T('Ay, Dünya\'nın etrafındaki bir turunu yaklaşık kaç günde tamamlar?', 27.3, 'gün'),
      T('FIFA standartlarına göre bir futbol sahası kaç metre uzunluğundadır?', 105, 'm'),
    ]
  };
}
const OLD_SAMPLE_TEXTS = ['Ağrı Dağı\'nın yüksekliği kaç metredir?','İstanbul hangi yılda fethedilmiştir?','Yetişkin bir insanın vücudunda kaç kemik vardır?','Standart bir piyanoda kaç tuş vardır?','Basketbol potasının çemberi yerden kaç santimetre yüksekliktedir?','Everest Dağı\'nın yüksekliği kaç metredir?','Mustafa Kemal Atatürk hangi yıl doğmuştur?','Bir maraton koşusu kaç kilometredir?','Satranç oyununun başında tahtada toplam kaç taş bulunur?','Ay\'ın Dünya\'ya ortalama uzaklığı kaç kilometredir?','Türkiye\'nin yüzölçümü yaklaşık kaç kilometrekaredir?','Dünya\'nın Ekvator çevresi yaklaşık kaç kilometredir?','İlk FIFA Dünya Kupası hangi yıl düzenlenmiştir?','Güneş ışığı Dünya\'ya yaklaşık kaç saniyede ulaşır?','Türkiye Büyük Millet Meclisi hangi yıl açılmıştır?','365 günlük bir yılda kaç dakika vardır?','Bir günde kaç saniye vardır?','Türkiye\'de kaç il vardır?','Aşağıdakilerden hangisi eş anlamlı bir kelime çiftidir?','8 × 7 işleminin sonucu kaçtır?','Bitkilerin güneş ışığını kullanarak besin üretmesine ne ad verilir?','Cumhuriyet hangi yıl ilan edilmiştir?','Bir futbol takımı sahaya kaç oyuncuyla çıkar?','"Kitaplık" kelimesindeki "-lık" eki ne tür bir ektir?','Bir üçgenin iç açılarının toplamı kaç derecedir?','Suyun kimyasal formülü hangisidir?','Aşağıdaki ülkelerden hangisinin Türkiye ile kara sınırı yoktur?','Yaz Olimpiyat Oyunları kaç yılda bir düzenlenir?','Aşağıdakilerden hangisi bir zamirdir (adıl)?','%25\'i 40 olan sayı kaçtır?','Güneş Sistemi\'ndeki en büyük gezegen hangisidir?','Malazgirt Meydan Muharebesi hangi yıl yapılmıştır?','Tenis maçlarında sıfır puanı ifade etmek için hangi terim kullanılır?'];
function isOldSampleSet(qs){
  try{
    const all = ['s1','s2','final','tie'].flatMap(k=>qs[k]||[]);
    if (!all.length) return false;
    const set = new Set(OLD_SAMPLE_TEXTS);
    return all.every(q=>set.has(q.text));
  }catch(e){ return false; }
}

/* ---------- yedek içe aktarma doğrulaması ---------- */
function validateImport(o){
  if (!o || typeof o !== 'object' || !o.questions) throw new Error('soru listesi bulunamadı');
  const out = {};
  for (const k of ['s1','s2','final','tie']){
    const arr = Array.isArray(o.questions[k]) ? o.questions[k] : [];
    out[k] = arr.map((q,ix)=>{
      if (!q || !q.text) throw new Error(`${k} bölümünde ${ix+1}. sorunun metni yok`);
      if (q.type === 'ders'){
        if (!Array.isArray(q.options) || q.options.length !== 4 || !LETTERS.includes(q.answer)) throw new Error(`${k} bölümünde ${ix+1}. sorunun şıkları hatalı`);
        return {id:uid(), type:'ders', subject:SUBJECTS.includes(q.subject)?q.subject:SUBJECTS[0], text:String(q.text), options:q.options.map(String), answer:q.answer};
      }
      const n = typeof q.answer === 'number' ? q.answer : parseNum(q.answer);
      if (n == null) throw new Error(`${k} bölümünde ${ix+1}. tahmin sorusunun cevabı sayı değil`);
      return {id:uid(), type:'tahmin', text:String(q.text), answer:n, unit:String(q.unit||'')};
    });
  }
  let settings = null;
  if (o.settings && typeof o.settings === 'object'){
    settings = {};
    if (typeof o.settings.title === 'string') settings.title = o.settings.title;
    if (Number(o.settings.seconds) >= 5) settings.seconds = Math.round(o.settings.seconds);
    // Takım listesi yedekte varsa ayarlardaki kuralla doğrulanır; hatalıysa yedek bütünüyle reddedilir (eski liste sessizce kalmaz).
    if (o.settings.classes != null){
      const list = KaplanCore.normRoster(o.settings.classes), err = KaplanCore.rosterError(list);
      if (err) throw new Error('takım/sınıf listesi geçersiz: ' + err);
      settings.classes = list;
    }
  }
  return {questions:out, settings};
}

/* ---------- kalıcı kayıt ---------- */
function newGame(){
  return { started:false, finished:false, pin:genPin(), view:'draw', stage:0, draw:null, teams:{s1:[],s2:[],final:[]},
           qIndex:0, phase:'ready', last:null, result:null, tie:null, tieUsed:0, tieRound:0, qualified:{s1:[],s2:[]}, history:[],
           jokers:{}, jdone:{}, jrej:{}, scored:{}, cancelled:{}, frozen:{}, clock:null, win:[], intro:null, evId:0, events:[], brk:false };
}
function defaultState(){
  const s = { schema:KaplanCore.SCHEMA, settings:{title:'Kaplan Arena', seconds:45, sound:true, volume:80, reduceMotion:false, classes:[...DEFAULT_CLASSES], lanIp:'', emblems:{}}, questions:sampleQuestions(), game:newGame() };
  return KaplanCore.migrate(s);
}
function loadState(){
  try{
    let raw = localStorage.getItem(KEY);
    if (!raw){
      const old = localStorage.getItem('bilgi-yarismasi-v1');
      if (old){ const o = JSON.parse(old); if (o && o.questions){ const d = defaultState(); d.questions = o.questions; return d; } }
      return null;
    }
    const s = JSON.parse(raw);
    if (!s || !s.questions || !s.game || !s.settings) return null;
    if (!s.schema || s.schema < KaplanCore.SCHEMA){
      // Göç öncesi kaydın kopyası (geri dönüş için). Üzerine yazılmaz.
      const bk = KEY + '-yedek-sema' + (s.schema || 1);
      try{ if (!localStorage.getItem(bk)) localStorage.setItem(bk, raw); }catch(e){}
    }
    const d = defaultState();
    s.settings = Object.assign({}, d.settings, { emblems:{} }, s.settings);   // armalar kaydın kendi sınıflarından atanır
    for (const k of ['s1','s2','final','tie']) if (!Array.isArray(s.questions[k])) s.questions[k] = [];
    if (isOldSampleSet(s.questions)) s.questions = sampleQuestions();
    // Göç ham kayıt üzerinde çalışır (eski "shown/revealed" alanları yeni varsayılanlarla ezilmeden), sonra eksik alanlar tamamlanır.
    KaplanCore.migrate(s);
    s.game = Object.assign(newGame(), s.game);
    return s;
  }catch(e){ console.error(e); return null; }
}
