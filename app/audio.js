/* Kaplan Arena — sahne sesleri. Web Audio ile çevrimdışı üretilir (dosya/lisans gerekmez).
   Yalnız sahne penceresi çalar; admin ve telefon sessizdir. Tarayıcı otomatik ses başlatmayı
   engelleyebileceği için sahnede bir kez kullanıcı tıklamasıyla etkinleştirilir. */
const StageAudio = (() => {
  let ctx = null, master = null, volume = 0.8, muted = false;
  function ensure(){
    if (!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.connect(ctx.destination); }
      catch(e){ ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (master) master.gain.value = muted ? 0 : volume;
    return !!ctx;
  }
  function tone(f, at, dur, type, peak, f2){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, at);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak || .2, at + .015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(master); o.start(at); o.stop(at + dur + .05);
  }
  function noise(at, dur, peak, hp){
    const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 1500; s.buffer = b;
    g.gain.setValueAtTime(peak || .1, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f).connect(g).connect(master); s.start(at);
  }
  const SFX = {
    test(t){ [523.25, 659.25, 783.99].forEach((f, k) => tone(f, t + k * .12, .35, 'triangle', .18)); },
    tick(t){ tone(1320, t, .07, 'square', .07); tone(660, t, .05, 'sine', .05); },
    timeup(t){ tone(196, t, 1.6, 'sine', .32); tone(98, t, 1.8, 'sine', .22); tone(392, t, .9, 'triangle', .08); },
    reveal(t){ [659.25, 880, 1174.66].forEach((f, k) => tone(f, t + k * .09, .7, 'triangle', .14)); },
    entry(t){ tone(1174.66, t, .32, 'triangle', .1, 1567.98); tone(587.33, t, .25, 'sine', .06); noise(t, .22, .03, 6000); },
    scores(t){ [392, 523.25, 659.25].forEach((f, k) => tone(f, t + k * .1, .45, 'triangle', .12)); },
    joker(t){
      tone(160, t, .5, 'sawtooth', .07, 900);                   // yükselen vınlama
      [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone(f, t + .25 + k * .085, .22, 'square', .09));
      tone(1318.5, t + .62, 1.1, 'triangle', .2); noise(t + .6, .5, .06, 4000);
    },
    roundEnd(t){ [392, 493.88, 587.33, 783.99].forEach((f, k) => tone(f, t + .9 + k * .16, k === 3 ? 1.1 : .4, 'triangle', .11)); noise(t + 1.4, .5, .025, 5000); },
    stage(t){ tone(293.66, t, 1.2, 'triangle', .09); tone(440, t + .2, 1.0, 'triangle', .07); },
    champion(t){
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, k) => tone(f, t + k * .14, k > 4 ? .9 : .3, 'triangle', .17));
      for (let k = 0; k < 6; k++) noise(t + .9 + k * .18, .25, .05, 5000);
    }
  };
  return {
    enable(){ return ensure(); },
    ready(){ return !!(ctx && ctx.state === 'running'); },
    set(vol, isMuted){ volume = Math.max(0, Math.min(1, vol)); muted = !!isMuted; if (master) master.gain.value = muted ? 0 : volume; },
    play(kind){
      if (!ctx || ctx.state !== 'running' || muted || !SFX[kind]) return false;
      try{ SFX[kind](ctx.currentTime + .02); return true; }catch(e){ return false; }
    }
  };
})();
