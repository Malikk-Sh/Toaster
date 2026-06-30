"use strict";
const ZONES=[
  { id:'dump', name:'СВАЛКА 404', sub:'Кладбище техники', kind:'dump',
    waves:3, climax:'fridge',
    sky:[[0,'#2b1a3a'],[0.4,'#6e3b3a'],[0.72,'#c25a26'],[0.92,'#e8852b'],[1,'#f0a23a']],
    orb:{x:0.7,col:'rgba(255,220,150,.9)',core:'rgba(255,220,160,.95)',mid:'rgba(255,160,60,.5)',edge:'rgba(255,120,40,0)',r:46},
    hills:[[0.3,0.62,'#3a2336',120,0],[0.5,0.70,'#2c1a2a',90,1]],
    ground:[[0,'#4a3526'],[0.3,'#2e2117'],[1,'#160f0a']], edge:'#caa15f', edge2:'rgba(255,180,90,.25)',
    puddle:'rgba(255,150,70,.12)' },
  { id:'city', name:'ГОРОД', sub:'Выход на поверхность', kind:'city',
    waves:3, climax:'roomba',
    sky:[[0,'#06061a'],[0.45,'#14152e'],[0.8,'#27224a'],[1,'#3a2f5e']],
    orb:{x:0.78,col:'rgba(190,200,255,.45)',core:'rgba(228,232,255,.95)',mid:'rgba(150,170,230,.3)',edge:'rgba(120,140,220,0)',r:32},
    ground:[[0,'#1b1c28'],[0.3,'#141420'],[1,'#0a0a12']], edge:'#5a6ac0', edge2:'rgba(120,150,255,.25)',
    puddle:'rgba(120,150,255,.14)' },
];
function curZone(){ return ZONES[clamp(game.zone||0,0,ZONES.length-1)]; }

// ------------------------------ Мир ----------------------------------
const WORLD={ w:2600, groundY:0, platforms:[] };
function buildWorld(){
  WORLD.groundY = VH - Math.max(70, VH*0.12);
  WORLD.w = Math.max(2200, VW*2.2);
  const g=WORLD.groundY;
  WORLD.platforms=[
    {x:0,y:g,w:WORLD.w,h:VH-g+60,ground:true},                  // земля
    {x:WORLD.w*0.18,y:g-150,w:200,h:22},
    {x:WORLD.w*0.40,y:g-240,w:170,h:22},
    {x:WORLD.w*0.62,y:g-150,w:210,h:22},
    {x:WORLD.w*0.80,y:g-260,w:160,h:22},
  ];
}

// ------------------------------ Частицы ------------------------------
let bgStars=[];
function buildBg(){
  bgStars=[];
  for(let i=0;i<40;i++) bgStars.push({x:Math.random()*WORLD.w*0.6,y:Math.random()*VH*0.5,s:rand(1,2.4),tw:rand(0,TAU)});
}
function drawBackground(t){
  const Z=curZone();
  // небо
  const sky=ctx.createLinearGradient(0,0,0,VH);
  for(const st of Z.sky) sky.addColorStop(st[0],st[1]);
  ctx.fillStyle=sky; ctx.fillRect(0,0,VW,VH);
  // светило (солнце/луна)
  const o=Z.orb; const sunX = -Cam.x*0.1 + VW*o.x, sunY=VH*0.6;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const sg=ctx.createRadialGradient(sunX,sunY,10,sunX,sunY,180);
  sg.addColorStop(0,o.col); sg.addColorStop(0.4,o.mid); sg.addColorStop(1,o.edge);
  ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sunX,sunY,180,0,TAU); ctx.fill();
  ctx.fillStyle=o.core; ctx.beginPath(); ctx.arc(sunX,sunY,o.r,0,TAU); ctx.fill();
  ctx.restore();
  // звёзды (ярче ночью в городе)
  ctx.save();
  const sa = Z.kind==='city'?0.7:0.4;
  for(const s of bgStars){ const x=s.x-Cam.x*0.05, y=s.y; if(x<-10) continue;
    ctx.globalAlpha=sa+Math.sin(t*2+s.tw)*0.3; ctx.fillStyle='#ffe'; ctx.fillRect(x,y,s.s,s.s); }
  ctx.restore(); ctx.globalAlpha=1;

  // силуэты заднего плана
  if(Z.kind==='city'){
    drawCityLayer(0.26, VH*0.66, '#0e1030', 210, 11);
    drawCityLayer(0.46, VH*0.72, '#0a0b1e', 150, 23);
  } else {
    for(const hl of Z.hills) drawJunkLayer(hl[0], VH*hl[1], hl[2], hl[3], hl[4]);
  }
}
function drawJunkLayer(par, baseY, color, h, seed){
  const ox=-Cam.x*par; ctx.fillStyle=color;
  ctx.beginPath(); ctx.moveTo(-50,VH);
  const step=120;
  for(let x=-50; x<VW+200; x+=step){
    const wx=x-ox;
    const hh=h*(0.5+0.5*Math.abs(Math.sin((wx+seed*97)*0.01)));
    ctx.lineTo(x, baseY-hh*0.5 + Math.sin((wx)*0.02+seed)*15);
    ctx.lineTo(x+step*0.5, baseY-hh + Math.cos((wx)*0.015+seed)*10);
  }
  ctx.lineTo(VW+200,VH); ctx.closePath(); ctx.fill();
}
function drawCityLayer(par, baseY, color, h, seed){
  const step=86;
  const startIdx=Math.floor((Cam.x*par - step)/step);
  const endIdx=Math.ceil((Cam.x*par + VW + step)/step);
  const neon=['rgba(90,200,255,','rgba(255,120,220,','rgba(255,200,90,'];
  for(let idx=startIdx; idx<=endIdx; idx++){
    const sx=idx*step - Cam.x*par;
    const r=Math.abs(Math.sin((idx+seed)*1.3));
    const bh=h*(0.35+0.65*r);
    const bw=step-6-rand0(idx+seed,16);
    const bx=sx+3;
    ctx.fillStyle=color; ctx.fillRect(bx, baseY-bh, bw, bh+VH-baseY);
    // окошки с неоновым светом (стабильны при прокрутке)
    const cols=Math.max(2,(bw/14)|0), rows=Math.max(3,(bh/18)|0);
    const nc=neon[(((idx+seed)%neon.length)+neon.length)%neon.length];
    for(let cxi=0;cxi<cols;cxi++) for(let ryi=0;ryi<rows;ryi++){
      if(((cxi*7+ryi*13+idx*3)%5)!==0) continue;
      ctx.fillStyle=nc+'0.5)';
      ctx.fillRect(bx+5+cxi*(bw/cols), baseY-bh+6+ryi*(bh/rows), 4, 5);
    }
  }
}
function rand0(v,m){ const x=Math.sin(v*12.9898)*43758.5453; return Math.abs(x-Math.floor(x))*m; }
function drawGround(){
  const Z=curZone();
  const g=WORLD.groundY;
  const grd=ctx.createLinearGradient(0,g-10,0,VH);
  for(const st of Z.ground) grd.addColorStop(st[0],st[1]);
  ctx.fillStyle=grd; ctx.fillRect(0,g,VW,VH-g);
  // кромка-блик
  ctx.fillStyle=Z.edge; ctx.fillRect(0,g,VW,3);
  ctx.fillStyle=Z.edge2; ctx.fillRect(0,g+3,VW,2);
  ctx.save(); ctx.translate(-Cam.x,0);
  if(Z.kind==='city'){
    // дорожная разметка + люки
    for(let x=0;x<WORLD.w;x+=120){ ctx.fillStyle='rgba(255,210,90,.18)'; ctx.fillRect(x+20,g+24,46,5); }
    for(let x=60;x<WORLD.w;x+=300){ ctx.fillStyle='rgba(120,140,200,.18)'; ctx.beginPath(); ctx.arc(x,g+30,12,0,TAU); ctx.fill(); }
  } else {
    for(let x=0;x<WORLD.w;x+=90){
      ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(x+ (x*7%40), g+18+ (x*3%20), 30,6);
      ctx.fillStyle='#5a4530'; ctx.beginPath(); ctx.arc(x+45, g+12, 2.5,0,TAU); ctx.fill();
    }
  }
  // лужи (отражают свет зоны)
  for(let i=0;i<6;i++){ const px=180+i*420 + (i*53%120);
    ctx.fillStyle=Z.puddle; ctx.beginPath(); ctx.ellipse(px,g+30,46,7,0,0,TAU); ctx.fill(); }
  ctx.restore();
}
function drawPlatforms(){
  ctx.save(); ctx.translate(-Cam.x,0);
  for(const pl of WORLD.platforms){ if(pl.ground) continue;
    // платформа из металлолома
    ctx.fillStyle='#1c140e'; roundRect(pl.x,pl.y+3,pl.w,pl.h,4); ctx.fill();
    ctx.fillStyle='#5a4530'; roundRect(pl.x,pl.y,pl.w,pl.h,4); ctx.fill();
    ctx.fillStyle='#caa15f'; ctx.fillRect(pl.x,pl.y,pl.w,2);
    ctx.fillStyle='rgba(0,0,0,.3)';
    for(let x=pl.x+8;x<pl.x+pl.w-6;x+=22){ ctx.fillRect(x,pl.y+pl.h-5,3,3); }
  }
  ctx.restore();
}

// ------------------------------ HUD ----------------------------------
