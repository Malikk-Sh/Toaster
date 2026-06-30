"use strict";
const toasts=[];
const PROJ_G=1500;
function fireToast(x,y,target,opt={}){
  let vx,vy;
  const facing=opt.facing||1;
  if(target){
    const dx=target.x-x, dy=(target.y-target.h*0.4)-y;
    const T=clamp(Math.abs(dx)/520, 0.26, 0.8);
    vx=dx/T; vy=dy/T - 0.5*PROJ_G*T;
  }else{
    vx=facing*520*(opt.speedMul||1); vy=-260;
  }
  if(opt.angle!=null){ const sp=opt.speed||620; vx=Math.cos(opt.angle)*sp; vy=Math.sin(opt.angle)*sp; }
  toasts.push({x,y,vx,vy,size:opt.size||10,dmg:opt.dmg||10,
    charged:!!opt.charged,aoe:opt.aoe||0,life:opt.life||2.2,rot:rand(0,TAU),
    spin:rand(-10,10)*sign(vx),hit:false,trail:0});
}
function explodeToast(t){
  const r = t.charged? (38+t.aoe) : 0;
  if(r>0){
    burst(t.x,t.y,26,{colors:['#ff6a00','#ffd23f','#ff2a00','#ffae42'],smax:340,grav:300,szmax:7,lmax:0.6});
    Audio_.explode(); Cam.addShake(10);
    for(const e of enemies){
      if(!e.dead && dist2(e.x,e.y-e.h*0.4,t.x,t.y) < (r+e.w*0.5)**2){
        damageEnemy(e, t.dmg, t.x, t.y, true);
        e.burn=Math.max(e.burn,2.5);
      }
    }
    // всплеск по боссу
    if(boss.active && boss.state!=='intro' && boss.state!=='dying' && dist2(boss.x,boss.cy,t.x,t.y) < (r+boss.w*0.45)**2){
      damageBoss(t.dmg, t.x, t.y, true); boss.burn=Math.max(boss.burn,3);
    }
    // плавим барьеры рядом
    for(let wi=iceWalls.length-1; wi>=0; wi--){ const wll=iceWalls[wi];
      if(dist2(wll.x,wll.y-wll.h*0.5,t.x,t.y) < (r+wll.w*0.5)**2) damageIceWall(wll, t.dmg, t.x, t.y);
    }
    // огненная зона-вспышка
    spawnParticle({x:t.x,y:t.y,vx:0,vy:0,life:0.22,max:0.22,size:r*0.9,color:'#ffae42',add:true,shrink:false,grav:0});
  }
}
function updateToasts(dt){
  for(let i=toasts.length-1;i>=0;i--){
    const t=toasts[i]; t.life-=dt; t.vy+=PROJ_G*dt;
    t.x+=t.vx*dt; t.y+=t.vy*dt; t.rot+=t.spin*dt; t.trail-=dt;
    // огненный след
    if(t.trail<=0){ t.trail=0.02;
      spawnParticle({x:t.x,y:t.y,vx:rand(-20,20),vy:rand(-10,30),life:rand(0.15,0.35),max:0.35,
        size:rand(2,t.charged?6:3.5),color:pick(['#ff8a1e','#ffd23f','#ff5a1e']),add:true,grav:-40});
    }
    // столкновение с землёй/платформой
    let landed=false;
    for(const pl of WORLD.platforms){
      if(t.x>pl.x && t.x<pl.x+pl.w && t.y>pl.y && t.y<pl.y+pl.h+ (pl.ground?80:14)){ landed=true; break; }
    }
    // попадание во врага
    let struck=null;
    for(const e of enemies){
      if(e.dead) continue;
      if(Math.abs(t.x-e.x)<e.w*0.55+t.size && Math.abs(t.y-(e.y-e.h*0.4))<e.h*0.55+t.size){ struck=e; break; }
    }
    if(struck){
      damageEnemy(struck, t.dmg, t.x, t.y, t.charged);
      struck.burn=Math.max(struck.burn, (t.charged?2.5:1.4)*brad.burnMul);
      explodeToast(t);
      if(!t.charged){ Audio_.hit(); burst(t.x,t.y,7,{colors:['#ffd27a','#ff8a1e'],smax:180,szmax:4,lmax:0.4}); }
      toasts.splice(i,1); continue;
    }
    // попадание в босса
    if(boss.active && boss.state!=='intro' && boss.state!=='dying' &&
       Math.abs(t.x-boss.x)<boss.w*0.5+t.size && Math.abs(t.y-boss.cy)<boss.h*0.5+t.size){
      damageBoss(t.dmg, t.x, t.y, t.charged);
      boss.burn=Math.max(boss.burn, (t.charged?3:1.6)*brad.burnMul);
      explodeToast(t);
      if(!t.charged){ Audio_.hit(); burst(t.x,t.y,7,{colors:['#ffd27a','#ff8a1e'],smax:180,szmax:4,lmax:0.4}); }
      toasts.splice(i,1); continue;
    }
    // попадание в ледяной барьер (огонь плавит)
    let hitWall=null;
    for(const wll of iceWalls){
      if(Math.abs(t.x-wll.x)<wll.w*0.5+t.size && t.y>wll.y-wll.h-t.size && t.y<wll.y+t.size){ hitWall=wll; break; }
    }
    if(hitWall){
      damageIceWall(hitWall, t.charged? t.dmg*1.2 : t.dmg, t.x, t.y);
      explodeToast(t);
      toasts.splice(i,1); continue;
    }
    if(landed){
      explodeToast(t);
      if(!t.charged) burst(t.x,t.y,5,{colors:['#caa15f','#8a6a3a'],smax:120,grav:400,szmax:3,lmax:0.4});
      toasts.splice(i,1); continue;
    }
    if(t.life<=0 || t.y>WORLD.groundY+200 || t.x< -100 || t.x>WORLD.w+100){ toasts.splice(i,1); }
  }
}
function drawToast(t){
  ctx.save(); ctx.translate(t.x,t.y); ctx.rotate(t.rot);
  const s=t.size;
  if(t.charged){ // ореол
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle='rgba(255,140,30,.5)'; ctx.beginPath(); ctx.arc(0,0,s*1.9,0,TAU); ctx.fill();
    ctx.globalCompositeOperation='source-over';
  }
  // ломтик тоста
  ctx.fillStyle='#b5722a'; roundRect(-s,-s,s*2,s*2,s*0.5); ctx.fill();
  ctx.fillStyle='#e0a85a'; roundRect(-s*0.78,-s*0.78,s*1.56,s*1.56,s*0.4); ctx.fill();
  ctx.fillStyle='#f4d29a'; roundRect(-s*0.5,-s*0.5,s*1.0,s*0.7,s*0.3); ctx.fill();
  ctx.restore();
}

// ------------------------------ Враги --------------------------------
const bossShots=[];
function spawnIceCube(x,y,tx,ty,opt={}){
  const dx=tx-x, dy=ty-y;
  const T=clamp(Math.abs(dx)/420, 0.4, 1.0);
  const G=PROJ_G*0.55;
  let vx=dx/T, vy=dy/T - 0.5*G*T;
  if(opt.angle!=null){ const sp=opt.speed||420; vx=Math.cos(opt.angle)*sp; vy=Math.sin(opt.angle)*sp; }
  bossShots.push({x,y,vx,vy,g:G,size:opt.size||13,dmg:opt.dmg||14,kind:'ice',chill:true,
    life:3.2,rot:rand(0,TAU),spin:rand(-6,6),trail:0});
}
// «болт-пуля» элитника (миниган) — без заморозки, летит почти прямо
function spawnBullet(x,y,ang,opt={}){
  const sp=opt.speed||560;
  bossShots.push({x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,g:opt.g!=null?opt.g:120,
    size:opt.size||6,dmg:opt.dmg||10,kind:'bullet',chill:false,
    life:opt.life||2.4,rot:rand(0,TAU),spin:rand(-14,14),trail:0});
}
// кипящая капля Чайника — по дуге, поджаривает при попадании
function spawnGlob(x,y,tx,ty,opt={}){
  const dx=tx-x, dy=ty-y;
  const T=clamp(Math.abs(dx)/360, 0.35, 0.95);
  const G=PROJ_G*0.6;
  const vx=dx/T, vy=dy/T - 0.5*G*T;
  bossShots.push({x,y,vx,vy,g:G,size:opt.size||11,dmg:opt.dmg||12,kind:'glob',chill:false,
    life:3.0,rot:rand(0,TAU),spin:rand(-4,4),trail:0});
}
// электро-болт зарядки — быстрый, почти прямой, короткий стан
function spawnBolt(x,y,ang,opt={}){
  const sp=opt.speed||640;
  bossShots.push({x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,g:opt.g!=null?opt.g:40,
    size:opt.size||7,dmg:opt.dmg||9,kind:'bolt',chill:!!opt.stun,chillSec:opt.stun||0,stunCol:true,
    life:opt.life||2.0,rot:ang,spin:0,trail:0});
}
// ударная волна Утюга — катится по земле, надо перепрыгнуть
function spawnGroundWave(x,dir,opt={}){
  bossShots.push({x,y:WORLD.groundY-12,vx:dir*(opt.speed||380),vy:0,g:0,
    size:opt.size||16,dmg:opt.dmg||14,kind:'wave',chill:false,
    life:opt.life||1.6,rot:0,spin:0,trail:0});
}
function updateBossShots(dt){
  for(let i=bossShots.length-1;i>=0;i--){
    const s=bossShots[i]; s.life-=dt; s.vy+=s.g*dt; s.x+=s.vx*dt; s.y+=s.vy*dt; s.rot+=s.spin*dt; s.trail-=dt;
    if(s.trail<=0){ s.trail=0.04;
      const tc = s.kind==='bullet'? ['#ffd27a','#ff8a1e','#caa15f']
        : s.kind==='glob'? ['#ffae42','#ff6a00','#ffd23f']
        : s.kind==='bolt'? ['#fff7a0','#9fd0ff','#fff']
        : s.kind==='wave'? ['#caa15f','#ffd27a','#8a6a3a']
        : ['#bfe8ff','#8fd2ff','#dff4ff'];
      spawnParticle({x:s.x,y:s.y,vx:rand(-15,15),vy:rand(-5,20),life:rand(0.18,0.36),max:0.36,
        size:rand(2,4),color:pick(tc),add:true,grav:30}); }
    // попадание в Брэда
    if(brad.alive && !brad.dashing && Math.abs(s.x-brad.x)<brad.w*0.5+s.size && Math.abs(s.y-(brad.y-brad.h*0.4))<brad.h*0.5+s.size){
      if(brad.reflectChance>0 && Math.random()<brad.reflectChance){
        floatText(brad.x,brad.y-brad.h*0.9,'ОТРАЖЕНО',{color:'#bfe8ff',size:16,font:'display'});
        shotShatter(s); Audio_.metal(); bossShots.splice(i,1); continue;
      }
      brad.hurt(s.dmg, s.x); if(s.chill) brad.chill(s.chillSec||1.6);
      shotShatter(s); bossShots.splice(i,1); continue;
    }
    // земля/платформа
    let hitGround=false;
    for(const pl of WORLD.platforms){ if(s.x>pl.x && s.x<pl.x+pl.w && s.y>pl.y && s.y<pl.y+pl.h+(pl.ground?60:12)){ hitGround=true; break; } }
    if(hitGround){ shotShatter(s); bossShots.splice(i,1); continue; }
    if(s.life<=0 || s.x<-120 || s.x>WORLD.w+120 || s.y>WORLD.groundY+200) bossShots.splice(i,1);
  }
}
function shotShatter(s){
  if(s.kind==='bullet'){ Audio_.tone(rand(500,700),0.04,'square',0.06,200);
    burst(s.x,s.y,5,{colors:['#ffd27a','#caa15f','#fff'],smax:160,grav:300,szmax:3,lmax:0.3}); }
  else if(s.kind==='glob'){ Audio_.noise(0.06,0.08,2200);
    burst(s.x,s.y,8,{colors:['#ffae42','#ff6a00','#ffd23f'],smax:180,grav:120,szmax:5,lmax:0.4}); }
  else if(s.kind==='bolt'){ Audio_.tone(rand(900,1300),0.05,'square',0.07,400);
    burst(s.x,s.y,6,{kind:'spark',colors:['#fff7a0','#9fd0ff','#fff'],smax:220,szmax:3,lmax:0.25,grav:60}); }
  else if(s.kind==='wave'){ burst(s.x,s.y,5,{colors:['#caa15f','#8a6a3a'],smax:140,grav:200,szmax:3,lmax:0.3}); }
  else iceShatter(s.x,s.y);
}
function iceShatter(x,y){
  Audio_.tone(rand(700,900),0.06,'triangle',0.08,300); Audio_.noise(0.05,0.06,5000);
  burst(x,y,8,{colors:['#bfe8ff','#8fd2ff','#fff'],smax:200,grav:300,szmax:4,lmax:0.4});
}
function drawBossShots(){
  for(const s of bossShots){
    ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.rot);
    const z=s.size;
    if(s.kind==='bullet'){
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,170,60,.5)';
      ctx.beginPath(); ctx.arc(0,0,z*1.7,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='#6a5a3a'; roundRect(-z,-z*0.7,z*2,z*1.4,2); ctx.fill();
      ctx.fillStyle='#caa15f'; roundRect(-z*0.7,-z*0.5,z*1.4,z*1.0,1); ctx.fill();
    } else if(s.kind==='glob'){
      // кипящая капля
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,150,50,.5)';
      ctx.beginPath(); ctx.arc(0,0,z*1.7,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='#ff8a1e'; ctx.beginPath(); ctx.arc(0,0,z,0,TAU); ctx.fill();
      ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.arc(-z*0.3,-z*0.3,z*0.45,0,TAU); ctx.fill();
    } else if(s.kind==='bolt'){
      // электро-болт (ромб + искра)
      ctx.globalCompositeOperation='lighter';
      ctx.fillStyle='rgba(170,210,255,.6)'; ctx.beginPath(); ctx.arc(0,0,z*1.8,0,TAU); ctx.fill();
      ctx.strokeStyle='#fff7a0'; ctx.lineWidth=2.4;
      ctx.beginPath(); ctx.moveTo(-z*1.6,0); ctx.lineTo(-z*0.3,-z*0.6); ctx.lineTo(z*0.3,z*0.6); ctx.lineTo(z*1.6,0); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(0,-z); ctx.lineTo(z*0.7,0); ctx.lineTo(0,z); ctx.lineTo(-z*0.7,0); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation='source-over';
    } else if(s.kind==='wave'){
      // низкая ударная волна по земле
      ctx.globalCompositeOperation='lighter';
      ctx.fillStyle='rgba(255,200,120,.4)';
      ctx.beginPath(); ctx.ellipse(0,0,z*1.4,z*2.0,0,0,TAU); ctx.fill();
      ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='#caa15f'; ctx.beginPath(); ctx.ellipse(0,0,z*0.8,z*1.5,0,0,TAU); ctx.fill();
    } else {
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(150,210,255,.45)';
      ctx.beginPath(); ctx.arc(0,0,z*1.6,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='#9fd6f5'; roundRect(-z,-z,z*2,z*2,3); ctx.fill();
      ctx.fillStyle='#d9f2ff'; roundRect(-z*0.7,-z*0.7,z*1.4,z*1.4,2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.85)'; roundRect(-z*0.5,-z*0.5,z*0.5,z*0.5,1); ctx.fill();
    }
    ctx.restore();
  }
}

// --- ледяные барьеры (препятствия на арене) ---
const iceWalls=[];
function spawnIceWall(x){
  const h=rand(70,110);
  iceWalls.push({x, y:WORLD.groundY, w:rand(34,46), h, hp:60, maxhp:60, born:0, life:9, shimmer:rand(0,TAU)});
  burst(x,WORLD.groundY-h*0.5,14,{colors:['#bfe8ff','#8fd2ff','#fff'],smax:160,szmax:4,lmax:0.5});
  Audio_.tone(160,0.3,'triangle',0.14,80); Audio_.noise(0.2,0.1,2600);
}
function damageIceWall(wll,dmg,fx,fy){
  wll.hp-=dmg; // огонь тоста хорошо плавит лёд
  burst(fx,fy,4,{kind:'spark',colors:['#bfe8ff','#fff'],smax:140,szmax:3,lmax:0.3,grav:120});
  floatText(wll.x,wll.y-wll.h-6,Math.round(dmg).toString(),{color:'#bfe8ff',size:13,vy:-26,life:0.5});
  if(wll.hp<=0){
    const idx=iceWalls.indexOf(wll); if(idx>=0) iceWalls.splice(idx,1);
    burst(wll.x,wll.y-wll.h*0.5,22,{colors:['#bfe8ff','#8fd2ff','#fff'],smax:240,grav:320,szmax:5,lmax:0.6});
    Audio_.metal();
  }
}
function updateIceWalls(dt){
  for(let i=iceWalls.length-1;i>=0;i--){
    const wll=iceWalls[i]; wll.born+=dt; wll.life-=dt; wll.shimmer+=dt*3;
    if(wll.life<=0){ burst(wll.x,wll.y-wll.h*0.5,12,{colors:['#bfe8ff','#fff'],smax:160,grav:300,szmax:4,lmax:0.5}); iceWalls.splice(i,1); continue; }
    // блокируем Брэда по горизонтали
    if(brad.alive && !brad.dashing){
      const top=wll.y-wll.h;
      const overlapY = (brad.y+brad.h*0.5) > top+6;
      if(overlapY && Math.abs(brad.x-wll.x) < (brad.w*0.5+wll.w*0.5)){
        if(brad.x<wll.x){ brad.x=wll.x-(brad.w*0.5+wll.w*0.5); if(brad.vx>0) brad.vx=0; }
        else { brad.x=wll.x+(brad.w*0.5+wll.w*0.5); if(brad.vx<0) brad.vx=0; }
      }
    }
  }
}
function drawIceWalls(){
  for(const wll of iceWalls){
    const top=wll.y-wll.h, x=wll.x-wll.w*0.5;
    const frac=clamp(wll.hp/wll.maxhp,0,1);
    ctx.save();
    ctx.globalAlpha=0.92;
    const g=ctx.createLinearGradient(0,top,0,wll.y);
    g.addColorStop(0,'#dff4ff'); g.addColorStop(0.5,'#9fd6f5'); g.addColorStop(1,'#6fb8e0');
    ctx.fillStyle=g; roundRect(x,top,wll.w,wll.h,6); ctx.fill();
    // блик
    ctx.fillStyle='rgba(255,255,255,.55)'; roundRect(x+4,top+5,wll.w*0.25,wll.h*0.7,3); ctx.fill();
    // трещины при повреждении
    if(frac<0.6){ ctx.strokeStyle='rgba(80,140,180,.7)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(wll.x,top+8); ctx.lineTo(wll.x-6,top+wll.h*0.5); ctx.lineTo(wll.x+5,wll.y-8); ctx.stroke(); }
    ctx.globalAlpha=1; ctx.restore();
  }
}

// --- сам босс ---
const crumbs=[];
function spawnCrumb(x,y){
  if(crumbs.length>300) crumbs.shift();
  crumbs.push({x,y,vx:rand(-120,120),vy:rand(-260,-120),life:9,settled:false,
    size:rand(3,5),anim:rand(0,TAU)});
}
function updateCrumbs(dt){
  for(let i=crumbs.length-1;i>=0;i--){
    const c=crumbs[i]; c.life-=dt; c.anim+=dt*5;
    if(c.life<=0){ crumbs.splice(i,1); continue; }
    // магнетизм к Брэду
    const d2=dist2(c.x,c.y,brad.x,brad.y-brad.h*0.4);
    if(brad.alive && d2 < 150*150){
      const dx=brad.x-c.x, dy=(brad.y-brad.h*0.4)-c.y, d=Math.sqrt(d2)||1;
      const pull=420*(1-d/150)+120;
      c.vx+=dx/d*pull*dt; c.vy+=dy/d*pull*dt;
    } else { c.vy+=900*dt; }
    c.x+=c.vx*dt; c.y+=c.vy*dt; c.vx*=(1-dt*0.8);
    // земля
    if(c.y>WORLD.groundY-4){ c.y=WORLD.groundY-4; c.vy*=-0.3; c.vx*=0.7; }
    // подбор
    if(brad.alive && d2 < (brad.w*0.6)**2){
      game.crumbs++; brad.gainUlt(1.4); Audio_.pickup();
      spawnParticle({x:c.x,y:c.y,vx:0,vy:-40,life:0.3,max:0.3,size:6,color:'#ffd27a',add:true});
      crumbs.splice(i,1);
    }
  }
}
function drawCrumbs(){
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(const c of crumbs){
    const pulse=0.7+Math.sin(c.anim)*0.3;
    ctx.fillStyle='rgba(255,180,70,.35)'; ctx.beginPath(); ctx.arc(c.x,c.y,c.size*2.2*pulse,0,TAU); ctx.fill();
  }
  ctx.globalCompositeOperation='source-over';
  for(const c of crumbs){ ctx.fillStyle='#f2c879'; roundRect(c.x-c.size/2,c.y-c.size/2,c.size,c.size,1.5); ctx.fill(); }
  ctx.restore();
}

// ------------------------------ Записки (лор) ------------------------
const NOTES=[
  {id:'n1', t:'Утиль-квитанция №404: «Тостер „Колос“, 1987 г.в. Состояние: рабочее. Причина списания: устарел морально.»'},
  {id:'n2', t:'Листовка TechFresh: «Обнови кухню — обнови себя! Старое не чинят. Старое заменяют.»'},
  {id:'n3', t:'Записка Фанни: «Брэд, если читаешь это — значит дошёл. Не верь рекламе. Грейся изнутри.»'},
  {id:'n4', t:'Инструкция Блендера (на салфетке): «КРОШКА = ТОПЛИВО. Тратить с умом. Жжж. О чём я? А, апгрейды!»'},
  {id:'n5', t:'Служебный лог: «Холодильник „Полюс“ перепрошит. Лоялен. Морозит несогласных.»'},
  {id:'n6', t:'Граффити на свалке: «МЫ НЕ МУСОР». Краска ещё свежая.'},
  {id:'n7', t:'Чек из магазина: гарантия истекла за день до поломки. Совпадение? В TechFresh не верят в совпадения.'},
  {id:'n8', t:'Городская сводка: «Roomba-патруль 9000 переведён в режим зачистки. Беженцев-приборов — изолировать.»'},
];
const notes=[];
function notesFoundCount(){ return Object.keys(Save.data.notes||{}).length; }
function maybeDropNote(x,y){
  // редкий шанс выронить записку (не чаще 1 непрочитанной за раз на экране)
  if(notes.length>0) return;
  const undiscovered=NOTES.filter(n=>!(Save.data.notes&&Save.data.notes[n.id]));
  if(undiscovered.length===0) return;
  if(Math.random()<0.14){
    const n=pick(undiscovered);
    notes.push({x,y:Math.min(y,WORLD.groundY-30),vy:-120,vx:rand(-40,40),id:n.id,text:n.t,anim:rand(0,TAU),life:18});
  }
}
function updateNotes(dt){
  for(let i=notes.length-1;i>=0;i--){
    const p=notes[i]; p.anim+=dt*3; p.life-=dt;
    if(p.life<=0){ notes.splice(i,1); continue; }
    const d2=dist2(p.x,p.y,brad.x,brad.y-brad.h*0.4);
    if(brad.alive && d2<150*150){ const dx=brad.x-p.x, dy=(brad.y-brad.h*0.4)-p.y, d=Math.sqrt(d2)||1;
      const pull=300*(1-d/150)+90; p.vx+=dx/d*pull*dt; p.vy+=dy/d*pull*dt; }
    else p.vy+=500*dt;
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=(1-dt*0.9);
    if(p.y>WORLD.groundY-12){ p.y=WORLD.groundY-12; p.vy*=-0.3; p.vx*=0.7; }
    if(brad.alive && d2<(brad.w*0.7)**2){
      Save.data.notes=Save.data.notes||{}; Save.data.notes[p.id]=true; Save.persist();
      Audio_.tone(740,0.1,'sine',0.12,1100); Audio_.tone(988,0.14,'sine',0.1,1480,0.06);
      showNote(p.text);
      burst(p.x,p.y,12,{colors:['#ffe9b0','#fff','#caa15f'],smax:160,szmax:4,lmax:0.5});
      notes.splice(i,1);
    }
  }
}
function drawNotes(){
  for(const p of notes){
    ctx.save(); ctx.translate(p.x, p.y+Math.sin(p.anim)*3); ctx.rotate(Math.sin(p.anim*0.7)*0.1);
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,230,160,.4)';
    ctx.beginPath(); ctx.arc(0,0,16,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over';
    // листок
    ctx.fillStyle='#f3ead0'; roundRect(-9,-12,18,24,2); ctx.fill();
    ctx.fillStyle='#b9a884'; for(let k=0;k<4;k++) ctx.fillRect(-6,-8+k*5,12,1.5);
    ctx.fillStyle='#caa15f'; ctx.font="900 9px 'Russo One',sans-serif"; ctx.textAlign='center'; ctx.fillText('?', 0, 11);
    ctx.restore();
  }
  ctx.textAlign='left';
}
// карточка записки (экранное пространство)
const noteCard={text:'',t:0,max:0};
function showNote(text){ noteCard.text=text; noteCard.t=noteCard.max=5.0; }
function updateNoteCard(dt){ if(noteCard.t>0) noteCard.t-=dt; }
function drawNoteCard(){
  if(noteCard.t<=0) return;
  const p=noteCard.t/noteCard.max;
  const a=p>0.85?(1-(p-0.85)/0.15):p<0.2?p/0.2:1;
  ctx.save(); ctx.globalAlpha=a;
  const w=Math.min(VW*0.86,520), x=VW/2-w/2, y=VH*0.7;
  // обёртка
  ctx.fillStyle='rgba(20,14,11,.92)'; roundRect(x,y,w,86,12); ctx.fill();
  ctx.strokeStyle='rgba(255,210,122,.5)'; ctx.lineWidth=1.5; roundRect(x,y,w,86,12); ctx.stroke();
  ctx.fillStyle='#ffd27a'; ctx.font="900 12px 'Russo One',sans-serif"; ctx.textAlign='left';
  ctx.fillText('📄 ЗАПИСКА НАЙДЕНА', x+14, y+20);
  // текст с переносом
  ctx.fillStyle='#e8dcc4'; ctx.font="13px 'Rubik',sans-serif";
  wrapText(noteCard.text, x+14, y+38, w-28, 16);
  ctx.restore(); ctx.globalAlpha=1; ctx.textAlign='left';
}
function wrapText(text,x,y,maxW,lh){
  const words=text.split(' '); let line='', yy=y;
  for(const wd of words){ const test=line?line+' '+wd:wd;
    if(ctx.measureText(test).width>maxW && line){ ctx.fillText(line,x,yy); line=wd; yy+=lh; if(yy>y+lh*3) { ctx.fillText(line+'…',x,yy); return; } }
    else line=test; }
  ctx.fillText(line,x,yy);
}

// ------------------------------ Брэд ---------------------------------
