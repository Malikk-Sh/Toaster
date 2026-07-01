"use strict";
const enemies=[];
const ENEMY_DEFS={
  vac:{name:'Сосун', hp:34, w:48, h:38, crumbs:3, color:'#7a8a5a', speed:62, contact:12},
  nuke:{name:'Нюк', hp:46, w:52, h:50, crumbs:5, color:'#9a9aa6', speed:18, contact:14},
  fan:{name:'Жара', hp:18, w:42, h:42, crumbs:2, color:'#caa15f', speed:118, contact:13},
  drone:{name:'Снек-Дрон', hp:13, w:30, h:26, crumbs:1, color:'#d8b15a', speed:158, contact:10},
  drill:{name:'Бурильщик', hp:40, w:54, h:40, crumbs:4, color:'#b06a3a', speed:70, contact:16},
  kettle:{name:'Кипяток', hp:32, w:46, h:46, crumbs:3, color:'#c0c6cc', speed:46, contact:12},
  mixer:{name:'Вихрь', hp:30, w:40, h:50, crumbs:3, color:'#c84a4a', speed:150, contact:16},
  iron:{name:'Пресс', hp:58, w:56, h:38, crumbs:5, color:'#5a8ac0', speed:50, contact:16},
  shock:{name:'Разряд', hp:15, w:32, h:32, crumbs:2, color:'#e8d24a', speed:120, contact:11},
  mine:{name:'Хлопушка', hp:16, w:34, h:26, crumbs:2, color:'#b0a040', speed:128, contact:8},
  juicer:{name:'Соковыжималка', hp:36, w:46, h:52, crumbs:4, color:'#c85a8a', speed:58, contact:13},
  roomba:{name:'Roomba 9000', hp:420, w:96, h:60, crumbs:30, color:'#3a3f4a', speed:70, contact:18, elite:true},
};
function spawnEnemy(type,x,y){
  const d=ENEMY_DEFS[type];
  const hp=Math.round(d.hp*(typeof enemyScale==='function'?enemyScale():diffMul()));
  const e={
    type,name:d.name,x,y:y!=null?y:WORLD.groundY-d.h*0.5,
    w:d.w,h:d.h,hp,maxhp:hp,color:d.color,speed:d.speed,contact:Math.round(d.contact*(1+(Save.data.ngPlus||0)*0.12)),
    crumbs:d.crumbs,vx:0,vy:0,dead:false,flash:0,burn:0,burnTick:0,
    state:'idle',t:0,charge:0,facing:-1,onGround:false,grounded:false,
    anim:rand(0,TAU),hurtBob:0,elite:!!d.elite,
  };
  enemies.push(e);
  if(e.elite){ game.elite=e; game.eliteActive=true; }
  return e;
}
function diffMul(){ return 1 + (Save.data.ngPlus||0)*0.4; }
function damageEnemy(e,dmg,fromX,fromY,big){
  if(e.dead) return;
  // бонус за удар сзади у Сосуна
  let mult=1;
  if(e.type==='vac'){ const behind = (e.facing<0 && fromX>e.x) || (e.facing>0 && fromX<e.x); if(behind) mult=1.6;
    if(e.state==='stun') mult=Math.max(mult,1.9); } // промахнулся рывком — уязвим
  // Соковыжималка: раскрутка перед залпом — открыта для урона
  if(e.type==='juicer' && e.state==='spin') mult=Math.max(mult,1.8);
  // двойной урон Нюку во время зарядки
  if(e.type==='nuke' && e.state==='charging') mult=Math.max(mult,2);
  // Бурильщик: уязвим со спины и особенно когда застрял
  if(e.type==='drill'){ const behind=(e.facing<0 && fromX>e.x)||(e.facing>0 && fromX<e.x); if(behind) mult=Math.max(mult,1.7);
    if(e.state==='stuck') mult=Math.max(mult,2.2); }
  // Миксер: уязвим во время раскрутки после рывка
  if(e.type==='mixer' && e.state==='recover') mult=Math.max(mult,2.0);
  // Утюг: бронирован (получает мало урона), кроме момента выпуска пара
  if(e.type==='iron') mult = e.state==='vent'? Math.max(mult,1.8) : mult*0.55;
  const final=Math.round(dmg*mult);
  e.hp-=final; e.flash=0.12; e.hurtBob=1;
  floatText(e.x+rand(-6,6), e.y-e.h*0.7, final.toString(),
    {color:mult>1?'#ffd23f':'#fff', size:mult>1?22:16, weight:900});
  burst(fromX,fromY,big?5:3,{kind:'spark',colors:['#fff','#ffd27a'],smax:big?260:160,szmax:3,lmax:0.35,grav:200});
  if(e.hp<=0) killEnemy(e);
}
function killEnemy(e){
  if(e.dead) return; e.dead=true;
  game.kills++;
  const big = !!e.elite;
  burst(e.x,e.y-e.h*0.4, big?40:20,{colors:['#ff8a1e','#ffd23f','#caa15f','#888'],smax:big?420:320,grav:360,szmax:big?8:6,lmax:0.7});
  spawnParticle({x:e.x,y:e.y-e.h*0.4,vx:0,vy:0,life:0.2,max:0.2,size:e.w*0.7,color:'#ffae42',add:true,shrink:false});
  Audio_.explode(); Cam.addShake(big?14:6);
  for(let i=0;i<e.crumbs;i++) spawnCrumb(e.x+rand(-16,16), e.y-e.h*0.4);
  maybeDropHeal(e.x, e.y-e.h*0.5);
  // апгрейд «Цепная детонация»
  if(brad.enemyDeathExplode){
    const ex=e.x, ey=e.y-e.h*0.4, R=92;
    burst(ex,ey,16,{colors:['#ff6a00','#ffd23f','#ff2a00'],smax:280,grav:200,szmax:6,lmax:0.5});
    spawnParticle({x:ex,y:ey,vx:0,vy:0,life:0.2,max:0.2,size:R*0.8,color:'#ffae42',add:true,shrink:false});
    Cam.addShake(5);
    for(const o of enemies){ if(!o.dead && o!==e && dist2(o.x,o.y-o.h*0.4,ex,ey)<R*R){ damageEnemy(o,22,ex,ey,true); o.burn=Math.max(o.burn,1.5); } }
    if(boss.active && boss.state!=='intro' && boss.state!=='dying' && dist2(boss.x,boss.cy,ex,ey)<(R+boss.w*0.4)**2){ damageBoss(14,ex,ey,false); }
  }
  // гибель элитника = кульминация зоны
  if(e.elite){ game.eliteActive=false; game.elite=null;
    floatText(e.x,e.y-e.h*0.8,'ЭЛИТА ПОВЕРЖЕНА!',{color:'#ffd23f',size:22,font:'display',life:1.4,vy:-26});
    onClimaxDefeated();
  }
}
// поведение
function updateEnemies(dt){
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if(e.dead){ enemies.splice(i,1); continue; }
    e.t+=dt; e.anim+=dt*6; e.flash=Math.max(0,e.flash-dt*4); e.hurtBob=Math.max(0,e.hurtBob-dt*5);
    e.facing = brad.x < e.x ? -1 : 1;
    // горение
    if(e.burn>0){ e.burn-=dt; e.burnTick-=dt;
      if(e.burnTick<=0){ e.burnTick=0.28; damageEnemyBurn(e,brad.burnDmg);
        spawnParticle({x:e.x+rand(-e.w*0.3,e.w*0.3),y:e.y-e.h*0.4,vx:rand(-10,10),vy:rand(-50,-20),
          life:rand(0.2,0.45),max:0.45,size:rand(2,5),color:pick(['#ff6a00','#ffd23f']),add:true,grav:-30});
      }
      if(e.hp<=0){ killEnemy(e); enemies.splice(i,1); continue; }
    }

    if(e.type==='vac'){ updateVac(e,dt); }
    else if(e.type==='nuke'){ updateNuke(e,dt); }
    else if(e.type==='fan'){ updateFan(e,dt); }
    else if(e.type==='drone'){ updateDrone(e,dt); }
    else if(e.type==='drill'){ updateDrill(e,dt); }
    else if(e.type==='kettle'){ updateKettle(e,dt); }
    else if(e.type==='mixer'){ updateMixer(e,dt); }
    else if(e.type==='iron'){ updateIron(e,dt); }
    else if(e.type==='shock'){ updateShock(e,dt); }
    else if(e.type==='mine'){ updateMine(e,dt); }
    else if(e.type==='juicer'){ updateJuicer(e,dt); }
    else if(e.type==='roomba'){ updateRoomba(e,dt); }

    // враг мог погибнуть в своей логике (мина-самоподрыв) — убираем и пропускаем
    if(e.dead){ enemies.splice(i,1); continue; }

    // контакт с Брэдом
    if(brad.alive && !brad.dashing && Math.abs(e.x-brad.x)<(e.w+brad.w)*0.45 && Math.abs((e.y-e.h*0.4)-(brad.y-brad.h*0.4))<(e.h+brad.h)*0.45){
      if(e.type==='vac' && e.state==='lunge'){ vacExplode(e,i); continue; }
      else if(e.type==='fan' && e.state==='kamikaze'){ fanExplode(e,i); continue; }
      else if(e.type==='mine'){ mineExplode(e); enemies.splice(i,1); continue; }
      else brad.hurt(e.contact, e.x);
    }
  }
}
function damageEnemyBurn(e,d){ e.hp-=d; e.flash=Math.max(e.flash,0.05);
  floatText(e.x+rand(-4,4),e.y-e.h*0.8,d.toString(),{color:'#ff8a1e',size:12,vy:-30,life:0.5}); }

// Лёгкое расталкивание — чтобы наземные враги не слипались в одну точку, а
// держали строй и обступали Брэда с разных сторон.
function separate(e,dt,range,push){
  range=range||e.w*1.1; push=push||70;
  for(const o of enemies){ if(o===e||o.dead||FLYING.has(o.type)) continue;
    const dx=e.x-o.x, ad=Math.abs(dx);
    if(ad<range && ad>0.01) e.x += sign(dx)*push*(1-ad/range)*dt;
  }
}
function updateVac(e,dt){
  // ползёт к Брэду; телеграф → мощное всасывание → резкий рывок-таран.
  // Часть Сосунов заходит со спины (фланг), чтобы окружать.
  if(e.flank===undefined) e.flank = Math.random()<0.4;
  separate(e,dt);
  const dx0=brad.x-e.x, d0=Math.abs(dx0);
  if(e.state==='idle'||e.state==='walk'){
    e.state='walk';
    // фланкер обходит на дальнюю сторону от Брэда, остальные прут в лоб
    let dir=sign(dx0)||1;
    if(e.flank && d0>150){ const side = brad.x<WORLD.w*0.5? 1:-1; const tx=brad.x+side*140; dir=sign(tx-e.x)||dir; }
    e.x += dir*e.speed*dt;
    if(d0 < 300 && e.t>1.2){ e.state='telegraph'; e.t=0; }
  } else if(e.state==='telegraph'){
    // короткий завод перед всасыванием (видно, что готовит рывок)
    if(Math.random()<0.6) spawnParticle({x:e.x+e.facing*e.w*0.5,y:e.y-e.h*0.3,vx:-e.facing*60,vy:rand(-20,20),life:0.25,max:0.25,size:rand(2,4),color:'#bcd',add:true});
    if(e.t>0.35){ e.state='suck'; e.t=0; }
  } else if(e.state==='suck'){
    // МОЩНО тянет Брэда к соплу; много видимых линий воздуха, сходящихся к носу
    const dx=e.x-brad.x, d=Math.abs(dx);
    if(brad.alive && d<460){ brad.vx += sign(dx)*380*dt; }
    for(let k=0;k<2;k++) if(Math.random()<0.7){
      const a=rand(0,TAU), r=rand(70,220);
      const px=e.x+e.facing*e.w*0.4, py=e.y-e.h*0.3; // сопло
      const sx=px+Math.cos(a)*r, sy=py+Math.sin(a)*r*0.6;
      spawnParticle({x:sx,y:sy,vx:(px-sx)*4,vy:(py-sy)*4,life:0.35,max:0.35,size:rand(2,4),color:pick(['#bcd','#9fb8d8','#e8f0ff']),add:true,shrink:true});
    }
    if(e.t>0.9){ e.state='lunge'; e.t=0; e.vx=sign(dx0)*460; e.lunges=(e.lunges||0)+1; }
  } else if(e.state==='lunge'){
    e.x+=e.vx*dt; e.vx*=(1-dt*1.6);
    if(e.t>0.55){
      // промах: короткая уязвимая пауза; иногда сразу второй рывок
      if((e.lunges||0)<2 && Math.abs(brad.x-e.x)<260 && Math.random()<0.5){ e.state='suck'; e.t=0; }
      else { e.state='stun'; e.t=0; e.lunges=0; }
    }
  } else if(e.state==='stun'){
    e.vx*=(1-dt*8);
    if(e.t>0.7){ e.state='walk'; e.t=0; }
  }
  e.y=WORLD.groundY-e.h*0.5;
}
function vacExplode(e,i){
  brad.hurt(18,e.x);
  burst(e.x,e.y-e.h*0.4,24,{colors:['#fff','#ff8a1e','#bcd'],smax:300,grav:300,szmax:6});
  Audio_.explode(); Cam.addShake(9);
  killEnemy(e); enemies.splice(i,1);
}
function updateNuke(e,dt){
  // держит дистанцию → заряжает наводящийся луч (телеграф) → стреляет → отходит.
  e.y=WORLD.groundY-e.h*0.5;
  const dx=brad.x-e.x, d=Math.abs(dx);
  const beamY=e.y-e.h*0.4, srcX=e.x;
  if(e.state==='idle'){
    // маневрирует на средней дистанции — не подпускает вплотную
    if(d<320) e.x -= sign(dx)*e.speed*dt*1.6;
    else if(d>680) e.x += sign(dx)*e.speed*dt*1.3;
    else e.x += sign(dx)*e.speed*dt*0.3;
    if(e.t>1.0+Math.random()){ e.state='charging'; e.t=0; e.charge=0;
      e.beamAng=Math.atan2((brad.y-brad.h*0.4)-beamY, brad.x-srcX); Audio_.beam(); }
  } else if(e.state==='charging'){
    e.charge=clamp(e.t/1.4,0,1);
    // луч медленно доворачивает к игроку, пока заряжается — можно увернуться рывком/прыжком
    const want=Math.atan2((brad.y-brad.h*0.4)-beamY, brad.x-srcX);
    e.beamAng=lerp(e.beamAng, want, 1-Math.pow(0.2,dt));
    if(e.t>=1.4){ e.state='fire'; e.t=0; fireBeam(e); }
  } else if(e.state==='fire'){ if(e.t>0.25){ e.state='recharge'; e.t=0; } }
  else if(e.state==='recharge'){
    // отходит и остывает — окно для контратаки
    e.x -= sign(dx)*e.speed*dt*1.7;
    if(e.t>1.0){ e.state='idle'; e.t=0; }
  }
}
function fireBeam(e){
  const y=e.y-e.h*0.4, ang=(e.beamAng!=null)? e.beamAng : (e.facing<0?Math.PI:0);
  const ca=Math.cos(ang), sa=Math.sin(ang);
  Audio_.tone(110,0.35,'sawtooth',0.2,90); Audio_.noise(0.3,0.18,1800); Cam.addShake(6);
  // луч — мгновенный, вдоль наведённого угла
  for(let r=20;r<1400;r+=28){
    const x=e.x+ca*r, yy=y+sa*r;
    spawnParticle({x:x+rand(-8,8),y:yy+rand(-10,10),vx:0,vy:rand(-20,20),life:rand(0.15,0.4),max:0.4,
      size:rand(3,8),color:pick(['#ff3b30','#ffd23f','#ff8a1e']),add:true});
  }
  // попадание: проекция вектора к Брэду на направление луча
  if(brad.alive && !brad.dashing){
    const bx=brad.x-e.x, by=(brad.y-brad.h*0.4)-y;
    const proj=bx*ca+by*sa, perp=Math.abs(bx*sa-by*ca);
    if(proj>0 && proj<1400 && perp<brad.h*0.6) brad.hurt(16,e.x);
  }
}
function updateFan(e,dt){
  // летает, СИЛЬНО отталкивает Брэда ветром, периодически пикирует, при низком HP — камикадзе
  if(e.hp < e.maxhp*0.35 && e.state!=='kamikaze'){ e.state='kamikaze'; floatText(e.x,e.y-e.h*0.8,'!!',{color:'#ff3b30',size:18}); }
  if(e.state==='kamikaze'){
    const dx=brad.x-e.x, dy=(brad.y-brad.h*0.4)-(e.y-e.h*0.4), d=Math.hypot(dx,dy)||1;
    e.x+=dx/d*280*dt; e.y+=dy/d*280*dt;
  } else if(e.state==='dive'){
    // резкое пикирование сверху на игрока
    const dx=brad.x-e.x, dy=(brad.y-brad.h*0.4)-(e.y-e.h*0.4), d=Math.hypot(dx,dy)||1;
    e.x+=dx/d*320*dt; e.y+=dy/d*320*dt;
    if(Math.random()<0.6) spawnParticle({x:e.x+rand(-8,8),y:e.y+rand(-8,8),vx:rand(-40,40),vy:rand(-40,40),life:0.2,max:0.2,size:rand(2,4),color:'#cde',add:true});
    if(e.t>0.5){ e.state='hover'; e.t=0; e.diveCD=rand(3,5); }
  } else {
    // парит над Брэдом, переставляется, отталкивает ветром
    e.state='hover';
    e.x += sign(brad.x-e.x)*e.speed*dt*0.6;
    const hoverY = brad.y - rand(90,150);
    e.y = lerp(e.y, clamp(hoverY, WORLD.groundY-340, WORLD.groundY-90), 1-Math.pow(0.1,dt));
    e.y += Math.sin(e.anim)*0.6;
    // СИЛЬНЫЙ ветер-отталкивание, шире радиус + видимые дуги выдуваемого воздуха
    const dx=brad.x-e.x, sd=sign(dx)||1;
    if(brad.alive && Math.abs(dx)<340 && Math.abs(e.y-brad.y)<200){
      brad.vx += sd*260*dt; // отталкивает прочь от вентилятора
      for(let k=0;k<2;k++) if(Math.random()<0.6) spawnParticle({x:e.x+sd*18+rand(-6,6),y:e.y+rand(-16,16),
        vx:sd*rand(240,360),vy:rand(-40,40),life:0.35,max:0.35,size:rand(2,4),color:pick(['#cde','#9fb8d8','#fff']),add:true,shrink:true});
    }
    // подготовка пикирования
    e.diveCD=(e.diveCD==null?rand(2.5,4):e.diveCD)-dt;
    if(e.diveCD<=0 && Math.abs(dx)<320){ e.state='dive'; e.t=0; }
  }
}
function fanExplode(e,i){
  brad.hurt(14,e.x);
  burst(e.x,e.y,18,{colors:['#fff','#ffd23f','#cde'],smax:280,szmax:5});
  Audio_.explode(); Cam.addShake(7); killEnemy(e); enemies.splice(i,1);
}

// рисование врагов
function drawEnemy(e){
  ctx.save(); ctx.translate(e.x, e.y + (e.hurtBob*Math.sin(e.t*40))*2);
  const fl=e.flash>0;
  if(e.type==='vac') drawVac(e,fl);
  else if(e.type==='nuke') drawNuke(e,fl);
  else if(e.type==='fan') drawFan(e,fl);
  else if(e.type==='drone') drawDrone(e,fl);
  else if(e.type==='drill') drawDrill(e,fl);
  else if(e.type==='kettle') drawKettle(e,fl);
  else if(e.type==='mixer') drawMixer(e,fl);
  else if(e.type==='iron') drawIron(e,fl);
  else if(e.type==='shock') drawShock(e,fl);
  else if(e.type==='mine') drawMine(e,fl);
  else if(e.type==='juicer') drawJuicer(e,fl);
  else if(e.type==='roomba') drawRoomba(e,fl);
  // полоска HP над врагом, если ранен (у элиты — своя сверху)
  if(e.hp<e.maxhp && !e.elite){
    const w=e.w*1.1, x=-w/2, y=-e.h*0.95;
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(x,y,w,4);
    ctx.fillStyle= e.burn>0?'#ff8a1e':'#ff5a4a'; ctx.fillRect(x,y,w*clamp(e.hp/e.maxhp,0,1),4);
  }
  ctx.restore();
}
function eyeRed(x,y,r){ ctx.fillStyle='#1a0000'; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
  ctx.fillStyle='#ff3b30'; ctx.beginPath(); ctx.arc(x,y,r*0.6,0,TAU); ctx.fill();
  ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,60,40,.6)'; ctx.beginPath(); ctx.arc(x,y,r*1.3,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
function drawVac(e,fl){
  const w=e.w,h=e.h, f=e.facing;
  ctx.save(); ctx.scale(f,1);
  // корпус-купол
  ctx.fillStyle=fl?'#fff':'#5f6e44'; roundRect(-w/2,-h/2,w,h,8); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#7a8a5a'; roundRect(-w/2,-h/2,w,h*0.55,8); ctx.fill();
  // колёса
  ctx.fillStyle='#2a2a2a'; ctx.beginPath(); ctx.arc(-w*0.28,h*0.45,7,0,TAU); ctx.arc(w*0.28,h*0.45,7,0,TAU); ctx.fill();
  // нос-щётка
  ctx.fillStyle='#3a3a3a'; roundRect(w*0.38,-h*0.1,w*0.28,h*0.4,3); ctx.fill();
  if(e.state==='suck'){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(150,200,255,.25)';
    ctx.beginPath(); ctx.moveTo(w*0.5,0); ctx.lineTo(w*0.5+90,-50); ctx.lineTo(w*0.5+90,50); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
  eyeRed(-w*0.05,-h*0.12,5); eyeRed(w*0.18,-h*0.12,5);
  ctx.restore();
}
function drawNuke(e,fl){
  const w=e.w,h=e.h,f=e.facing;
  const glow = e.state==='charging'? e.charge : 0;
  // прицел-телеграф вдоль наведённого угла (в мировых координатах, до scale)
  if(glow>0 && e.beamAng!=null){
    ctx.save(); ctx.translate(0,-h*0.4); ctx.rotate(e.beamAng);
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(255,80,40,${0.25+glow*0.5})`;
    ctx.fillRect(w*0.4,-2, 30+glow*1000, 3+glow*3);
    ctx.globalCompositeOperation='source-over'; ctx.restore();
  }
  ctx.save(); ctx.scale(f,1);
  ctx.fillStyle=fl?'#fff':'#7a7a86'; roundRect(-w/2,-h/2,w,h,6); ctx.fill();
  // дверца-окно
  ctx.fillStyle=fl?'#fff':'#2a2a32'; roundRect(-w*0.42,-h*0.38,w*0.6,h*0.76,4); ctx.fill();
  ctx.fillStyle=`rgba(255,${Math.round(120-glow*120)},40,${0.4+glow*0.6})`; roundRect(-w*0.38,-h*0.32,w*0.52,h*0.64,3); ctx.fill();
  // панель
  ctx.fillStyle='#3a3a42'; roundRect(w*0.18,-h*0.42,w*0.26,h*0.84,3); ctx.fill();
  eyeRed(w*0.31,-h*0.18,4); eyeRed(w*0.31,h*0.02,3);
  ctx.restore();
}
function drawFan(e,fl){
  const w=e.w,h=e.h;
  ctx.save();
  // защитная решётка-круг
  ctx.fillStyle=fl?'#fff':'#5a4a32'; ctx.beginPath(); ctx.arc(0,0,w*0.5,0,TAU); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#caa15f'; ctx.beginPath(); ctx.arc(0,0,w*0.42,0,TAU); ctx.fill();
  // лопасти
  ctx.save(); ctx.rotate(e.anim*3);
  ctx.fillStyle='#3a2f1e';
  for(let k=0;k<3;k++){ ctx.rotate(TAU/3); ctx.beginPath(); ctx.ellipse(w*0.18,0,w*0.22,w*0.1,0,0,TAU); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle='#2a2118'; ctx.beginPath(); ctx.arc(0,0,5,0,TAU); ctx.fill();
  eyeRed(-7,-w*0.34,4); eyeRed(7,-w*0.34,4);
  if(e.state==='kamikaze'){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,60,40,.3)';
    ctx.beginPath(); ctx.arc(0,0,w*0.7+Math.sin(e.t*30)*3,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
  ctx.restore();
}
// Снек-дрон (мини-еда, призывается боссом во 2й фазе)
function updateDrone(e,dt){
  e.bob=(e.bob||rand(0,TAU))+dt*8;
  const dx=brad.x-e.x, dy=(brad.y-brad.h*0.4)-(e.y), d=Math.hypot(dx,dy)||1;
  // парящее наведение на Брэда
  e.x += dx/d*e.speed*dt;
  e.y += dy/d*e.speed*0.8*dt + Math.sin(e.bob)*0.6;
  e.y = clamp(e.y, WORLD.groundY-360, WORLD.groundY-18);
}
function drawDrone(e,fl){
  const w=e.w,h=e.h, f=e.facing;
  ctx.save();
  // винт сверху
  ctx.strokeStyle='#cdb795'; ctx.lineWidth=2;
  ctx.save(); ctx.translate(0,-h*0.55); ctx.rotate((e.bob||0)*4);
  ctx.beginPath(); ctx.moveTo(-w*0.5,0); ctx.lineTo(w*0.5,0); ctx.stroke(); ctx.restore();
  ctx.fillStyle='#6a5a3a'; ctx.fillRect(-1,-h*0.55,2,h*0.2);
  ctx.save(); ctx.scale(f,1);
  // тушка-сосиска/снек
  ctx.fillStyle=fl?'#fff':'#c98a3a'; roundRect(-w*0.5,-h*0.32,w,h*0.62,h*0.3); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#e0a85a'; roundRect(-w*0.42,-h*0.26,w*0.84,h*0.3,h*0.2); ctx.fill();
  // глазки
  eyeRed(-w*0.06,-h*0.06,3); eyeRed(w*0.14,-h*0.06,3);
  ctx.restore();
  ctx.restore();
}

// Бурильщик: целится → рывок по прямой → если промахнулся, застревает (уязвим)
function updateDrill(e,dt){
  e.y=WORLD.groundY-e.h*0.5;
  separate(e,dt);
  if(e.state==='idle'||e.state==='aim'){
    e.state='aim';
    // медленно подходит и целится
    e.x += sign(brad.x-e.x)*e.speed*0.5*dt;
    e.aim=(e.aim||0)+dt;
    // клубы пыли из-под бура при подходе
    if(Math.random()<0.35) spawnParticle({x:e.x+e.facing*e.w*0.4+rand(-4,4),y:e.y+e.h*0.4,vx:rand(-20,20),vy:-rand(10,40),life:rand(0.3,0.6),max:0.6,size:rand(3,6),color:pick(['#9a8a6a','#c2b090','#8a7a5a']),add:false,grav:-10});
    if(e.aim>1.0 && Math.abs(brad.x-e.x)<560){ e.state='charge'; e.t=0; e.aim=0; e.dir=sign(brad.x-e.x)||1; e.vx=e.dir*560;
      Audio_.tone(120,0.25,'sawtooth',0.18,90); Audio_.noise(0.2,0.1,1800); }
  } else if(e.state==='charge'){
    e.x+=e.vx*dt;
    // густая пыль из-под бура на рывке
    for(let k=0;k<2;k++) if(Math.random()<0.6) spawnParticle({x:e.x-e.dir*e.w*0.4,y:e.y+rand(-6,12),vx:-e.dir*rand(120,220),vy:-rand(10,70),life:rand(0.3,0.55),max:0.55,size:rand(3,7),color:pick(['#caa15f','#9a8a6a','#8a6a3a','#c2b090']),add:false,grav:180});
    // застревает, если врезался в край мира или пробежал мимо Брэда
    const passed = (e.dir>0 && e.x>brad.x+90) || (e.dir<0 && e.x<brad.x-90);
    const wall = e.x<e.w*0.5+8 || e.x>WORLD.w-e.w*0.5-8;
    if(e.t>0.18 && (passed||wall)){ e.state='stuck'; e.t=0;
      Audio_.metal(); Cam.addShake(5);
      burst(e.x+e.dir*e.w*0.4, e.y, 10,{colors:['#caa15f','#8a6a3a','#fff'],smax:200,grav:300,szmax:4}); }
  } else if(e.state==='stuck'){
    e.vx*=(1-dt*6);
    if(e.t>1.5){ e.state='aim'; e.t=0; e.aim=0; }
  }
}
function drawDrill(e,fl){
  const w=e.w,h=e.h,f=e.facing;
  ctx.save();
  if(e.state==='stuck'){ ctx.translate(rand(-1.5,1.5),0); } // вибрация застрявшего
  ctx.scale(f,1);
  // корпус-дрель
  ctx.fillStyle=fl?'#fff':'#7a4a28'; roundRect(-w*0.5,-h*0.42,w*0.86,h*0.84,6); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#b06a3a'; roundRect(-w*0.5,-h*0.42,w*0.86,h*0.42,6); ctx.fill();
  // ручка-моторчик сзади
  ctx.fillStyle='#3a2a1e'; roundRect(-w*0.56,-h*0.2,w*0.16,h*0.4,3); ctx.fill();
  // бур (спираль) спереди
  const drillX=w*0.36;
  ctx.fillStyle='#9aa0a8'; ctx.beginPath(); ctx.moveTo(drillX,-h*0.3); ctx.lineTo(drillX+w*0.3*(e.state==='charge'?1.1:1),0); ctx.lineTo(drillX,h*0.3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#5a5f68'; ctx.lineWidth=2;
  const spin=(e.state==='charge')?e.t*40:e.anim*3;
  for(let k=0;k<3;k++){ const yy=-h*0.2+k*h*0.2+Math.sin(spin+k)*3; ctx.beginPath(); ctx.moveTo(drillX,yy); ctx.lineTo(drillX+w*0.26,yy); ctx.stroke(); }
  eyeRed(-w*0.1,-h*0.12,4); eyeRed(w*0.08,-h*0.12,4);
  if(e.state==='aim'){ ctx.globalCompositeOperation='lighter'; ctx.strokeStyle='rgba(255,80,40,.5)'; ctx.lineWidth=2; ctx.setLineDash([8,6]);
    ctx.beginPath(); ctx.moveTo(drillX+w*0.3,0); ctx.lineTo(drillX+w*0.3+360,0); ctx.stroke(); ctx.setLineDash([]); ctx.globalCompositeOperation='source-over'; }
  ctx.restore();
}

// ====================================================================
//  НОВЫЕ ВРАГИ (кухонные приборы)
// ====================================================================

// Чайник «Кипяток» — держит дистанцию, телеграфит свистком, лобит кипящие капли
function updateKettle(e,dt){
  e.y=WORLD.groundY-e.h*0.5;
  const dx=brad.x-e.x, d=Math.abs(dx);
  if(e.state==='idle'||e.state==='reposition'){
    e.state='reposition';
    if(d<240) e.x -= sign(dx)*e.speed*dt;       // отходим
    else if(d>360) e.x += sign(dx)*e.speed*dt;  // подходим
    if(e.t>1.6 && d<560){ e.state='whistle'; e.t=0; e.charge=0; Audio_.tone(880,0.3,'sine',0.05,1500); }
  } else if(e.state==='whistle'){
    e.charge=clamp(e.t/1.0,0,1);
    if(Math.random()<0.6) spawnParticle({x:e.x+e.facing*e.w*0.5,y:e.y-e.h*0.35,vx:e.facing*20,vy:-rand(30,70),
      life:rand(0.3,0.6),max:0.6,size:rand(2,5),color:'rgba(255,255,255,.6)',add:true,grav:-30});
    if(e.t>=1.0){ e.state='spray'; e.t=0; e.shots=randi(2,3); e.fire=0; }
  } else if(e.state==='spray'){
    e.fire-=dt;
    if(e.fire<=0 && e.shots>0){ e.fire=0.24; e.shots--;
      spawnGlob(e.x+e.facing*e.w*0.45, e.y-e.h*0.3, brad.x+rand(-50,50), brad.y-brad.h*0.4, {dmg:12,size:11});
      Audio_.noise(0.1,0.1,1400); }
    if(e.shots<=0 && e.t>0.4){ e.state='reposition'; e.t=0; }
  }
}
function drawKettle(e,fl){
  const w=e.w,h=e.h,f=e.facing;
  ctx.save(); ctx.scale(f,1);
  ctx.fillStyle=fl?'#fff':'#9aa0a8'; roundRect(-w*0.42,-h*0.3,w*0.84,h*0.7,h*0.3); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#c0c6cc'; roundRect(-w*0.42,-h*0.3,w*0.84,h*0.34,h*0.25); ctx.fill();
  // носик
  ctx.fillStyle='#7a8088'; ctx.beginPath(); ctx.moveTo(w*0.34,-h*0.05); ctx.lineTo(w*0.62,-h*0.28); ctx.lineTo(w*0.6,-h*0.1); ctx.lineTo(w*0.4,h*0.08); ctx.closePath(); ctx.fill();
  // ручка
  ctx.strokeStyle='#5a6068'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(-w*0.05,-h*0.32,w*0.26,Math.PI*0.95,Math.PI*0.05,true); ctx.stroke();
  ctx.fillStyle='#6a7078'; ctx.beginPath(); ctx.arc(-w*0.05,-h*0.3,4,0,TAU); ctx.fill();
  if(e.state==='whistle'){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.arc(w*0.55,-h*0.34-Math.sin(e.t*20)*3, 6+e.charge*5,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
  eyeRed(-w*0.12,-h*0.02,4); eyeRed(w*0.08,-h*0.02,4);
  ctx.restore();
}

// Миксер «Вихрь» — быстрый дашер; после рывка уязвим (раскрутка)
function updateMixer(e,dt){
  e.y=WORLD.groundY-e.h*0.5;
  const dx=brad.x-e.x, d=Math.abs(dx);
  if(e.state==='idle'||e.state==='chase'){
    e.state='chase';
    e.x += sign(dx)*e.speed*dt;
    if(d<300 && e.t>0.8){ e.state='windup'; e.t=0; e.dir=sign(dx)||1; Audio_.tone(200,0.3,'sawtooth',0.1,420); }
  } else if(e.state==='windup'){
    e.x -= e.dir*50*dt;
    if(e.t>0.45){ e.state='dash'; e.t=0; e.vx=e.dir*640; Audio_.noise(0.2,0.12,2000); }
  } else if(e.state==='dash'){
    e.x += e.vx*dt; e.vx*=(1-dt*1.2);
    e.x=clamp(e.x, e.w*0.5, WORLD.w-e.w*0.5);
    if(Math.random()<0.5) spawnParticle({x:e.x-e.dir*e.w*0.4,y:e.y+rand(-10,12),vx:-e.dir*120,vy:rand(-30,30),life:0.25,max:0.25,size:rand(2,5),color:pick(['#ffd27a','#c84a4a','#fff']),add:true});
    if(e.t>0.5 || Math.abs(e.vx)<120){ e.state='recover'; e.t=0; }
  } else if(e.state==='recover'){
    if(e.t>0.9){ e.state='chase'; e.t=0; }
  }
}
function drawMixer(e,fl){
  const w=e.w,h=e.h,f=e.facing;
  ctx.save(); ctx.scale(f,1);
  const spin = (e.state==='dash')? e.t*60 : (e.state==='windup')? e.t*34 : e.anim*4;
  ctx.fillStyle=fl?'#fff':'#a83a3a'; roundRect(-w*0.4,-h*0.42,w*0.8,h*0.5,8); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#c84a4a'; roundRect(-w*0.4,-h*0.42,w*0.8,h*0.25,8); ctx.fill();
  ctx.fillStyle='#7a2a2a'; roundRect(-w*0.18,-h*0.56,w*0.36,h*0.18,4); ctx.fill();
  ctx.strokeStyle='#cfd6dc'; ctx.lineWidth=2.5;
  for(const bx of [-w*0.18,w*0.18]){
    ctx.fillStyle='#9aa0a8'; ctx.fillRect(bx-1.5,h*0.05,3,h*0.16);
    ctx.save(); ctx.translate(bx,h*0.3); ctx.rotate(spin);
    ctx.strokeStyle='#cfd6dc'; ctx.beginPath(); ctx.ellipse(0,0,w*0.12,h*0.16,0,0,TAU); ctx.stroke();
    ctx.rotate(TAU/4); ctx.beginPath(); ctx.ellipse(0,0,w*0.12,h*0.16,0,0,TAU); ctx.stroke();
    ctx.restore();
  }
  eyeRed(-w*0.1,-h*0.22,4); eyeRed(w*0.1,-h*0.22,4);
  if(e.state==='recover'){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,210,80,.25)'; ctx.beginPath(); ctx.arc(0,0,w*0.5,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
  ctx.restore();
}

// Утюг «Пресс» — бронирован, прыгает и бьёт вниз → ударная волна; уязвим при выпуске пара
function updateIron(e,dt){
  const groundYc=WORLD.groundY-e.h*0.5;
  if(e.state==='idle'||e.state==='approach'){
    e.state='approach'; e.y=groundYc;
    e.x += sign(brad.x-e.x)*e.speed*dt;
    if(Math.abs(brad.x-e.x)<360 && e.t>1.2){ e.state='leap'; e.t=0; e.vy=-580; e.vx=sign(brad.x-e.x)*200; Audio_.tone(170,0.2,'square',0.12,320); }
  } else if(e.state==='leap'){
    e.vy+=1800*dt; e.x+=e.vx*dt; e.y+=e.vy*dt;
    e.x=clamp(e.x, e.w*0.5, WORLD.w-e.w*0.5);
    if(e.y>=groundYc && e.vy>0){ e.y=groundYc; e.state='slam'; e.t=0; ironSlam(e); }
  } else if(e.state==='slam'){
    e.y=groundYc; if(e.t>0.5){ e.state='vent'; e.t=0; }
  } else if(e.state==='vent'){
    e.y=groundYc;
    if(Math.random()<0.5) spawnParticle({x:e.x+rand(-e.w*0.3,e.w*0.3),y:e.y+e.h*0.3,vx:rand(-20,20),vy:-rand(20,50),life:rand(0.3,0.6),max:0.6,size:rand(3,6),color:'rgba(220,235,255,.6)',add:true,grav:-20});
    if(e.t>1.1){ e.state='approach'; e.t=0; }
  }
}
function ironSlam(e){
  Audio_.tone(80,0.3,'sawtooth',0.2,40); Audio_.noise(0.3,0.18,1200); Cam.addShake(9);
  burst(e.x,WORLD.groundY-6,16,{colors:['#caa15f','#8a6a3a','#fff'],smax:260,grav:300,szmax:5});
  spawnGroundWave(e.x-e.w*0.4, -1, {dmg:14,speed:360});
  spawnGroundWave(e.x+e.w*0.4, 1, {dmg:14,speed:360});
}
function drawIron(e,fl){
  const w=e.w,h=e.h,f=e.facing;
  ctx.save(); ctx.scale(f,1);
  // подошва (трапеция, носик вперёд)
  ctx.fillStyle=fl?'#fff':'#3a5a80';
  ctx.beginPath(); ctx.moveTo(-w*0.44,h*0.3); ctx.lineTo(w*0.5,h*0.12); ctx.lineTo(w*0.5,h*0.34); ctx.lineTo(-w*0.4,h*0.46); ctx.closePath(); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#5a8ac0'; roundRect(-w*0.42,-h*0.2,w*0.8,h*0.4,6); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#7aa6d8'; roundRect(-w*0.42,-h*0.2,w*0.8,h*0.2,6); ctx.fill();
  ctx.strokeStyle='#2a3a4a'; ctx.lineWidth=6; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-w*0.3,-h*0.18); ctx.quadraticCurveTo(0,-h*0.74,w*0.28,-h*0.18); ctx.stroke();
  ctx.fillStyle='#1a2a3a'; for(let k=0;k<4;k++){ ctx.beginPath(); ctx.arc(-w*0.2+k*w*0.16, h*0.34, 2,0,TAU); ctx.fill(); }
  eyeRed(-w*0.1,-h*0.04,4); eyeRed(w*0.1,-h*0.04,4);
  if(e.state==='vent'){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(220,235,255,.3)';
    for(let k=0;k<3;k++){ ctx.beginPath(); ctx.arc(-w*0.2+k*w*0.2, h*0.42+Math.sin(e.t*10+k)*3, 5,0,TAU); ctx.fill(); }
    ctx.globalCompositeOperation='source-over'; }
  ctx.restore();
  // тень-телеграф при прыжке
  if(e.state==='leap'){
    const gy=WORLD.groundY-e.y;
    ctx.save(); ctx.globalAlpha=0.55; ctx.strokeStyle='#ff5a40'; ctx.lineWidth=2; ctx.setLineDash([6,5]);
    ctx.beginPath(); ctx.ellipse(0,gy,w*0.5,8,0,0,TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
}

// Электро-зарядка «Разряд» — летун, очередями стреляет электро-болтами
function updateShock(e,dt){
  e.bob=(e.bob||rand(0,TAU))+dt*6;
  const dx=brad.x-e.x, d=Math.abs(dx)||1;
  const want = d>360? 1 : d<240? -1 : 0;
  e.x += sign(dx)*want*e.speed*dt;
  e.y = lerp(e.y, clamp(brad.y-115, WORLD.groundY-320, WORLD.groundY-80), 1-Math.pow(0.08,dt)) + Math.sin(e.bob)*0.6;
  e.shootCD=(e.shootCD==null?1.4:e.shootCD)-dt;
  if(e.shootCD<=0 && e.state!=='burst'){ e.state='burst'; e.t=0; e.shots=3; e.fire=0; Audio_.tone(320,0.2,'square',0.08,820); }
  if(e.state==='burst'){
    e.fire-=dt;
    if(e.fire<=0 && e.shots>0){ e.fire=0.16; e.shots--;
      const ang=Math.atan2((brad.y-brad.h*0.4)-e.y, brad.x-e.x)+rand(-0.08,0.08);
      spawnBolt(e.x,e.y,ang,{dmg:9,speed:660}); Audio_.shoot(); }
    if(e.shots<=0){ e.state='idle'; e.shootCD=rand(1.7,2.5); }
  }
}
function drawShock(e,fl){
  const w=e.w,h=e.h,f=e.facing;
  ctx.save();
  if(e.state==='burst'){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,240,120,.3)'; ctx.beginPath(); ctx.arc(0,0,w*0.7,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
  ctx.scale(f,1);
  ctx.fillStyle=fl?'#fff':'#bfae3a'; roundRect(-w*0.4,-h*0.4,w*0.8,h*0.8,6); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#e8d24a'; roundRect(-w*0.4,-h*0.4,w*0.8,h*0.4,6); ctx.fill();
  ctx.fillStyle='#5a5a3a'; ctx.fillRect(w*0.36,-h*0.16,w*0.2,5); ctx.fillRect(w*0.36,h*0.06,w*0.2,5);
  eyeRed(-w*0.1,-h*0.06,4); eyeRed(w*0.08,-h*0.06,4);
  ctx.strokeStyle='rgba(255,250,180,.8)'; ctx.lineWidth=1.6;
  for(let k=0;k<2;k++){ const a=e.anim*3+k*3; ctx.beginPath(); ctx.moveTo(Math.cos(a)*w*0.4,Math.sin(a)*h*0.4);
    ctx.lineTo(Math.cos(a)*w*0.62,Math.sin(a)*h*0.6); ctx.stroke(); }
  ctx.restore();
}

// Робот-мина «Хлопушка» — семенит к Брэду и самоподрывается (телеграф)
function updateMine(e,dt){
  e.y=WORLD.groundY-e.h*0.5;
  const dx=brad.x-e.x, d=Math.abs(dx);
  if(e.state==='idle'||e.state==='scuttle'){
    e.state='scuttle';
    e.x += sign(dx)*e.speed*dt;
    if(d<92){ e.state='prime'; e.t=0; Audio_.tone(720,0.1,'square',0.1,940); }
  } else if(e.state==='prime'){
    if(Math.floor(e.t*8)!==Math.floor((e.t-dt)*8)) Audio_.tone(940,0.05,'square',0.08,1200);
    if(Math.random()<0.4) spawnParticle({x:e.x+rand(-e.w*0.3,e.w*0.3),y:e.y-e.h*0.2,vx:rand(-20,20),vy:-rand(10,40),life:0.3,max:0.3,size:rand(2,4),color:'#ff5a40',add:true});
    if(e.t>0.75){ mineExplode(e); }
  }
}
function mineExplode(e){
  if(e.dead) return;
  const R=110;
  burst(e.x,e.y-e.h*0.3,22,{colors:['#fff','#ffd23f','#ff6a00','#ff2a00'],smax:340,grav:200,szmax:7});
  spawnParticle({x:e.x,y:e.y-e.h*0.3,vx:0,vy:0,life:0.2,max:0.2,size:R*0.7,color:'#ffae42',add:true,shrink:false});
  Audio_.explode(); Cam.addShake(10);
  if(brad.alive && !brad.dashing && dist2(brad.x,brad.y-brad.h*0.4,e.x,e.y-e.h*0.3)<R*R) brad.hurt(16,e.x);
  killEnemy(e);
}
function drawMine(e,fl){
  const w=e.w,h=e.h;
  ctx.save();
  const swell = e.state==='prime'? 1+Math.sin(e.t*24)*0.08 : 1;
  ctx.scale(swell,swell);
  ctx.strokeStyle='#3a3a2a'; ctx.lineWidth=2;
  for(const lx of [-w*0.3,-w*0.1,w*0.1,w*0.3]){ ctx.beginPath(); ctx.moveTo(lx,h*0.18); ctx.lineTo(lx*1.25,h*0.5); ctx.stroke(); }
  ctx.fillStyle='#5a5020'; for(let k=0;k<6;k++){ const a=k*TAU/6; ctx.save(); ctx.rotate(a); ctx.fillRect(w*0.36,-2,5,4); ctx.restore(); }
  ctx.fillStyle=fl?'#fff':'#7a7030'; ctx.beginPath(); ctx.arc(0,0,w*0.42,0,TAU); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#b0a040'; ctx.beginPath(); ctx.arc(-w*0.1,-w*0.1,w*0.26,0,TAU); ctx.fill();
  const on = e.state==='prime'? (Math.floor(e.t*12)%2===0) : (Math.floor(performance.now()/500)%2===0);
  if(on){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,60,40,.7)'; ctx.beginPath(); ctx.arc(0,-h*0.05,7,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
  ctx.fillStyle= on? '#ff5a40':'#7a2a22'; ctx.beginPath(); ctx.arc(0,-h*0.05,3.5,0,TAU); ctx.fill();
  ctx.restore();
}

// Соковыжималка — наземный: подходит → раскручивается (уязвима) → веером
// разбрасывает кислотные брызги по дуге → откатывается.
function updateJuicer(e,dt){
  e.y=WORLD.groundY-e.h*0.5;
  separate(e,dt);
  const dx=brad.x-e.x, d=Math.abs(dx);
  if(e.state==='idle'||e.state==='approach'){
    e.state='approach';
    if(d>320) e.x += sign(dx)*e.speed*dt;
    else if(d<180) e.x -= sign(dx)*e.speed*dt*0.8;
    else e.x += sign(dx)*e.speed*dt*0.2;
    if(e.t>1.4 && d<480){ e.state='spin'; e.t=0; Audio_.tone(180,0.4,'sawtooth',0.08,520); }
  } else if(e.state==='spin'){
    // раскрутка — короткая уязвимость (телеграф залпа)
    if(Math.random()<0.6) spawnParticle({x:e.x+rand(-e.w*0.4,e.w*0.4),y:e.y-e.h*0.3,vx:rand(-50,50),vy:-rand(20,70),
      life:0.3,max:0.3,size:rand(2,4),color:pick(['#ff5a8a','#ffd23f','#c85a8a']),add:true});
    if(e.t>0.6){ e.state='spray'; e.t=0; e.shots=randi(5,7); e.fire=0;
      e.baseAng=Math.atan2((brad.y-brad.h*0.4)-(e.y-e.h*0.3), brad.x-e.x); }
  } else if(e.state==='spray'){
    e.fire-=dt;
    if(e.fire<=0 && e.shots>0){ e.fire=0.09;
      const idx=e.shots; const spread=(idx%2?1:-1)*(0.12+(7-idx)*0.05);
      spawnAcid(e.x+e.facing*e.w*0.3, e.y-e.h*0.3, e.baseAng+spread, {dmg:10,size:9});
      Audio_.noise(0.06,0.08,1600); e.shots--; }
    if(e.shots<=0 && e.t>0.4){ e.state='cooldown'; e.t=0; }
  } else if(e.state==='cooldown'){
    e.x -= sign(dx)*e.speed*dt*0.5;
    if(e.t>0.9){ e.state='approach'; e.t=0; }
  }
}
function drawJuicer(e,fl){
  const w=e.w,h=e.h,f=e.facing;
  ctx.save(); ctx.scale(f,1);
  const spin=(e.state==='spin'||e.state==='spray')? e.t*40 : e.anim*2;
  // основание-конус
  ctx.fillStyle=fl?'#fff':'#8a3a5a';
  ctx.beginPath(); ctx.moveTo(-w*0.44,h*0.5); ctx.lineTo(w*0.44,h*0.5); ctx.lineTo(w*0.3,-h*0.05); ctx.lineTo(-w*0.3,-h*0.05); ctx.closePath(); ctx.fill();
  // корпус-стакан
  ctx.fillStyle=fl?'#fff':'#c85a8a'; roundRect(-w*0.32,-h*0.28,w*0.64,h*0.34,6); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#e07aa8'; roundRect(-w*0.32,-h*0.28,w*0.64,h*0.14,6); ctx.fill();
  // носик-слив
  ctx.fillStyle='#7a2a4a'; ctx.beginPath(); ctx.moveTo(w*0.28,h*0.02); ctx.lineTo(w*0.52,h*0.14); ctx.lineTo(w*0.28,h*0.2); ctx.closePath(); ctx.fill();
  // вращающийся ребристый конус (ример)
  ctx.save(); ctx.translate(0,-h*0.36); ctx.rotate(spin);
  ctx.fillStyle='#f2c879'; for(let k=0;k<6;k++){ ctx.rotate(TAU/6); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(w*0.2,-3); ctx.lineTo(w*0.2,3); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.arc(0,0,w*0.1,0,TAU); ctx.fill();
  ctx.restore();
  eyeRed(-w*0.12,-h*0.14,4); eyeRed(w*0.06,-h*0.14,4);
  if(e.state==='spin'){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(180,255,90,.25)';
    ctx.beginPath(); ctx.arc(0,-h*0.1,w*0.5+Math.sin(e.t*30)*3,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
  ctx.restore();
}

// Roomba 9000 — летающий элитник: вызывает пылесосы + миниган
function updateRoomba(e,dt){
  e.bob=(e.bob||0)+dt*3;
  // парит над ареной, держась над Брэдом
  const tx=clamp(brad.x + (e.side||40), WORLD.w*0.2, WORLD.w*0.8);
  if(e.t>2.4){ e.side=rand(-180,180); e.t2=(e.t2||0); }
  e.x=lerp(e.x, tx, 1-Math.pow(0.6,dt));
  const hoverY = WORLD.groundY-210 + Math.sin(e.bob)*16;
  e.y=clamp(lerp(e.y, hoverY, 1-Math.pow(0.4,dt)), WORLD.groundY-300, WORLD.groundY-120);
  // таймеры атак
  e.summonCD=(e.summonCD==null?2.0:e.summonCD)-dt;
  e.gunCD=(e.gunCD==null?2.6:e.gunCD)-dt;
  if(e.summonCD<=0){ e.summonCD=rand(4.5,6.0);
    const live=enemies.filter(o=>!o.dead && o.type==='vac').length;
    if(live<4){ const n=randi(1,2); for(let k=0;k<n;k++){ const sx=clamp(e.x+rand(-60,60),40,WORLD.w-40); spawnEnemy('vac',sx,WORLD.groundY-ENEMY_DEFS.vac.h*0.5);
        burst(sx,WORLD.groundY-20,8,{colors:['#9fe06a','#caa15f'],smax:150,szmax:3}); }
      floatText(e.x,e.y-e.h*0.7,'ПОДКРЕПЛЕНИЕ!',{color:'#9fe06a',size:14,font:'display',vy:-24,life:0.9}); } }
  if(e.gunCD<=0 && e.state!=='burst'){ e.state='burst'; e.t3=0; Audio_.tone(90,0.2,'square',0.12,70); }
  if(e.state==='burst'){ e.t3=(e.t3||0)+dt; e.fire=(e.fire||0)-dt;
    if(e.fire<=0){ e.fire=0.1;
      const ang=Math.atan2((brad.y-brad.h*0.4)-e.y, brad.x-e.x)+rand(-0.16,0.16);
      spawnBullet(e.x, e.y+e.h*0.2, ang, {dmg:8, size:6, speed:560}); Audio_.shoot(); }
    if(e.t3>1.2){ e.state='idle'; e.gunCD=rand(2.6,3.6); } }
}
function drawRoomba(e,fl){
  const w=e.w,h=e.h,f=e.facing;
  ctx.save();
  // тень на земле
  ctx.save(); ctx.globalAlpha=0.28; ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(0,(WORLD.groundY-e.y),w*0.5,8,0,0,TAU); ctx.fill(); ctx.restore();
  // подъёмные роторы
  ctx.strokeStyle='#aab4bc'; ctx.lineWidth=2;
  for(const rx of [-w*0.34,w*0.34]){ ctx.save(); ctx.translate(rx,-h*0.5); ctx.rotate(e.bob*8);
    ctx.beginPath(); ctx.moveTo(-w*0.18,0); ctx.lineTo(w*0.18,0); ctx.stroke(); ctx.restore();
    ctx.fillStyle='#5a636b'; ctx.fillRect(rx-1,-h*0.5,2,h*0.18); }
  // диск-корпус
  ctx.fillStyle=fl?'#fff':'#2f343d'; roundRect(-w*0.5,-h*0.32,w,h*0.7,h*0.34); ctx.fill();
  ctx.fillStyle=fl?'#fff':'#3f4651'; roundRect(-w*0.5,-h*0.32,w,h*0.34,h*0.3); ctx.fill();
  // «сенсор-башня»
  ctx.fillStyle='#22262e'; roundRect(-w*0.16,-h*0.5,w*0.32,h*0.26,4); ctx.fill();
  // миниган снизу (вращается во время burst)
  ctx.save(); ctx.translate(0,h*0.34); ctx.rotate(e.state==='burst'? (e.t3||0)*30 : 0);
  ctx.fillStyle='#1a1d23'; for(let k=0;k<4;k++){ ctx.rotate(TAU/4); ctx.fillRect(-2,4,4,12); }
  ctx.fillStyle='#3a3f4a'; ctx.beginPath(); ctx.arc(0,0,6,0,TAU); ctx.fill(); ctx.restore();
  // глаза-сканер
  const ec = e.state==='burst'? '#ff3b30':'#9fe06a';
  ctx.globalCompositeOperation='lighter'; ctx.fillStyle=e.state==='burst'?'rgba(255,60,40,.6)':'rgba(120,230,90,.6)';
  ctx.beginPath(); ctx.arc(0,-h*0.37,9,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='#0a0f0a'; ctx.beginPath(); ctx.arc(0,-h*0.37,5,0,TAU); ctx.fill();
  ctx.fillStyle=ec; ctx.beginPath(); ctx.arc(0,-h*0.37,2.5,0,TAU); ctx.fill();
  ctx.restore();
}
//  БОСС: «ОГРОМНЫЙ ХОЛОДИЛЬНИК» (Свалка 404) + его атаки
// ====================================================================
