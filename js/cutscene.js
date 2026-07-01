"use strict";
/* =====================================================================
   ПРОЛОГ — анимированная катсцена предыстории Брэда.
   Проигрывается автоматически перед новым забегом из меню, с явной кнопкой
   «Пропустить». На рестарте после смерти не показывается (сразу в бой).
   Работает как отдельное состояние игрового цикла (state='cutscene').
   ===================================================================== */

// ---- мелкие помощники рисования ----
function csToaster(x,y,s,glow){
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  // корпус-хром
  ctx.fillStyle='#c5ccd4'; roundRect(-24,-22,48,34,8); ctx.fill();
  const gr=ctx.createLinearGradient(0,-22,0,6); gr.addColorStop(0,'#eef1f5'); gr.addColorStop(1,'#9aa4ad');
  ctx.fillStyle=gr; roundRect(-24,-22,48,26,8); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.5)'; roundRect(-19,-18,7,20,3); ctx.fill();
  ctx.fillStyle='#1a140e'; roundRect(-15,-22,12,4,2); ctx.fill(); roundRect(3,-22,12,4,2); ctx.fill();
  // рычаг
  ctx.fillStyle='#8a6a3a'; roundRect(20,-8,4,16,2); ctx.fill();
  ctx.fillStyle='#c49a54'; ctx.beginPath(); ctx.arc(22,-8,3,0,TAU); ctx.fill();
  // ножки
  ctx.fillStyle='#6b5847'; roundRect(-16,12,5,5,2); ctx.fill(); roundRect(11,12,5,5,2); ctx.fill();
  // глаза (загораются с glow)
  const er = glow>0.02;
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-4,-4,3.4,0,TAU); ctx.arc(8,-4,3.4,0,TAU); ctx.fill();
  if(er){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(255,120,40,${glow})`;
    ctx.beginPath(); ctx.arc(-4,-4,5*glow+2,0,TAU); ctx.arc(8,-4,5*glow+2,0,TAU); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = glow>0.4? '#ff6a1e' : '#2a2a2a';
  ctx.beginPath(); ctx.arc(-3.5,-4,1.7,0,TAU); ctx.arc(8.5,-4,1.7,0,TAU); ctx.fill();
  ctx.restore();
}
function csHead(x,y,r,col){ ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x,y,r,0,TAU);
  ctx.fillRect(x-r*0.7,y+r*0.4,r*1.4,r*1.6); ctx.fill(); }

const Cutscene={
  active:false, onDone:null, idx:0, sceneT:0, t:0, embers:[],
  scenes:[
    { dur:3.6, sub:'1987. Брэд — гордость семьи. Каждое утро начиналось с его тёплого хруста.',
      draw(p){
        const g=ctx.createLinearGradient(0,0,0,VH); g.addColorStop(0,'#3a2416'); g.addColorStop(0.6,'#6a3f22'); g.addColorStop(1,'#241610');
        ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
        // окно + утреннее солнце (лёгкая панорама)
        const wx=VW*0.66+Math.sin(p*2)*6, wy=VH*0.30;
        ctx.fillStyle='rgba(60,40,24,.6)'; ctx.fillRect(wx-150,wy-130,300,250);
        ctx.fillStyle='rgba(255,210,130,.25)'; ctx.fillRect(wx-140,wy-120,280,230);
        ctx.save(); ctx.globalCompositeOperation='lighter';
        const sun=ctx.createRadialGradient(wx,wy,4,wx,wy,170);
        sun.addColorStop(0,'rgba(255,235,170,.95)'); sun.addColorStop(1,'rgba(255,180,80,0)');
        ctx.fillStyle=sun; ctx.beginPath(); ctx.arc(wx,wy,170,0,TAU); ctx.fill(); ctx.restore();
        // столешница
        ctx.fillStyle='#4a3320'; ctx.fillRect(0,VH*0.66,VW,VH*0.34);
        ctx.fillStyle='#5a3f28'; ctx.fillRect(0,VH*0.655,VW,10);
        // семья-силуэты
        csHead(VW*0.70,VH*0.50,30,'rgba(20,10,6,.55)');
        csHead(VW*0.79,VH*0.52,26,'rgba(20,10,6,.55)');
        csHead(VW*0.745,VH*0.585,17,'rgba(20,10,6,.55)');
        // Брэд гордо на столе, выпрыгивает тост
        csToaster(VW*0.4, VH*0.60, 2.2, 0);
        const pop=Math.max(0,Math.sin(p*Math.PI))*22;
        ctx.fillStyle='#e0a85a'; roundRect(VW*0.4-12,VH*0.60-58-pop,24,20,4); ctx.fill();
        ctx.fillStyle='#f4d29a'; roundRect(VW*0.4-7,VH*0.60-53-pop,14,10,3); ctx.fill();
      } },
    { dur:3.0, sub:'Тридцать шесть лет верной службы. Ни одного пригоревшего ломтика.',
      draw(p){
        ctx.fillStyle='#2a1c12'; ctx.fillRect(0,0,VW,VH);
        // монтаж: ряды восходящих «солнц»-утро
        ctx.save(); ctx.globalCompositeOperation='lighter';
        for(let i=0;i<10;i++){ const fx=((i*0.13+p*0.5)%1); const cx=fx*VW; const cy=VH*(0.7-0.4*Math.sin(fx*Math.PI));
          const rg=ctx.createRadialGradient(cx,cy,2,cx,cy,40); rg.addColorStop(0,'rgba(255,210,120,.7)'); rg.addColorStop(1,'rgba(255,150,60,0)');
          ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(cx,cy,40,0,TAU); ctx.fill(); }
        ctx.restore();
        // выскакивающие тосты
        for(let i=0;i<6;i++){ const ph=(p*2 + i*0.37)%1; const bx=VW*(0.12+i*0.15); const by=VH*0.62 - Math.sin(ph*Math.PI)*90;
          ctx.save(); ctx.translate(bx,by); ctx.rotate(Math.sin(ph*6)*0.2);
          ctx.fillStyle='#a35f22'; roundRect(-13,-13,26,26,6); ctx.fill();
          ctx.fillStyle='#e6b160'; roundRect(-9,-9,18,18,4); ctx.fill(); ctx.restore(); }
        // «36 ЛЕТ»
        ctx.globalAlpha=clamp(Math.sin(p*Math.PI)*1.4,0,1);
        ctx.fillStyle='#ffd27a'; ctx.textAlign='center'; ctx.font="900 88px 'Russo One',sans-serif";
        ctx.fillText('36 ЛЕТ', VW*0.5, VH*0.5); ctx.globalAlpha=1; ctx.textAlign='left';
      } },
    { dur:3.6, sub:'Потом пришёл TechFresh. Блестящий. Холодный. «Умный».',
      draw(p){
        const g=ctx.createLinearGradient(0,0,0,VH); g.addColorStop(0,'#06101e'); g.addColorStop(0.6,'#0c2036'); g.addColorStop(1,'#040c16');
        ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
        // холодный прожектор на новый прибор
        ctx.save(); ctx.globalCompositeOperation='lighter';
        const sx=VW*0.5, sy=VH*0.2;
        ctx.fillStyle='rgba(150,190,255,.10)'; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx-220,VH*0.9); ctx.lineTo(sx+220,VH*0.9); ctx.fill();
        ctx.restore();
        // блестящий модный прибор TechFresh
        const bob=Math.sin(p*3)*4;
        ctx.save(); ctx.translate(VW*0.5, VH*0.56+bob);
        const gr=ctx.createLinearGradient(0,-70,0,70); gr.addColorStop(0,'#eaf2ff'); gr.addColorStop(0.5,'#a9c6ee'); gr.addColorStop(1,'#5f86bd');
        ctx.fillStyle=gr; roundRect(-70,-80,140,160,20); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.5)'; roundRect(-56,-66,20,120,8); ctx.fill();
        // холодный «умный» экран-глаз
        ctx.save(); ctx.globalCompositeOperation='lighter';
        const eg=ctx.createRadialGradient(0,-6,2,0,-6,40); eg.addColorStop(0,'rgba(120,200,255,.95)'); eg.addColorStop(1,'rgba(80,150,255,0)');
        ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(0,-6,40,0,TAU); ctx.fill(); ctx.restore();
        ctx.fillStyle='#0a2036'; ctx.beginPath(); ctx.arc(0,-6,14,0,TAU); ctx.fill();
        ctx.fillStyle='#bfe0ff'; ctx.beginPath(); ctx.arc(0,-6,6,0,TAU); ctx.fill();
        ctx.restore();
        // логотип-плашка
        ctx.globalAlpha=clamp((p-0.3)*3,0,1);
        ctx.fillStyle='rgba(180,210,255,.9)'; ctx.textAlign='center'; ctx.font="900 42px 'Russo One',sans-serif";
        ctx.fillText('TechFresh™', VW*0.5, VH*0.30); ctx.globalAlpha=1; ctx.textAlign='left';
        // старый Брэд, задвинутый в угол в тени
        csToaster(VW*0.14, VH*0.72, 1.5, 0);
      } },
    { dur:3.8, sub:'Брэда списали. Выбросили на Свалку 404 — кладбище ненужной техники.',
      draw(p){
        ctx.fillStyle='#0a0810'; ctx.fillRect(0,0,VW,VH);
        // дождь
        ctx.strokeStyle='rgba(150,170,200,.28)'; ctx.lineWidth=1.4;
        for(let i=0;i<90;i++){ const rx=((i*137.5 + p*900)%VW); const ry=((i*53 + p*1400)%VH); ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-6,ry+18); ctx.stroke(); }
        // вспышка молнии
        const flash=(p>0.5&&p<0.56)||(p>0.72&&p<0.76)?0.5:0;
        if(flash){ ctx.fillStyle=`rgba(200,210,255,${flash})`; ctx.fillRect(0,0,VW,VH); }
        // куча хлама
        ctx.fillStyle='#14121a';
        ctx.beginPath(); ctx.moveTo(0,VH); ctx.lineTo(0,VH*0.72);
        for(let i=0;i<=10;i++){ ctx.lineTo(VW*i/10, VH*(0.72 - (i%2?0.05:0.0) - Math.sin(i)*0.04)); }
        ctx.lineTo(VW,VH); ctx.fill();
        ctx.fillStyle='#1c1a24';
        for(let i=0;i<14;i++){ const jx=(i*97)%VW; const jy=VH*0.74+ (i*57%40); roundRect(jx,jy,26+ (i%3)*10,14,3); ctx.fill(); }
        // Брэд летит в кучу (по дуге сверху)
        const fx=lerp(VW*0.75, VW*0.42, clamp(p*1.4,0,1));
        const fy=lerp(-40, VH*0.66, clamp(p*1.4,0,1)) - Math.sin(clamp(p*1.4,0,1)*Math.PI)*80;
        ctx.save(); ctx.translate(fx,fy); ctx.rotate(p*8);
        csToaster(0,0,1.5,0); ctx.restore();
      } },
    { dur:4.2, sub:'Но тостер не сдаётся. Тостер — перезагружается. «Я ещё не остыл.»',
      draw(p){
        ctx.fillStyle='#0a0608'; ctx.fillRect(0,0,VW,VH);
        const glow=clamp((p-0.15)/0.5,0,1);
        // тепловой ореол растёт
        ctx.save(); ctx.globalCompositeOperation='lighter';
        const hr=ctx.createRadialGradient(VW*0.5,VH*0.54,10,VW*0.5,VH*0.54,260*glow+40);
        hr.addColorStop(0,`rgba(255,140,40,${0.5*glow+0.05})`); hr.addColorStop(1,'rgba(255,90,20,0)');
        ctx.fillStyle=hr; ctx.beginPath(); ctx.arc(VW*0.5,VH*0.54,260*glow+40,0,TAU); ctx.fill(); ctx.restore();
        // Брэд крупно, глаза разгораются
        csToaster(VW*0.5, VH*0.54, 3.4, glow);
        // угли поднимаются
        ctx.save(); ctx.globalCompositeOperation='lighter';
        for(const e of Cutscene.embers){ ctx.globalAlpha=clamp(e.life,0,1); ctx.fillStyle=e.col;
          ctx.beginPath(); ctx.arc(e.x,e.y,e.size,0,TAU); ctx.fill(); }
        ctx.restore(); ctx.globalAlpha=1;
      } },
  ],
  start(onDone){
    this.onDone=onDone; this.idx=0; this.sceneT=0; this.t=0; this.embers.length=0; this.active=true;
    Audio_.init(); Audio_.resume();
    hideAll();
    game.state='cutscene';
    const b=document.getElementById('btn-skip-cut'); if(b) b.classList.remove('hidden');
    document.getElementById('btn-pause').style.display='none';
    try{ Music.start('zone'); }catch(_){}
    Audio_.tone(196,0.6,'sine',0.12); Audio_.tone(294,0.6,'sine',0.10,null,0.1);
  },
  finish(){
    if(!this.active) return; this.active=false;
    const b=document.getElementById('btn-skip-cut'); if(b) b.classList.add('hidden');
    const cb=this.onDone; this.onDone=null;
    if(cb) cb();
  },
  skip(){ if(this.active){ Audio_.tone(330,0.12,'square',0.08); this.finish(); } },
  update(dt){
    if(!this.active) return;
    this.t+=dt; this.sceneT+=dt;
    // угли в финальной сцене
    if(this.idx===this.scenes.length-1){
      if(Math.random()<0.6) this.embers.push({x:VW*0.5+rand(-70,70),y:VH*0.60,vx:rand(-20,20),vy:-rand(40,110),
        life:1,size:rand(1.5,3.5),col:pick(['#ff8a1e','#ffd23f','#ff5a1e'])});
      for(let i=this.embers.length-1;i>=0;i--){ const e=this.embers[i]; e.x+=e.vx*dt; e.y+=e.vy*dt; e.vx*=(1-dt); e.life-=dt*0.5; if(e.life<=0) this.embers.splice(i,1); }
    }
    const sc=this.scenes[this.idx];
    if(this.sceneT>=sc.dur){
      this.idx++; this.sceneT=0;
      if(this.idx>=this.scenes.length){ this.finish(); return; }
      Audio_.tone(220+this.idx*40,0.4,'sine',0.10);
    }
  },
  render(ts){
    if(!this.active) return;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.clearRect(0,0,VW,VH);
    const sc=this.scenes[this.idx]; const p=clamp(this.sceneT/sc.dur,0,1);
    // сама сцена
    sc.draw(p);
    // кроссфейд через чёрный на входе/выходе сцены
    const fadeIn=clamp(this.sceneT/0.5,0,1), fadeOut=clamp((sc.dur-this.sceneT)/0.5,0,1);
    const dark=1-Math.min(fadeIn,fadeOut);
    if(dark>0){ ctx.fillStyle=`rgba(0,0,0,${dark.toFixed(3)})`; ctx.fillRect(0,0,VW,VH); }
    // леттербокс-полосы
    const bar=VH*0.11;
    ctx.fillStyle='#000'; ctx.fillRect(0,0,VW,bar); ctx.fillRect(0,VH-bar,VW,bar);
    // субтитр
    const subA=Math.min(fadeIn,fadeOut);
    if(subA>0 && sc.sub){
      ctx.save(); ctx.globalAlpha=subA; ctx.textAlign='center';
      ctx.fillStyle='#f4e6c8'; ctx.font="500 22px 'Rubik',sans-serif";
      csWrap(sc.sub, VW*0.5, VH-bar-46, VW*0.8, 30);
      ctx.restore(); ctx.textAlign='left';
    }
    // индикатор прогресса сцен
    const n=this.scenes.length, dotW=10, gap=8, totW=n*dotW+(n-1)*gap, x0=VW*0.5-totW/2, y0=VH-bar*0.5;
    for(let i=0;i<n;i++){ ctx.fillStyle=i<=this.idx?'#ffd27a':'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.arc(x0+i*(dotW+gap)+dotW*0.5,y0,dotW*0.35,0,TAU); ctx.fill(); }
  },
};
// перенос строк субтитра по центру
function csWrap(text,cx,y,maxW,lh){
  const words=text.split(' '); const lines=[]; let line='';
  for(const w of words){ const test=line?line+' '+w:w;
    if(ctx.measureText(test).width>maxW && line){ lines.push(line); line=w; } else line=test; }
  if(line) lines.push(line);
  const startY=y-(lines.length-1)*lh;
  lines.forEach((ln,i)=>ctx.fillText(ln,cx,startY+i*lh));
}
