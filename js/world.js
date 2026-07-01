"use strict";
const ZONES=[
  { id:'dump', name:'СВАЛКА 404', sub:'Кладбище техники', kind:'dump',
    waves:10, climax:'fridge',
    sky:[[0,'#2b1a3a'],[0.4,'#6e3b3a'],[0.72,'#c25a26'],[0.92,'#e8852b'],[1,'#f0a23a']],
    orb:{x:0.7,col:'rgba(255,220,150,.9)',core:'rgba(255,220,160,.95)',mid:'rgba(255,160,60,.5)',edge:'rgba(255,120,40,0)',r:46},
    hills:[[0.3,0.62,'#3a2336',120,0],[0.5,0.70,'#2c1a2a',90,1]],
    ground:[[0,'#4a3526'],[0.3,'#2e2117'],[1,'#160f0a']], edge:'#caa15f', edge2:'rgba(255,180,90,.25)',
    puddle:'rgba(255,150,70,.12)' },
  { id:'sewer', name:'ПОДЗЕМКА', sub:'Стоки под городом', kind:'sewer',
    waves:10, climax:'washer',
    sky:[[0,'#04100c'],[0.5,'#08201a'],[0.8,'#0c2e24'],[1,'#10362a']],
    orb:{x:0.6,col:'rgba(120,220,180,.30)',core:'rgba(180,255,220,.7)',mid:'rgba(80,200,150,.2)',edge:'rgba(60,180,140,0)',r:26},
    ground:[[0,'#13241f'],[0.3,'#0c1a16'],[1,'#06100d']], edge:'#3a9e7a', edge2:'rgba(120,255,200,.18)',
    puddle:'rgba(120,255,200,.12)' },
  { id:'city', name:'ГОРОД', sub:'Выход на поверхность', kind:'city',
    waves:10, climax:'roomba',
    sky:[[0,'#06061a'],[0.45,'#14152e'],[0.8,'#27224a'],[1,'#3a2f5e']],
    orb:{x:0.78,col:'rgba(190,200,255,.45)',core:'rgba(228,232,255,.95)',mid:'rgba(150,170,230,.3)',edge:'rgba(120,140,220,0)',r:32},
    ground:[[0,'#1b1c28'],[0.3,'#141420'],[1,'#0a0a12']], edge:'#5a6ac0', edge2:'rgba(120,150,255,.25)',
    puddle:'rgba(120,150,255,.14)' },
  { id:'factory', name:'ЗАВОД TECHFRESH', sub:'Сердце корпорации', kind:'factory',
    waves:10, climax:'prime',
    sky:[[0,'#1a0606'],[0.45,'#2a0c0a'],[0.8,'#3a1410'],[1,'#4a1a12']],
    orb:{x:0.7,col:'rgba(255,120,80,.4)',core:'rgba(255,160,90,.85)',mid:'rgba(255,90,40,.25)',edge:'rgba(255,60,30,0)',r:34},
    ground:[[0,'#241410'],[0.3,'#180c0a'],[1,'#0c0605']], edge:'#c0603a', edge2:'rgba(255,120,60,.22)',
    puddle:'rgba(255,120,60,.12)' },
];
function curZone(){ return ZONES[clamp(game.zone||0,0,ZONES.length-1)]; }

// ------------------------------ Мир (сегментный уровень) -------------
const WORLD={ w:2600, groundY:0, platforms:[], segments:[], gates:[], secrets:[], frontier:0 };
// Шаблоны расстановки платформ на сегмент: [долягоризонтали, высотаНадЗемлёй, ширина, секрет?]
// Многоярусные структуры вместо прямой дороги: нижний и верхний маршруты (оба ведут
// вперёд), лестницы-восхождения, навесы и колонны; тайники — на верхних ответвлениях,
// куда добираешься двойным прыжком/рывком (естественные «гейты способностей»).
const PLATFORM_TEMPLATES={
  dump:[
    // двухъярусный: низкий проход + верхний маршрут с тайником
    [[0.18,150,150],[0.40,150,150],[0.64,155,160],[0.86,160,150],[0.30,300,150],[0.56,345,140,true],[0.78,300,150]],
    // восхождение по ступеням к высокому тайнику
    [[0.20,150,140],[0.34,235,130],[0.48,315,120],[0.63,395,120,true],[0.82,260,150]],
    // навесы: два слоя внахлёст
    [[0.24,160,180],[0.50,150,170],[0.76,155,180],[0.38,315,150],[0.66,360,140,true]],
    // высокий мост над разрывом + нижний обход
    [[0.22,150,150],[0.46,270,120],[0.62,275,120],[0.82,150,160],[0.52,405,150,true]],
    // колонны-башни (вертикаль)
    [[0.16,150,120],[0.30,150,120],[0.50,300,130],[0.70,305,130],[0.86,150,150],[0.60,420,120,true]],
  ],
  sewer:[
    [[0.20,140,150],[0.44,145,150],[0.68,150,160],[0.88,150,150],[0.32,290,150,true],[0.60,335,150]],
    [[0.18,150,140],[0.33,240,130],[0.50,320,120,true],[0.70,250,140],[0.86,150,150]],
    [[0.26,160,170],[0.52,150,170],[0.78,150,170],[0.40,300,150],[0.68,355,140,true]],
    [[0.22,150,150],[0.42,260,130],[0.58,265,130],[0.80,150,160],[0.50,395,150,true]],
    [[0.16,150,120],[0.34,300,130],[0.54,150,140],[0.72,305,130,true],[0.88,150,140]],
  ],
  city:[
    [[0.18,160,150],[0.42,150,160],[0.66,160,160],[0.86,150,150],[0.30,310,150],[0.58,360,140,true],[0.80,300,150]],
    [[0.20,150,140],[0.35,245,130],[0.52,330,120],[0.68,410,120,true],[0.85,270,150]],
    [[0.24,150,180],[0.50,155,170],[0.76,150,180],[0.36,320,150,true],[0.64,375,140]],
    [[0.22,150,150],[0.46,275,120],[0.62,280,120],[0.82,150,160],[0.52,415,150,true]],
    [[0.16,150,120],[0.32,150,120],[0.52,310,130],[0.72,315,130,true],[0.88,150,150]],
  ],
  factory:[
    [[0.18,150,150],[0.42,155,160],[0.66,150,160],[0.86,160,150],[0.30,315,150],[0.56,365,140,true],[0.80,310,150]],
    [[0.20,150,140],[0.35,250,130],[0.52,335,120],[0.68,420,120,true],[0.85,280,150]],
    [[0.24,160,180],[0.50,150,170],[0.76,155,180],[0.38,325,150],[0.66,380,140,true]],
    [[0.22,150,150],[0.44,280,120],[0.60,285,120],[0.82,150,160],[0.52,420,150,true]],
    [[0.16,150,120],[0.32,150,120],[0.52,315,130],[0.72,320,130],[0.88,150,150],[0.62,430,120,true]],
  ],
};
function buildWorld(){
  WORLD.groundY = VH - Math.max(70, VH*0.12);
  const g=WORLD.groundY, Z=curZone();
  const waves=Z.waves||10;
  const segW=Math.max(920, VW*1.15);
  const segCount=waves+1;               // + арена босса в конце
  WORLD.w=segW*segCount;
  WORLD.segments=[]; WORLD.gates=[]; WORLD.secrets=[]; WORLD.frontier=0;
  WORLD.platforms=[{x:0,y:g,w:WORLD.w,h:VH-g+60,ground:true}]; // сплошная земля
  const tset=PLATFORM_TEMPLATES[Z.kind]||PLATFORM_TEMPLATES.dump;
  for(let s=0;s<segCount;s++){
    const x0=s*segW, x1=x0+segW;
    WORLD.segments.push({x0,x1});
    if(s<waves){
      const tpl=tset[(s*2 + (game.zone||0)) % tset.length]; // разные структуры по сегментам и зонам
      for(const p of tpl){
        const px=x0 + p[0]*segW, py=g - p[1];
        WORLD.platforms.push({x:px,y:py,w:p[2],h:22});
        if(p[3]) WORLD.secrets.push({x:px+p[2]*0.5, y:py-14, taken:false});
      }
      WORLD.gates.push({x:x1-28, seg:s, open:0}); // ворота в конце каждого волнового сегмента
    }
  }
}
// правый предел доступной зоны (до первых закрытых ворот) — для камеры
function accessRightX(){
  for(const gt of WORLD.gates){ if(gt.open<0.9) return gt.x+50; }
  return WORLD.w;
}
// закрытые ворота блокируют сущность по горизонтали
function blockByGates(e){
  for(const gt of WORLD.gates){
    if(gt.open>=0.9) continue;
    if(e.x > gt.x - e.w*0.5){ e.x = gt.x - e.w*0.5; if(e.vx>0) e.vx=0; }
    break; // только первые закрытые ворота впереди
  }
}
function openGate(seg){ const gt=WORLD.gates[seg]; if(gt && gt.open<1) gt._opening=true; }
function updateGates(dt){
  for(const gt of WORLD.gates){ if(gt._opening && gt.open<1){ gt.open=Math.min(1,gt.open+dt*1.4);
    if(gt.open>=1) gt._opening=false;
    if(Math.random()<0.55) spawnParticle({x:gt.x+rand(-16,16),y:WORLD.groundY-rand(0,340),vx:rand(-30,30),vy:-rand(20,70),life:0.4,max:0.4,size:rand(2,4),color:pick(['#ffd27a','#caa15f']),add:true});
  } }
}
function drawGates(){
  const Z=curZone(), g=WORLD.groundY;
  const col = Z.kind==='sewer'?'#2a4a40' : Z.kind==='city'?'#2a3050' : Z.kind==='factory'?'#3a2418' : '#3a2a1e';
  const edge = Z.kind==='sewer'?'#5fe0b0' : Z.kind==='city'?'#6a7ad0' : Z.kind==='factory'?'#e8b53a' : '#caa15f';
  for(const gt of WORLD.gates){
    if(gt.open>=1) continue;
    // ворота-стена почти во весь экран — сразу видно, что её не перепрыгнуть
    const gh=Math.min(460, VH*0.92), lift=gt.open*gh;
    const x=gt.x-20, top=g-gh+lift;
    ctx.fillStyle=col; roundRect(x,top,40,gh-lift,4); ctx.fill();
    // ребра/створка
    ctx.fillStyle='rgba(0,0,0,.35)'; for(let yy=top+8; yy<g-lift; yy+=18) ctx.fillRect(x+3,yy,34,4);
    ctx.fillStyle=edge; ctx.fillRect(x,top,40,4);
    // индикатор «закрыто»
    if(gt.open<0.05){ ctx.fillStyle=edge; ctx.font="900 12px 'Russo One',sans-serif"; ctx.textAlign='center';
      ctx.fillStyle='rgba(0,0,0,0)'; }
  }
  ctx.textAlign='left';
}
function updateSecrets(dt){
  for(const sc of WORLD.secrets){ if(sc.taken) continue;
    if(brad.alive && dist2(brad.x,brad.y-brad.h*0.4,sc.x,sc.y)<(brad.w*0.8)**2){
      sc.taken=true;
      const crumbs=randi(4,7); for(let i=0;i<crumbs;i++) spawnCrumb(sc.x+rand(-14,14), sc.y);
      const heal=Math.round(brad.maxhp*0.15); brad.hp=Math.min(brad.maxhp, brad.hp+heal);
      floatText(sc.x, sc.y-10, 'ТАЙНИК!', {color:'#ffd27a',size:16,font:'display',vy:-30,life:1.0});
      Audio_.tone(700,0.1,'sine',0.14,1050); Audio_.tone(950,0.12,'sine',0.12,1400,0.05);
      burst(sc.x,sc.y,16,{colors:['#ffd27a','#fff','#9fe06a'],smax:200,szmax:4,lmax:0.5});
    }
  }
}
function drawSecrets(){
  for(const sc of WORLD.secrets){ if(sc.taken) continue;
    ctx.save(); ctx.translate(sc.x, sc.y+Math.sin(performance.now()/500)*2);
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,210,122,.35)';
    ctx.beginPath(); ctx.arc(0,0,15,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over';
    // сундук-ящик
    ctx.fillStyle='#7a5a2a'; roundRect(-11,-9,22,18,3); ctx.fill();
    ctx.fillStyle='#a8813f'; roundRect(-11,-9,22,7,3); ctx.fill();
    ctx.fillStyle='#ffd27a'; ctx.fillRect(-2,-9,4,18);
    ctx.fillStyle='#5a4020'; ctx.fillRect(-3,-2,6,4);
    ctx.restore();
  }
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
  // звёзды/искры/капли фона (ярче в городе, слабее под землёй)
  ctx.save();
  const sa = Z.kind==='city'?0.7 : Z.kind==='dump'?0.4 : Z.kind==='factory'?0.22 : 0.12;
  const starCol = Z.kind==='factory'?'#ffb070' : Z.kind==='sewer'?'#bff0d8' : '#ffe';
  for(const s of bgStars){ const x=s.x-Cam.x*0.05, y=s.y; if(x<-10) continue;
    ctx.globalAlpha=sa+Math.sin(t*2+s.tw)*0.3; ctx.fillStyle=starCol; ctx.fillRect(x,y,s.s,s.s); }
  ctx.restore(); ctx.globalAlpha=1;

  // силуэты заднего плана — ДАЛЬНИЙ слой (малый параллакс) даёт глубину
  if(Z.kind==='city'){
    drawCityLayer(0.12, VH*0.58, '#0a0a1e', 150, 5);
    drawCityLayer(0.26, VH*0.66, '#0e1030', 210, 11);
    drawCityLayer(0.46, VH*0.72, '#0a0b1e', 150, 23);
  } else if(Z.kind==='sewer'){
    drawPipesLayer(0.12, VH*0.52, '#05120d', 150, 3);
    drawPipesLayer(0.24, VH*0.60, '#06140f', 200, 7);
    drawPipesLayer(0.46, VH*0.72, '#040d0a', 150, 19);
  } else if(Z.kind==='factory'){
    drawFactoryLayer(0.12, VH*0.54, '#140605', 165, 3);
    drawFactoryLayer(0.26, VH*0.62, '#1a0a08', 230, 9);
    drawFactoryLayer(0.46, VH*0.72, '#120605', 165, 21);
  } else {
    drawJunkLayer(0.14, VH*0.54, '#241730', 90, 5); // дальние холмы
    for(const hl of Z.hills) drawJunkLayer(hl[0], VH*hl[1], hl[2], hl[3], hl[4]);
  }
  // атмосферная вуаль у горизонта — «воздушная перспектива» (глубина)
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const haze=ctx.createLinearGradient(0,VH*0.42,0,VH*0.72);
  const hz = Z.kind==='sewer'?'rgba(120,200,160,':'rgba(255,150,80,';
  haze.addColorStop(0,hz+'0)'); haze.addColorStop(0.6,hz+'0.05)'); haze.addColorStop(1,hz+'0)');
  ctx.fillStyle=haze; ctx.fillRect(0,VH*0.42,VW,VH*0.30); ctx.restore();
}
// Подземка: силуэты труб с фланцами и круглыми устьями
function drawPipesLayer(par, baseY, color, h, seed){
  const step=150;
  const startIdx=Math.floor((Cam.x*par - step)/step);
  const endIdx=Math.ceil((Cam.x*par + VW + step)/step);
  for(let idx=startIdx; idx<=endIdx; idx++){
    const sx=idx*step - Cam.x*par;
    const r=Math.abs(Math.sin((idx+seed)*1.7));
    const ph=h*(0.4+0.6*r);
    const pw=26+rand0(idx+seed,20);
    // вертикальная труба
    ctx.fillStyle=color; ctx.fillRect(sx, baseY-ph, pw, ph+VH-baseY);
    // фланцы-кольца
    ctx.fillStyle='rgba(180,255,210,.05)';
    for(let yy=baseY-ph+12; yy<VH; yy+=50){ ctx.fillRect(sx-3, yy, pw+6, 5); }
    // круглое устье сверху
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(sx+pw*0.5, baseY-ph, pw*0.75,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.arc(sx+pw*0.5, baseY-ph, pw*0.4,0,TAU); ctx.fill();
    // редкий зеленоватый блик внутри устья
    if((idx+seed)%3===0){ ctx.fillStyle='rgba(120,255,200,.10)'; ctx.beginPath(); ctx.arc(sx+pw*0.5, baseY-ph, pw*0.22,0,TAU); ctx.fill(); }
  }
}
// Завод: индустриальные машины — корпуса, шестерни, трубы, дымоходы с дымом
function drawGearSil(cx,cy,r,rot,color){
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(rot);
  ctx.fillStyle=color; const teeth=9; ctx.beginPath();
  for(let i=0;i<teeth;i++){ const a0=i/teeth*TAU, a1=(i+0.5)/teeth*TAU;
    ctx.lineTo(Math.cos(a0)*r, Math.sin(a0)*r);
    ctx.lineTo(Math.cos(a0+0.11)*(r*1.2), Math.sin(a0+0.11)*(r*1.2));
    ctx.lineTo(Math.cos(a1-0.11)*(r*1.2), Math.sin(a1-0.11)*(r*1.2));
    ctx.lineTo(Math.cos(a1)*r, Math.sin(a1)*r);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(0,0,r*0.42,0,TAU); ctx.fill();
  ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,120,60,.12)'; ctx.beginPath(); ctx.arc(0,0,r*0.2,0,TAU); ctx.fill();
  ctx.restore(); ctx.globalCompositeOperation='source-over';
}
function drawFactoryLayer(par, baseY, color, h, seed){
  const step=175;
  const startIdx=Math.floor((Cam.x*par - step)/step);
  const endIdx=Math.ceil((Cam.x*par + VW + step)/step);
  const now=performance.now();
  for(let idx=startIdx; idx<=endIdx; idx++){
    const sx=idx*step - Cam.x*par;
    const r=Math.abs(Math.sin((idx+seed)*1.1));
    const bh=h*(0.4+0.55*r);
    const bw=step-16;
    const bx=sx+8, top=baseY-bh;
    // приземистый корпус машины
    ctx.fillStyle=color; ctx.fillRect(bx, top, bw, bh+VH-baseY);
    ctx.fillRect(bx+bw*0.14, top-14, bw*0.46, 16); // ступень-крыша
    // горизонтальная магистральная труба поверх (соединяет блоки)
    ctx.fillStyle=color; ctx.fillRect(sx-step*0.12, top+16, step*1.24, 13);
    ctx.fillStyle='rgba(0,0,0,.4)'; for(let fx=bx-12; fx<bx+bw+12; fx+=32) ctx.fillRect(fx,top+14,4,17);
    // большая шестерня на части блоков (вращается)
    if(((idx+seed)%2+2)%2===0) drawGearSil(bx+bw*0.5, top+bh*0.42, Math.min(bw*0.26,38), now/1400*(idx%2?1:-1), color);
    // дымоход + дрейфующий дым
    if(((idx+seed)%3+3)%3===0){
      const stx=bx+bw*0.26, sth=46;
      ctx.fillStyle=color; ctx.fillRect(stx, top-sth, 16, sth);
      ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(stx-2, top-sth, 20, 5);
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(let s=0;s<3;s++){ const pph=(now/1000*13 + s*24 + idx*9)%72;
        ctx.fillStyle='rgba(140,100,90,'+(0.12*(1-pph/72)).toFixed(3)+')';
        ctx.beginPath(); ctx.arc(stx+8 + Math.sin((pph+idx)*0.11)*9, top-sth-pph, 7+pph*0.15, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // тусклые панели индикаторов
    ctx.fillStyle='rgba(255,150,70,.14)';
    for(let cyi=0;cyi<3;cyi++) for(let cxi=0;cxi<2;cxi++){ if(((cxi*3+cyi*5+idx)%3)!==0) continue;
      ctx.fillRect(bx+bw*0.62+cxi*14, top+34+cyi*18, 9, 6); }
    // мигающая аварийная лампа
    if(((idx*2+seed)%3+3)%3===0){ const blink=0.35+0.65*Math.abs(Math.sin(now/300 + idx));
      ctx.fillStyle='rgba(255,80,40,'+(0.6*blink).toFixed(2)+')'; ctx.beginPath(); ctx.arc(bx+bw*0.5, top-4, 4,0,TAU); ctx.fill(); }
  }
}
function drawJunkLayer(par, baseY, color, h, seed){
  // Индексная прокрутка (как у city/pipes/factory) — горы ЕДУТ по горизонтали,
  // а не морфятся: высота устойчива по индексу вершины.
  const step=140;
  const startIdx=Math.floor((Cam.x*par - step)/step);
  const endIdx=Math.ceil((Cam.x*par + VW + step)/step);
  ctx.fillStyle=color; ctx.beginPath();
  ctx.moveTo(startIdx*step - Cam.x*par, VH);
  for(let idx=startIdx; idx<=endIdx; idx++){
    const sx=idx*step - Cam.x*par;
    const valley=h*(0.18+0.22*Math.abs(Math.sin((idx*2+seed)*0.9)));
    const peak  =h*(0.55+0.45*Math.abs(Math.sin((idx+seed*97)*1.3)));
    ctx.lineTo(sx, baseY - valley);          // подошва
    ctx.lineTo(sx+step*0.5, baseY - peak);   // вершина
  }
  ctx.lineTo(endIdx*step - Cam.x*par, VH); ctx.closePath(); ctx.fill();
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
  // рисуем только видимый диапазон (мир очень широкий)
  const vL=Cam.x-60, vR=Cam.x+VW+60;
  const from=(step,o)=>Math.floor((vL-(o||0))/step)*step+(o||0);
  if(Z.kind==='city'){
    for(let x=from(120,20);x<vR;x+=120){ ctx.fillStyle='rgba(255,210,90,.18)'; ctx.fillRect(x,g+24,46,5); }
    for(let x=from(300,60);x<vR;x+=300){ ctx.fillStyle='rgba(120,140,200,.18)'; ctx.beginPath(); ctx.arc(x,g+30,12,0,TAU); ctx.fill(); }
  } else if(Z.kind==='sewer'){
    for(let x=from(180,20);x<vR;x+=180){ ctx.fillStyle='rgba(120,255,200,.09)'; ctx.fillRect(x,g+22,84,4); }
    for(let x=from(240,50);x<vR;x+=240){ ctx.fillStyle='rgba(150,200,180,.18)';
      for(let k=0;k<6;k++) ctx.fillRect(x+k*9, g+30, 4, 12); }
  } else if(Z.kind==='factory'){
    const off=(performance.now()/1000*46)%44;
    ctx.fillStyle='rgba(255,180,60,.13)';
    for(let x=from(44,0)-44;x<vR;x+=44){ const bx=x+off;
      ctx.beginPath(); ctx.moveTo(bx,g+6); ctx.lineTo(bx+20,g+6); ctx.lineTo(bx+8,g+16); ctx.lineTo(bx-12,g+16); ctx.closePath(); ctx.fill(); }
    for(let x=from(54,0);x<vR;x+=54){
      ctx.fillStyle='rgba(120,70,50,.55)'; ctx.beginPath(); ctx.arc(x, g+30, 7, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(x,g+30); ctx.rotate(performance.now()/280); ctx.fillStyle='#2a1712'; ctx.fillRect(-6,-1.2,12,2.4); ctx.restore();
    }
  } else {
    for(let x=from(90,0);x<vR;x+=90){
      ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(x+ (x*7%40), g+18+ (x*3%20), 30,6);
      ctx.fillStyle='#5a4530'; ctx.beginPath(); ctx.arc(x+45, g+12, 2.5,0,TAU); ctx.fill();
    }
  }
  // лужи (в видимом диапазоне)
  for(let x=from(420,180);x<vR;x+=420){ ctx.fillStyle=Z.puddle; ctx.beginPath(); ctx.ellipse(x,g+30,46,7,0,0,TAU); ctx.fill(); }
  ctx.restore();
}
function drawPlatforms(){
  const Z=curZone(); const factory=Z.kind==='factory';
  ctx.save(); ctx.translate(-Cam.x,0);
  for(const pl of WORLD.platforms){ if(pl.ground) continue;
    if(factory){
      // металлический катуолк с решёткой и предупреждающей кромкой
      ctx.fillStyle='#141014'; roundRect(pl.x,pl.y+3,pl.w,pl.h,3); ctx.fill();
      ctx.fillStyle='#3a3f46'; roundRect(pl.x,pl.y,pl.w,pl.h,3); ctx.fill();
      // решётка
      ctx.fillStyle='rgba(0,0,0,.35)';
      for(let x=pl.x+4;x<pl.x+pl.w-3;x+=9) ctx.fillRect(x,pl.y+3,3,pl.h-5);
      // жёлто-чёрная кромка
      for(let x=pl.x;x<pl.x+pl.w;x+=14){ ctx.fillStyle=((x/14)|0)%2?'#e8b53a':'#1a1206'; ctx.fillRect(x,pl.y,14,3); }
    } else {
      // платформа из металлолома
      ctx.fillStyle='#1c140e'; roundRect(pl.x,pl.y+3,pl.w,pl.h,4); ctx.fill();
      ctx.fillStyle='#5a4530'; roundRect(pl.x,pl.y,pl.w,pl.h,4); ctx.fill();
      ctx.fillStyle='#caa15f'; ctx.fillRect(pl.x,pl.y,pl.w,2);
      ctx.fillStyle='rgba(0,0,0,.3)';
      for(let x=pl.x+8;x<pl.x+pl.w-6;x+=22){ ctx.fillRect(x,pl.y+pl.h-5,3,3); }
    }
  }
  ctx.restore();
}

// ------------------------------ HUD ----------------------------------
