"use strict";
const Audio_={
  ctx:null, master:null, muted:false,
  init(){
    if(this.ctx) return;
    try{
      this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      this.master=this.ctx.createGain();
      this.master.gain.value=0.5; this.master.connect(this.ctx.destination);
    }catch(e){ this.ctx=null; }
  },
  resume(){ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },
  tone(freq,dur,type='sine',vol=0.3,slideTo=null,delay=0){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime+delay;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo),t+dur);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+0.02);
  },
  noise(dur,vol=0.3,filterFreq=1200,delay=0){
    if(!this.ctx||this.muted) return;
    const t=this.ctx.currentTime+delay;
    const n=Math.floor(this.ctx.sampleRate*dur);
    const buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=filterFreq;
    const g=this.ctx.createGain(); g.gain.value=vol;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  },
  // конкретные эффекты
  shoot(){ this.tone(rand(620,720),0.09,'square',0.10,260); },
  charge(level){ /* поднимающийся гул отдельным узлом — упрощаем разовым тоном */ },
  release(power){ this.tone(180,0.28,'sawtooth',0.28,60); this.noise(0.25,0.22,2200); },
  hit(){ this.tone(rand(900,1100),0.05,'triangle',0.10,400); this.noise(0.04,0.08,3000); },
  metal(){ this.tone(rand(1200,1700),0.07,'square',0.12,500); this.noise(0.05,0.12,4000); },
  explode(){ this.noise(0.45,0.4,900); this.tone(90,0.4,'sawtooth',0.28,40); },
  jump(){ this.tone(280,0.14,'square',0.12,520); },
  dash(){ this.noise(0.18,0.18,3000); this.tone(420,0.12,'sawtooth',0.12,180); },
  pickup(){ this.tone(880,0.06,'sine',0.10,1320); },
  hurt(){ this.tone(220,0.18,'sawtooth',0.3,70); this.noise(0.12,0.18,1400); },
  ult(){ this.tone(120,0.6,'sawtooth',0.32,520); this.noise(0.6,0.3,2400); },
  wave(){ this.tone(440,0.12,'square',0.16,660); this.tone(660,0.12,'square',0.14,880,0.08); },
  beam(){ this.tone(150,0.5,'sawtooth',0.16,150); },
};

// ------------------------------ Музыка (синтез-секвенсор) ------------
const Music={
  playing:false, mode:'zone', step:0, nextT:0, timer:null, bpm:84, bus:null, ducked:false,
  // ноты (Гц)
  zoneBass:[55.00, 43.65, 65.41, 49.00],          // Am - F - C - G (низкий гул)
  zonePad :[220.00, 174.61, 261.63, 196.00],
  bossRoot:[55.00, 55.00, 43.65, 49.00],
  bossLead:[659.25, 0, 698.46, 0, 783.99, 0, 415.30, 0, 659.25, 0, 587.33, 0, 698.46, 0, 415.30, 0], // A гарм. минор, напряжённо
  _ensureBus(){ if(!this.bus && Audio_.ctx){ this.bus=Audio_.ctx.createGain(); this.bus.gain.value=0.0001; this.bus.connect(Audio_.master); } },
  _target(){ if(Audio_.muted) return 0.0001; const base=this.mode==='boss'?0.5:0.34; return this.ducked? base*0.25 : base; },
  _ramp(){ if(this.bus&&Audio_.ctx) this.bus.gain.setTargetAtTime(this._target(), Audio_.ctx.currentTime, 0.4); },
  start(mode='zone'){
    Audio_.init(); if(!Audio_.ctx) return; this._ensureBus();
    this.mode=mode; this.bpm = mode==='boss'?140:84;
    if(!this.playing){ this.playing=true; this.step=0; this.nextT=Audio_.ctx.currentTime+0.08;
      this.timer=setInterval(()=>this._sched(),25); }
    this._ramp();
  },
  setMode(mode){ if(!this.playing) return this.start(mode); this.mode=mode; this.bpm=mode==='boss'?140:84; this._ramp(); },
  duck(v){ this.ducked=v; this._ramp(); },
  stop(){ this.playing=false; if(this.timer) clearInterval(this.timer); this.timer=null;
    if(this.bus&&Audio_.ctx) this.bus.gain.setTargetAtTime(0.0001, Audio_.ctx.currentTime, 0.25); },
  _v(time,freq,dur,type,vol,slideTo,filt){
    if(!Audio_.ctx||!freq) return;
    const c=Audio_.ctx, o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,time);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo),time+dur);
    let node=o;
    if(filt){ const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=filt; o.connect(f); node=f; }
    g.gain.setValueAtTime(0.0001,time);
    g.gain.exponentialRampToValueAtTime(vol,time+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,time+dur);
    node.connect(g); g.connect(this.bus); o.start(time); o.stop(time+dur+0.02);
  },
  _perc(time,vol,freq,dur){ if(!Audio_.ctx) return; const c=Audio_.ctx;
    const n=Math.floor(c.sampleRate*dur), b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const s=c.createBufferSource(); s.buffer=b; const f=c.createBiquadFilter(); f.type='highpass'; f.frequency.value=freq;
    const g=c.createGain(); g.gain.value=vol; s.connect(f); f.connect(g); g.connect(this.bus); s.start(time);
  },
  _sched(){
    if(!Audio_.ctx){ return; }
    const eighth=(60/this.bpm)/2;
    while(this.nextT < Audio_.ctx.currentTime+0.12){ this._step(this.step, this.nextT); this.nextT+=eighth; this.step=(this.step+1)%16; }
    this._ramp();
  },
  _step(i,t){
    if(Audio_.muted) return;
    const bar=(i/4|0)%4;
    if(this.mode==='boss'){
      // бочка
      if(i%4===0){ this._v(t,130,0.18,'sine',0.5,46); this._perc(t,0.12,120,0.05); }
      // пульсирующий бас (восьмыми)
      const root=this.bossRoot[bar];
      this._v(t, root, i%4===0?0.22:0.13, 'sawtooth', i%4===0?0.20:0.12, null, 700);
      // снейр
      if(i===4||i===12) this._perc(t,0.18,1800,0.12);
      // минорный стэб на офф-битах
      if(i===2||i===6||i===10||i===14){ const r=root*2; this._v(t,r,0.14,'square',0.06); this._v(t,r*1.19,0.14,'square',0.05); this._v(t,r*1.5,0.14,'square',0.05); }
      // лид-мотив
      if(this.bossLead[i]) this._v(t, this.bossLead[i], 0.16, 'triangle', 0.07, null, 2600);
    } else {
      // спокойная атмосфера свалки
      if(i%4===0){ this._v(t, this.zoneBass[bar], 1.1, 'sawtooth', 0.16, null, 380); }
      if(i===2||i===10){ this._v(t, this.zonePad[bar], 0.9, 'triangle', 0.07, null, 1400); }
      if((i===6||i===14) && Math.random()<0.7){ this._v(t, this.zonePad[(bar+2)%4]*2, 0.7, 'sine', 0.05); }
      if(i===8 && Math.random()<0.4){ this._v(t, 880, 0.5, 'sine', 0.03); }
    }
  }
};

// ------------------------------ Ввод ---------------------------------
